package neoforge

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type NeoForge struct {
	ctx context.Context
}

func NewNeoForge() *NeoForge {
	return &NeoForge{}
}

type version struct {
	IsSnapshot bool     `json:"isSnapshot"`
	Versions   []string `json:"versions"`
}
type VersionManifest struct {
	version
}

const userAgent = projectInfo.UserAgent

func (nf *NeoForge) GetLoaderVersions(gameVersion string) (*VersionManifest, error) {
	var vManifest VersionManifest
	neoforgeVersionsUrl := "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge"
	request, err := http.NewRequest("GET", neoforgeVersionsUrl, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	if do.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("neoforge api returned error %d", do.StatusCode)
	}
	err = json.NewDecoder(do.Body).Decode(&vManifest)
	if err != nil {
		return nil, err
	}
	var newManifest VersionManifest
	for _, v := range vManifest.Versions {
		var loadermcVer string
		// just keep stable versions
		if strings.Contains(v, "-beta") || strings.Contains(v, "snapshot") || strings.Contains(v, "alpha") || strings.HasPrefix(v, "0.") {
			continue
		}
		splits := strings.Split(v, ".")
		if len(splits) < 2 {
			continue
		}
		v1, sErr := strconv.Atoi(splits[0])
		if sErr != nil {
			return nil, sErr
		}
		if v1 < 26 {
			loadermcVer = "1." + splits[0] + "." + splits[1]
		}
		if v1 >= 26 {
			loadermcVer = splits[0] + "." + splits[1]
		}
		if loadermcVer == gameVersion {
			newManifest.Versions = append(newManifest.Versions, v)
		} else {
			continue
		}
	}
	return &newManifest, nil
}

func (nf *NeoForge) GetProfile(loaderVersion string) (*download.VersionInfo, error) {
	var versionInfo download.VersionInfo
	dl := download.NewDownload()
	tempDir := os.TempDir()
	url := "https://maven.neoforged.net/releases/net/neoforged/neoforge/" + loaderVersion + "/neoforge-" + loaderVersion + "-installer.jar"
	filename := "neoforge-" + loaderVersion + ".jar"
	installerJar := filepath.Join(tempDir, filename)
	_, err := dl.Downloader(installerJar, url)
	if err != nil {
		return nil, err
	}
	reader, err := zip.OpenReader(installerJar)
	if err != nil {
		return nil, err
	}
	for _, r := range reader.File {
		if r.Name != "version.json" {
			continue
		}
		file, fErr := r.Open()
		if fErr != nil {
			return nil, fErr
		}
		fErr = json.NewDecoder(file).Decode(&versionInfo)
		if fErr != nil {
			return nil, fErr
		}
		err = file.Close()
		if err != nil {
			return nil, err
		}
		break
	}
	err = reader.Close()
	if err != nil {
		return nil, err
	}
	err = os.Remove(installerJar)
	if err != nil {
		return nil, err
	}
	// dont forget to os.remove the jar file
	if versionInfo.ID == "" {
		return nil, fmt.Errorf("couldn't find version.json")
	}
	return &versionInfo, nil
}

func (nf *NeoForge) InstallNeoforge(gameVer, loaderVer string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	profile, err := nf.GetProfile(loaderVer)
	if err != nil {
		return "", err
	}
	versionsDir := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", profile.ID)
	err = os.MkdirAll(versionsDir, 0o755)
	if err != nil {
		return "", err
	}
	jsonData, err := json.MarshalIndent(profile, "", "  ")
	if err != nil {
		return "", err
	}
	err = os.WriteFile(filepath.Join(versionsDir, profile.ID+".json"), jsonData, 0600)
	if err != nil {
		return "", err
	}

	return profile.ID, nil
}
