package watcher

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
)

// Watcher watches for file changes
type Watcher struct {
	watcher      *fsnotify.Watcher
	rootPath     string
	onFileChange func(path string)
	onTreeChange func()
	done         chan struct{}
}

// New creates a new file watcher
func New(rootPath string, onFileChange func(path string), onTreeChange func()) (*Watcher, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	return &Watcher{
		watcher:      w,
		rootPath:     rootPath,
		onFileChange: onFileChange,
		onTreeChange: onTreeChange,
		done:         make(chan struct{}),
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

			// Debug logging (uncomment if needed)
			// fmt.Printf("[DEBUG] Event: %s %v\n", event.Name, event.Op)

			// Handle file changes (write events for .md files)
			if event.Op&fsnotify.Write == fsnotify.Write {
				if strings.HasSuffix(strings.ToLower(event.Name), ".md") {
					w.onFileChange(event.Name)
					// Also trigger tree change in case file was just created
					w.onTreeChange()
				}
			}

			// Handle create events
			if event.Op&fsnotify.Create == fsnotify.Create {
				info, err := os.Stat(event.Name)
				if err != nil {
					continue
				}

				if info.IsDir() {
					// New directory created - add to watcher and notify tree change
					w.addDir(event.Name)
					w.onTreeChange()
				} else if strings.HasSuffix(strings.ToLower(event.Name), ".md") {
					// New .md file created
					w.onFileChange(event.Name)
					w.onTreeChange()
				}
			}

			// Handle remove and rename events
			if event.Op&fsnotify.Remove == fsnotify.Remove ||
				event.Op&fsnotify.Rename == fsnotify.Rename {
				// Check if it's a .md file by name (file may not exist anymore)
				isMdFile := strings.HasSuffix(strings.ToLower(event.Name), ".md")

				// Try to check if it's a directory (may fail if file is gone)
				info, err := os.Stat(event.Name)
				isDir := err == nil && info.IsDir()

				if isDir || isMdFile {
					w.onTreeChange()
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
