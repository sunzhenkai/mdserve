package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// HTTPHandler exposes the MCP server over the Streamable HTTP transport.
//
// It implements the minimal request/response contract:
//   - POST /mcp   → one JSON-RPC request, one JSON-RPC response.
//   - GET  /mcp   → opens an SSE stream (kept minimal: sends a single
//     "endpoint" event so strict clients complete the handshake; no server
//     notifications are produced by read-only tools).
//   - DELETE /mcp → acknowledges session termination (200, no body).
//
// Because every tool is stateless and reads the filesystem per-call, session
// IDs are accepted but not tracked — there is no per-session state to keep.
type HTTPHandler struct {
	server *Server
}

// NewHTTPHandler wraps an MCP server for Streamable HTTP serving.
func NewHTTPHandler(server *Server) *HTTPHandler {
	return &HTTPHandler{server: server}
}

// Register mounts the MCP HTTP endpoints on the given router group.
// The group's prefix should typically be "" and the routes "/mcp".
func (h *HTTPHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/mcp", h.handlePost)
	rg.GET("/mcp", h.handleSSE)
	rg.DELETE("/mcp", h.handleDelete)
}

const (
	// mcpContentType is the Streamable HTTP media type.
	mcpContentType = "application/json"
	// mcpSessionHeader is the session id header defined by the spec.
	mcpSessionHeader = "Mcp-Session-Id"
)

// handlePost processes a single JSON-RPC request (or batch) over HTTP POST.
func (h *HTTPHandler) handlePost(c *gin.Context) {
	if !strings.Contains(c.ContentType(), "json") {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "expected application/json"})
		return
	}

	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}
	if len(strings.TrimSpace(string(body))) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty body"})
		return
	}

	out, err := h.server.HandleBatch(c.Request.Context(), body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// A request that is purely notifications yields no response body → 202.
	if len(out) == 0 {
		c.Status(http.StatusAccepted)
		return
	}

	// On initialize, mint and return a session id so spec-compliant clients
	// can echo it back. We do not track it.
	if isInitializeRequest(body) {
		c.Header(mcpSessionHeader, newSessionID())
	}
	c.Data(http.StatusOK, mcpContentType, out)
}

// handleSSE opens a Server-Sent Events stream. Read-only tools never emit
// server-initiated notifications, so we keep this minimal: send the required
// "endpoint" announcement event and keep the connection open briefly so strict
// clients complete their handshake, then close.
func (h *HTTPHandler) handleSSE(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.Status(http.StatusInternalServerError)
		return
	}

	// Announce the POST endpoint for this session, per the Streamable HTTP spec.
	if _, err := fmt.Fprintf(c.Writer, "event: endpoint\ndata: /mcp\n\n"); err != nil {
		return
	}
	flusher.Flush()

	// Block until the client disconnects; read-only tools have nothing to push.
	<-c.Request.Context().Done()
}

// handleDelete terminates the session. No state is stored, so just acknowledge.
func (h *HTTPHandler) handleDelete(c *gin.Context) {
	c.Status(http.StatusOK)
}

// isInitializeRequest returns true if the (single-object) body is an
// initialize request. For batches this is best-effort (returns false).
func isInitializeRequest(body []byte) bool {
	var req Request
	if json.Unmarshal(body, &req) != nil {
		return false
	}
	return req.Method == MethodInitialize
}

// newSessionID mints an opaque session id. We use a stable, prefixed value
// rather than a random UUID because there is no per-session state to protect.
func newSessionID() string {
	return "mdserve-mcp"
}
