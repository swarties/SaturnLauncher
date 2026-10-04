package fabric

import (
	"SaturnLauncher/backend/download"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

type Fabric struct {
	ctx context.Context
}

func NewFabric() *Fabric {
	return &Fabric{}
}

type LoaderVersion struct {
	Version string `json:"version"`
	Stable  bool   `json:"stable"`
}
type Loader struct {
	Loader LoaderVersion `json:"loader"`
}

func (f *Fabric) GetLoaderVersions(gameVersion string) ([]LoaderVersion, error) {
	var raw []Loader
	var loaderVer []LoaderVersion
	fabricUrl := "https://meta.fabricmc.net/v2/versions/loader/" + gameVersion
	get, err := http.Get(fabricUrl)
	if err != nil {
		return nil, err
	}
	defer get.Body.Close()
	if get.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fabric api returned error %d", get.StatusCode)
	}
	err = json.NewDecoder(get.Body).Decode(&raw)
	if err != nil {
		return nil, err
	}
	for _, r := range raw {
		loaderVer = append(loaderVer, r.Loader)
	}
	if len(loaderVer) == 0 {
		return nil, fmt.Errorf("fabric api has no loader versions for minecraft version: %s", gameVersion)
	}
	return loaderVer, nil
}

func (f *Fabric) GetProfile(gameVersion, loaderVersion string) (*download.VersionInfo, error) {
	var profile download.VersionInfo
	profileUrl := "https://meta.fabricmc.net/v2/versions/loader/" + gameVersion + "/" + loaderVersion + "/" + "profile/json"
	get, err := http.Get(profileUrl)
	if err != nil {
		return nil, err
	}
	defer get.Body.Close()
	if get.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fabric api returned error %d", get.StatusCode)
	}
	err = json.NewDecoder(get.Body).Decode(&profile)
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (f *Fabric) InstallFabric(gameVersion, loaderVersion string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	profile, err := f.GetProfile(gameVersion, loaderVersion)
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
