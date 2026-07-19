package mcp

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/wii/mdserve/internal/docs"
)

func newTestServer(t *testing.T) (*Server, string) {
	t.Helper()
	root := t.TempDir()
	// Seed a couple of documents.
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("# Home\n\nWelcome to mdserve."), 0o644); err != nil {
		t.Fatalf("write readme: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "guide"), 0o755); err != nil {
		t.Fatalf("mkdir guide: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "guide", "intro.md"), []byte("---\ntags: [intro, core]\n---\n# Intro\n\nA guide."), 0o644); err != nil {
		t.Fatalf("write intro: %v", err)
	}
	lib, err := docs.New(root, nil)
	if err != nil {
		t.Fatalf("docs.New: %v", err)
	}
	return NewServer(lib, "mdserve-test", "test"), root
}

// call invokes a JSON-RPC method and unmarshals the response.
func call(t *testing.T, s *Server, id, method string, params any) Response {
	t.Helper()
	var p json.RawMessage
	if params != nil {
		b, err := json.Marshal(params)
		if err != nil {
			t.Fatalf("marshal params: %v", err)
		}
		p = b
	}
	raw, _ := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"method":  method,
		"params":  paramsOrNil(p),
	})
	out, err := s.Handle(context.Background(), raw)
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	var resp Response
	if err := json.Unmarshal(out, &resp); err != nil {
		t.Fatalf("unmarshal resp: %v (raw=%s)", err, string(out))
	}
	return resp
}

func paramsOrNil(p json.RawMessage) any {
	if len(p) == 0 {
		return nil
	}
	var v any
	_ = json.Unmarshal(p, &v)
	return v
}

func TestInitialize(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "1", MethodInitialize, InitializeParams{ProtocolVersion: ProtocolVersion})
	if resp.Error != nil {
		t.Fatalf("initialize error: %v", resp.Error)
	}
	b, _ := json.Marshal(resp.Result)
	var init InitializeResult
	if err := json.Unmarshal(b, &init); err != nil {
		t.Fatalf("unmarshal init result: %v", err)
	}
	if init.ProtocolVersion != ProtocolVersion {
		t.Fatalf("protocolVersion = %q, want %q", init.ProtocolVersion, ProtocolVersion)
	}
	if init.ServerInfo.Name != "mdserve-test" {
		t.Fatalf("serverInfo.Name = %q", init.ServerInfo.Name)
	}
}

func TestToolsList(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "2", MethodToolsList, nil)
	if resp.Error != nil {
		t.Fatalf("tools/list error: %v", resp.Error)
	}
	b, _ := json.Marshal(resp.Result)
	var res ListToolsResult
	if err := json.Unmarshal(b, &res); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	names := map[string]bool{}
	for _, tool := range res.Tools {
		names[tool.Name] = true
	}
	for _, want := range []string{"list_docs", "read_doc", "search_docs", "get_outline", "list_tags"} {
		if !names[want] {
			t.Fatalf("missing tool %q in %v", want, names)
		}
	}
}

func TestToolsCall_ReadDoc(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "3", MethodToolsCall, CallToolParams{
		Name:      "read_doc",
		Arguments: map[string]any{"path": "guide/intro.md"},
	})
	if resp.Error != nil {
		t.Fatalf("read_doc error: %v", resp.Error)
	}
	b, _ := json.Marshal(resp.Result)
	var res CallToolResult
	if err := json.Unmarshal(b, &res); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if res.IsError {
		t.Fatalf("tool reported error")
	}
	if len(res.Content) != 1 || res.Content[0].Type != "text" {
		t.Fatalf("unexpected content: %+v", res.Content)
	}
	if !contains(res.Content[0].Text, "A guide.") {
		t.Fatalf("content missing body: %s", res.Content[0].Text)
	}
	if !contains(res.Content[0].Text, "intro") {
		t.Fatalf("content missing tags: %s", res.Content[0].Text)
	}
}

func TestToolsCall_SearchDocs(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "4", MethodToolsCall, CallToolParams{
		Name:      "search_docs",
		Arguments: map[string]any{"query": "welcome"},
	})
	if resp.Error != nil {
		t.Fatalf("search error: %v", resp.Error)
	}
	b, _ := json.Marshal(resp.Result)
	var res CallToolResult
	if err := json.Unmarshal(b, &res); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !contains(res.Content[0].Text, "README.md") {
		t.Fatalf("search did not find README.md: %s", res.Content[0].Text)
	}
}

func TestToolsCall_ListTags(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "5", MethodToolsCall, CallToolParams{Name: "list_tags"})
	if resp.Error != nil {
		t.Fatalf("list_tags error: %v", resp.Error)
	}
	b, _ := json.Marshal(resp.Result)
	var res CallToolResult
	if err := json.Unmarshal(b, &res); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !contains(res.Content[0].Text, "intro") || !contains(res.Content[0].Text, "core") {
		t.Fatalf("tags missing intro/core: %s", res.Content[0].Text)
	}
}

func TestToolsCall_GetOutline(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "6", MethodToolsCall, CallToolParams{
		Name:      "get_outline",
		Arguments: map[string]any{"path": "README.md"},
	})
	if resp.Error != nil {
		t.Fatalf("get_outline error: %v", resp.Error)
	}
	b, _ := json.Marshal(resp.Result)
	var res CallToolResult
	if err := json.Unmarshal(b, &res); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !contains(res.Content[0].Text, "Home") {
		t.Fatalf("outline missing Home: %s", res.Content[0].Text)
	}
}

func TestToolsCall_UnknownTool(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "7", MethodToolsCall, CallToolParams{Name: "nope"})
	if resp.Error == nil || resp.Error.Code != CodeMethodNotFound {
		t.Fatalf("expected method-not-found, got: %+v", resp.Error)
	}
}

func TestToolsCall_MissingRequiredArg(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "8", MethodToolsCall, CallToolParams{Name: "read_doc"})
	if resp.Error == nil || resp.Error.Code != CodeInvalidParams {
		t.Fatalf("expected invalid-params, got: %+v", resp.Error)
	}
}

func TestToolsCall_PathTraversalRejected(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "9", MethodToolsCall, CallToolParams{
		Name:      "read_doc",
		Arguments: map[string]any{"path": "../../../etc/passwd"},
	})
	b, _ := json.Marshal(resp.Result)
	var res CallToolResult
	if err := json.Unmarshal(b, &res); err != nil {
		// May also surface as JSON-RPC error; either way it must not leak /etc/passwd.
		if resp.Error == nil {
			t.Fatalf("expected error for traversal, got result: %s", string(b))
		}
		return
	}
	// If surfaced as a tool result, ensure it is an error and not file content.
	if !res.IsError {
		t.Fatalf("traversal returned success: %s", res.Content[0].Text)
	}
}

func TestNotificationsInitializedNoResponse(t *testing.T) {
	s, _ := newTestServer(t)
	raw := []byte(`{"jsonrpc":"2.0","method":"notifications/initialized"}`)
	out, err := s.Handle(context.Background(), raw)
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if out != nil {
		t.Fatalf("notification should produce no response, got: %s", string(out))
	}
}

func TestPing(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "10", MethodPing, nil)
	if resp.Error != nil {
		t.Fatalf("ping error: %v", resp.Error)
	}
}

func TestMethodNotFound(t *testing.T) {
	s, _ := newTestServer(t)
	resp := call(t, s, "11", "totally/made/up", nil)
	if resp.Error == nil || resp.Error.Code != CodeMethodNotFound {
		t.Fatalf("expected method-not-found, got: %+v", resp.Error)
	}
}

func TestParseError(t *testing.T) {
	s, _ := newTestServer(t)
	out, err := s.Handle(context.Background(), []byte("{not json"))
	if err != nil {
		t.Fatalf("Handle returned err on parse error: %v", err)
	}
	var resp Response
	if err := json.Unmarshal(out, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Error == nil || resp.Error.Code != CodeParseError {
		t.Fatalf("expected parse error, got: %+v", resp)
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= 0 && indexOf(haystack, needle) >= 0
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
