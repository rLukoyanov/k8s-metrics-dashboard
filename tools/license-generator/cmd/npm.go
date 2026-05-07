package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

func processNPM(dir string, entries *[]LicenseEntry) error {
	pkgPath := filepath.Join(dir, "package.json")
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		return nil
	}

	var pkg struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return fmt.Errorf("parsing package.json: %w", err)
	}

	allDeps := make(map[string]string)
	for k, v := range pkg.Dependencies {
		allDeps[k] = v
	}
	for k, v := range pkg.DevDependencies {
		allDeps[k] = v
	}

	for name := range allDeps {
		npmPkgPath := filepath.Join(dir, "node_modules", name, "package.json")
		npmData, err := os.ReadFile(npmPkgPath)
		if err != nil {
			continue
		}

		var npmPkg struct {
			Name    string `json:"name"`
			Version string `json:"version"`
			License string `json:"license"`
		}
		if err := json.Unmarshal(npmData, &npmPkg); err != nil {
			continue
		}

		licenseID := npmPkg.License
		if licenseID == "" {
			licenseID = "UNKNOWN"
		}

		var licenseText string
		for _, fname := range []string{"LICENSE", "LICENSE.md", "LICENSE.txt"} {
			licensePath := filepath.Join(dir, "node_modules", name, fname)
			if data, err := os.ReadFile(licensePath); err == nil {
				licenseText = string(data)
				break
			}
		}

		purl := buildPurl("npm", npmPkg.Name, npmPkg.Version)
		*entries = append(*entries, makeEntry(purl, npmPkg.Name, npmPkg.Version, licenseID, licenseText))
	}

	return nil
}
