package diagram

import (
	"testing"
)

func TestNormalizeEngine_CanonicalEngines(t *testing.T) {
	for _, e := range SupportedEngines {
		got, ok := NormalizeEngine(e)
		if !ok {
			t.Errorf("engine %q should be supported", e)
		}
		if got != e {
			t.Errorf("NormalizeEngine(%q) = %q, want %q", e, got, e)
		}
	}
}

func TestNormalizeEngine_Aliases(t *testing.T) {
	cases := map[string]string{
		"dot":     "graphviz",
		"c4":      "structurizr",
		"c4model": "structurizr",
		"pu":      "plantuml",
		"puml":    "plantuml",
	}
	for alias, want := range cases {
		got, ok := NormalizeEngine(alias)
		if !ok {
			t.Errorf("alias %q should be supported", alias)
		}
		if got != want {
			t.Errorf("NormalizeEngine(%q) = %q, want %q", alias, got, want)
		}
	}
}

func TestNormalizeEngine_CaseInsensitive(t *testing.T) {
	cases := []string{"D2", "PlantUML", "DOT", "C4", "GRAPHVIZ", "Structurizr"}
	for _, in := range cases {
		if _, ok := NormalizeEngine(in); !ok {
			t.Errorf("NormalizeEngine(%q) = unsupported, want supported (case-insensitive)", in)
		}
	}
}

func TestNormalizeEngine_Unsupported(t *testing.T) {
	cases := []string{"", "unknown", "mermaid", "java", "python", "graphviz2"}
	for _, in := range cases {
		got, ok := NormalizeEngine(in)
		if ok {
			t.Errorf("NormalizeEngine(%q) = (%q, true), want unsupported", in, got)
		}
	}
}

func TestNormalizeEngine_MermaidNotKroki(t *testing.T) {
	// Mermaid is intentionally NOT on the Kroki whitelist — it renders client-side.
	if _, ok := NormalizeEngine("mermaid"); ok {
		t.Errorf("mermaid must not be a Kroki-supported engine")
	}
}

func TestSupportedEnginesSorted_IsStable(t *testing.T) {
	a := SupportedEnginesSorted()
	b := SupportedEnginesSorted()
	if len(a) != len(b) {
		t.Fatalf("length mismatch")
	}
	for i := range a {
		if a[i] != b[i] {
			t.Fatalf("sorted list not stable at index %d: %q vs %q", i, a[i], b[i])
		}
	}
	// Verify sorted ascending.
	for i := 1; i < len(a); i++ {
		if a[i-1] > a[i] {
			t.Errorf("list not sorted: %q before %q", a[i-1], a[i])
		}
	}
}

func TestSupportedEnginesSorted_DoesNotMutateSource(t *testing.T) {
	_ = SupportedEnginesSorted()
	// First element must still be d2 (original order preserved on source slice).
	if SupportedEngines[0] != "d2" {
		t.Errorf("SupportedEngines mutated; first = %q, want d2", SupportedEngines[0])
	}
}

func TestSupportedEngines_ContainsExpected(t *testing.T) {
	expected := map[string]bool{
		"d2": true, "plantuml": true, "structurizr": true, "graphviz": true,
		"excalidraw": true, "wavedrom": true, "nomnoml": true, "bytefield": true,
		"erd": true, "pikchr": true, "svgbob": true, "blockdiag": true,
		"actdiag": true, "seqdiag": true, "nwdiag": true,
	}
	got := map[string]bool{}
	for _, e := range SupportedEngines {
		got[e] = true
	}
	for e := range expected {
		if !got[e] {
			t.Errorf("whitelist missing engine %q", e)
		}
	}
}
