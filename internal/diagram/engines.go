package diagram

import (
	"sort"
	"strings"
)

// SupportedEngines is the conservative whitelist of Kroki engines mdserve
// proxies. Anything not in this set (after alias normalization) is rejected
// with an unsupported_engine error before contacting Kroki.
//
// Source: https://kroki.io (common, broadly-available engines only).
var SupportedEngines = []string{
	"d2",
	"plantuml",
	"structurizr",
	"graphviz",
	"excalidraw",
	"wavedrom",
	"nomnoml",
	"bytefield",
	"erd",
	"pikchr",
	"svgbob",
	"blockdiag",
	"actdiag",
	"seqdiag",
	"nwdiag",
}

// engineAliases maps user-facing language tags (e.g. fenced code block labels)
// to canonical Kroki engine names.
var engineAliases = map[string]string{
	"dot":     "graphviz",
	"c4":      "structurizr",
	"c4model": "structurizr",
	"pu":      "plantuml",
	"puml":    "plantuml",
}

// supportedSet powers O(1) whitelist membership checks.
var supportedSet = func() map[string]bool {
	m := make(map[string]bool, len(SupportedEngines))
	for _, e := range SupportedEngines {
		m[e] = true
	}
	return m
}()

// NormalizeEngine converts a user-provided language tag into its canonical
// Kroki engine name (applying aliases). The returned boolean reports whether
// the (normalized) engine is on the whitelist. Lookup is case-insensitive.
func NormalizeEngine(lang string) (engine string, supported bool) {
	if lang == "" {
		return "", false
	}
	lang = strings.ToLower(lang)
	// Lookup is case-insensitive; lowercase matches alias table & whitelist.
	if canonical, ok := engineAliases[lang]; ok {
		lang = canonical
	}
	return lang, supportedSet[lang]
}

// SupportedEnginesSorted returns a stable, sorted copy of the whitelist for
// inclusion in error responses and logs.
func SupportedEnginesSorted() []string {
	out := make([]string, len(SupportedEngines))
	copy(out, SupportedEngines)
	sort.Strings(out)
	return out
}
