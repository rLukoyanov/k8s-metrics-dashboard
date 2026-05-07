package cmd

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func processGoMods(dir, gopath string, entries *[]LicenseEntry) error {
	modCache := filepath.Join(gopath, "pkg", "mod")

	mods, err := findGoMods(dir)
	if err != nil {
		return err
	}

	for _, modFile := range mods {
		if err := processGoMod(modFile, modCache, entries); err != nil {
			fmt.Fprintf(os.Stderr, "warning: processing %s: %v\n", modFile, err)
		}
	}

	return nil
}

func findGoMods(dir string) ([]string, error) {
	var mods []string

	if data, err := os.ReadFile(filepath.Join(dir, "go.mod")); err == nil && len(data) > 0 {
		mods = append(mods, filepath.Join(dir, "go.mod"))
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return mods, nil
	}

	for _, e := range entries {
		if e.IsDir() {
			gm := filepath.Join(dir, e.Name(), "go.mod")
			if data, err := os.ReadFile(gm); err == nil && len(data) > 0 {
				mods = append(mods, gm)
			}
		}
	}

	return mods, nil
}

func processGoMod(modFile, modCache string, entries *[]LicenseEntry) error {
	f, err := os.Open(modFile)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	inBlock := false

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if strings.HasPrefix(line, "require (") {
			inBlock = true
			continue
		}
		if inBlock && line == ")" {
			inBlock = false
			continue
		}
		if !inBlock && !strings.HasPrefix(line, "require ") {
			continue
		}

		var modPath, version string
		if inBlock {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				modPath = parts[0]
				version = parts[1]
			}
		} else {
			rest := strings.TrimPrefix(line, "require ")
			parts := strings.Fields(rest)
			if len(parts) >= 2 {
				modPath = parts[0]
				version = parts[1]
			}
		}

		if modPath == "" || version == "" {
			continue
		}

		cacheDir := filepath.Join(modCache, modPath+"@"+version)
		info, err := os.Stat(cacheDir)
		if err != nil || !info.IsDir() {
			continue
		}

		licenseID := extractGoLicense(cacheDir)

		var licenseText string
		for _, fname := range []string{"LICENSE", "LICENSE.md", "LICENSE.txt"} {
			licensePath := filepath.Join(cacheDir, fname)
			if data, err := os.ReadFile(licensePath); err == nil {
				licenseText = string(data)
				break
			}
		}

		purl := buildPurl("golang", modPath, version)
		*entries = append(*entries, makeEntry(purl, modPath, version, licenseID, licenseText))
	}

	return scanner.Err()
}
