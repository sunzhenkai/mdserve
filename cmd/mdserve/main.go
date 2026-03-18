package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/wii/mdserve/internal/server"
)

var (
	port int
	host string
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "mdserve",
		Short: "Markdown files server with real-time rendering",
		Long:  "A real-time Markdown files server that provides web-based rendering and file browsing.",
	}

	var serveCmd = &cobra.Command{
		Use:   "serve <path>",
		Short: "Start the markdown server",
		Long:  "Start serving markdown files from the specified directory.",
		Args:  cobra.ExactArgs(1),
		Run:   runServe,
	}

	serveCmd.Flags().IntVarP(&port, "port", "p", 3000, "Port to listen on")
	serveCmd.Flags().StringVarP(&host, "host", "H", "127.0.0.1", "Host to bind to")

	rootCmd.AddCommand(serveCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runServe(cmd *cobra.Command, args []string) {
	path := args[0]

	// Create server configuration
	config := &server.Config{
		Path: path,
		Host: host,
		Port: port,
	}

	// Create and start server
	srv, err := server.New(config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create server: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Starting mdserve server at http://%s:%d\n", host, port)
	fmt.Printf("Serving files from: %s\n", path)

	if err := srv.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}
