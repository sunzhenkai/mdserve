package diagram

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// KrokiClient calls a self-hosted Kroki instance to render diagram DSL into SVG.
// It reuses an HTTP client with connection pooling for performance.
type KrokiClient struct {
	baseURL string
	client  *http.Client
}

// NewKrokiClient builds a client targeting the given Kroki root URL (e.g.
// "http://localhost:8000"). The render timeout governs individual render calls.
func NewKrokiClient(baseURL string, timeout time.Duration) *KrokiClient {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	// Reuse a single client to leverage keep-alive connection pooling.
	return &KrokiClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// Render calls `POST {baseURL}/{engine}/svg` with the source code as the raw
// request body. On success it returns the SVG text. On failure it returns an
// *Error classified by cause (render_failed / service_unavailable / service_timeout).
func (k *KrokiClient) Render(ctx context.Context, engine, code string) (string, error) {
	endpoint, err := k.engineURL(engine)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(code))
	if err != nil {
		return "", NewServiceUnavailableError(k.baseURL, fmt.Sprintf("failed to build request: %v", err))
	}
	req.Header.Set("Content-Type", "text/plain; charset=utf-8")

	resp, err := k.client.Do(req)
	if err != nil {
		// Distinguish timeout from generic network failures.
		if isTimeout(ctx, err) {
			return "", NewServiceTimeoutError(k.baseURL)
		}
		return "", NewServiceUnavailableError(k.baseURL, err.Error())
	}
	defer resp.Body.Close()

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return "", NewRenderFailedError(engine, fmt.Sprintf("failed to read Kroki response: %v", readErr))
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return string(body), nil
	}

	// Any 4xx from Kroki is treated as a DSL / rendering failure (per spec).
	if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		return "", NewRenderFailedError(engine, strings.TrimSpace(string(body)))
	}

	// 5xx or unexpected: surface as service unavailable.
	return "", NewServiceUnavailableError(k.baseURL, fmt.Sprintf("kroki returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(body))))
}

// Ping performs a lightweight health check against the Kroki root endpoint.
// It uses an independent 1-second timeout so it never blocks the caller and
// returns true only when Kroki responds with a 2xx status.
func (k *KrokiClient) Ping() bool {
	return PingURL(k.baseURL)
}

// engineURL builds `{baseURL}/{engine}/svg` with the engine path-safe.
func (k *KrokiClient) engineURL(engine string) (string, error) {
	u, err := url.Parse(k.baseURL)
	if err != nil {
		return "", NewServiceUnavailableError(k.baseURL, fmt.Sprintf("invalid base url: %v", err))
	}
	u.Path = strings.TrimRight(u.Path, "/") + "/" + url.PathEscape(engine) + "/svg"
	return u.String(), nil
}

// isTimeout reports whether err represents a deadline cancellation/timeout.
func isTimeout(ctx context.Context, err error) bool {
	if ctx != nil && ctx.Err() == context.DeadlineExceeded {
		return true
	}
	if err == nil {
		return false
	}
	// http.Client returns a *url.Error wrapping context.DeadlineExceeded or
	// a net.Error with Timeout() == true on its own timeout.
	if ne, ok := err.(interface{ Timeout() bool }); ok && ne.Timeout() {
		return true
	}
	return strings.Contains(err.Error(), "context deadline exceeded") || strings.Contains(err.Error(), "timeout")
}

// PingURL performs a 1-second health check GET against the given URL root.
// Returns true only when the endpoint responds 2xx within the deadline.
func PingURL(rawURL string) bool {
	pingClient := &http.Client{Timeout: time.Second}
	resp, err := pingClient.Get(rawURL)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	_ = resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 400
}
