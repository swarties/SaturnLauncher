package download

import (
	"archive/zip"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
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

func (d *Download) GetClientJar(vInfo VersionInfo) error {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	destPath := filepath.Join(appdatadir, "SaturnLauncher", "minecraft", "versions", vInfo.ID)
	filePath := filepath.Join(destPath, vInfo.ID+".jar")
	clientUrl := vInfo.Downloads.Client.URL
	clientSha1 := vInfo.Downloads.Client.Sha1
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
		return fmt.Errorf("sha1 Mismatch error file is corrupted. version id: %s", vInfo.ID)
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
	// Does not support arm still downloads them add support later
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
		defer reader.Close()
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
			err = fileReader.Close()
			if err != nil {
				return err
			}
			err = file.Close()
			if err != nil {
				return err
			}
		}

	}
	return nil
}

func (d *Download) GetJava(vInfo VersionInfo) ([]string, error) {
	var javaVersions []string
	javaHome := os.Getenv("JAVA_HOME")
	if len(javaHome) == 0 {
		fmt.Println("coudlnt find java in JAVA_HOME continuing search")
	} else {
		java := filepath.Join(javaHome, "bin", "java.exe")
		javaVersions = append(javaVersions, java)
	}
	javaDir := "C:\\Program Files\\Java\\"
	_, err := os.Stat(javaDir)
	if err == nil {
		dir, err := os.ReadDir(javaDir)
		if err != nil {
			return nil, err
		}
		for _, entries := range dir {
			if entries.IsDir() {
				if entries.Name() == "latest" {
					javaLocation := filepath.Join(javaDir, entries.Name(), "jre-1.8", "bin", "java.exe")
					javaVersions = append(javaVersions, javaLocation)
					continue
				}
				javaLocation := filepath.Join(javaDir, entries.Name(), "bin", "java.exe")
				javaVersions = append(javaVersions, javaLocation)
			} else {
				continue
			}
		}
	}
	adoptiumDir := "C:\\Program Files\\Eclipse Adoptium\\"
	_, err = os.Stat(adoptiumDir)
	if err == nil {
		dir, err := os.ReadDir(adoptiumDir)
		if err != nil {
			return nil, err
		}
		for _, entries := range dir {
			if entries.IsDir() {
				javaLocation := filepath.Join(adoptiumDir, entries.Name(), "bin", "java.exe")
				javaVersions = append(javaVersions, javaLocation)
			} else {
				continue
			}
		}
	}
	zuluDir := "C:\\Program Files\\Zulu\\"
	_, err = os.Stat(zuluDir)
	if err == nil {
		dir, err := os.ReadDir(zuluDir)
		if err != nil {
			return nil, err
		}
		for _, entries := range dir {
			if entries.IsDir() {
				javaLocation := filepath.Join(zuluDir, entries.Name(), "bin", "java.exe")
				javaVersions = append(javaVersions, javaLocation)
			} else {
				continue
			}
		}
	}
	if len(javaVersions) == 0 {
		return nil, fmt.Errorf("could not find any java.exe installed. please visit https://adoptium.net/temurin/releases/ . please install java version %d", vInfo.JavaVersion.MajorVersion)
	}
	return javaVersions, nil
}

func (d *Download) EnsureJava(javaVersions []string, vInfo VersionInfo) (*string, error) {
	for _, java := range javaVersions {
		cmd := exec.Command(java, "-XshowSettings:properties", "-version")
		out, err := cmd.CombinedOutput()
		if err != nil {
			continue
		}
		outputStr := string(out)
		for line := range strings.SplitSeq(outputStr, "\n") {
			if strings.Contains(line, "java.specification.version =") {
				parts := strings.Split(line, "=")
				if len(parts) == 2 {
					version := strings.TrimSpace(parts[1])
					var nversion string
					if strings.Contains(version, "1.") {
						nversion = strings.TrimPrefix(version, "1.")
					} else {
						v, err := strconv.Atoi(version)
						if err != nil {
							continue
						}
						if v >= vInfo.JavaVersion.MajorVersion {
							return &java, nil
						}
					}
					v, err := strconv.Atoi(nversion)
					if err != nil {
						continue
					}
					if v >= vInfo.JavaVersion.MajorVersion {
						return &java, nil
					}

					continue
				}
			}
		}
	}

	return nil, fmt.Errorf("could not find a suitable java version. please install java version %d at https://adoptium.net/temurin/releases/", vInfo.JavaVersion.MajorVersion)
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
			return fmt.Errorf("coudlnt unmarshal json. json might've been tampered with")
		}
	}

	return fmt.Errorf("coudlnt unmarshal json. json might've been tampered with")
}
