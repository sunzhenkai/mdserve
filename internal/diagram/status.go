package diagram

import (
	"fmt"
	"io"
	"strings"
)

// EngineStatus enumerates the Kroki availability states reported at startup.
type EngineStatus int

const (
	// StatusNotConfigured: diagrams.kroki.enabled is false (or absent).
	StatusNotConfigured EngineStatus = iota
	// StatusReachable: Kroki is enabled and the health probe succeeded.
	StatusReachable
	// StatusUnreachable: Kroki is enabled but the health probe failed.
	StatusUnreachable
)

// PrintEngineStatus writes a human-readable "diagram engines" summary to w.
// It always lists Mermaid (client-side) and then describes the Kroki state.
//
// The format mirrors the spec's startup-log scenarios so it can be asserted on.
func PrintEngineStatus(w io.Writer, status EngineStatus, krokiURL string) {
	var b strings.Builder
	b.WriteString("\n图表引擎:\n")
	b.WriteString("  ✓ mermaid (客户端渲染)\n")

	switch status {
	case StatusNotConfigured:
		b.WriteString("  ⚠ 未配置 Kroki，d2 / plantuml / graphviz 等将无法渲染\n")
		b.WriteString("    配置方法：在 .mdserve.yaml 添加 diagrams.kroki.url\n")
	case StatusReachable:
		b.WriteString(fmt.Sprintf("  ✓ %s via Kroki @ %s [已连接]\n",
			strings.Join(SupportedEnginesSorted(), " / "), krokiURL))
	case StatusUnreachable:
		b.WriteString(fmt.Sprintf("  ✗ Kroki 已配置但无法连接 @ %s\n", krokiURL))
		b.WriteString("    排查建议：docker ps | grep kroki  /  确认端口与地址正确\n")
	}

	fmt.Fprint(w, b.String())
}

// ProbeStatus performs the startup health probe and maps it to an EngineStatus.
// It is a thin wrapper so callers (main.go) don't depend on ping details.
// When krokiEnabled is false the probe is skipped entirely.
func ProbeStatus(krokiEnabled bool, krokiURL string) EngineStatus {
	if !krokiEnabled {
		return StatusNotConfigured
	}
	if PingURL(krokiURL) {
		return StatusReachable
	}
	return StatusUnreachable
}
