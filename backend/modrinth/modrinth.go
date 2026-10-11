package modrinth

import (
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	url2 "net/url"
	"strings"
	"time"
)

// import "SaturnLauncher/backend/download"

type Modrinth struct {
	ctx context.Context
}

func NewModrinth() *Modrinth {
	return &Modrinth{}
}

const userAgent = "swarties/SaturnLauncher/" + projectInfo.Version + " (" + projectInfo.ContactEmail + ")"

// structs made using https://transform.tools/json-to-go
type DiscoverMods struct {
	Hits []struct {
		ProjectID         string        `json:"project_id"`
		ProjectType       string        `json:"project_type"`
		AllProjectTypes   []string      `json:"all_project_types"`
		Slug              string        `json:"slug"`
		Author            string        `json:"author"`
		AuthorID          string        `json:"author_id"`
		Organization      interface{}   `json:"organization"`
		OrganizationID    interface{}   `json:"organization_id"`
		Title             string        `json:"title"`
		Description       string        `json:"description"`
		Categories        []string      `json:"categories"`
		DisplayCategories []string      `json:"display_categories"`
		Versions          []string      `json:"versions"`
		Downloads         int           `json:"downloads"`
		Follows           int           `json:"follows"`
		IconURL           string        `json:"icon_url"`
		DateCreated       time.Time     `json:"date_created"`
		DateModified      time.Time     `json:"date_modified"`
		LatestVersion     string        `json:"latest_version"`
		License           string        `json:"license"`
		ClientSide        string        `json:"client_side"`
		ServerSide        string        `json:"server_side"`
		Environment       []string      `json:"environment"`
		DisclosureTypes   []interface{} `json:"disclosure_types"`
		Gallery           []interface{} `json:"gallery"`
		FeaturedGallery   interface{}   `json:"featured_gallery"`
		Color             int           `json:"color"`
	} `json:"hits"`
	Offset    int `json:"offset"`
	Limit     int `json:"limit"`
	TotalHits int `json:"total_hits"`
}

type ModPage struct {
	ClientSide   string      `json:"client_side"`
	ServerSide   string      `json:"server_side"`
	GameVersions []string    `json:"game_versions"`
	Environment  []string    `json:"environment"`
	ID           string      `json:"id"`
	Slug         string      `json:"slug"`
	ProjectType  string      `json:"project_type"`
	Team         string      `json:"team"`
	Organization interface{} `json:"organization"`
	Title        string      `json:"title"`
	Description  string      `json:"description"`
	Body         string      `json:"body"`
	BodyURL      interface{} `json:"body_url"`
	Published    time.Time   `json:"published"`
	Updated      time.Time   `json:"updated"`
	Status       string      `json:"status"`
	License      struct {
		ID   string      `json:"id"`
		Name string      `json:"name"`
		URL  interface{} `json:"url"`
	} `json:"license"`
	Downloads            int           `json:"downloads"`
	Followers            int           `json:"followers"`
	Categories           []string      `json:"categories"`
	AdditionalCategories []interface{} `json:"additional_categories"`
	Loaders              []string      `json:"loaders"`
	Versions             []string      `json:"versions"`
	IconURL              string        `json:"icon_url"`
	RawIconURL           string        `json:"raw_icon_url"`
	IssuesURL            string        `json:"issues_url"`
	SourceURL            string        `json:"source_url"`
	WikiURL              string        `json:"wiki_url"`
	DiscordURL           string        `json:"discord_url"`
	DonationUrls         []interface{} `json:"donation_urls"`
	Gallery              []interface{} `json:"gallery"`
	Color                int           `json:"color"`
}

type VersionInfo struct {
	GameVersions    []string    `json:"game_versions"`
	Loaders         []string    `json:"loaders"`
	Environment     string      `json:"environment"`
	ID              string      `json:"id"`
	ProjectID       string      `json:"project_id"`
	AuthorID        string      `json:"author_id"`
	Featured        bool        `json:"featured"`
	Name            string      `json:"name"`
	VersionNumber   string      `json:"version_number"`
	Changelog       string      `json:"changelog"`
	ChangelogURL    interface{} `json:"changelog_url"`
	DatePublished   time.Time   `json:"date_published"`
	Downloads       int         `json:"downloads"`
	VersionType     string      `json:"version_type"`
	Status          string      `json:"status"`
	RequestedStatus interface{} `json:"requested_status"`
	Files           []struct {
		ID     string `json:"id"`
		Hashes struct {
			Sha512 string `json:"sha512"`
			Sha1   string `json:"sha1"`
		} `json:"hashes"`
		URL      string      `json:"url"`
		Filename string      `json:"filename"`
		Primary  bool        `json:"primary"`
		Size     int         `json:"size"`
		FileType interface{} `json:"file_type"`
	} `json:"files"`
	Dependencies []struct {
		VersionID      interface{} `json:"version_id"`
		ProjectID      string      `json:"project_id"`
		FileName       interface{} `json:"file_name"`
		DependencyType string      `json:"dependency_type"`
	} `json:"dependencies"`
}

func (m *Modrinth) GetDiscoveryPage(projectType, version, categories string) (*DiscoverMods, error) {
	categories = "fabric" // hardcoded as fabric cuz it's the only mod loader supported at this time
	var discover DiscoverMods
	facets := [][]string{
		{
			"project_type=" + projectType,
		},
		{
			"versions=" + version,
		},
		{
			"categories=" + categories,
		},
		{
			"environment=client_and_server",
		},
	}
	facetsJson, err := json.Marshal(facets)
	if err != nil {
		return nil, err
	}
	url := "https://api.modrinth.com/v2/search" + "?facets=" + url2.QueryEscape(string(facetsJson))
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
	return &discover, nil
}

func (m *Modrinth) GetProject(projectId string) (*ModPage, error) {
	var modInfo ModPage
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

func (m *Modrinth) GetVersions(projectId, gameVersion string) ([]VersionInfo, error) {
	var verInfo []VersionInfo
	if strings.TrimSpace(gameVersion) == "" {
		return nil, fmt.Errorf("version is invalid")
	}
	gameVer := "[\"" + gameVersion + "\"]"
	url := "https://api.modrinth.com/v2/project/" + projectId + "/version" + "?loaders=" + url2.QueryEscape("[\"fabric\"]") + "&game_versions=" + url2.QueryEscape(gameVer)
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

/*
func (m *Modrinth) InstallContent(versions VersionInfo, gameVer, folderId, contentType string) error {
	var fileUrl string
	var filename string
	var sha1 string
	for _, v := range versions.Files {
		if v.Primary {
			fileUrl = v.URL
			filename = v.Filename
			sha1 = v.Hashes.Sha1
			break
		}
	}
	if fileUrl == "" {
		return fmt.Errorf("file url is empty")
	}
	dl := download.NewDownload()
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	fileLoc := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, contentType, filename)
	_, err = dl.Downloader(fileLoc, fileUrl)
	if err != nil {
		return err
	}
	fileSha1, err := dl.GetFileSha1(fileLoc)
	if err != nil {
		return err
	}
	if sha1 != fileSha1 {
		err := os.Remove(fileLoc)
		if err != nil {
			return err
		}
		return fmt.Errorf("file sha1 does not match")
	}
	for _, d := range versions.Dependencies {
		if d.DependencyType != "required" {
			continue
		} else {
			if d.VersionID != "" {
				// https://docs.modrinth.com/api/operations/getversion/
				url := fmt.Sprintf("https://api.modrinth.com/v2/version/%s", d.VersionID)

			} else {
				if d.ProjectID != "" {
					getVersions, err := m.GetVersions(d.ProjectID, gameVer)
					if err != nil {
						return err
					}
					content, err := dl.GetInstalledContent(folderId, contentType)
					if err != nil {
						return err
					}
					depFilename := getVersions[0].Files[0].Filename
					if slices.Contains(content, depFilename) {
						continue
					}
					url := getVersions[0].Files[0].URL
					depLocation := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, contentType, depFilename)
					_, err = dl.Downloader(depLocation, url)
					if err != nil {
						return err
					}
					depSha1, err := dl.GetFileSha1(depLocation)
					if err != nil {
						return err
					}
					if getVersions[0].Files[0].Hashes.Sha1 != depSha1 {
						err := os.Remove(depLocation)
						if err != nil {
							return err
						}
						return fmt.Errorf("dependency sha1 mismatch")
					}
				}
			}
		}
	}
	return nil
}
*/ //going to be replaced
func (m *Modrinth) GetVersion(verId string) (*VersionInfo, error) {
	url := fmt.Sprintf("https://api.modrinth.com/v2/version/%s", verId)

}
