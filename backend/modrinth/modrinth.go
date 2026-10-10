package modrinth

import (
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	url2 "net/url"
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
	Dependencies []interface{} `json:"dependencies"`
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
		return nil, fmt.Errorf("modrinth api did not return status 200 OK")
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
		return nil, fmt.Errorf("modrinth api did not return status 200 OK")
	}
	err = json.NewDecoder(do.Body).Decode(&modInfo)
	if err != nil {
		return nil, err
	}
	return &modInfo, nil
}

func (m *Modrinth) GetVersions(modInfo ModPage) ([]VersionInfo, error) {
	var verInfo []VersionInfo
	var info VersionInfo
	i := 0
	url := "https://api.modrinth.com/v2/version/"
	for _, v := range modInfo.Versions {
		if i < 20 {
			newUrl := url + url2.QueryEscape(v)
			requests, err := http.NewRequest("GET", newUrl, nil)
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
				return nil, fmt.Errorf("modrinth api did not return status 200 OK")
			}
			err = json.NewDecoder(do.Body).Decode(&info)
			if err != nil {
				return nil, err
			}
			verInfo = append(verInfo, info)
			i++
		}
	}
	return verInfo, nil
}
