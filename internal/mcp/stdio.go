package mcp

import (
	"bufio"
	"context"
	"fmt"
	"io"
)

// ServeStdio runs the MCP server over stdio, reading newline-delimited
// JSON-RPC messages from r and writing responses to w. It blocks until r
// returns EOF or the context is cancelled. Logging MUST go to stderr only —
// stdout is reserved for protocol messages.
func (s *Server) ServeStdio(ctx context.Context, r io.Reader, w io.Writer) error {
	reader := bufio.NewReader(r)
	writer := bufio.NewWriter(w)
	defer writer.Flush()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		line, err := reader.ReadBytes('\n')
		trimmed := trimSpaceBytes(line)
		if len(trimmed) == 0 {
			// EOF with no remaining data ends the loop cleanly.
			if err != nil {
				if err == io.EOF {
					return nil
				}
				return err
			}
			// Skip blank lines (some clients emit trailing newlines).
			continue
		}

		out, hErr := s.HandleBatch(ctx, trimmed)
		if hErr != nil {
			fmt.Fprintf(io.Discard, "mcp: handle error: %v\n", hErr)
			continue
		}
		if len(out) == 0 {
			// Notification or empty batch → nothing to write.
			continue
		}
		if _, err := writer.Write(out); err != nil {
			return err
		}
		if err := writer.WriteByte('\n'); err != nil {
			return err
		}
		if err := writer.Flush(); err != nil {
			return err
		}
	}
}

// trimSpaceBytes trims ASCII whitespace from both ends of b.
func trimSpaceBytes(b []byte) []byte {
	start, end := 0, len(b)
	for start < end && isSpaceByte(b[start]) {
		start++
	}
	for end > start && isSpaceByte(b[end-1]) {
		end--
	}
	return b[start:end]
}

func isSpaceByte(c byte) bool {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r'
}
