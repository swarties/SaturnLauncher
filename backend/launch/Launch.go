package launch

import (
	"SaturnLauncher/backend/auth"
	"SaturnLauncher/backend/download"
	"context"
	"fmt"
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

func (l *Launch) BuildArgs(mcinfo auth.MinecraftInfo, folderId string, classpath string, versionInfo download.VersionInfo, mcpayload auth.MinecraftPayload, authinfo auth.AuthSession) (map[string]string, error) {
	// i := instances.NewInstanceManager()
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	args := make(map[string]string)
	// inst, err := i.GetInstanceInfo(folderId)
	/* if err != nil {
		return nil, err
	} */
	// local paths
	instDir := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	args["game_directory"] = instDir
	assetsDir := filepath.Join(appdata, "SaturnLauncher", "minecraft", "assets")
	args["assets_root"] = assetsDir
	nativesDir := filepath.Join(appdata, "SaturnLauncher", "minecraft", "natives", versionInfo.ID)
	args["natives_directory"] = nativesDir
	libsDir := filepath.Join(appdata, "SaturnLauncher", "minecraft", "libraries")
	args["library_directory"] = libsDir
	args["classpath"] = classpath
	args["classpath_separator"] = string(os.PathListSeparator)
	// version metadata
	args["version_name"] = versionInfo.ID
	args["version_type"] = "release" // hardcoded to release change if we add support for snapshots etc
	args["assets_index_name"] = versionInfo.AssetIndex.ID
	args["launcher_name"] = "SaturnLauncher"
	args["launcher_version"] = "0.3.0"
	// account info
	args["auth_player_name"] = mcinfo.Username
	args["auth_uuid"] = mcinfo.UUID
	args["auth_access_token"] = mcpayload.AccessToken
	args["auth_xuid"] = authinfo.Xuid // have to get later in auth.go in xsts func
	args["clientid"] = "000000004C12AE6F"
	args["user_type"] = "msa"
	return args, nil
}

func (l *Launch) CreateArgs(fargs map[string]string, args []download.Argument) ([]string, error) {
	var nargs []string
	for _, a := range args {
		if !download.EnsureRules(a.Rules, nil) {
			continue
		}
		for _, v := range a.Value {
			if v != "" {
				nargs = append(nargs, v)
			}
		}

	}
	for i, arg := range nargs {
		resolved, err := resolve(arg, fargs)
		if err != nil {
			return nil, err
		}
		nargs[i] = resolved
	}

	return nargs, nil
}
func resolve(s string, fargs map[string]string) (string, error) {
	for {
		start := strings.Index(s, "${")
		if start == -1 {
			return s, nil
		}
		end := strings.Index(s[start:], "}")
		if end == -1 {
			return "", fmt.Errorf("no closing }. malformed args")
		}
		end += start
		name := s[start+2 : end]
		value, ok := fargs[name]
		if !ok {
			return "", fmt.Errorf("unknown placeholder please open a github issue placeholder name: %s", name)
		}
		s = s[:start] + value + s[end+1:]
	}
}
