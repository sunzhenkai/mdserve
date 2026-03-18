package git

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// Puller handles automatic git pull operations
type Puller struct {
	repoPath string
	interval time.Duration
	branch   string
	stopCh   chan struct{}
}

// IsGitRepo checks if the path is a git repository
func IsGitRepo(path string) bool {
	gitDir := filepath.Join(path, ".git")
	info, err := os.Stat(gitDir)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// NewPuller creates a new puller instance
func NewPuller(repoPath string, interval time.Duration, branch string) *Puller {
	return &Puller{
		repoPath: repoPath,
		interval: interval,
		branch:   branch,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the periodic pull process
// It performs an immediate pull first, then pulls at the configured interval
func (p *Puller) Start() {
	// Pull immediately on start
	p.pull()

	// Start periodic pulling
	go func() {
		ticker := time.NewTicker(p.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				p.pull()
			case <-p.stopCh:
				return
			}
		}
	}()
}

// Stop stops the periodic pull process
func (p *Puller) Stop() {
	close(p.stopCh)
}

// pull performs a git pull operation using the git command
func (p *Puller) pull() {
	// Use git command for simplicity
	// This is more reliable than go-git for most use cases
	cmd := exec.Command("git", "pull", "--ff-only", "origin", p.branch)
	cmd.Dir = p.repoPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[WARN] Git pull failed: %v, output: %s", err, string(output))
		return
	}

	log.Printf("[INFO] Git pull successful: %s", string(output))
}
