package git

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// SyncOptions holds options for ensuring a local git repository exists.
type SyncOptions struct {
	Path   string
	URL    string
	Branch string
}

// EnsureRepo prepares the docs directory as a git repository.
// When URL is set and the path is not yet a git repo, it clones into Path.
// Returns ready=true when the path is a git repository and pull can proceed.
func EnsureRepo(opts SyncOptions) (ready bool, err error) {
	path, err := filepath.Abs(opts.Path)
	if err != nil {
		return false, fmt.Errorf("resolve docs path: %w", err)
	}

	if IsGitRepo(path) {
		log.Printf("[INFO] Git repository detected: path=%s", path)
		return true, nil
	}

	if opts.URL == "" {
		return false, nil
	}

	branch := opts.Branch
	if branch == "" {
		branch = "main"
	}

	exists, empty := dirState(path)
	if exists && !empty && !IsGitRepo(path) {
		return false, fmt.Errorf("%s exists but is not a git repository", path)
	}

	if !exists {
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return false, fmt.Errorf("create parent directory: %w", err)
		}
	}

	log.Printf("[INFO] Git clone: url=%s, branch=%s, path=%s", opts.URL, branch, path)

	args := []string{"clone", "--branch", branch, "--single-branch", opts.URL, path}
	output, err := runGit("", args...)
	if err != nil {
		log.Printf("[WARN] Git clone failed: %v, output: %s", err, trimOutput(output))
		return false, fmt.Errorf("git clone: %w", err)
	}

	if !IsGitRepo(path) {
		log.Printf("[WARN] Git clone finished but %s is still not a git repository, output: %s", path, trimOutput(output))
		return false, fmt.Errorf("clone completed but %s is not a git repository", path)
	}

	log.Printf("[INFO] Git clone successful: %s", trimOutput(output))
	return true, nil
}

// IsGitRepo checks if path is inside a git work tree.
func IsGitRepo(path string) bool {
	output, err := runGit(path, "rev-parse", "--is-inside-work-tree")
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(output)) == "true"
}

func dirState(path string) (exists bool, empty bool) {
	info, err := os.Stat(path)
	if err != nil {
		return false, true
	}
	if !info.IsDir() {
		return true, false
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return true, false
	}
	return true, len(entries) == 0
}

func runGit(dir string, args ...string) ([]byte, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = gitEnv()
	cmd.Stdin = nil
	return cmd.CombinedOutput()
}

func gitEnv() []string {
	env := os.Environ()
	return appendEnvIfMissing(env, "GIT_TERMINAL_PROMPT", "0")
}

func appendEnvIfMissing(env []string, key, value string) []string {
	prefix := key + "="
	for _, e := range env {
		if strings.HasPrefix(e, prefix) {
			return env
		}
	}
	return append(env, prefix+value)
}

func trimOutput(output []byte) string {
	return strings.TrimSpace(string(output))
}
