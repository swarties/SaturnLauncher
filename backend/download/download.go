package download

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/cavaliergopher/grab/v3"
)

type Download struct {
	ctx context.Context
}

func NewDownload() *Download {
	return &Download{}
}

type VersionManifest struct {
	Versions []Version `json:"versions"`
}

type Version struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	URL  string `json:"url"`
	SHA1 string `json:"sha1"`
}

func (d *Download) Downloader(destPath string, downloadUrl string) (*string, error) {
	client := grab.NewClient()
	req, err := grab.NewRequest(destPath, downloadUrl)
	if err != nil {
		return nil, err
	}

	fmt.Printf("Downloading %v...\n", req.URL())
	resp := client.Do(req)
	fmt.Printf("  %v\\n", resp.HTTPResponse.Status)

	t := time.NewTicker(500 * time.Millisecond)
	defer t.Stop()
Loop:
	for {
		select {
		case <-t.C:
			fmt.Printf("  transferred %v / %v bytes (%.2f%%)\n",
				resp.BytesComplete(),
				resp.Size(),
				100*resp.Progress())
		case <-resp.Done:
			break Loop
		}
	}
	if err := resp.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Download failed: %v\n", err)
		return nil, err
	}

	fmt.Printf("Download saved to ./%v \n", resp.Filename)
	return &resp.Filename, nil
}

func (d *Download) GetVersionManifest() (*VersionManifest, error) {
	var rawManifest VersionManifest
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	targetdir := filepath.Join(appdatadir, "SaturnLauncher")
	_, err = d.Downloader(targetdir, "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
	if err != nil {
		return nil, err
	}
	finaldir := filepath.Join(targetdir, "version_manifest_v2.json")
	jsonFile, err := os.Open(finaldir)
	if err != nil {
		return nil, err
	}
	defer jsonFile.Close()
	byteVal, err := io.ReadAll(jsonFile)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(byteVal, &rawManifest)
	if err != nil {
		return nil, err
	}

	var filteredManifest VersionManifest
	for _, ver := range rawManifest.Versions {
		if ver.Type != "release" {
			continue
		}
		if ver.ID == "1.13.2" {
			break
		}
		filteredManifest.Versions = append(filteredManifest.Versions, ver)
	}

	return &filteredManifest, err

}
func (d *Download) GetFileSha1(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()
	hasher := sha1.New()
	_, err = io.Copy(hasher, file)
	if err != nil {
		return "", err
	}
	hashInBytes := hasher.Sum(nil)

	return hex.EncodeToString(hashInBytes), nil
}

// get started on download when instance manager is completed

func (d *Download) GetVersionInfo(filteredManifest VersionManifest, versionId string) error {
	var versionUrl string
	var versionSha1 string
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	for _, ver := range filteredManifest.Versions {
		if ver.ID == versionId {
			versionUrl = ver.URL
			versionSha1 = ver.SHA1
			break
		}
	}
	if versionUrl == "" {
		return fmt.Errorf("couldnt find version url in the manifest. What did you even do... restart the launcher and it should fix the manifest")
	}
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "versions", versionId)
	err = os.MkdirAll(destPath, 0o755)
	if err != nil {
		return err
	}

	filename, err := d.Downloader(destPath, versionUrl)
	if err != nil {
		return err
	}
	fileloc := filepath.Join(destPath, *filename)
	hash, err := d.GetFileSha1(fileloc)
	if err != nil {
		return err
	}
	if hash != versionSha1 {
		err := os.Remove(fileloc)
		if err != nil {
			return err
		}
		return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionId)
	}
	return nil
}
