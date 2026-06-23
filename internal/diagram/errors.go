package diagram

import (
	"fmt"
	"strings"
)

// ErrorKind classifies diagram rendering failures for differentiated client UX.
type ErrorKind string

const (
	// ErrUnsupported is returned when the requested engine is not in the whitelist.
	// Maps to HTTP 400.
	ErrUnsupported ErrorKind = "unsupported_engine"
	// ErrRenderFailed is returned when Kroki responds 4xx indicating a DSL syntax
	// or rendering error. Maps to HTTP 422.
	ErrRenderFailed ErrorKind = "render_failed"
	// ErrServiceUnavailable is returned when the Kroki endpoint cannot be reached
	// (TCP connection refused, DNS failure, etc.). Maps to HTTP 503.
	ErrServiceUnavailable ErrorKind = "service_unavailable"
	// ErrServiceTimeout is returned when Kroki does not respond within the
	// configured timeout. Maps to HTTP 504.
	ErrServiceTimeout ErrorKind = "service_timeout"
)

// Error is the structured diagram error returned by the rendering pipeline.
// It is serialized to JSON for the API error response.
type Error struct {
	Kind      ErrorKind `json:"error"`
	Engine    string    `json:"engine,omitempty"`
	Message   string    `json:"message,omitempty"`
	URL       string    `json:"url,omitempty"`
	Supported []string  `json:"supported,omitempty"`
}

func (e *Error) Error() string {
	var b strings.Builder
	b.WriteString(string(e.Kind))
	if e.Engine != "" {
		fmt.Fprintf(&b, " (engine=%s)", e.Engine)
	}
	if e.Message != "" {
		fmt.Fprintf(&b, ": %s", e.Message)
	}
	if e.URL != "" {
		fmt.Fprintf(&b, " [url=%s]", e.URL)
	}
	return b.String()
}

// NewUnsupportedError builds an error listing all supported engines.
func NewUnsupportedError(engine string, supported []string) *Error {
	return &Error{
		Kind:      ErrUnsupported,
		Engine:    engine,
		Supported: supported,
	}
}

// NewRenderFailedError wraps a Kroki 4xx response body.
func NewRenderFailedError(engine, message string) *Error {
	return &Error{
		Kind:    ErrRenderFailed,
		Engine:  engine,
		Message: message,
	}
}

// NewServiceUnavailableError indicates the Kroki endpoint is unreachable.
func NewServiceUnavailableError(url, message string) *Error {
	return &Error{
		Kind:    ErrServiceUnavailable,
		URL:     url,
		Message: message,
	}
}

// NewServiceTimeoutError indicates the Kroki call exceeded the timeout.
func NewServiceTimeoutError(url string) *Error {
	return &Error{
		Kind: ErrServiceTimeout,
		URL:  url,
	}
}
