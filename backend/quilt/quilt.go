package quilt

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const userAgent = projectInfo.UserAgent

type Quilt struct {
	ctx context.Context
}

func NewQuilt() *Quilt {
	return &Quilt{}
}

type LoaderVersion struct {
	Version string `json:"version"`
	Stable  bool
}
type Loader struct {
	Loader LoaderVersion `json:"loader"`
}

func (q *Quilt) GetLoaderVersions(gameVersion string) ([]LoaderVersion, error) {
	var raw []Loader
	var loaderVer []LoaderVersion
	quiltUrl := "https://meta.quiltmc.org/v3/versions/loader/" + gameVersion
	request, err := http.NewRequest("GET", quiltUrl, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("User-Agent", userAgent)
	get, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer get.Body.Close()
	if get.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("quilt api returned error %d", get.StatusCode)
	}
	err = json.NewDecoder(get.Body).Decode(&raw)
	if err != nil {
		return nil, err
	}
	for _, r := range raw {
		if strings.Contains(r.Loader.Version, "beta") || strings.Contains(r.Loader.Version, "alpha") || strings.Contains(r.Loader.Version, "rc") {
			r.Loader.Stable = false
		} else {
			r.Loader.Stable = true
		}
		loaderVer = append(loaderVer, r.Loader)
	}
	if len(loaderVer) == 0 {
		return nil, fmt.Errorf("quilt api has no loader versions for minecraft version: %s", gameVersion)
	}
	return loaderVer, nil
}

func (q *Quilt) GetProfile(gameVersion, loaderVersion string) (*download.VersionInfo, error) {
	var profile download.VersionInfo
	profileUrl := "https://meta.quiltmc.org/v3/versions/loader/" + gameVersion + "/" + loaderVersion + "/" + "profile/json"
	request, err := http.NewRequest("GET", profileUrl, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("User-Agent", userAgent)
	get, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer get.Body.Close()
	if get.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("quilt api returned error %d", get.StatusCode)
	}
	err = json.NewDecoder(get.Body).Decode(&profile)
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (q *Quilt) InstallQuilt(gameVersion, loaderVersion string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	profile, err := q.GetProfile(gameVersion, loaderVersion)
	if err != nil {
		return "", err
	}
	folder := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", profile.ID)
	err = os.MkdirAll(folder, 0o755)
	if err != nil {
		return "", err

	}
	jsonData, err := json.MarshalIndent(profile, "", "  ")
	if err != nil {
		return "", err

	}
	err = os.WriteFile(filepath.Join(folder, profile.ID+".json"), jsonData, 0600)
	if err != nil {
		return "", err
	}
	return profile.ID, nil
}
