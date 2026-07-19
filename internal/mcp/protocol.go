package mcp

import "encoding/json"

// JSON-RPC 2.0 + MCP (Model Context Protocol) wire types for the minimal
// subset mdserve implements: initialize, notifications/initialized,
// tools/list, tools/call.
//
// Spec reference: https://spec.modelcontextprotocol.io (2025-06-18 revision).
// Only the structures we actually marshal/unmarshal are defined here.

const (
	// JSON-RPC protocol version (always "2.0").
	jsonrpcVersion = "2.0"
	// MCP protocol version advertised in initialize results.
	ProtocolVersion = "2025-06-18"
)

// JSON-RPC method names.
const (
	MethodInitialize  = "initialize"
	MethodInitialized = "notifications/initialized"
	MethodToolsList   = "tools/list"
	MethodToolsCall   = "tools/call"
	MethodPing        = "ping"
)

// Standard JSON-RPC error codes.
const (
	CodeParseError     = -32700
	CodeInvalidRequest = -32600
	CodeMethodNotFound = -32601
	CodeInvalidParams  = -32602
	CodeInternalError  = -32603
)

// Request is a JSON-RPC 2.0 request/notification. Notifications carry no ID.
type Request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// Response is a JSON-RPC 2.0 response (success or error).
type Response struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Result  any             `json:"result,omitempty"`
	Error   *ResponseError  `json:"error,omitempty"`
}

// ResponseError is the JSON-RPC error object.
type ResponseError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// InitializeParams is the params object for the initialize request.
type InitializeParams struct {
	ProtocolVersion string         `json:"protocolVersion"`
	Capabilities    map[string]any `json:"capabilities,omitempty"`
	ClientInfo      ClientInfo     `json:"clientInfo,omitempty"`
}

// InitializeResult is the result object returned from initialize.
type InitializeResult struct {
	ProtocolVersion string     `json:"protocolVersion"`
	Capabilities    ServerCaps `json:"capabilities"`
	ServerInfo      ServerInfo `json:"serverInfo"`
	Instructions    string     `json:"instructions,omitempty"`
}

// ClientInfo identifies the connecting client.
type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

// ServerInfo identifies this server.
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ServerCaps declares the server's capabilities.
type ServerCaps struct {
	Tools ToolsCapability `json:"tools"`
}

// ToolsCapability declares tool support.
type ToolsCapability struct {
	ListChanged bool `json:"listChanged,omitempty"`
}

// Tool describes a single tool exposed to the client.
type Tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema"`
}

// ListToolsResult is the result of tools/list.
type ListToolsResult struct {
	Tools      []Tool `json:"tools"`
	NextCursor string `json:"nextCursor,omitempty"`
}

// CallToolParams is the params object for tools/call.
type CallToolParams struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments,omitempty"`
}

// CallToolResult is the result of tools/call. MCP returns content blocks; we
// only emit text blocks (our tools are text-oriented).
type CallToolResult struct {
	Content []ContentBlock `json:"content"`
	// IsError marks a tool-level error (distinct from a JSON-RPC error). When
	// true the Content describes the failure; the transport still returns 200.
	IsError bool `json:"isError,omitempty"`
}

// ContentBlock is a single MCP content block. Only "text" is used here.
type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// TextContent is a convenience constructor for a text content block.
func TextContent(text string) ContentBlock {
	return ContentBlock{Type: "text", Text: text}
}
