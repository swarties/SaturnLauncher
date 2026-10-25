package skins

import (
	"SaturnLauncher/backend/download"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
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
	defer os.Remove(temp)
	if err != nil {
		return "", err
	}
	file, err := os.ReadFile(temp)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(file), nil
}

func (s *Skins) UploadSkin(path, variant, accessToken string) error {
	file, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)
	err = writer.WriteField("variant", variant)
	if err != nil {
		return err
	}
	w, err := writer.CreateFormFile("file", "skin.png")
	if err != nil {
		return err
	}
	_, err = w.Write(file)
	if err != nil {
		return err
	}
	request, err := http.NewRequest("PUT", "https://api.minecraftservices.com/minecraft/profile/skins", &buffer)
	if err != nil {
		return err
	}
	request.Header.Add("Content-Type", writer.FormDataContentType())
	request.Header.Add("Authorization", "Bearer "+accessToken)
	err = writer.Close()
	if err != nil {
		return err
	}
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer do.Body.Close()
	if do.StatusCode != http.StatusOK {
		all, err := io.ReadAll(do.Body)
		if err != nil {
			return err
		}
		return fmt.Errorf("couldn't upload the skin. error was %s. response body: %s", err, all)
	}
	return nil
}
