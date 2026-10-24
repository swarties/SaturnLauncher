//go:build linux

package autoupdater

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type Updater struct {
	ctx context.Context
}

func NewUpdater() *Updater {
	return &Updater{}
}

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

func (u *Updater) UpdateApp() {
	var release Release
	osName := runtime.GOOS
	request, err := http.NewRequest("GET", "https://api.github.com/repos/"+repoOwner+"/"+repoName+"/releases/latest", nil)
	if err != nil {
		return
	}
	request.Header.Set("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return
	}
	defer do.Body.Close()
	rls, err := io.ReadAll(do.Body)
	if err != nil {
		return
	}
	err = json.Unmarshal(rls, &release)
	if err != nil {
		return
	}

	if release.TagName != tag {
		// download updater
		execPath, err := os.Executable()
		if err != nil {
			return
		}
		execPathDir := filepath.Dir(execPath)
		tempDirDown := filepath.Join(execPathDir, "saturnBin.tmp")
		dl := download.NewDownload()
		if osName == "linux" {
			var dlLink string
			for _, r := range release.Assets {
				if strings.Contains(r.Name, "SaturnLauncher-linux") {
					dlLink = r.BrowserDownloadURL
				}
			}
			_, err := dl.Downloader(tempDirDown, dlLink)
			if err != nil {
				return
			}
			err = os.Chmod(tempDirDown, 0755)
			if err != nil {
				return
			}

			err = os.Remove(execPath)
			if err != nil {
				return
			}
			err = os.Rename(tempDirDown, execPath)
			if err != nil {
				return
			}
			err = exec.Command(execPath).Start()
			if err != nil {
				return
			}
			os.Exit(0)
		}
	}
}
