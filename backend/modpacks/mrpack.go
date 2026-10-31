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
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
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

func (m *Mrpack) ExportModpack(folderId, dst string, includeWorlds, includeOptions bool) error {
	dl := download.NewDownload()
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	instPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	var mpack ModrinthPack
	iMgr := instances.NewInstanceManager()
	info, err := iMgr.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	mr := modrinth2.NewModrinth()
	manifest, err := mr.ReadManifest(folderId)
	if err != nil {
		return err
	}
	mpack.Name = info.Name
	mpack.VersionID = time.Now().Format("20060102150405")
	mpack.Game = "minecraft"
	mpack.FormatVersion = 1
	mpack.Dependencies.Minecraft = info.Version
	if info.FabricVersion != "" {
		parts := strings.Split(info.FabricVersion, "-")
		if len(parts) >= 3 {
			mpack.Dependencies.FabricLoader = parts[2]
		}
	}
	if info.QuiltVersion != "" {
		parts := strings.Split(info.QuiltVersion, "-")
		if len(parts) >= 3 {
			mpack.Dependencies.QuiltLoader = parts[2]
		}
	}
	create, err := os.Create(dst)
	if err != nil {
		return err
	}
	zipWriter := zip.NewWriter(create)
	writer, err := zipWriter.Create("modrinth.index.json")
	if err != nil {
		return err
	}
	trackedFiles := make(map[string]bool)
	for _, ma := range manifest {
		var files Files
		files.Hashes.Sha1 = ma.Hash
		_, err := os.Stat(filepath.Join(instPath, "mods", ma.Filename))
		if err == nil {
			files.Path = "mods/" + ma.Filename
		}
		_, err = os.Stat(filepath.Join(instPath, "resourcepacks", ma.Filename))
		if err == nil {
			files.Path = "resourcepacks/" + ma.Filename
		}
		_, err = os.Stat(filepath.Join(instPath, "shaderpacks", ma.Filename))
		if err == nil {
			files.Path = "shaderpacks/" + ma.Filename
		}
		trackedFiles[files.Path] = true
		files.Downloads = []string{"https://cdn.modrinth.com/data/" + ma.ProjectId + "/versions/" + ma.VersionId + "/" + url.PathEscape(ma.Filename)}
		files.Env.Client = "required"
		files.Env.Server = "required"
		if files.Path == "" {
			continue
		}
		sha512, err := dl.GetFileSha512(filepath.Join(instPath, files.Path))
		if err != nil {
			return err
		}
		files.Hashes.Sha512 = sha512
		stat, err := os.Stat(filepath.Join(instPath, files.Path))
		if err != nil {
			return err
		}
		files.FileSize = int(stat.Size())
		mpack.Files = append(mpack.Files, files)
	}
	indent, err := json.MarshalIndent(mpack, "", "  ")
	if err != nil {
		return err
	}
	_, err = writer.Write(indent)
	if err != nil {
		return err
	}
	modsDir, err := os.ReadDir(filepath.Join(instPath, "mods"))
	if err == nil {
		for _, mod := range modsDir {
			if mod.IsDir() {
				continue
			}
			present, _ := trackedFiles["mods/"+mod.Name()]
			if present {
				continue
			}
			open, err := os.Open(filepath.Join(instPath, "mods", mod.Name()))
			if err != nil {
				return err
			}
			zipEntry, err := zipWriter.Create("overrides/mods/" + mod.Name())
			if err != nil {
				return err
			}
			_, err = io.Copy(zipEntry, open)
			if err != nil {
				return err
			}
			err = open.Close()
			if err != nil {
				return err
			}
		}
	}
	resourceDir, err := os.ReadDir(filepath.Join(instPath, "resourcepacks"))
	if err == nil {
		for _, rp := range resourceDir {
			if rp.IsDir() {
				continue
			}
			present, _ := trackedFiles["resourcepacks/"+rp.Name()]
			if present {
				continue
			}
			open, err := os.Open(filepath.Join(instPath, "resourcepacks", rp.Name()))
			if err != nil {
				return err
			}
			zipEntry, err := zipWriter.Create("overrides/resourcepacks/" + rp.Name())
			if err != nil {
				return err
			}
			_, err = io.Copy(zipEntry, open)
			if err != nil {
				return err
			}
			err = open.Close()
			if err != nil {
				return err
			}
		}
	}
	shaderDir, err := os.ReadDir(filepath.Join(instPath, "shaderpacks"))
	if err == nil {
		for _, shader := range shaderDir {
			if shader.IsDir() {
				continue
			}
			present, _ := trackedFiles["shaderpacks/"+shader.Name()]
			if present {
				continue
			}
			open, err := os.Open(filepath.Join(instPath, "shaderpacks", shader.Name()))
			if err != nil {
				return err
			}
			zipEntry, err := zipWriter.Create("overrides/shaderpacks/" + shader.Name())
			if err != nil {
				return err
			}
			_, err = io.Copy(zipEntry, open)
			if err != nil {
				return err
			}
			err = open.Close()
			if err != nil {
				return err
			}
		}
	}

	err = iMgr.AddToZip(filepath.Join(instPath, "config"), "overrides/config", zipWriter)
	if err != nil {
		return err
	}
	if includeWorlds {
		err = iMgr.AddToZip(filepath.Join(instPath, "saves"), "overrides/saves", zipWriter)
		if err != nil {
			return err
		}
	}
	if includeOptions {
		optionsPath := filepath.Join(instPath, "options.txt")
		_, err = os.Stat(optionsPath)
		if err == nil {
			open, err := os.Open(optionsPath)
			if err != nil {
				return err
			}
			zipEntry, err := zipWriter.Create("overrides/options.txt")
			if err != nil {
				return err
			}
			_, err = io.Copy(zipEntry, open)
			if err != nil {
				return err
			}
			err = open.Close()
			if err != nil {
				return err
			}
		}
	}

	err = zipWriter.Close()
	if err != nil {
		return err
	}
	err = create.Close()
	if err != nil {
		return err
	}
	return nil
}
