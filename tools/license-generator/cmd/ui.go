package cmd

import (
	_ "embed"
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

//go:embed ui.html
var uiHTML []byte

var uiPort int

var uiCmd = &cobra.Command{
	Use:   "ui",
	Short: "Start a web UI for license lookup",
	Long:  "Starts an HTTP server with a web UI for resolving npm package licenses.",
	RunE:  runUI,
}

func init() {
	rootCmd.AddCommand(uiCmd)
	uiCmd.Flags().IntVarP(&uiPort, "port", "P", 8080, "port to listen on")
}

func runUI(_ *cobra.Command, _ []string) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(uiHTML) //nolint:errcheck
	})

	mux.HandleFunc("/api/resolve", handleResolve)

	addr := fmt.Sprintf(":%d", uiPort)
	fmt.Printf("License Generator UI → http://localhost%s\n", addr)
	return http.ListenAndServe(addr, mux)
}

var npmClient = &http.Client{Timeout: 15 * time.Second}

func handleResolve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	var items []map[string]any
	if err := json.Unmarshal(body, &items); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	results := make([]map[string]any, len(items))
	for i, item := range items {
		entry := make(map[string]any, len(item)+1)
		for k, v := range item {
			entry[k] = v
		}

		name, _ := item["name"].(string)
		version, _ := item["version"].(string)
		pkgType, _ := item["type"].(string)

		license := "UNKNOWN"
		if name != "" {
			if pkgType == "golang" {
				license = lookupGoLicense(name, version)
			} else {
				license = lookupNpmLicense(name, version)
			}
		}
		entry["licenses"] = []map[string]any{{"license": license}}
		results[i] = entry
	}

	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.Encode(results) //nolint:errcheck
}

func lookupNpmLicense(name, version string) string {
	// url.PathEscape handles both @ → %40 and / → %2F for scoped packages
	encodedName := url.PathEscape(strings.TrimPrefix(name, "/"))

	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://registry.npmjs.org/%s/%s", encodedName, url.PathEscape(version))
	} else {
		apiURL = fmt.Sprintf("https://registry.npmjs.org/%s/latest", encodedName)
	}

	resp, err := npmClient.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		return "UNKNOWN"
	}
	defer resp.Body.Close()

	var pkg struct {
		License any `json:"license"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&pkg); err != nil {
		return "UNKNOWN"
	}

	switch v := pkg.License.(type) {
	case string:
		return v
	case map[string]any:
		if t, ok := v["type"].(string); ok {
			return t
		}
	}
	return "UNKNOWN"
}

// lookupGoLicense first checks the local GOPATH module cache, then falls back
// to fetching the license file from the module's source on the Go proxy / VCS.
func lookupGoLicense(modPath, version string) string {
	gopath := os.Getenv("GOPATH")
	if gopath == "" {
		gopath = filepath.Join(os.Getenv("HOME"), "go")
	}

	// Try local cache first (fast, no network)
	if version != "" {
		cacheDir := filepath.Join(gopath, "pkg", "mod", modPath+"@"+version)
		if info, err := os.Stat(cacheDir); err == nil && info.IsDir() {
			if lic := extractGoLicense(cacheDir); lic != "UNKNOWN" {
				return lic
			}
		}
	}

	// Fallback: fetch via Go module proxy zip info to find source host,
	// then try to download LICENSE file from the raw source URL.
	return lookupGoLicenseRemote(modPath, version)
}

func lookupGoLicenseRemote(modPath, version string) string {
	// Use the Go module proxy to get the resolved version (if not provided)
	if version == "" {
		infoURL := fmt.Sprintf("https://proxy.golang.org/%s/@latest", url.PathEscape(modPath))
		resp, err := npmClient.Get(infoURL)
		if err != nil || resp.StatusCode != http.StatusOK {
			return "UNKNOWN"
		}
		defer resp.Body.Close()
		var info struct {
			Version string `json:"Version"`
		}
		if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<14)).Decode(&info); err != nil {
			return "UNKNOWN"
		}
		version = info.Version
	}

	// Download the zip from the proxy and scan for a LICENSE file
	zipURL := fmt.Sprintf("https://proxy.golang.org/%s/@v/%s.zip",
		url.PathEscape(modPath), url.PathEscape(version))

	resp, err := npmClient.Get(zipURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		return "UNKNOWN"
	}
	defer resp.Body.Close()

	// Read at most 4 MB of the zip to find a LICENSE file
	data, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "UNKNOWN"
	}

	return scanZipForLicense(data, modPath, version)
}

func scanZipForLicense(data []byte, modPath, version string) string {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "UNKNOWN"
	}

	prefix := modPath + "@" + version + "/"
	for _, f := range zr.File {
		base := strings.TrimPrefix(f.Name, prefix)
		switch strings.ToUpper(base) {
		case "LICENSE", "LICENSE.MD", "LICENSE.TXT", "COPYING", "COPYING.LESSER":
			rc, err := f.Open()
			if err != nil {
				continue
			}
			content, err := io.ReadAll(io.LimitReader(rc, 1<<16))
			rc.Close()
			if err != nil {
				continue
			}
			return detectLicenseType(string(content))
		}
	}
	return "UNKNOWN"
}
