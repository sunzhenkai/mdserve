package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writeTempConfig(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, ".mdserve.yaml")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write temp config: %v", err)
	}
	return path
}

func TestDefaultConfig_KrokiDefaults(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.Diagrams.Kroki.Enabled {
		t.Errorf("default Kroki.Enabled = true, want false")
	}
	if cfg.Diagrams.Kroki.Timeout != 10*time.Second {
		t.Errorf("default Kroki.Timeout = %v, want 10s", cfg.Diagrams.Kroki.Timeout)
	}
	if cfg.Diagrams.Kroki.CacheVersion != 1 {
		t.Errorf("default Kroki.CacheVersion = %d, want 1", cfg.Diagrams.Kroki.CacheVersion)
	}
	if cfg.Diagrams.Kroki.URL != "" {
		t.Errorf("default Kroki.URL = %q, want empty", cfg.Diagrams.Kroki.URL)
	}
}

func TestLoad_KrokiEnabledWithURL(t *testing.T) {
	path := writeTempConfig(t, `
docs:
  path: "."
diagrams:
  kroki:
    enabled: true
    url: "http://localhost:8000"
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if !cfg.Diagrams.Kroki.Enabled {
		t.Errorf("Kroki.Enabled = false, want true")
	}
	if cfg.Diagrams.Kroki.URL != "http://localhost:8000" {
		t.Errorf("Kroki.URL = %q, want http://localhost:8000", cfg.Diagrams.Kroki.URL)
	}
	// Defaults preserved for unset fields
	if cfg.Diagrams.Kroki.Timeout != 10*time.Second {
		t.Errorf("Kroki.Timeout = %v, want 10s (default)", cfg.Diagrams.Kroki.Timeout)
	}
	if cfg.Diagrams.Kroki.CacheVersion != 1 {
		t.Errorf("Kroki.CacheVersion = %d, want 1 (default)", cfg.Diagrams.Kroki.CacheVersion)
	}
}

func TestLoad_KrokiCustomValues(t *testing.T) {
	path := writeTempConfig(t, `
docs:
  path: "."
diagrams:
  kroki:
    enabled: true
    url: "http://kroki.example:9999"
    timeout: "30s"
    cache_version: 5
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if cfg.Diagrams.Kroki.Timeout != 30*time.Second {
		t.Errorf("Kroki.Timeout = %v, want 30s", cfg.Diagrams.Kroki.Timeout)
	}
	if cfg.Diagrams.Kroki.CacheVersion != 5 {
		t.Errorf("Kroki.CacheVersion = %d, want 5", cfg.Diagrams.Kroki.CacheVersion)
	}
}

func TestLoad_EmptyConfig_KeepsKrokiDefaults(t *testing.T) {
	path := writeTempConfig(t, `
docs:
  path: "."
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if cfg.Diagrams.Kroki.Enabled {
		t.Errorf("Kroki.Enabled = true, want false (default)")
	}
	if cfg.Diagrams.Kroki.Timeout != 10*time.Second {
		t.Errorf("Kroki.Timeout = %v, want 10s (default)", cfg.Diagrams.Kroki.Timeout)
	}
}

func TestValidate_EnabledButNoURL_Error(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Docs.Path = "."
	cfg.Diagrams.Kroki.Enabled = true
	cfg.Diagrams.Kroki.URL = ""
	err := cfg.Validate()
	if err == nil {
		t.Fatalf("Validate should return error when Kroki enabled without URL")
	}
}

func TestValidate_EnabledWithURL_OK(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Docs.Path = "."
	cfg.Diagrams.Kroki.Enabled = true
	cfg.Diagrams.Kroki.URL = "http://localhost:8000"
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate returned unexpected error: %v", err)
	}
}

func TestValidate_DisabledNoURL_OK(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Docs.Path = "."
	// Kroki disabled, no URL — should be valid
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate returned unexpected error: %v", err)
	}
}

func TestLoad_InvalidYAML_Error(t *testing.T) {
	path := writeTempConfig(t, `
docs:
  path: "."
diagrams:
  kroki:
    enabled: "not-a-bool"
`)
	_, err := Load(path)
	if err == nil {
		t.Fatalf("Load should return error for invalid YAML")
	}
}
