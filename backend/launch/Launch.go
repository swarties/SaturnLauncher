package launch

import (
	"SaturnLauncher/backend/auth"
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/instances"
	"context"
	"os"
	"path/filepath"
	"strings"
)

type Launch struct {
	ctx context.Context
}

func NewLaunch() *Launch {
	return &Launch{}
}

type Data struct {
	CurrentAccessToken auth.MinecraftPayload `json:"access_token"`
	Username           string                `json:"name"`
	UUID               string                `json:"id"`
}

func (l *Launch) ClasspathBuilder(info download.VersionInfo) (string, error) {
	var artifacts []string
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	for _, a := range info.Libraries {
		if download.EnsureRules(a.Rules, nil) {
			if a.Downloads.Artifact.Path != "" {
				if strings.HasSuffix(a.Name, "-arm64") {
					continue
				}
				if strings.HasSuffix(a.Name, "-x86") {
					continue
				}
				if strings.HasSuffix(a.Name, "-aarch_64") {
					continue
				}
				if strings.Contains(a.Name, ":natives-") {
					continue
				}
				artifactLocation := filepath.Join(appdata, "SaturnLauncher", "minecraft", "libraries", a.Downloads.Artifact.Path)
				artifacts = append(artifacts, artifactLocation)
			}
		}
	}
	clientjarDir := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", info.ID, info.ID+".jar")
	artifacts = append(artifacts, clientjarDir)
	// dedupe checker to make sure the same path isn't repeated multiple times
	return strings.Join(artifacts, string(os.PathListSeparator)), nil
}

func (l *Launch) BuildArgs(mcinfo auth.MinecraftInfo, folderId string, classpath string, versionInfo download.VersionInfo) (map[string]string, error) {
	i := instances.NewInstanceManager()
	var args map[string]string
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return nil, err
	}
	// local paths
	args["game_directory"] = inst.Name
	args["assets_root"] = "minecraft/assets"
	args["natives_directory"] = "minecraft/natives"
	args["library_directory"] = "minecraft/libraries"
	args["classpath"] = classpath
	args["classpath_separator"] = os.PathListSeparator
	// version metadata
	args["version_name"] = inst.Version
	args["version_type"] = "release"
	args["asset_index_name"] = versionInfo.AssetIndex.ID
	args["launcher_name"] = "SaturnLauncher"
	args["launcher_version"] = "0.3.0"
	return args, nil
}
