package Skins

import (
	"SaturnLauncher/backend/download"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

type Skins struct {
	ctx context.Context
}

func NewSkinsManager() *Skins { return &Skins{} }

type GetUUID struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type GetSkin struct {
	Properties []GetSkinProperties `json:"properties"`
}

type GetSkinProperties struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// yes i know i can do it another way but wails doesnt like structs in structs apparently
type GetSkinTextures struct {
	Textures Textures `json:"textures"`
}

type Textures struct {
	Skin Skin `json:"SKIN"`
}

type Skin struct {
	URL      string   `json:"url"`
	Metadata Metadata `json:"metadata"`
}

type Metadata struct {
	Model string `json:"model"`
}

func (s *Skins) GetSkinByUsername(username string) (string, error) {
	var uuidStruct GetUUID
	var skinStruct GetSkin
	var skinTextures GetSkinTextures
	getUUID, err := http.Get("https://api.mojang.com/users/profiles/minecraft/" + username)
	if err != nil {
		return "", err
	}
	if getUUID.StatusCode != http.StatusOK {
		defer getUUID.Body.Close()
		return "", fmt.Errorf("user does not exist")
	}
	defer getUUID.Body.Close()
	uuid, err := io.ReadAll(getUUID.Body)
	if err != nil {
		return "", err
	}
	err = json.Unmarshal(uuid, &uuidStruct)
	if err != nil {
		return "", err
	}

	getSkin, err := http.Get("https://sessionserver.mojang.com/session/minecraft/profile/" + uuidStruct.Id)
	if err != nil {
		return "", err
	}
	if getSkin.StatusCode != http.StatusOK {
		defer getSkin.Body.Close()
		return "", fmt.Errorf("user does not exist")
	}
	defer getSkin.Body.Close()
	skin, err := io.ReadAll(getSkin.Body)
	err = json.Unmarshal(skin, &skinStruct)
	if err != nil {
		return "", err
	}
	skinJson, err := base64.StdEncoding.DecodeString(skinStruct.Properties[0].Value)
	if err != nil {
		return "", err
	}
	err = json.Unmarshal(skinJson, &skinTextures)
	if err != nil {
		return "", err
	}
	temp := filepath.Join(os.TempDir(), "skin.png")

	dl := download.NewDownload()
	_, err = dl.Downloader(temp, skinTextures.Textures.Skin.URL)
	if err != nil {
		return "", err
	}
	file, err := os.ReadFile(temp)
	if err != nil {
		return "", err
	}
	defer os.Remove(temp)
	return base64.StdEncoding.EncodeToString(file), nil
}
