package modpacks

import (
	"SaturnLauncher/backend/download"
	fabric2 "SaturnLauncher/backend/fabric"
	"SaturnLauncher/backend/instances"
	modrinth2 "SaturnLauncher/backend/modrinth"
	"SaturnLauncher/backend/quilt"
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
		QuiltLoader  string `json:"quilt-loader"`
	} `json:"dependencies"`
}

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
	if modpack.Dependencies.QuiltLoader != "" {
		q := quilt.NewQuilt()
		id, err := q.InstallQuilt(inst.Version, modpack.Dependencies.QuiltLoader)
		if err != nil {
			return "", err
		}
		err = instManager.UpdateQuiltVersion(folderId, id)
		if err != nil {
			return "", err
		}
	} else {
		f := fabric2.NewFabric()
		id, err := f.InstallFabric(inst.Version, modpack.Dependencies.FabricLoader)
		if err != nil {
			return "", err
		}
		err = instManager.UpdateFabricVersion(folderId, id)
		if err != nil {
			return "", err
		}
	}
	for _, a := range modpack.Files {
		path := filepath.Clean(a.Path)
		if strings.Contains(path, "..") {
			continue
		}
		if a.Env.Client == "unsupported" {
			continue
		}
		mod := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, path)
		err = os.MkdirAll(filepath.Dir(mod), 0o755)
		if err != nil {
			return "", err
		}
		candidates = append(candidates, download.AssetCandidate{
			URL:      a.Downloads[0],
			DestPath: mod,
			Hash:     a.Hashes.Sha1,
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
	for _, a := range modpack.Files {
		if !strings.HasPrefix(a.Path, "mods/") && !strings.HasPrefix(a.Path, "resourcepacks/") && !strings.HasPrefix(a.Path, "shaderpacks/") {
			continue
		}
		filename := filepath.Base(a.Path)
		sha1 := a.Hashes.Sha1
		split := strings.Split(a.Downloads[0], "/")
		if len(split) != 8 {
			continue
		}
		projectId := split[4]
		versionId := split[6]
		modrinth := modrinth2.NewModrinth()
		err := modrinth.SaveManifest(filename, sha1, versionId, projectId, folderId)
		if err != nil {
			return "", err
		}

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
