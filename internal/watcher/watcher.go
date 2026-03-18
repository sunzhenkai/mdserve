package watcher

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
)

// Watcher watches for file changes
type Watcher struct {
	watcher  *fsnotify.Watcher
	rootPath string
	onChange func(path string)
	done     chan struct{}
}

// New creates a new file watcher
func New(rootPath string, onChange func(path string)) (*Watcher, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	return &Watcher{
		watcher:  w,
		rootPath: rootPath,
		onChange: onChange,
		done:     make(chan struct{}),
	}, nil
}

// Start starts watching for file changes
func (w *Watcher) Start() {
	// Add root directory
	w.addDir(w.rootPath)

	// Start watching for events
	go w.watch()
}

// Stop stops the watcher
func (w *Watcher) Stop() {
	close(w.done)
	w.watcher.Close()
}

func (w *Watcher) addDir(path string) {
	// Add directory to watcher
	w.watcher.Add(path)

	// Recursively add subdirectories
	entries, err := os.ReadDir(path)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if entry.IsDir() && !strings.HasPrefix(entry.Name(), ".") {
			fullPath := filepath.Join(path, entry.Name())
			w.addDir(fullPath)
		}
	}
}

func (w *Watcher) watch() {
	for {
		select {
		case <-w.done:
			return
		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}

			// Only handle write and create events for .md files
			if event.Op&fsnotify.Write == fsnotify.Write ||
				event.Op&fsnotify.Create == fsnotify.Create {
				if strings.HasSuffix(strings.ToLower(event.Name), ".md") {
					w.onChange(event.Name)
				}
			}

			// Handle new directories
			if event.Op&fsnotify.Create == fsnotify.Create {
				info, err := os.Stat(event.Name)
				if err == nil && info.IsDir() {
					w.addDir(event.Name)
				}
			}

		case err, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
			_ = err // Ignore errors
		}
	}
}
