//go:build windows

package autoupdater

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"golang.org/x/sys/windows/registry"
)

const userAgent = projectInfo.UserAgent
const tag = projectInfo.ReleaseTag
const repoName = projectInfo.Name
const repoOwner = projectInfo.RepoOwner

type Release struct {
	URL     string   `json:"url"`
	TagName string   `json:"tag_name"`
	Name    string   `json:"name"`
	Assets  []Assets `json:"assets"`
}

type Assets struct {
	Name               string `json:"name"`
	Digest             string `json:"digest"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

func (u *Updater) UpdateApp() error {
	var release Release
	osName := runtime.GOOS

	request, err := http.NewRequest("GET", "https://api.github.com/repos/"+repoOwner+"/"+repoName+"/releases/latest", nil)
	if err != nil {
		return fmt.Errorf("updater error: %s", err)
	}
	request.Header.Set("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return fmt.Errorf("updater error: %s", err)
	}
	defer do.Body.Close()
	rls, err := io.ReadAll(do.Body)
	if err != nil {
		return fmt.Errorf("updater error: %s", err)
	}
	err = json.Unmarshal(rls, &release)
	if err != nil {
		return fmt.Errorf("updater error: %s", err)
	}

	if release.TagName != tag {
		tempDir := os.TempDir()
		dl := download.NewDownload()
		isNsis, err := isNsisInstall()
		if err != nil {
			isNsis = false
		}
		switch osName {
		case "windows":
			if isNsis {
				tempDir = filepath.Join(tempDir, "updater.exe")
				var dlLink string
				for _, r := range release.Assets {
					if strings.Contains(r.Name, "installer") {
						dlLink = r.BrowserDownloadURL
					}
				}
				_, err = dl.Downloader(tempDir, dlLink)
				if err != nil {
					return fmt.Errorf("updater error: %s", err)
				}
				cmd := exec.Command(tempDir, "/S", "/RELAUNCH")
				err := cmd.Start()
				if err == nil {
					os.Exit(0)
				}
			} else {
				tempDir = filepath.Join(tempDir, "newSaturnBinary.exe")
				for _, r := range release.Assets {
					if strings.HasSuffix(r.Name, ".exe") && !strings.Contains(r.Name, "installer") {
						_, err := dl.Downloader(tempDir, r.BrowserDownloadURL)
						if err != nil {
							return fmt.Errorf("updater error: %s", err)
						}
						break
					}

				}
				batTemp := os.TempDir()
				batTemp = filepath.Join(batTemp, "replaceSaturn.bat")
				execPath, err := os.Executable()
				if err != nil {
					return fmt.Errorf("updater error: %s", err)
				}
				batContent := "timeout /t 5 /nobreak > NUL\n" +
					"move /Y \"%TEMP%\\newSaturnBinary.exe\" \"" + execPath + "\"\n" +
					"start \"\" \"" + execPath + "\"\n" +
					"start /b \"\" cmd /c del \"%~f0\"&exit /b\n"

				err = os.WriteFile(batTemp, []byte(batContent), 0644)
				if err != nil {
					return fmt.Errorf("updater error: %s", err)
				}
				cmd := exec.Command("cmd.exe", "/c", batTemp)
				err = cmd.Start()
				if err == nil {
					os.Exit(0)
				}
				return fmt.Errorf("updater error: %s", err)
			}
		default:
			panic("vas ???????")
		}
	}
	return nil
}

func isNsisInstall() (bool, error) {
	path := "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SaturnLauncherSaturnLauncher"

	key, err := registry.OpenKey(registry.CURRENT_USER, path, registry.QUERY_VALUE|registry.WOW64_64KEY)
	if err != nil {
		return false, err
	}
	defer key.Close()
	value, _, err := key.GetStringValue("UninstallString")
	if err != nil || value == "" {
		return false, err
	}

	return true, nil
}
