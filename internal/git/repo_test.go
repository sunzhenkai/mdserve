package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestIsGitRepo(t *testing.T) {
	if !IsGitRepo(".") {
		t.Fatal("expected current repository to be detected as git repo")
	}

	dir := t.TempDir()
	if IsGitRepo(dir) {
		t.Fatal("expected empty directory to not be a git repo")
	}

	cmd := exec.Command("git", "init")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("git init failed: %v", err)
	}

	if !IsGitRepo(dir) {
		t.Fatal("expected initialized directory to be a git repo")
	}
}

func TestGitEnv_SetsTerminalPrompt(t *testing.T) {
	env := gitEnv()
	found := false
	for _, e := range env {
		if e == "GIT_TERMINAL_PROMPT=0" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected GIT_TERMINAL_PROMPT=0 in git environment")
	}
}

func TestAppendEnvIfMissing(t *testing.T) {
	env := appendEnvIfMissing([]string{"HOME=/tmp"}, "GIT_TERMINAL_PROMPT", "0")
	if len(env) != 2 {
		t.Fatalf("expected 2 env entries, got %d", len(env))
	}

	env = appendEnvIfMissing([]string{"GIT_TERMINAL_PROMPT=1"}, "GIT_TERMINAL_PROMPT", "0")
	if env[0] != "GIT_TERMINAL_PROMPT=1" {
		t.Fatalf("expected existing GIT_TERMINAL_PROMPT to be preserved, got %q", env[0])
	}
}

func TestDirState(t *testing.T) {
	dir := t.TempDir()

	exists, empty := dirState(dir)
	if !exists || !empty {
		t.Fatalf("expected empty directory, got exists=%v empty=%v", exists, empty)
	}

	if err := os.WriteFile(filepath.Join(dir, "note.md"), []byte("x"), 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	exists, empty = dirState(dir)
	if !exists || empty {
		t.Fatalf("expected non-empty directory, got exists=%v empty=%v", exists, empty)
	}

	missing, missingEmpty := dirState(filepath.Join(dir, "missing"))
	if missing || !missingEmpty {
		t.Fatalf("expected missing directory, got exists=%v empty=%v", missing, missingEmpty)
	}
}

func TestEnsureRepo_NoURL_NotReady(t *testing.T) {
	dir := t.TempDir()
	ready, err := EnsureRepo(SyncOptions{Path: dir})
	if err != nil {
		t.Fatalf("EnsureRepo returned error: %v", err)
	}
	if ready {
		t.Fatal("expected ready=false when path is not a git repo and url is empty")
	}
}

func TestEnsureRepo_ExistingRepoReady(t *testing.T) {
	dir := t.TempDir()
	cmd := exec.Command("git", "init")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("git init failed: %v", err)
	}

	ready, err := EnsureRepo(SyncOptions{Path: dir, URL: "git@github.com:example/repo.git"})
	if err != nil {
		t.Fatalf("EnsureRepo returned error: %v", err)
	}
	if !ready {
		t.Fatal("expected ready=true for existing git repo")
	}
}

func TestEnsureRepo_NonEmptyNonRepoErrors(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("docs"), 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	ready, err := EnsureRepo(SyncOptions{
		Path: dir,
		URL:  "git@github.com:example/private-docs.git",
	})
	if err == nil {
		t.Fatal("expected error when directory exists but is not a git repo")
	}
	if ready {
		t.Fatal("expected ready=false")
	}
	if !strings.Contains(err.Error(), "not a git repository") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTrimOutput(t *testing.T) {
	if trimOutput([]byte(" hello \n")) != "hello" {
		t.Fatal("trimOutput should trim whitespace")
	}
}
