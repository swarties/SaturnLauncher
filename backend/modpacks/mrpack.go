package modpacks

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
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
		return nil, fmt.Errorf("couldnt correctly parse the modpack")
	}
	return &mrpack, nil
}
