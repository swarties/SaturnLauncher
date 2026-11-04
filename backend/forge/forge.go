package forge

import (
	"SaturnLauncher/backend/projectInfo"
	"context"
	"encoding/xml"
	"net/http"
	"strings"
)

type Forge struct {
	ctx context.Context
}

func NewForge() *Forge {
	return &Forge{}
}

const userAgent = projectInfo.UserAgent

type Versions struct {
	XMLName    xml.Name `xml:"metadata"`
	Text       string   `xml:",chardata"`
	GroupId    string   `xml:"groupId"`
	ArtifactId string   `xml:"artifactId"`
	Versioning struct {
		Text     string `xml:",chardata"`
		Latest   string `xml:"latest"`
		Release  string `xml:"release"`
		Versions struct {
			Text    string   `xml:",chardata"`
			Version []string `xml:"version"`
		} `xml:"versions"`
		LastUpdated string `xml:"lastUpdated"`
	} `xml:"versioning"`
}

func (f *Forge) GetLoaderVersions(gameVersion string) ([]string, error) {
	var rawVersionManifest Versions
	var finalVersionManifest []string
	url := "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml"
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("User-Agent", userAgent)
	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	err = xml.NewDecoder(do.Body).Decode(&rawVersionManifest)
	if err != nil {
		return nil, err
	}
	for _, r := range rawVersionManifest.Versioning.Versions.Version {
		splits := strings.Split(r, "-")
		if splits[0] != gameVersion {
			continue
		}
		finalVersionManifest = append(finalVersionManifest, r)
	}
	if len(finalVersionManifest) == 0 {
		return []string{}, nil
	}
	return finalVersionManifest, nil
}
