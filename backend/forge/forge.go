package forge

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type Forge struct {
	ctx context.Context
}

func NewForge() *Forge {
	return &Forge{}
}

const userAgent = projectInfo.UserAgent

// not going to be used for now as its kinda buggy
type Versions struct {
	XMLName    xml.Name `xml:"metadata"`
	Text       string   `xml:",chardata"`
	GroupId    string   `xml:"groupId"`
	ArtifactId string   `xml:"artifactId"`
	Versioning struct {
		Text     string `xml:",chardata"`
		Latest   string `xml:"latest"`
		Release  string `xml:"release"`
		Versions struct {
			Text    string   `xml:",chardata"`
			Version []string `xml:"version"`
		} `xml:"versions"`
		LastUpdated string `xml:"lastUpdated"`
	} `xml:"versioning"`
}

func (f *Forge) GetLoaderVersions(gameVersion string) ([]string, error) {
	var rawVersionManifest Versions
	var finalVersionManifest []string
	url := "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml"
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	err = xml.NewDecoder(do.Body).Decode(&rawVersionManifest)
	if err != nil {
		return nil, err
	}
	for _, r := range rawVersionManifest.Versioning.Versions.Version {
		splits := strings.Split(r, "-")
		if splits[0] != gameVersion {
			continue
		}
		finalVersionManifest = append(finalVersionManifest, r)
	}
	if len(finalVersionManifest) == 0 {
		return []string{}, nil
	}
	return finalVersionManifest, nil
}

func (f *Forge) InstallForge(loaderVersion string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dl := download.NewDownload()
	splits := strings.Split(loaderVersion, "-")
	// add getting version json for version before launch also for neoforge
	var manifest download.VersionManifest
	base := filepath.Join(appdata, "SaturnLauncher")
	jsonPath := filepath.Join(base, "version_manifest_v2.json")
	jsonReader, err := os.Open(jsonPath)
	if err != nil {
		return "", err
	}
	defer jsonReader.Close()
	bytes, err := io.ReadAll(jsonReader)
	if err != nil {
		return "", err
	}
	err = json.Unmarshal(bytes, &manifest)
	if err != nil {
		return "", err
	}
	var filteredManifest download.VersionManifest
	for _, ver := range manifest.Versions {
		if ver.Type != "release" {
			continue
		}
		if ver.ID == "1.13.2" {
			break
		}
		filteredManifest.Versions = append(filteredManifest.Versions, ver)
	}
	err = dl.GetVersionInfo(filteredManifest, splits[0], false)
	if err != nil {
		return "", err
	}
	gameVersion := splits[0]
	vInfo, err := dl.ParseVersionInfo(gameVersion, false)
	if err != nil {
		fmt.Println(err)
		return "", err
	}
	// forge install part
	mcDir := filepath.Join(appdata, "SaturnLauncher", "minecraft")
	url := "https://maven.minecraftforge.net/net/minecraftforge/forge/" + loaderVersion + "/forge-" + loaderVersion + "-installer.jar"
	fmt.Println(url)
	tempDir := os.TempDir()
	installerJar := filepath.Join(tempDir, "forge-"+loaderVersion+".jar")
	_, err = dl.Downloader(installerJar, url)
	if err != nil {
		fmt.Println(err)
		return "", err
	}
	fmt.Println("installed jar")
	launcherProfile := filepath.Join(mcDir, "launcher_profiles.json")
	_, err = os.Stat(launcherProfile)
	if err != nil {
		if os.IsNotExist(err) {
			err = os.WriteFile(launcherProfile, []byte(`{"profiles":{}}`), 0600)
			if err != nil {
				return "", err
			}
		}
		return "", err
	}
	java, err := dl.EnsureJava(*vInfo)
	if err != nil {
		return "", err
	}
	cmd := exec.Command(*java, "-Djava.awt.headless=true", "-jar", installerJar, "--installClient", mcDir)
	cmd.Dir = tempDir
	output, err := cmd.CombinedOutput()
	fmt.Println(string(output))
	if err != nil {
		return "", err
	}
	err = os.Remove(installerJar)
	if err != nil {
		return "", err
	}
	return splits[0] + "-forge-" + splits[1], nil
}
