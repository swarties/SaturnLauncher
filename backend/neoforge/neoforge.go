package neoforge

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
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

func (nf *NeoForge) InstallNeoforge(loaderVersion string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	mcDir := filepath.Join(appdata, "SaturnLauncher", "minecraft")
	var vInfo download.VersionInfo
	dl := download.NewDownload()
	tempDir := os.TempDir()
	url := "https://maven.neoforged.net/releases/net/neoforged/neoforge/" + loaderVersion + "/neoforge-" + loaderVersion + "-installer.jar"
	filename := "neoforge-" + loaderVersion + ".jar"
	installerJar := filepath.Join(tempDir, filename)
	_, err = dl.Downloader(installerJar, url)
	if err != nil {
		return "", err
	}
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
	vInfo.JavaVersion.MajorVersion = 21
	java, err := dl.EnsureJava(vInfo)
	if err != nil {
		return "", err
	}
	cmd := exec.Command(*java, "-Djava.awt.headless=true", "-jar", installerJar, "--install-client", mcDir)
	cmd.Dir = tempDir
	out, err := cmd.CombinedOutput()
	fmt.Println(string(out))
	if err != nil {
		return "", err
	}

	err = os.Remove(installerJar)
	if err != nil {
		return "", err
	}
	return "neoforge-" + loaderVersion, nil
}
