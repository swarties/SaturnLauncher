package download

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

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

// copied and pasted from https://transform.tools/json-to-go to make it easier
type Argument struct {
	Rules []Rule   `json:"rules,omitempty"`
	Value []string `json:"value"`
}
type VersionInfo struct {
	Arguments struct {
		Jvm  []Argument `json:"jvm"`
		Game []Argument `json:"game"`
	}
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
	MainClass   string `json:"mainClass"`
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
		Rules   []Rule            `json:"rules,omitempty"`
		URL     string            `json:"url"`
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

type ModManifest struct {
	Version     string `json:"version"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

type pack struct {
	Description string `json:"description"`
	Name        string
}
type RpManifest struct {
	Pack pack `json:"pack"`
}

type ContentInfo struct {
	Version     string
	Name        string
	Description string
	Icon        string
	Pack        pack
	FileName    string
	FileSize    int
	isShader    bool
}

const assetUrl = "https://resources.download.minecraft.net/"

type Rule struct {
	Action string `json:"action"`
	Os     struct {
		Name string `json:"name"`
		Arch string `json:"arch"`
	} `json:"os"`
	Features map[string]bool `json:"features,omitempty"`
}

func (d *Download) Downloader(destPath string, downloadUrl string) (*string, error) {
	client := grab.NewClient()
	req, err := grab.NewRequest(destPath, downloadUrl)
	if err != nil {
		return nil, err
	}
	req.NoResume = true
	resp := client.Do(req)
	<-resp.Done
	if err := resp.Err(); err != nil {
		//fmt.Fprintf(os.Stderr, "Download failed: %v\n", err)
		return nil, err
	}
	return &resp.Filename, nil
}

func (d *Download) GetVersionManifest() (*VersionManifest, error) {
	var rawManifest VersionManifest
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	targetDir := filepath.Join(appdata, "SaturnLauncher")
	err = os.MkdirAll(targetDir, 0o755)
	if err != nil {
		return nil, err
	}
	_, err = d.Downloader(targetDir, "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
	if err != nil {
		return nil, err
	}
	finalDir := filepath.Join(targetDir, "version_manifest_v2.json")
	jsonFile, err := os.Open(finalDir)
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

func (d *Download) GetVersionInfo(filteredManifest VersionManifest, versionId string) error {
	var versionUrl string
	var versionSha1 string
	appdata, err := os.UserConfigDir()
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
		return fmt.Errorf("couldn't find version url in the manifest. What did you even do... restart the launcher and it should fix the manifest")
	}
	destPath := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", versionId)
	err = os.MkdirAll(destPath, 0o755)
	if err != nil {
		return err
	}
	filePath := filepath.Join(destPath, versionId+".json")
	stat, err := os.Stat(filePath)
	if err == nil && stat.Size() > 0 {
		return nil
	}
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
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	destPath := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", versionId)
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

func (d *Download) GetClientJar(vInfo VersionInfo) error {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	destPath := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", vInfo.ID)
	filePath := filepath.Join(destPath, vInfo.ID+".jar")
	clientUrl := vInfo.Downloads.Client.URL
	clientSha1 := vInfo.Downloads.Client.Sha1
	stat, err := os.Stat(filePath)
	if err == nil && int(stat.Size()) == vInfo.Downloads.Client.Size {
		return nil
	}
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
		return fmt.Errorf("sha1 mismatch error file is corrupted. version id: %s", vInfo.ID)
	}

	return nil
}

func (d *Download) GetLibraries(versionInfo VersionInfo) error {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	osName := runtime.GOOS
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "libraries")
	for _, library := range versionInfo.Libraries {
		if library.Downloads.Artifact.URL != "" {
			if strings.HasSuffix(library.Name, "-arm64") {
				continue
			}
			if strings.HasSuffix(library.Name, "-x86") {
				continue
			}
			if strings.HasSuffix(library.Name, "-aarch_64") {
				continue
			}
			if EnsureRules(library.Rules, nil) {
				filePath := filepath.Join(destPath, library.Downloads.Artifact.Path)
				err = os.MkdirAll(filepath.Dir(filePath), 0o755)
				if err != nil {
					return err
				}
				stat, err := os.Stat(filePath)
				needsDownload := err != nil || int(stat.Size()) != library.Downloads.Artifact.Size
				if needsDownload {
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
						return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionInfo.ID)
					}
				}

			}
		} else if library.URL != "" {
			mavPath, err := MavenPath(library.Name)
			if err != nil {
				return err
			}
			newPath := filepath.Join(destPath, mavPath)
			err = os.MkdirAll(filepath.Dir(newPath), 0o755)
			if err != nil {
				return err
			}
			_, err = os.Stat(newPath)
			if err != nil {
				_, err := d.Downloader(newPath, library.URL+mavPath)
				if err != nil {
					return err
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
					stat, err := os.Stat(filePath)
					if err == nil && int(stat.Size()) == native.Size {
						continue
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
						return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", versionInfo.ID)
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
		info, statErr := os.Stat(destPath)
		if statErr != nil {
			currentAssetUrl := assetUrl + hash[:2] + "/" + hash
			var newCandidates AssetCandidate
			newCandidates.DestPath = destPath
			newCandidates.URL = currentAssetUrl
			newCandidates.Hash = hash
			Candidates = append(Candidates, newCandidates)
			continue
		}
		if info.Size() != int64(i.Size) {
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

func (d *Download) GetAssets(vInfo VersionInfo) error {
	index, err := d.GetAssetIndex(&vInfo)
	if err != nil {
		return err
	}
	assets, err := d.GetMissingAssets(*index)
	if err != nil {
		return err
	}
	if len(assets) == 0 {
		return nil
	}
	failures, err := d.BatchDownloader(assets)
	if err != nil {
		return err
	}
	if len(failures) > 0 {
		return fmt.Errorf("failed to download %d assets", len(failures))
	}
	return nil
}

func (d *Download) GetNatives(vInfo VersionInfo) ([]string, error) {
	var natives []string
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}

	osName := runtime.GOOS
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "libraries")
	for _, lib := range vInfo.Libraries {
		nativeKey := lib.Natives[osName]
		if strings.HasSuffix(lib.Name, "-arm64") {
			continue
		}
		if strings.HasSuffix(lib.Name, "-x86") {
			continue
		}
		if strings.HasSuffix(lib.Name, "-aarch_64") {
			continue
		}
		if nativeKey != "" {
			classifiers := lib.Downloads.Classifiers[nativeKey]
			if classifiers.Path == "" {
				continue
			} else {
				nativePath := filepath.Join(destPath, classifiers.Path)
				natives = append(natives, nativePath)
			}
		} else {
			if strings.Contains(lib.Name, ":natives-") {
				if EnsureRules(lib.Rules, nil) {
					if lib.Downloads.Artifact.Path == "" {
						continue
					}
					natives = append(natives, filepath.Join(destPath, lib.Downloads.Artifact.Path))
				}

			}
		}
	}
	return natives, nil
}

func (d *Download) ExtractNatives(vInfo VersionInfo) error {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	nativesPath, err := d.GetNatives(vInfo)
	if err != nil {
		return err
	}
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "natives", vInfo.ID)
	for _, v := range vInfo.Arguments.Jvm {
		for _, a := range v.Value {
			if a == "-Djava.library.path=${natives_directory}/java" {
				destPath = filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "natives", vInfo.ID, "java")
			} else if a == "-Djava.library.path=${natives_directory}" {
				destPath = filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "natives", vInfo.ID)
			} else {
				continue
			}
		}

	}

	err = os.RemoveAll(destPath)
	if err != nil {
		return err
	}
	err = os.MkdirAll(destPath, 0o755)
	if err != nil {
		return err
	}
	for _, natives := range nativesPath {
		reader, err := zip.OpenReader(natives)
		if err != nil {
			return err
		}
		for _, entry := range reader.File {
			if entry.FileInfo().IsDir() {
				continue
			}
			targetPath := filepath.Join(destPath, entry.Name)
			targetPath = filepath.Clean(targetPath)
			prefix := destPath + string(os.PathSeparator)
			if !strings.HasPrefix(targetPath, prefix) {
				continue
			}
			pFolder := filepath.Dir(targetPath)
			err := os.MkdirAll(pFolder, 0o755)
			if err != nil {
				return err
			}
			fileReader, err := entry.Open()
			if err != nil {
				return err
			}
			file, err := os.Create(targetPath)
			if err != nil {
				return err
			}
			_, err = io.Copy(file, fileReader)
			if err != nil {
				return err
			}
			err = file.Close()
			if err != nil {
				return err
			}
			err = fileReader.Close()
			if err != nil {
				return err
			}

		}
		err = reader.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func (d *Download) DownloadJava(majorVersion int) (string, error) {
	osName := runtime.GOOS
	url := fmt.Sprintf("https://api.adoptium.net/v3/binary/latest/%d/ga/%s/x64/jre/hotspot/normal/eclipse", majorVersion, osName)
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	var bin string
	switch osName {
	case "linux":
		bin = "java"
	case "windows":
		bin = "java.exe"
	}
	javaLocation := filepath.Join(appdata, "SaturnLauncher", "java", strconv.Itoa(majorVersion))
	_, err = os.Stat(filepath.Join(javaLocation, "bin", bin))
	if err == nil {
		return filepath.Join(javaLocation, "bin", bin), nil
	}
	if os.IsNotExist(err) {
		var zipPath string
		if osName == "windows" {
			zipPath = javaLocation + ".zip"
		} else if osName == "linux" {
			zipPath = javaLocation + ".tar.gz"
		}

		_, err := d.Downloader(zipPath, url)
		if err != nil {
			return "", err
		}
		if osName == "windows" {
			reader, err := zip.OpenReader(zipPath)
			if err != nil {
				return "", err
			}
			defer reader.Close()
			for _, f := range reader.File {
				if f.FileInfo().IsDir() {
					continue
				}
				segments := strings.Split(f.Name, "/")
				if len(segments) <= 1 {
					continue
				}
				relPath := filepath.Join(segments[1:]...)
				targetPath := filepath.Join(javaLocation, relPath)
				if strings.HasPrefix(targetPath, javaLocation+string(os.PathSeparator)) {
					err := os.MkdirAll(filepath.Dir(targetPath), 0o755)
					if err != nil {
						return "", err
					}
					open, err := f.Open()
					if err != nil {
						return "", err
					}
					create, err := os.Create(targetPath)
					if err != nil {
						return "", err
					}
					_, err = io.Copy(create, open)
					err = create.Close()
					if err != nil {
						return "", err
					}
					err = open.Close()
					if err != nil {
						return "", err
					}

				} else {
					continue
				}
			}
			err = reader.Close()
			if err != nil {
				return "", err
			}
		} else if osName == "linux" {
			osOpen, err := os.Open(zipPath)
			if err != nil {
				return "", err
			}
			gzipReader, err := gzip.NewReader(osOpen)
			if err != nil {
				return "", err
			}
			tarReader := tar.NewReader(gzipReader)
			for {
				next, err := tarReader.Next()
				if err == io.EOF {
					break
				}
				if err != nil {
					return "", err
				}
				if next.FileInfo().IsDir() {
					continue
				}
				segments := strings.Split(next.Name, "/")
				if len(segments) <= 1 {
					continue
				}
				newPath := filepath.Join(segments[1:]...)
				targetPath := filepath.Join(javaLocation, newPath)
				if strings.HasPrefix(targetPath, javaLocation+string(os.PathSeparator)) {
					err := os.MkdirAll(filepath.Dir(targetPath), 0o755)
					if err != nil {
						return "", err
					}
					create, err := os.Create(targetPath)
					if err != nil {
						return "", err
					}
					_, err = io.Copy(create, tarReader)
					if err != nil {
						return "", err
					}
					err = os.Chmod(targetPath, next.FileInfo().Mode())
					if err != nil {
						return "", err
					}
					err = create.Close()
					if err != nil {
						return "", err
					}
				}
			}
			err = gzipReader.Close()
			if err != nil {
				return "", err
			}
			err = osOpen.Close()
			if err != nil {
				return "", err
			}
		}
		err = os.Remove(zipPath)
		if err != nil {
			return "", err
		}
		_, err = os.Stat(filepath.Join(javaLocation, "bin", bin))
		if os.IsNotExist(err) {
			removeErr := os.RemoveAll(javaLocation)
			if removeErr != nil {
				return "", removeErr
			}
			return "", fmt.Errorf("java extraction failed for version %d", majorVersion)
		}
	}
	if err != nil && !os.IsNotExist(err) {
		return "", err
	}
	return filepath.Join(javaLocation, "bin", bin), nil
}

func (d *Download) EnsureJava(vInfo VersionInfo) (*string, error) {
	// handle javaPathOverride later

	java, err := d.DownloadJava(vInfo.JavaVersion.MajorVersion)
	if err != nil {
		return nil, err
	}
	return &java, nil
}

func EnsureRules(rules []Rule, features map[string]bool) bool {
	osName := runtime.GOOS
	osArchitecture := runtime.GOARCH
	if osArchitecture == "amd64" {
		osArchitecture = "x86_64"
	} else if osArchitecture == "386" {
		osArchitecture = "x86"
	}
	allow := false
	if len(rules) == 0 {
		return true
	}
NextRule:
	for _, r := range rules {
		if osName != r.Os.Name && r.Os.Name != "" {
			continue
		}
		if osArchitecture != r.Os.Arch && r.Os.Arch != "" {
			continue
		}
		for name, want := range r.Features {
			if features[name] != want {
				continue NextRule
			}
		}
		allow = r.Action == "allow"
	}

	return allow
}

func MavenPath(name string) (string, error) {
	result := strings.Split(name, ":")
	if len(result) != 3 {
		return "", fmt.Errorf("invalid format")
	}
	group := result[0]
	artifact := result[1]
	version := result[2]
	group = strings.ReplaceAll(group, ".", "/")
	path := group + "/" + artifact + "/" + version + "/" + artifact + "-" + version + ".jar"
	return path, nil
}

func (a *Argument) UnmarshalJSON(data []byte) error {
	if strings.HasPrefix(string(data), "\"") {
		var str string
		err := json.Unmarshal(data, &str)
		if err != nil {
			return err
		}
		a.Value = []string{str}
		return nil
	}
	if strings.HasPrefix(string(data), "{") {
		type temp struct {
			Rules []Rule          `json:"rules"`
			Value json.RawMessage `json:"value"`
		}
		var tempStruct temp
		err := json.Unmarshal(data, &tempStruct)
		if err != nil {
			return err
		}
		a.Rules = tempStruct.Rules
		if strings.HasPrefix(string(tempStruct.Value), "\"") {
			var str string
			err := json.Unmarshal(tempStruct.Value, &str)
			if err != nil {
				return err
			}
			a.Value = []string{str}
			return nil
		} else if strings.HasPrefix(string(tempStruct.Value), "[") {
			var str []string
			err := json.Unmarshal(tempStruct.Value, &str)
			if err != nil {
				return err
			}
			a.Value = str
			return nil
		} else {
			return fmt.Errorf("couldn't unmarshal json. json might've been tampered with")
		}
	}

	return fmt.Errorf("couldn't unmarshal json. json might've been tampered with")
}

func (d *Download) GetInstalledContent(folderId, contentType string) ([]ContentInfo, error) {
	contentDir, _, err := d.ContentDir(folderId, contentType)
	var contentInfo []ContentInfo
	if err != nil {
		return nil, err
	}
	dir, err := os.ReadDir(contentDir)
	if err != nil {
		return nil, err
	}
	for _, d := range dir {

		if d.IsDir() {
			continue
		}
		var info ContentInfo
		dirName := filepath.Join(contentDir, d.Name())
		info = ContentInfo{FileName: d.Name()}
		if contentType == "mods" {

			var superm ModManifest
			stat, err := os.Stat(dirName)
			if err != nil {
				return nil, err
			}
			reader, err := zip.OpenReader(dirName)
			if err != nil {
				contentInfo = append(contentInfo, info)
				continue
			}

			for _, r := range reader.File {

				if r.Name != "fabric.mod.json" {
					continue
				}
				open, err := r.Open()
				if err != nil {
					return nil, err
				}

				file, err := io.ReadAll(open)
				if err != nil {
					return nil, err
				}
				file = bytes.ReplaceAll(file, []byte("\n"), []byte(" "))
				file = bytes.ReplaceAll(file, []byte("\r"), []byte(" "))
				err = json.Unmarshal(file, &superm)
				oerr := open.Close()
				if oerr != nil {
					return nil, err
				}
				if err != nil {
					break
				}
				superm.Icon = strings.TrimPrefix(superm.Icon, "/")
				for _, read := range reader.File {
					if read.Name != superm.Icon {
						continue
					}
					mOpen, err := read.Open()
					if err != nil {
						continue
					}
					mFile, err := io.ReadAll(mOpen)
					if err != nil {
						continue
					}
					err = mOpen.Close()
					if err != nil {
						continue
					}
					info.Icon = base64.StdEncoding.EncodeToString(mFile)
					break
				}
				info.Name = superm.Name
				info.Version = superm.Version
				info.Description = superm.Description
				info.FileSize = int(stat.Size())
				info.isShader = false
				break
			}
			err = reader.Close()
			if err != nil {
				return nil, err
			}

		} else if contentType == "resourcepacks" {
			var superRp RpManifest
			stat, err := os.Stat(dirName)
			if err != nil {
				return nil, err
			}
			reader, err := zip.OpenReader(dirName)
			if err != nil {
				contentInfo = append(contentInfo, info)
				continue
			}
			for _, r := range reader.File {
				if r.Name != "pack.mcmeta" {
					continue
				}
				open, err := r.Open()
				if err != nil {
					return nil, err
				}

				file, err := io.ReadAll(open)
				if err != nil {
					return nil, err
				}
				err = json.Unmarshal(file, &superRp)
				oerr := open.Close()
				if oerr != nil {
					return nil, err
				}
				if err != nil {
					break
				}

				packIconDir := "pack.png"
				for _, read := range reader.File {
					if read.Name != packIconDir {
						continue
					}
					rpOpen, err := read.Open()
					if err != nil {
						continue
					}
					rpFile, err := io.ReadAll(rpOpen)
					if err != nil {
						continue
					}
					err = rpOpen.Close()
					if err != nil {
						continue
					}
					info.Icon = base64.StdEncoding.EncodeToString(rpFile)
					break
				}
				info.Pack.Name = strings.TrimSuffix(d.Name(), ".zip")
				info.Pack.Description = superRp.Pack.Description
				info.FileSize = int(stat.Size())
				info.isShader = false
				break
			}
			err = reader.Close()
			if err != nil {
				return nil, err
			}
		} else if contentType == "shaders" {
			stat, err := os.Stat(dirName)
			if err != nil {
				return nil, err
			}
			reader, err := zip.OpenReader(dirName)
			if err != nil {
				return nil, err
			}
			defer reader.Close()
			for _, r := range reader.File {
				if r.Name == "pack.mcmeta" {
					info.isShader = false
				}
			}
			info.Name = strings.TrimSuffix(stat.Name(), ".zip")
			info.FileSize = int(stat.Size())
			info.FileName = stat.Name()
			info.isShader = true
		}
		contentInfo = append(contentInfo, info)
	}
	return contentInfo, nil
}

func (d *Download) ContentDir(folderId, contentType string) (string, string, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return "", "", err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId)
	modDir := filepath.Join(base, "mods")
	rpDir := filepath.Join(base, "resourcepacks")
	shadersDir := filepath.Join(base, "shaderpacks")
	var contentDir string
	var fileFormat string
	switch contentType {
	case "mods":
		fileFormat = "*.jar"
		contentDir = modDir
	case "resourcepacks":
		fileFormat = "*.zip"
		contentDir = rpDir
	case "shaders":
		fileFormat = "*.zip"
		contentDir = shadersDir
	default:
		return "", "", fmt.Errorf("content type is not supported")
	}

	return contentDir, fileFormat, nil
}
