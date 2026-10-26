package modrinth

import (
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	url2 "net/url"
	"os"
	"path/filepath"
	"strings"
)

// import "SaturnLauncher/backend/download"

type Modrinth struct {
	ctx context.Context
}

func NewModrinth() *Modrinth {
	return &Modrinth{}
}

const userAgent = projectInfo.UserAgent

// structs made using https://transform.tools/json-to-go

type SearchHits struct {
	ProjectID         string   `json:"project_id"`
	ProjectType       string   `json:"project_type"`
	AllProjectTypes   []string `json:"all_project_types"`
	Slug              string   `json:"slug"`
	Author            string   `json:"author"`
	AuthorID          string   `json:"author_id"`
	Organization      string   `json:"organization"`
	OrganizationID    string   `json:"organization_id"`
	Title             string   `json:"title"`
	Description       string   `json:"description"`
	Categories        []string `json:"categories"`
	DisplayCategories []string `json:"display_categories"`
	Versions          []string `json:"versions"`
	Downloads         int      `json:"downloads"`
	Follows           int      `json:"follows"`
	IconURL           string   `json:"icon_url"`
	DateCreated       string   `json:"date_created"`
	DateModified      string   `json:"date_modified"`
	LatestVersion     string   `json:"latest_version"`
	License           string   `json:"license"`
	ClientSide        string   `json:"client_side"`
	ServerSide        string   `json:"server_side"`
	Environment       []string `json:"environment"`
	DisclosureTypes   []string `json:"disclosure_types"`
	Gallery           []string `json:"gallery"`
	FeaturedGallery   string   `json:"featured_gallery"`
	Color             int      `json:"color"`
	IsInstalled       bool
}
type DiscoverProjects struct {
	Hits      []SearchHits `json:"hits"`
	Offset    int          `json:"offset"`
	Limit     int          `json:"limit"`
	TotalHits int          `json:"total_hits"`
}
type License struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

type GalleryImage struct {
	URL         string `json:"url"`
	Featured    bool   `json:"featured"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Created     string `json:"created"`
	Ordering    int    `json:"ordering"`
}

type DonationURL struct {
	ID       string `json:"id"`
	Platform string `json:"platform"`
	URL      string `json:"url"`
}

type ProjectPage struct {
	ClientSide           string         `json:"client_side"`
	ServerSide           string         `json:"server_side"`
	GameVersions         []string       `json:"game_versions"`
	Environment          []string       `json:"environment"`
	ID                   string         `json:"id"`
	Slug                 string         `json:"slug"`
	ProjectType          string         `json:"project_type"`
	Team                 string         `json:"team"`
	Organization         string         `json:"organization"`
	Title                string         `json:"title"`
	Description          string         `json:"description"`
	Body                 string         `json:"body"`
	BodyURL              string         `json:"body_url"`
	Published            string         `json:"published"`
	Updated              string         `json:"updated"`
	Status               string         `json:"status"`
	License              License        `json:"license"`
	Downloads            int            `json:"downloads"`
	Followers            int            `json:"followers"`
	Categories           []string       `json:"categories"`
	AdditionalCategories []string       `json:"additional_categories"`
	Loaders              []string       `json:"loaders"`
	Versions             []string       `json:"versions"`
	IconURL              string         `json:"icon_url"`
	RawIconURL           string         `json:"raw_icon_url"`
	IssuesURL            string         `json:"issues_url"`
	SourceURL            string         `json:"source_url"`
	WikiURL              string         `json:"wiki_url"`
	DiscordURL           string         `json:"discord_url"`
	DonationUrls         []DonationURL  `json:"donation_urls"`
	Gallery              []GalleryImage `json:"gallery"`
	Color                int            `json:"color"`
}
type Hashes struct {
	Sha512 string `json:"sha512"`
	Sha1   string `json:"sha1"`
}
type VersionDependencies struct {
	VersionID      string `json:"version_id"`
	ProjectID      string `json:"project_id"`
	FileName       string `json:"file_name"`
	DependencyType string `json:"dependency_type"`
}
type VersionFile struct {
	ID       string `json:"id"`
	Hashes   Hashes `json:"hashes"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Primary  bool   `json:"primary"`
	Size     int    `json:"size"`
	FileType string `json:"file_type"`
}
type VersionInfo struct {
	GameVersions    []string              `json:"game_versions"`
	Loaders         []string              `json:"loaders"`
	Environment     string                `json:"environment"`
	ID              string                `json:"id"`
	ProjectID       string                `json:"project_id"`
	AuthorID        string                `json:"author_id"`
	Featured        bool                  `json:"featured"`
	Name            string                `json:"name"`
	VersionNumber   string                `json:"version_number"`
	Changelog       string                `json:"changelog"`
	ChangelogURL    string                `json:"changelog_url"`
	DatePublished   string                `json:"date_published"`
	Downloads       int                   `json:"downloads"`
	VersionType     string                `json:"version_type"`
	Status          string                `json:"status"`
	RequestedStatus string                `json:"requested_status"`
	Files           []VersionFile         `json:"files"`
	Dependencies    []VersionDependencies `json:"dependencies"`
}

type Manifest struct {
	Filename  string `json:"filename"`
	ProjectId string `json:"projectId"`
	VersionId string `json:"versionId"`
	Hash      string `json:"hash"`
}

type UpdateInfo struct {
	OldFileName    string `json:"oldFileName"`
	NewFileName    string `json:"newFileName"`
	ProjectId      string `json:"projectId"`
	CurrentVersion string `json:"currentVersion"`
	NewVersion     string `json:"newVersion"`
	NewDownloadUrl string `json:"newDownloadUrl"`
}

func (m *Modrinth) GetDiscoveryPage(projectType, version, categories, query, folderId string) (*DiscoverProjects, error) {
	// categories = "fabric" // hardcoded as fabric cuz it's the only mod loader supported at this time
	var discover DiscoverProjects
	facets := [][]string{
		{
			"project_type:" + projectType,
		},
		{
			"versions:" + version,
		},
	}
	facetsJson, err := json.Marshal(facets)
	if err != nil {
		return nil, err
	}
	var url string
	if query != "" {
		url = "https://api.modrinth.com/v2/search" + "?facets=" + url2.QueryEscape(string(facetsJson)) + "&query=" + url2.QueryEscape(query) + "&limit=25"
	} else {
		url = "https://api.modrinth.com/v2/search" + "?facets=" + url2.QueryEscape(string(facetsJson)) + "&limit=25"
	}

	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	if do.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("modrinth's api did not return status 200 OK")
	}
	err = json.NewDecoder(do.Body).Decode(&discover)
	if err != nil {
		return nil, err
	}
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "modrinth_manifest.json")
	file, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &discover, nil
		}
		return nil, err
	}
	if len(file) == 0 {
		return &discover, nil
	}
	var manifest []Manifest
	err = json.Unmarshal(file, &manifest)
	if err != nil {
		return nil, err
	}
	for i := range discover.Hits {
		for _, f := range manifest {
			if discover.Hits[i].ProjectID == f.ProjectId {
				discover.Hits[i].IsInstalled = true
				break
			}
		}
	}
	return &discover, nil
}

func (m *Modrinth) GetProject(projectId string) (*ProjectPage, error) {
	var modInfo ProjectPage
	url := "https://api.modrinth.com/v2/project/" + projectId
	requests, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	requests.Header.Set("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(requests)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	if do.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("modrinth's api did not return status 200 OK")
	}
	err = json.NewDecoder(do.Body).Decode(&modInfo)
	if err != nil {
		return nil, err
	}
	return &modInfo, nil
}

func (m *Modrinth) GetVersions(projectId, gameVersion, projectType string) ([]VersionInfo, error) {
	var verInfo []VersionInfo
	if strings.TrimSpace(gameVersion) == "" {
		return nil, fmt.Errorf("version is invalid")
	}
	gameVer := "[\"" + gameVersion + "\"]"
	url := "https://api.modrinth.com/v2/project/" + projectId + "/version" + "?game_versions=" + url2.QueryEscape(gameVer)
	if projectType == "mod" {
		url += "&loaders=" + url2.QueryEscape("[\"fabric\"]")
	}
	requests, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	requests.Header.Set("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(requests)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	if do.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("modrinth's api did not return status 200 OK")
	}
	err = json.NewDecoder(do.Body).Decode(&verInfo)
	if err != nil {
		return nil, err
	}
	if len(verInfo) == 0 {
		return nil, fmt.Errorf("version info is empty")
	}
	return verInfo, nil
}

func (m *Modrinth) GetVersion(verId string) (*VersionInfo, error) {
	var vInfo VersionInfo
	url := fmt.Sprintf("https://api.modrinth.com/v2/version/%s", verId)
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	if do.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("modrinth's api didnt return status code 200 OK")
	}
	err = json.NewDecoder(do.Body).Decode(&vInfo)
	if err != nil {
		return nil, err
	}
	return &vInfo, nil
}

func (m *Modrinth) InstallModFile(v VersionInfo, folderId, contentType string) error {
	dl := download.NewDownload()
	var fileUrl string
	var fileName string
	var fileSha1 string
	for _, ver := range v.Files {
		if ver.Primary == true {
			fileUrl = ver.URL
			fileSha1 = ver.Hashes.Sha1
			fileName = ver.Filename
			break
		}
	}
	if fileUrl == "" {
		if len(v.Files) == 0 {
			return fmt.Errorf("no files available")
		}
		fileUrl = v.Files[0].URL
		fileSha1 = v.Files[0].Hashes.Sha1
		fileName = v.Files[0].Filename
	}
	content, err := dl.GetInstalledContent(folderId, contentType)
	if err != nil {
		return err
	}
	alreadyInstalled := false
	for _, c := range content {
		if c.FileName == fileName {
			alreadyInstalled = true
			break
		}
	}
	if alreadyInstalled {
		return nil
	}
	contentT, _, err := dl.ContentDir(folderId, contentType)
	if err != nil {
		return err
	}
	fileLoc := filepath.Join(contentT, fileName)
	_, err = dl.Downloader(fileLoc, fileUrl)
	if err != nil {
		return err
	}
	dlSha1, err := dl.GetFileSha1(fileLoc)
	if err != nil {
		return err
	}
	if dlSha1 != fileSha1 {
		err := os.Remove(fileLoc)
		if err != nil {
			return err
		}
		return fmt.Errorf("file sha1 mismatch. retry installing the mod")
	}
	err = m.SaveManifest(fileName, fileSha1, v.ID, v.ProjectID, folderId)
	if err != nil {
		return err
	}

	return nil
}

func (m *Modrinth) InstallDeps(v VersionInfo, seen map[string]bool, folderId, contentType, gameVer, projectType string) error {
	if seen[v.ProjectID] {
		return nil
	}
	seen[v.ProjectID] = true
	err := m.InstallModFile(v, folderId, contentType)
	if err != nil {
		return err
	}
	for _, d := range v.Dependencies {
		var depVersion *VersionInfo
		if d.DependencyType != "required" {
			continue
		}
		if d.VersionID != "" {
			version, err := m.GetVersion(d.VersionID)
			if err != nil {
				return err
			}
			depVersion = version
		} else if d.ProjectID != "" {
			versions, err := m.GetVersions(d.ProjectID, gameVer, projectType)
			if err != nil {
				return err
			}
			depVersion = &versions[0]
		} else {
			continue
		}
		err := m.InstallDeps(*depVersion, seen, folderId, contentType, gameVer, projectType)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m *Modrinth) ReadManifest(folderId string) ([]Manifest, error) {
	var modrinthManifest []Manifest
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "modrinth_manifest.json")
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		return []Manifest{}, nil
	}
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(file, &modrinthManifest)
	if err != nil {
		return nil, err
	}
	return modrinthManifest, nil
}

func (m *Modrinth) SaveManifest(filename, sha1, versionId, projectId, folderId string) error {
	var manifest []Manifest
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	path := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "modrinth_manifest.json")
	file, err := os.ReadFile(path)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
	} else if len(file) > 0 {
		err = json.Unmarshal(file, &manifest)
		if err != nil {
			return err
		}
	}
	var modrinthManifest Manifest
	modrinthManifest.Hash = sha1
	modrinthManifest.Filename = filename
	modrinthManifest.VersionId = versionId
	modrinthManifest.ProjectId = projectId
	found := false
	for i, _ := range manifest {
		if manifest[i].Filename == modrinthManifest.Filename {
			manifest[i] = modrinthManifest
			found = true
			break
		}
	}
	if !found {
		manifest = append(manifest, modrinthManifest)
	}
	file, err = json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}
	err = os.WriteFile(path, file, 0o644)
	if err != nil {
		return err
	}
	return nil
}

func (m *Modrinth) GetContentUpdates(folderId, gameVersion, projectType string) ([]UpdateInfo, error) {
	var updInfo []UpdateInfo
	modInfo, err := m.ReadManifest(folderId)
	if err != nil {
		return nil, err
	}
	for _, f := range modInfo {
		versions, err := m.GetVersions(f.ProjectId, gameVersion, projectType)
		if err != nil {
			continue
		}
		latestVer := versions[0]
		if f.VersionId != latestVer.ID {
			var newInfo UpdateInfo
			for _, v := range latestVer.Files {
				if v.Primary == true {
					newInfo.OldFileName = f.Filename
					newInfo.NewFileName = v.Filename
					newInfo.ProjectId = f.ProjectId
					newInfo.CurrentVersion = f.VersionId
					newInfo.NewVersion = latestVer.ID
					newInfo.NewDownloadUrl = v.URL
					updInfo = append(updInfo, newInfo)
					break
				}
			}
		}
	}
	return updInfo, nil
}

func (m *Modrinth) RemoveFromManifest(folderId, filename string) error {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	var newManifest []Manifest
	manifest, err := m.ReadManifest(folderId)
	if err != nil {
		return err
	}
	for _, ma := range manifest {
		if ma.Filename == filename {
			continue
		}
		newManifest = append(newManifest, ma)
	}
	indent, err := json.MarshalIndent(newManifest, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "modrinth_manifest.json")
	err = os.WriteFile(path, indent, 0o644)
	if err != nil {
		return err
	}
	return nil
}
