//go:build linux

package autoupdater

import (
	"context"
)

type Updater struct {
	ctx context.Context
}

func NewUpdater() *Updater {
	return &Updater{}
}

//const userAgent = projectInfo.UserAgent
//const tag = projectInfo.ReleaseTag
//const repoName = projectInfo.Name
//const repoOwner = projectInfo.RepoOwner
//
//type Release struct {
//	URL     string   `json:"url"`
//	TagName string   `json:"tag_name"`
//	Name    string   `json:"name"`
//	Assets  []Assets `json:"assets"`
//}
//
//type Assets struct {
//	Name               string `json:"name"`
//	Digest             string `json:"digest"`
//	BrowserDownloadURL string `json:"browser_download_url"`
//}
//
//func (u *Updater) UpdateApp() {
//	var release Release
//	osName := runtime.GOOS
//	request, err := http.NewRequest("GET", "https://api.github.com/repos/"+repoOwner+"/"+repoName+"/releases/latest", nil)
//	if err != nil {
//		return
//	}
//	request.Header.Set("User-Agent", userAgent)
//	do, err := http.DefaultClient.Do(request)
//	if err != nil {
//		return
//	}
//	defer do.Body.Close()
//	rls, err := io.ReadAll(do.Body)
//	if err != nil {
//		return
//	}
//	err = json.Unmarshal(rls, &release)
//	if err != nil {
//		return
//	}
//
//	if release.TagName != tag {
//		// download updater
//		tempDir := os.TempDir()
//		dl := download.NewDownload()
//		// isNsis, err := isNsisInstall()
//		if err != nil {
//			return
//		}
//		switch osName {
//		case "linux":
//			// nothing rn
//		default:
//			panic("vas ???????")
//		}
//	}
//}

//func isNsisInstall() (bool, error) {
//	path := "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SaturnLauncherSaturnLauncher"
//
//	key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.QUERY_VALUE|registry.WOW64_64KEY)
//	if err != nil {
//		return false, err
//	}
//	defer key.Close()
//	value, _, err := key.GetStringValue("UninstallString")
//	if err != nil || value == "" {
//		return false, err
//	}
//
//	return true, nil
//}
