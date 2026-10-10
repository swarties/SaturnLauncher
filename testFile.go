package main

/*
import (
	"encoding/json"
	"fmt"
	"net/http"
	url2 "net/url"
	"time"
)

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

func main() {
	mods, err := modrinth("shader", "1.21.1", "fabric")
	if err != nil {
		return
	}
	goodjson, err := json.MarshalIndent(mods, "", "  ")
	if err != nil {
		return
	}
	fmt.Println(string(goodjson))
}

func modrinth(projectType, version, categories string) (DiscoverMods, error) {
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
	}
	facetsJson, err := json.Marshal(facets)
	url := "https://api.modrinth.com/v2/search" + "?facets=" + url2.QueryEscape(string(facetsJson))
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return discover, err
	}
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return DiscoverMods{}, err
	}
	defer do.Body.Close()
	err = json.NewDecoder(do.Body).Decode(&discover)
	if err != nil {
		return discover, err
	}
	return discover, nil
}
*/
