package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/spf13/cobra"
)

type Config struct {
	ProjectDir string
	OutputFile string
	NpmEnabled bool
	GoEnabled  bool
	GoPath     string
	Pretty     bool
}

var cfg Config

var rootCmd = &cobra.Command{
	Use:   "license-generator",
	Short: "Collect dependency license info from npm and Go modules",
	Long: `Scans package.json and go.mod files in a project directory,
reads each dependency's license metadata, and generates a licenses.json report.`,
	RunE: run,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.Flags().StringVarP(&cfg.ProjectDir, "path", "p", ".", "path to project root")
	rootCmd.Flags().StringVarP(&cfg.OutputFile, "output", "o", "", "output file (default: <project>/licenses.json)")
	rootCmd.Flags().BoolVar(&cfg.NpmEnabled, "npm", true, "scan npm dependencies")
	rootCmd.Flags().BoolVar(&cfg.GoEnabled, "go", true, "scan Go module dependencies")
	rootCmd.Flags().StringVar(&cfg.GoPath, "gopath", "", "GOPATH for Go module cache")
	rootCmd.Flags().BoolVar(&cfg.Pretty, "pretty", true, "pretty-print JSON")
}

func run(cmd *cobra.Command, args []string) error {
	dir, err := filepath.Abs(cfg.ProjectDir)
	if err != nil {
		return fmt.Errorf("resolving project path: %w", err)
	}
	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		return fmt.Errorf("project directory %q does not exist", dir)
	}
	cfg.ProjectDir = dir

	if cfg.OutputFile == "" {
		cfg.OutputFile = filepath.Join(dir, "licenses.json")
	} else {
		out, err := filepath.Abs(cfg.OutputFile)
		if err != nil {
			return fmt.Errorf("resolving output path: %w", err)
		}
		cfg.OutputFile = out
	}

	if cfg.GoPath == "" {
		cfg.GoPath = os.Getenv("GOPATH")
		if cfg.GoPath == "" {
			cfg.GoPath = filepath.Join(os.Getenv("HOME"), "go")
		}
	}

	var entries []LicenseEntry

	if cfg.NpmEnabled {
		if err := processNPM(cfg.ProjectDir, &entries); err != nil {
			fmt.Fprintf(os.Stderr, "warning: npm scan: %v\n", err)
		}
	}
	if cfg.GoEnabled {
		if err := processGoMods(cfg.ProjectDir, cfg.GoPath, &entries); err != nil {
			fmt.Fprintf(os.Stderr, "warning: go scan: %v\n", err)
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name < entries[j].Name
	})

	var data []byte
	if cfg.Pretty {
		data, err = json.MarshalIndent(entries, "", "  ")
	} else {
		data, err = json.Marshal(entries)
	}
	if err != nil {
		return fmt.Errorf("marshaling JSON: %w", err)
	}

	if err := os.WriteFile(cfg.OutputFile, data, 0644); err != nil {
		return fmt.Errorf("writing %s: %w", cfg.OutputFile, err)
	}

	fmt.Printf("Generated %s with %d packages\n", cfg.OutputFile, len(entries))
	return nil
}
