package diagram

import (
	"strings"
	"testing"
)

func TestPrintEngineStatus_NotConfigured(t *testing.T) {
	var b strings.Builder
	PrintEngineStatus(&b, StatusNotConfigured, "")

	out := b.String()
	for _, want := range []string{"图表引擎", "✓ mermaid", "未配置 Kroki", "diagrams.kroki.url"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q\ngot:\n%s", want, out)
		}
	}
	if strings.Contains(out, "via Kroki") {
		t.Errorf("not-configured output should not mention Kroki engines")
	}
}

func TestPrintEngineStatus_Reachable(t *testing.T) {
	var b strings.Builder
	PrintEngineStatus(&b, StatusReachable, "http://localhost:8000")

	out := b.String()
	for _, want := range []string{"✓ mermaid", "via Kroki @ http://localhost:8000", "[已连接]", "d2", "plantuml", "graphviz"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q\ngot:\n%s", want, out)
		}
	}
	if strings.Contains(out, "未配置") || strings.Contains(out, "无法连接") {
		t.Errorf("reachable output should not show warning/error states")
	}
}

func TestPrintEngineStatus_Unreachable(t *testing.T) {
	var b strings.Builder
	PrintEngineStatus(&b, StatusUnreachable, "http://localhost:8000")

	out := b.String()
	for _, want := range []string{"✓ mermaid", "✗ Kroki 已配置但无法连接", "http://localhost:8000", "docker ps"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q\ngot:\n%s", want, out)
		}
	}
	if strings.Contains(out, "[已连接]") {
		t.Errorf("unreachable output should not claim connected")
	}
}

func TestProbeStatus_NotConfiguredWhenDisabled(t *testing.T) {
	if got := ProbeStatus(false, "http://localhost:8000"); got != StatusNotConfigured {
		t.Errorf("ProbeStatus(false,...) = %v, want %v", got, StatusNotConfigured)
	}
}
