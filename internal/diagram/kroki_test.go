package diagram

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// helper: build a KrokiClient pointing at a mock server.
func newTestClient(t *testing.T, server *httptest.Server, timeout time.Duration) *KrokiClient {
	t.Helper()
	return NewKrokiClient(server.URL, timeout)
}

func TestKrokiClient_Render_Success(t *testing.T) {
	const svg = "<svg>ok</svg>"
	mux := http.NewServeMux()
	mux.HandleFunc("/graphviz/svg", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		w.Header().Set("Content-Type", "image/svg+xml")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(svg))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := newTestClient(t, server, 5*time.Second)
	got, err := client.Render(context.Background(), "graphviz", "digraph{A->B}")
	if err != nil {
		t.Fatalf("Render returned error: %v", err)
	}
	if got != svg {
		t.Errorf("Render = %q, want %q", got, svg)
	}
}

func TestKrokiClient_Render_RendersRawBody(t *testing.T) {
	var received string
	mux := http.NewServeMux()
	mux.HandleFunc("/d2/svg", func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 64)
		n, _ := r.Body.Read(buf)
		received = string(buf[:n])
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<svg/>"))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := newTestClient(t, server, 5*time.Second)
	if _, err := client.Render(context.Background(), "d2", "A -> B"); err != nil {
		t.Fatalf("Render error: %v", err)
	}
	if received != "A -> B" {
		t.Errorf("raw body received by Kroki = %q, want %q", received, "A -> B")
	}
}

func TestKrokiClient_Render_4xx_RenderFailed(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/plantuml/svg", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("syntax error at line 3"))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := newTestClient(t, server, 5*time.Second)
	_, err := client.Render(context.Background(), "plantuml", "broken")
	de, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T (%v)", err, err)
	}
	if de.Kind != ErrRenderFailed {
		t.Errorf("Kind = %s, want %s", de.Kind, ErrRenderFailed)
	}
	if de.Engine != "plantuml" {
		t.Errorf("Engine = %q, want plantuml", de.Engine)
	}
	if !strings.Contains(de.Message, "syntax error at line 3") {
		t.Errorf("Message = %q, want to contain kroki message", de.Message)
	}
}

func TestKrokiClient_Render_5xx_ServiceUnavailable(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/d2/svg", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("kroki blew up"))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := newTestClient(t, server, 5*time.Second)
	_, err := client.Render(context.Background(), "d2", "x")
	de, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T (%v)", err, err)
	}
	if de.Kind != ErrServiceUnavailable {
		t.Errorf("Kind = %s, want %s", de.Kind, ErrServiceUnavailable)
	}
}

func TestKrokiClient_Render_ConnectionRefused_ServiceUnavailable(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	server.Close() // close immediately → connection refused

	client := newTestClient(t, server, 2*time.Second)
	_, err := client.Render(context.Background(), "d2", "x")
	de, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T (%v)", err, err)
	}
	if de.Kind != ErrServiceUnavailable {
		t.Errorf("Kind = %s, want %s", de.Kind, ErrServiceUnavailable)
	}
	if !strings.Contains(de.URL, "http://127.0.0.1") && de.URL == "" {
		t.Errorf("URL should be populated, got %q", de.URL)
	}
}

func TestKrokiClient_Render_Timeout_ServiceTimeout(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/d2/svg", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(300 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	// Very short client timeout so the call times out.
	client := newTestClient(t, server, 50*time.Millisecond)
	_, err := client.Render(context.Background(), "d2", "x")
	de, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T (%v)", err, err)
	}
	if de.Kind != ErrServiceTimeout {
		t.Errorf("Kind = %s, want %s", de.Kind, ErrServiceTimeout)
	}
}

func TestKrokiClient_Render_ContextTimeout_ServiceTimeout(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/d2/svg", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	// Long client timeout but short context deadline.
	client := newTestClient(t, server, 5*time.Second)
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := client.Render(ctx, "d2", "x")
	de, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T (%v)", err, err)
	}
	if de.Kind != ErrServiceTimeout {
		t.Errorf("Kind = %s, want %s", de.Kind, ErrServiceTimeout)
	}
}

func TestPingURL_Reachable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	if !PingURL(server.URL) {
		t.Errorf("PingURL(%q) = false, want true", server.URL)
	}
}

func TestPingURL_Unreachable(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	server.Close()
	if PingURL(server.URL) {
		t.Errorf("PingURL on closed server = true, want false")
	}
}

func TestPingURL_TimesOutQuickly(t *testing.T) {
	start := time.Now()
	// A non-routable address ensures we hit the timeout rather than a refusal.
	// Use a TCP address that won't respond; 192.0.2.1 is TEST-NET-1 (RFC 5737).
	PingURL("http://192.0.2.1:1/")
	elapsed := time.Since(start)
	if elapsed > 1500*time.Millisecond {
		t.Errorf("PingURL took %v, want under ~1s timeout", elapsed)
	}
}

func TestKrokiClient_Ping(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	client := NewKrokiClient(server.URL, 5*time.Second)
	if !client.Ping() {
		t.Errorf("Ping() = false, want true")
	}
}
