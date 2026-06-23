// Package api houses HTTP handlers that are optional layers above the core
// file server. The diagram handler proxies render requests to a self-hosted
// Kroki instance with on-disk caching.
package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/wii/mdserve/internal/diagram"
)

// maxDiagramBodyBytes caps request bodies to protect against accidental or
// malicious oversized payloads (1 MiB is ample for any reasonable diagram).
const maxDiagramBodyBytes = 1 << 20

// DiagramDeps bundles the collaborators a DiagramHandler needs.
type DiagramDeps struct {
	// Enabled reports whether Kroki is configured. When false the handler
	// still validates engines but refuses to call Kroki.
	Enabled bool
	// Client is the Kroki HTTP client (may be nil when Enabled is false).
	Client *diagram.KrokiClient
	// Cache stores rendered SVGs (may be nil when Enabled is false).
	Cache *diagram.Cache
}

// DiagramHandler implements POST /api/diagram.
type DiagramHandler struct {
	deps DiagramDeps
}

// NewDiagramHandler builds a handler from the given dependencies.
func NewDiagramHandler(deps DiagramDeps) *DiagramHandler {
	return &DiagramHandler{deps: deps}
}

// diagramRequest is the JSON body for POST /api/diagram.
type diagramRequest struct {
	Engine string `json:"engine"`
	Code   string `json:"code"`
}

// Register attaches the diagram routes to the given router group.
func (h *DiagramHandler) Register(rg gin.IRoutes) {
	rg.POST("/diagram", h.handleRender)
}

// handleRender implements the full request flow described in the spec:
//
//	parse body (1 MiB cap) → normalize alias → whitelist check →
//	cache hit? → call Kroki → write cache → return SVG
func (h *DiagramHandler) handleRender(c *gin.Context) {
	// 1. Bound & parse body.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxDiagramBodyBytes)
	var req diagramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeDiagramError(c, http.StatusBadRequest, &diagram.Error{
			Kind:    "render_failed",
			Message: "invalid request body: " + err.Error(),
		})
		return
	}

	// 2. Normalize alias + whitelist check.
	engine, supported := diagram.NormalizeEngine(req.Engine)
	if !supported {
		writeDiagramError(c, http.StatusBadRequest, diagram.NewUnsupportedError(req.Engine, diagram.SupportedEnginesSorted()))
		return
	}

	// 3. Cache hit short-circuits (only when caching is configured).
	if h.deps.Cache != nil {
		if svg, hit, err := h.deps.Cache.Get(engine, req.Code); err == nil && hit {
			c.Data(http.StatusOK, "image/svg+xml", []byte(svg))
			return
		}
	}

	// 4. Kroki must be enabled to render a miss.
	if !h.deps.Enabled || h.deps.Client == nil {
		writeDiagramError(c, http.StatusServiceUnavailable, &diagram.Error{
			Kind:    diagram.ErrServiceUnavailable,
			Message: "Kroki 未配置，请在 .mdserve.yaml 中启用 diagrams.kroki",
		})
		return
	}

	// 5. Call Kroki.
	svg, err := h.deps.Client.Render(c.Request.Context(), engine, req.Code)
	if err != nil {
		writeDiagramRenderError(c, err)
		return
	}

	// 6. Write cache (best-effort; a write failure must not fail the request).
	if h.deps.Cache != nil {
		_ = h.deps.Cache.Set(engine, req.Code, svg)
	}

	// 7. Return SVG.
	c.Data(http.StatusOK, "image/svg+xml", []byte(svg))
}

// writeDiagramError serializes a diagram.Error with the given HTTP status.
func writeDiagramError(c *gin.Context, status int, de *diagram.Error) {
	c.JSON(status, de)
}

// writeDiagramRenderError maps an *diagram.Error returned by the Kroki client
// to the appropriate HTTP status code.
func writeDiagramRenderError(c *gin.Context, err error) {
	de, ok := err.(*diagram.Error)
	if !ok {
		writeDiagramError(c, http.StatusServiceUnavailable, &diagram.Error{
			Kind:    diagram.ErrServiceUnavailable,
			Message: err.Error(),
		})
		return
	}
	status := http.StatusServiceUnavailable
	switch de.Kind {
	case diagram.ErrRenderFailed:
		status = http.StatusUnprocessableEntity // 422
	case diagram.ErrServiceUnavailable:
		status = http.StatusServiceUnavailable // 503
	case diagram.ErrServiceTimeout:
		status = http.StatusGatewayTimeout // 504
	}
	writeDiagramError(c, status, de)
}
