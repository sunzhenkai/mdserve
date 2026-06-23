package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/wii/mdserve/internal/diagram"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newTestRouter wires a DiagramHandler with the given deps onto a fresh gin engine.
func newTestRouter(t *testing.T, deps DiagramDeps) *gin.Engine {
	t.Helper()
	r := gin.New()
	h := NewDiagramHandler(deps)
	h.Register(r.Group("/api"))
	return r
}

func doDiagram(t *testing.T, r *gin.Engine, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/diagram", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func mustJSONBody(engine, code string) string {
	b, _ := json.Marshal(map[string]string{"engine": engine, "code": code})
	return string(b)
}

// mockKroki builds a test Kroki server with per-engine behavior.
func mockKroki(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(handler))
}

func TestDiagramHandler_Success(t *testing.T) {
	const svg = "<svg>rendered</svg>"
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/d2/svg" {
			t.Errorf("kroki path = %s, want /d2/svg", r.URL.Path)
		}
		w.Header().Set("Content-Type", "image/svg+xml")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(svg))
	})
	defer kroki.Close()

	cache := diagram.NewCache(t.TempDir(), 1)
	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 5*time.Second),
		Cache:   cache,
	})

	w := doDiagram(t, r, mustJSONBody("d2", "A -> B"))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if ct := w.Header().Get("Content-Type"); ct != "image/svg+xml" {
		t.Errorf("Content-Type = %q, want image/svg+xml", ct)
	}
	if w.Body.String() != svg {
		t.Errorf("body = %q, want %q", w.Body.String(), svg)
	}
}

func TestDiagramHandler_AliasNormalizedBeforeKroki(t *testing.T) {
	var hitPath string
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		hitPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<svg/>"))
	})
	defer kroki.Close()

	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 5*time.Second),
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})

	w := doDiagram(t, r, mustJSONBody("dot", "digraph{}"))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if hitPath != "/graphviz/svg" {
		t.Errorf("kroki called at %q, want /graphviz/svg (alias dot→graphviz)", hitPath)
	}
}

func TestDiagramHandler_UnsupportedEngine_400(t *testing.T) {
	krokiCalled := false
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		krokiCalled = true
		w.WriteHeader(http.StatusOK)
	})
	defer kroki.Close()

	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 5*time.Second),
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})

	w := doDiagram(t, r, mustJSONBody("unknowndsl", "x"))
	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
	if krokiCalled {
		t.Errorf("Kroki must NOT be called for unsupported engine")
	}
	var resp diagram.Error
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid error json: %v", err)
	}
	if resp.Kind != diagram.ErrUnsupported {
		t.Errorf("error = %s, want %s", resp.Kind, diagram.ErrUnsupported)
	}
	if len(resp.Supported) == 0 {
		t.Errorf("supported engines list must be populated")
	}
}

func TestDiagramHandler_RenderFailed_422(t *testing.T) {
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("syntax error at line 2"))
	})
	defer kroki.Close()

	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 5*time.Second),
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})

	w := doDiagram(t, r, mustJSONBody("plantuml", "broken"))
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422", w.Code)
	}
	var resp diagram.Error
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Kind != diagram.ErrRenderFailed {
		t.Errorf("error = %s, want %s", resp.Kind, diagram.ErrRenderFailed)
	}
	if resp.Message != "syntax error at line 2" {
		t.Errorf("message = %q", resp.Message)
	}
}

func TestDiagramHandler_ServiceUnavailable_503(t *testing.T) {
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {})
	kroki.Close() // force connection refused

	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 2*time.Second),
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})

	w := doDiagram(t, r, mustJSONBody("d2", "x"))
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", w.Code)
	}
	var resp diagram.Error
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Kind != diagram.ErrServiceUnavailable {
		t.Errorf("error = %s, want %s", resp.Kind, diagram.ErrServiceUnavailable)
	}
}

func TestDiagramHandler_Timeout_504(t *testing.T) {
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(300 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})
	defer kroki.Close()

	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 50*time.Millisecond),
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})

	w := doDiagram(t, r, mustJSONBody("d2", "x"))
	if w.Code != http.StatusGatewayTimeout {
		t.Errorf("status = %d, want 504", w.Code)
	}
	var resp diagram.Error
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Kind != diagram.ErrServiceTimeout {
		t.Errorf("error = %s, want %s", resp.Kind, diagram.ErrServiceTimeout)
	}
}

func TestDiagramHandler_DisabledKroki_503_NotConfigured(t *testing.T) {
	// No Kroki server at all; deps disabled.
	r := newTestRouter(t, DiagramDeps{
		Enabled: false,
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})
	w := doDiagram(t, r, mustJSONBody("d2", "x"))
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", w.Code)
	}
	var resp diagram.Error
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Kind != diagram.ErrServiceUnavailable {
		t.Errorf("error = %s, want %s", resp.Kind, diagram.ErrServiceUnavailable)
	}
}

func TestDiagramHandler_CacheHit_SkipsKroki(t *testing.T) {
	krokiCalls := 0
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		krokiCalls++
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<svg>kroki</svg>"))
	})
	defer kroki.Close()

	cache := diagram.NewCache(t.TempDir(), 1)
	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 5*time.Second),
		Cache:   cache,
	})

	// First call → hits Kroki, writes cache.
	w1 := doDiagram(t, r, mustJSONBody("d2", "A -> B"))
	if w1.Code != http.StatusOK || w1.Body.String() != "<svg>kroki</svg>" {
		t.Fatalf("first call: status=%d body=%q", w1.Code, w1.Body.String())
	}

	// Second call → must hit cache, NOT call Kroki again.
	w2 := doDiagram(t, r, mustJSONBody("d2", "A -> B"))
	if w2.Code != http.StatusOK {
		t.Fatalf("second call status=%d", w2.Code)
	}
	if w2.Body.String() != "<svg>kroki</svg>" {
		t.Errorf("cached body = %q", w2.Body.String())
	}
	if krokiCalls != 1 {
		t.Errorf("Kroki called %d times, want 1 (cache should serve 2nd)", krokiCalls)
	}
}

func TestDiagramHandler_RequestBodyLimit(t *testing.T) {
	kroki := mockKroki(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	defer kroki.Close()

	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Client:  diagram.NewKrokiClient(kroki.URL, 5*time.Second),
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})

	// Build a payload > 1 MiB.
	huge := string(make([]byte, maxDiagramBodyBytes+1024))
	body, _ := json.Marshal(map[string]string{"engine": "d2", "code": huge})
	w := doDiagram(t, r, string(body))
	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 for oversized body", w.Code)
	}
}

func TestDiagramHandler_InvalidJSON_400(t *testing.T) {
	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})
	w := doDiagram(t, r, "{not json")
	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestDiagramHandler_NoRequestBody_400(t *testing.T) {
	r := newTestRouter(t, DiagramDeps{
		Enabled: true,
		Cache:   diagram.NewCache(t.TempDir(), 1),
	})
	req := httptest.NewRequest(http.MethodPost, "/api/diagram", bytes.NewBufferString(""))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 for empty body", w.Code)
	}
}
