package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type LicenseEntry struct {
	Type       string       `json:"type"`
	BomRef     string       `json:"bom-ref"`
	Name       string       `json:"name"`
	Version    string       `json:"version"`
	Purl       string       `json:"purl"`
	Licenses   []LicenseObj `json:"licenses"`
	Properties []Property   `json:"properties"`
}

type LicenseObj struct {
	License LicenseID `json:"license"`
}

type LicenseID struct {
	Name string `json:"name"`
}

type Property struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func extractGoLicense(cacheDir string) string {
	for _, fname := range []string{"LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING", "COPYING.LESSER"} {
		licensePath := filepath.Join(cacheDir, fname)
		data, err := os.ReadFile(licensePath)
		if err != nil {
			continue
		}
		return detectLicenseType(string(data))
	}
	return "UNKNOWN"
}

func detectLicenseType(text string) string {
	if strings.Contains(text, "Apache License") {
		return "Apache-2.0"
	}
	if strings.Contains(text, "MIT License") || strings.HasPrefix(text, "MIT License") {
		return "MIT"
	}
	if strings.Contains(text, "Permission is hereby granted") {
		return "MIT"
	}
	if strings.Contains(text, "GNU GENERAL PUBLIC LICENSE") {
		if strings.Contains(text, "Version 3") || strings.Contains(text, "version 3") {
			return "GPL-3.0-only"
		}
		return "GPL-2.0-only"
	}
	if strings.Contains(text, "Redistribution and use") {
		if strings.Contains(text, "substantially similar") {
			return "BSD-2-Clause"
		}
		return "BSD-3-Clause"
	}
	if strings.Contains(text, "Mozilla Public License") {
		return "MPL-2.0"
	}
	if strings.Contains(text, "ISC License") || text == "ISC" {
		return "ISC"
	}
	return "UNKNOWN"
}

func buildPurl(pkgType, name, version string) string {
	if pkgType == "npm" {
		name = strings.ReplaceAll(name, "@", "%40")
	}
	return fmt.Sprintf("pkg:%s/%s@%s", pkgType, name, version)
}

func makeEntry(purl, name, version, licenseID, licenseText string) LicenseEntry {
	props := []Property{}
	if licenseText != "" {
		props = append(props, Property{Name: "licenseText", Value: licenseText})
	}

	return LicenseEntry{
		Type:    "library",
		BomRef:  purl,
		Name:    name,
		Version: version,
		Purl:    purl,
		Licenses: []LicenseObj{
			{License: LicenseID{Name: licenseID}},
		},
		Properties: props,
	}
}
