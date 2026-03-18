package main

import (
	"fmt"
	"log"
	"os"

	"github.com/spf13/cobra"
	"github.com/wii/mdserve/internal/config"
	"github.com/wii/mdserve/internal/git"
	"github.com/wii/mdserve/internal/server"
)

var (
	port       int
	host       string
	configPath string
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "mdserve",
		Short: "Markdown files server with real-time rendering",
		Long:  "A real-time Markdown files server that provides web-based rendering and file browsing.",
	}

	var serveCmd = &cobra.Command{
		Use:   "serve [path]",
		Short: "Start the markdown server",
		Long:  "Start serving markdown files from the specified directory.",
		Args:  cobra.MaximumNArgs(1),
		Run:   runServe,
	}

	serveCmd.Flags().IntVarP(&port, "port", "p", 3000, "Port to listen on")
	serveCmd.Flags().StringVarP(&host, "host", "H", "127.0.0.1", "Host to bind to")
	serveCmd.Flags().StringVarP(&configPath, "config", "c", "", "Config file path (default: .mdserve.yaml)")

	// Config command
	var configCmd = &cobra.Command{
		Use:   "config",
		Short: "Manage configuration",
		Long:  "Manage mdserve configuration files.",
	}

	var configInitCmd = &cobra.Command{
		Use:   "init [file]",
		Short: "Generate an example configuration file",
		Long:  "Generate an example configuration file with detailed comments.",
		Args:  cobra.MaximumNArgs(1),
		Run:   runConfigInit,
	}

	configInitCmd.Flags().BoolP("force", "f", false, "Overwrite existing file")

	configCmd.AddCommand(configInitCmd)

	rootCmd.AddCommand(serveCmd)
	rootCmd.AddCommand(configCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runServe(cmd *cobra.Command, args []string) {
	// 1. Find and load config file
	cfgFile := config.FindConfigFile(configPath)

	var cfg *config.Config
	if cfgFile != "" {
		var err error
		cfg, err = config.Load(cfgFile)
		if err != nil {
			log.Fatalf("Failed to load config: %v", err)
		}
		log.Printf("Loaded config from: %s", cfgFile)
	} else {
		if configPath != "" {
			log.Printf("[WARN] Config file not found: %s, using defaults", configPath)
		}
		cfg = config.DefaultConfig()
	}

	// 2. Get document path from args
	var docPath string
	if len(args) > 0 {
		docPath = args[0]
	}

	// 3. Merge command line flags into config
	hostChanged := cmd.Flags().Changed("host")
	portChanged := cmd.Flags().Changed("port")
	cfg.MergeWithFlags(docPath, host, port, hostChanged, portChanged)

	// 4. Validate configuration
	if err := cfg.Validate(); err != nil {
		log.Fatal(err)
	}

	// 5. Setup git puller if configured
	var gitPuller *git.Puller
	if cfg.Git.Enabled {
		if git.IsGitRepo(cfg.Docs.Path) {
			gitPuller = git.NewPuller(cfg.Docs.Path, cfg.Git.Interval, cfg.Git.Branch)
			gitPuller.Start()
			log.Printf("Git auto-pull enabled: interval=%v, branch=%s", cfg.Git.Interval, cfg.Git.Branch)
		} else {
			log.Printf("[WARN] Git pull configured but %s is not a git repository", cfg.Docs.Path)
		}
	}

	// 6. Create server configuration
	srvConfig := &server.Config{
		Path:       cfg.Docs.Path,
		Host:       cfg.Server.Host,
		Port:       cfg.Server.Port,
		SiteName:   cfg.Site.Name,
		DefaultDoc: cfg.Site.DefaultDoc,
		Menu:       convertMenuItems(cfg.Menu),
	}

	// 7. Create and start server
	srv, err := server.New(srvConfig)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	log.Printf("Starting mdserve server at http://%s:%d", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Serving files from: %s", cfg.Docs.Path)
	if cfg.Site.Name != "" {
		log.Printf("Site name: %s", cfg.Site.Name)
	}

	if err := srv.Start(); err != nil {
		// Stop git puller before exiting
		if gitPuller != nil {
			gitPuller.Stop()
		}
		log.Fatalf("Server error: %v", err)
	}
}

// convertMenuItems converts config.MenuItem to server.MenuItem
func convertMenuItems(items []config.MenuItem) []server.MenuItem {
	result := make([]server.MenuItem, len(items))
	for i, item := range items {
		result[i] = server.MenuItem{
			Title:    item.Title,
			Type:     item.Type,
			Path:     item.Path,
			Tag:      item.Tag,
			Children: convertMenuItems(item.Children),
		}
	}
	return result
}

func runConfigInit(cmd *cobra.Command, args []string) {
	// Determine output file path
	outputPath := ".mdserve.yaml"
	if len(args) > 0 {
		outputPath = args[0]
	}

	// Check if file exists
	force, _ := cmd.Flags().GetBool("force")
	if _, err := os.Stat(outputPath); err == nil && !force {
		fmt.Printf("Config file already exists: %s\n", outputPath)
		fmt.Println("Use --force or -f to overwrite.")
		os.Exit(1)
	}

	// Generate example config
	exampleConfig := config.ExampleConfig()

	// Write to file
	if err := os.WriteFile(outputPath, []byte(exampleConfig), 0644); err != nil {
		log.Fatalf("Failed to write config file: %v", err)
	}

	fmt.Printf("Generated example config file: %s\n", outputPath)
}
