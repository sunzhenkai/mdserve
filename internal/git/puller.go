package git

import (
	"log"
	"time"
)

// Puller handles automatic git pull operations
type Puller struct {
	repoPath string
	interval time.Duration
	branch   string
	stopCh   chan struct{}
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
	log.Printf("[INFO] Git pull: path=%s, branch=%s", p.repoPath, p.branch)

	output, err := runGit(p.repoPath, "pull", "--ff-only", "origin", p.branch)
	if err != nil {
		log.Printf("[WARN] Git pull failed: path=%s, branch=%s, err=%v, output: %s",
			p.repoPath, p.branch, err, trimOutput(output))
		return
	}

	if len(output) == 0 {
		log.Printf("[INFO] Git pull successful: path=%s, branch=%s, result=already up to date", p.repoPath, p.branch)
		return
	}

	log.Printf("[INFO] Git pull successful: path=%s, branch=%s, output: %s",
		p.repoPath, p.branch, trimOutput(output))
}

// PullOnce performs a single git pull; exposed for tests.
func PullOnce(repoPath, branch string) error {
	_, err := runGit(repoPath, "pull", "--ff-only", "origin", branch)
	return err
}
