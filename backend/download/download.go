package download

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
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

// very long struct incoming
// copied and pasted from https://transform.tools/json-to-go

type VersionInfo struct {
	AssetIndex struct {
		ID        string `json:"id"`
		Sha1      string `json:"sha1"`
		Size      int    `json:"size"`
		TotalSize int    `json:"totalSize"`
		URL       string `json:"url"`
	} `json:"assetIndex"`
	Downloads struct {
		Client struct {
			Sha1 string `json:"sha1"`
			Size int    `json:"size"`
			URL  string `json:"url"`
		} `json:"client"`
	} `json:"downloads"`
	ID          string `json:"id"`
	JavaVersion struct {
		Component    string `json:"component"`
		MajorVersion int    `json:"majorVersion"`
	} `json:"javaVersion"`
	Libraries []struct {
		Downloads struct {
			Artifact struct {
				Path string `json:"path"`
				Sha1 string `json:"sha1"`
				Size int    `json:"size"`
				URL  string `json:"url"`
			} `json:"artifact"`
			Classifiers map[string]struct {
				Path string `json:"path"`
				Sha1 string `json:"sha1"`
				Size int    `json:"size"`
				URL  string `json:"url"`
			} `json:"classifiers"`
		} `json:"downloads"`
		Natives map[string]string `json:"natives"`
		Name    string            `json:"name"`
		Rules   []struct {
			Action string `json:"action"`
			Os     struct {
				Name string `json:"name"`
			} `json:"os"`
		} `json:"rules,omitempty"`
	} `json:"libraries"`
}

type AssetIndex struct {
	Objects map[string]AssetObject `json:"objects"`
}

type AssetObject struct {
	Hash string `json:"hash"`
	Size int    `json:"size"`
}

type AssetCandidate struct {
	URL      string
	DestPath string
	Hash     string
}

const assetUrl = "https://resources.download.minecraft.net/"

func (d *Download) Downloader(destPath string, downloadUrl string) (*string, error) {
	client := grab.NewClient()
	req, err := grab.NewRequest(destPath, downloadUrl)
	if err != nil {
		return nil, err
	}

	fmt.Printf("Downloading %v...\n", req.URL())
	resp := client.Do(req)
	if resp.HTTPResponse != nil {
		fmt.Printf("  %v\n", resp.HTTPResponse.Status)
	}

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

	fmt.Printf("Download saved to %v \n", resp.Filename)
	return &resp.Filename, nil
}

func (d *Download) GetVersionManifest() (*VersionManifest, error) {
	var rawManifest VersionManifest
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	targetdir := filepath.Join(appdatadir, "SaturnLauncher")
	err = os.MkdirAll(targetdir, 0o755)
	if err != nil {
		return nil, err
	}
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
	fmt.Println(hex.EncodeToString(hashInBytes))
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
	filePath := filepath.Join(destPath, versionId+".json")
	_, err = d.Downloader(filePath, versionUrl)
	if err != nil {
		return err
	}
	hash, err := d.GetFileSha1(filePath)
	if err != nil {
		return err
	}
	if hash != versionSha1 {
		err := os.Remove(filePath)
		if err != nil {
			return err
		}
		return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionId)
	}
	return nil
}

func (d *Download) ParseVersionInfo(versionId string) (*VersionInfo, error) {
	var data VersionInfo
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "versions", versionId)
	filePath := filepath.Join(destPath, versionId+".json")
	file, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(file, &data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (d *Download) GetClientJar(versionId string) error {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "versions", versionId)
	filePath := filepath.Join(destPath, versionId+".jar")
	versionInfo, err := d.ParseVersionInfo(versionId)
	if err != nil {
		return err
	}
	clientUrl := versionInfo.Downloads.Client.URL
	clientSha1 := versionInfo.Downloads.Client.Sha1
	_, err = d.Downloader(filePath, clientUrl)
	if err != nil {
		return err
	}
	hash, err := d.GetFileSha1(filePath)
	if err != nil {
		return err
	}
	if hash != clientSha1 {
		err := os.Remove(filePath)
		if err != nil {
			return err
		}
		return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionId)
	}

	return nil
}

func (d *Download) GetLibraries(versionId string) error {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	versionInfo, err := d.ParseVersionInfo(versionId)
	if err != nil {
		return err
	}
	osName := runtime.GOOS
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "libraries")
	for _, library := range versionInfo.Libraries {
		if library.Downloads.Artifact.URL != "" {
			if len(library.Rules) > 0 {
				if library.Rules[0].Os.Name == osName {
					filePath := filepath.Join(destPath, library.Downloads.Artifact.Path)
					err = os.MkdirAll(filepath.Dir(filePath), 0o755)
					if err != nil {
						return err
					}
					_, err = d.Downloader(filePath, library.Downloads.Artifact.URL)
					expectedSha1 := library.Downloads.Artifact.Sha1
					if err != nil {
						return err
					}
					fileSha1, err := d.GetFileSha1(filePath)
					if err != nil {
						return err
					}
					if expectedSha1 != fileSha1 {
						err := os.Remove(filePath)
						if err != nil {
							return err
						}
						return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionId)
					}
				}
			} else {
				filePath := filepath.Join(destPath, library.Downloads.Artifact.Path)
				err = os.MkdirAll(filepath.Dir(filePath), 0o755)
				if err != nil {
					return err
				}
				_, err = d.Downloader(filePath, library.Downloads.Artifact.URL)
				expectedSha1 := library.Downloads.Artifact.Sha1
				if err != nil {
					return err
				}
				fileSha1, err := d.GetFileSha1(filePath)
				if err != nil {
					return err
				}
				if expectedSha1 != fileSha1 {
					err := os.Remove(filePath)
					if err != nil {
						return err
					}
					return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionId)
				}
			}
		}
		nativeName := library.Natives[osName]
		if len(nativeName) > 0 {
			native, ok := library.Downloads.Classifiers[nativeName]
			if ok == true {
				if len(native.URL) > 0 {
					filePath := filepath.Join(destPath, native.Path)
					err = os.MkdirAll(filepath.Dir(filePath), 0o755)
					if err != nil {
						return err
					}
					_, err = d.Downloader(filePath, native.URL)
					expectedSha1 := native.Sha1
					if err != nil {
						return err
					}
					fileSha1, err := d.GetFileSha1(filePath)
					if err != nil {
						return err
					}
					if expectedSha1 != fileSha1 {
						err := os.Remove(filePath)
						if err != nil {
							return err
						}
						return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionId)
					}
				}
			}
		}

	}
	return nil
}

func (d *Download) GetAssetIndex(versionInfo *VersionInfo) (*AssetIndex, error) {
	var assetIndex AssetIndex
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	idx := versionInfo.AssetIndex
	assetIndexUrl := idx.URL
	assetIndexSha1 := idx.Sha1
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "assets", "indexes", idx.ID+".json")
	newSha1, err := d.GetFileSha1(destPath)
	if !errors.Is(err, os.ErrNotExist) && newSha1 == assetIndexSha1 {
		file, err := os.ReadFile(destPath)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(file, &assetIndex)
		if err != nil {
			return nil, err
		}
		return &assetIndex, nil
	}
	if err == nil && newSha1 != assetIndexSha1 {
		err := os.Remove(destPath)
		if err != nil {
			return nil, err
		}
	}
	filePath, err := d.Downloader(destPath, assetIndexUrl)
	if err != nil {
		return nil, err
	}
	newSha1, err = d.GetFileSha1(*filePath)
	if err != nil {
		return nil, err
	}
	if assetIndexSha1 != newSha1 {
		err := os.Remove(*filePath)
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("sha1 Mismatch error asset index file is corrupted")
	}
	// parsing
	file, err := os.ReadFile(*filePath)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(file, &assetIndex)
	if err != nil {
		return nil, err
	}
	return &assetIndex, nil
}

func (d *Download) GetMissingAssets(index AssetIndex) ([]AssetCandidate, error) {
	appdatadir, err := os.UserConfigDir()
	var Candidates []AssetCandidate
	if err != nil {
		return nil, err
	}

	for _, i := range index.Objects {

		hash := i.Hash
		destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "assets", "objects", hash[:2], hash)
		_, statErr := os.Stat(destPath)
		if statErr != nil {
			currentAssetUrl := assetUrl + hash[:2] + "/" + hash
			var newCandidates AssetCandidate
			newCandidates.DestPath = destPath
			newCandidates.URL = currentAssetUrl
			newCandidates.Hash = hash
			Candidates = append(Candidates, newCandidates)
			continue
		}

		fileHash, err := d.GetFileSha1(destPath)
		if err != nil {
			return nil, err
		}
		if fileHash != i.Hash {
			currentAssetUrl := assetUrl + hash[:2] + "/" + hash
			var newCandidates AssetCandidate
			newCandidates.DestPath = destPath
			newCandidates.URL = currentAssetUrl
			newCandidates.Hash = hash
			Candidates = append(Candidates, newCandidates)
			continue
		}

	}
	dedupeMap := make(map[string]struct{})
	var dedupeCandidates []AssetCandidate
	for _, candidate := range Candidates {
		if _, exists := dedupeMap[candidate.Hash]; exists {
			continue
		}
		dedupeMap[candidate.Hash] = struct{}{}
		dedupeCandidates = append(dedupeCandidates, candidate)
	}
	return dedupeCandidates, nil
}

func (d *Download) BatchDownloader(ac []AssetCandidate) ([]AssetCandidate, error) {
	client := grab.NewClient()
	var requests []*grab.Request
	var failures []AssetCandidate
	for _, candidate := range ac {
		req, err := grab.NewRequest(candidate.DestPath, candidate.URL)
		if err != nil {
			return nil, err
		}
		req.Tag = candidate
		err = os.MkdirAll(filepath.Dir(candidate.DestPath), 0o755)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	respb := client.DoBatch(6, requests...)

	for resp := range respb {
		candidate := resp.Request.Tag.(AssetCandidate)
		if resp.Err() != nil {
			failures = append(failures, candidate)
			continue
		}
		hash, err := d.GetFileSha1(resp.Filename)
		if err != nil {
			failures = append(failures, candidate)
			continue
		}
		if hash != candidate.Hash {
			err := os.Remove(resp.Filename)
			if err != nil {
				fmt.Println("error deleting the file after a hash mismatch")
			}
			failures = append(failures, candidate)

		}
	}
	return failures, nil
}
