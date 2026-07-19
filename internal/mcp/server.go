package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/wii/mdserve/internal/docs"
)

// Server is the MCP JSON-RPC dispatcher. It is stateless across requests
// (all tools are read-only and re-read the filesystem each call), so a single
// instance can serve both stdio and HTTP transports.
type Server struct {
	info   ServerInfo
	tools  []tool
	byName map[string]tool
}

// NewServer creates an MCP server over the given docs library.
func NewServer(lib *docs.Library, name, version string) *Server {
	tools := buildTools(lib)
	byName := make(map[string]tool, len(tools))
	for _, t := range tools {
		byName[t.def.Name] = t
	}
	return &Server{
		info:   ServerInfo{Name: name, Version: version},
		tools:  tools,
		byName: byName,
	}
}

// Tools returns the advertised tool definitions (for tools/list).
func (s *Server) Tools() []Tool {
	out := make([]Tool, len(s.tools))
	for i, t := range s.tools {
		out[i] = t.def
	}
	return out
}

// Handle parses and dispatches a single JSON-RPC request (one object).
// It returns the response bytes to write back, or nil if the message is a
// notification (no response). A returned error means the input was not valid
// JSON-RPC framing and the caller may close the connection.
func (s *Server) Handle(ctx context.Context, raw []byte) ([]byte, error) {
	req, perr := parseRequest(raw)
	if perr != nil {
		// Could not parse framing; respond with a parse error with null id.
		return writeResponse(Response{JSONRPC: jsonrpcVersion, Error: perr})
	}

	// Notification: valid request, no id → no response.
	if len(req.ID) == 0 && isNotification(req.Method) {
		return nil, nil
	}

	resp := s.dispatch(ctx, req)
	// Notifications that slipped through (no id) still produce no response.
	if len(req.ID) == 0 {
		return nil, nil
	}
	return writeResponse(resp)
}

// HandleBatch dispatches a JSON-RPC message that may be a single object or a
// batch array. Returns the response bytes (single object, batch array, or nil
// when every item was a notification).
func (s *Server) HandleBatch(ctx context.Context, raw []byte) ([]byte, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return writeResponse(Response{JSONRPC: jsonrpcVersion, Error: &ResponseError{
			Code: CodeParseError, Message: "empty request",
		}})
	}
	if trimmed[0] == '[' {
		return s.handleBatchArray(ctx, raw)
	}
	return s.Handle(ctx, raw)
}

func (s *Server) handleBatchArray(ctx context.Context, raw []byte) ([]byte, error) {
	var reqs []json.RawMessage
	if err := json.Unmarshal(raw, &reqs); err != nil {
		return writeResponse(Response{JSONRPC: jsonrpcVersion, Error: &ResponseError{
			Code: CodeParseError, Message: "invalid batch",
		}})
	}
	var responses []Response
	for _, item := range reqs {
		out, err := s.Handle(ctx, item)
		if err != nil {
			return nil, err
		}
		if out != nil {
			var r Response
			if jsonErr := json.Unmarshal(out, &r); jsonErr == nil {
				responses = append(responses, r)
			}
		}
	}
	if len(responses) == 0 {
		return nil, nil
	}
	if len(responses) == 1 {
		return writeResponse(responses[0])
	}
	return json.Marshal(responses)
}

// dispatch routes a parsed request to the matching method handler.
func (s *Server) dispatch(ctx context.Context, req Request) Response {
	resp := Response{JSONRPC: jsonrpcVersion, ID: req.ID}
	switch req.Method {
	case MethodInitialize:
		result, err := s.handleInitialize(req.Params)
		if err != nil {
			resp.Error = err
		} else {
			resp.Result = result
		}
	case MethodPing:
		// ping → empty result.
		resp.Result = struct{}{}
	case MethodToolsList:
		resp.Result = ListToolsResult{Tools: s.Tools()}
	case MethodToolsCall:
		result, err := s.handleToolsCall(ctx, req.Params)
		if err != nil {
			resp.Error = err
		} else {
			resp.Result = result
		}
	case MethodInitialized:
		// notification; nothing to do.
	default:
		resp.Error = &ResponseError{
			Code:    CodeMethodNotFound,
			Message: fmt.Sprintf("method not found: %s", req.Method),
		}
	}
	return resp
}

// handleInitialize validates the client params and returns server capabilities.
func (s *Server) handleInitialize(params json.RawMessage) (*InitializeResult, *ResponseError) {
	// Params are optional/informational; we accept any shape.
	result := &InitializeResult{
		ProtocolVersion: ProtocolVersion,
		Capabilities: ServerCaps{
			Tools: ToolsCapability{},
		},
		ServerInfo: s.info,
		Instructions: "Read-only access to the mdserve document library. " +
			"Use list_docs to browse, read_doc to read a file, search_docs to " +
			"search, get_outline for a document's headings, and list_tags for " +
			"front-matter tags/categories.",
	}
	_ = params
	return result, nil
}

// handleToolsCall executes a named tool with its arguments.
func (s *Server) handleToolsCall(ctx context.Context, params json.RawMessage) (*CallToolResult, *ResponseError) {
	var p CallToolParams
	if len(params) > 0 {
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ResponseError{Code: CodeInvalidParams, Message: "invalid tools/call params"}
		}
	}

	t, ok := s.byName[p.Name]
	if !ok {
		return nil, &ResponseError{
			Code:    CodeMethodNotFound,
			Message: fmt.Sprintf("unknown tool: %s", p.Name),
		}
	}

	text, err := t.handler(ctx, p.Arguments)
	if err != nil {
		// Tool-level (invalid-arg) errors become a JSON-RPC error so the
		// client sees a structured failure rather than a soft tool result.
		if te := asToolError(err); te != nil {
			return nil, &ResponseError{Code: te.code, Message: te.message}
		}
		// Unexpected/internal errors are surfaced as a tool result with
		// isError=true (keeps the JSON-RPC layer clean).
		return &CallToolResult{
			IsError: true,
			Content: []ContentBlock{TextContent(err.Error())},
		}, nil
	}
	return &CallToolResult{
		Content: []ContentBlock{TextContent(text)},
	}, nil
}

// parseRequest decodes a JSON-RPC request envelope.
func parseRequest(raw []byte) (Request, *ResponseError) {
	var req Request
	if err := json.Unmarshal(raw, &req); err != nil {
		return Request{}, &ResponseError{Code: CodeParseError, Message: "parse error"}
	}
	if req.JSONRPC != "" && req.JSONRPC != jsonrpcVersion {
		// Tolerate missing jsonrpc but reject clearly-wrong versions.
		return Request{}, &ResponseError{Code: CodeInvalidRequest, Message: "unsupported jsonrpc version"}
	}
	if req.Method == "" {
		return Request{}, &ResponseError{Code: CodeInvalidRequest, Message: "missing method"}
	}
	return req, nil
}

// isNotification reports whether the method is a notification (no response).
func isNotification(method string) bool {
	return strings.HasPrefix(method, "notifications/")
}

// writeResponse marshals a single response object.
func writeResponse(r Response) ([]byte, error) {
	if r.JSONRPC == "" {
		r.JSONRPC = jsonrpcVersion
	}
	return json.Marshal(r)
}
