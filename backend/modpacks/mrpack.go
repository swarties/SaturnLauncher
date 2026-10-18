package modpacks

import (
	"SaturnLauncher/backend/download"
	fabric2 "SaturnLauncher/backend/fabric"
	"SaturnLauncher/backend/instances"
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type Mrpack struct {
	ctx context.Context
}

func NewMrpack() *Mrpack {
	return &Mrpack{}
}

// structs made using https://transform.tools/json-to-go and adapted for wails by me
type Hashes struct {
	Sha512 string `json:"sha512"`
	Sha1   string `json:"sha1"`
}
type Env struct {
	Server string `json:"server"`
	Client string `json:"client"`
}
type Files struct {
	Path      string   `json:"path"`
	Hashes    Hashes   `json:"hashes"`
	Env       Env      `json:"env"`
	Downloads []string `json:"downloads"`
	FileSize  int      `json:"fileSize"`
}
type ModrinthPack struct {
	Game          string  `json:"game"`
	FormatVersion int     `json:"formatVersion"`
	VersionID     string  `json:"versionId"`
	Name          string  `json:"name"`
	Summary       string  `json:"summary"`
	Files         []Files `json:"files"`
	Dependencies  struct {
		Minecraft    string `json:"minecraft"`
		FabricLoader string `json:"fabric-loader"`
	} `json:"dependencies"`
}

//path, err := wailsRuntime.OpenFileDialog(m.ctx, wailsRuntime.OpenDialogOptions{
//Title: "",
//Filters: []wailsRuntime.FileFilter{
//{
//DisplayName: "Modrinth Modpacks",
//Pattern:     "*.mrpack",
//},
//},
//})
//if err != nil {
//return nil, err
//}
// dialog func to add in app.go wrapper later

func (m *Mrpack) ParseModpack(path string) (*ModrinthPack, error) {
	var mrpack ModrinthPack
	reader, err := zip.OpenReader(path)
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	for _, f := range reader.File {
		if f.FileInfo().Name() == "modrinth.index.json" {
			open, err := f.Open()
			if err != nil {
				return nil, err
			}
			file, err := io.ReadAll(open)
			if err != nil {
				return nil, err
			}
			err = open.Close()
			if err != nil {
				return nil, err
			}
			err = json.Unmarshal(file, &mrpack)
			if err != nil {
				return nil, err
			}
		} else {
			continue
		}
	}
	if mrpack.Name == "" {
		return nil, fmt.Errorf("couldn't correctly parse the modpack")
	}
	return &mrpack, nil
}

func (m *Mrpack) InstallModpack(path string) (string, error) {
	var candidates []download.AssetCandidate
	instManager := instances.NewInstanceManager()
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	modpack, err := m.ParseModpack(path)
	if err != nil {
		return "", err
	}
	inst, err := instManager.CreateInstance(modpack.Name, modpack.Dependencies.Minecraft)
	if err != nil {
		return "", err
	}
	folderId := inst.Uuid
	instDir := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	dl := download.NewDownload()
	//instInfo, err := instManager.GetInstanceInfo(folderId)
	//if err != nil {
	//	return err
	//}
	//fabric := fmt.Sprintf("fabric-loader-%s-%s", modpack.Dependencies.FabricLoader, instInfo.Version)
	f := fabric2.NewFabric()
	id, err := f.InstallFabric(inst.Version, modpack.Dependencies.FabricLoader)
	if err != nil {
		return "", err
	}
	err = instManager.UpdateFabricVersion(folderId, id)
	if err != nil {
		return "", err
	}

	for _, m := range modpack.Files {
		path := filepath.Clean(m.Path)
		if strings.Contains(path, "..") {
			continue
		}
		if m.Env.Client == "unsupported" {
			continue
		}
		mod := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, path)
		err = os.MkdirAll(filepath.Dir(mod), 0o755)
		if err != nil {
			return "", err
		}
		candidates = append(candidates, download.AssetCandidate{
			URL:      m.Downloads[0],
			DestPath: mod,
			Hash:     m.Hashes.Sha1,
		})
	}
	failures, err := dl.BatchDownloader(candidates)
	if err != nil {
		return "", err
	}
	if len(failures) > 0 {
		undFailures, err := dl.BatchDownloader(failures)
		if err != nil {
			return "", err
		}
		return "", fmt.Errorf("failed to install %d elements", len(undFailures))
	}
	reader, err := zip.OpenReader(path)
	if err != nil {
		return "", err
	}
	defer reader.Close()
	for _, r := range reader.File {
		var newPath string
		if r.FileInfo().IsDir() {
			continue
		}
		if strings.HasPrefix(r.Name, "overrides/") {
			newPath = strings.TrimPrefix(r.Name, "overrides/")
		} else if strings.HasPrefix(r.Name, "client-overrides/") {
			newPath = strings.TrimPrefix(r.Name, "client-overrides/")
		} else {
			continue
		}
		destPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, newPath)
		if !strings.Contains(destPath, instDir+string(os.PathSeparator)) {
			continue
		}
		err := os.MkdirAll(filepath.Dir(destPath), 0o755)
		if err != nil {
			return "", err
		}
		fileOpen, err := r.Open()
		if err != nil {
			return "", err
		}
		fileCreate, err := os.Create(destPath)
		if err != nil {
			return "", err
		}
		_, err = io.Copy(fileCreate, fileOpen)
		if err != nil {
			return "", err
		}
		err = fileCreate.Close()
		if err != nil {
			return "", err
		}
		err = fileOpen.Close()
		if err != nil {
			return "", err
		}
	}
	return inst.Uuid, nil
}
