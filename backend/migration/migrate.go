package migration

import (
	fabric2 "SaturnLauncher/backend/fabric"
	"SaturnLauncher/backend/instances"
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gopkg.in/ini.v1"
)

type Migration struct {
	ctx context.Context
}

func NewMigration() *Migration { return &Migration{} }

type DetectedInstances struct {
	Name string
	Path string
	Type string
}

type ParsedInstance struct {
	Name          string
	McVersion     string
	FabricVersion string
	MinRam        int
	MaxRam        int
	Path          string
}
type CachedRequires struct {
	Suggests string `json:"suggests"`
	UID      string `json:"uid"`
}
type Components struct {
	CachedName     string           `json:"cachedName"`
	CachedVersion  string           `json:"cachedVersion"`
	DependencyOnly bool             `json:"dependencyOnly,omitempty"`
	UID            string           `json:"uid"`
	Version        string           `json:"version"`
	CachedRequires []CachedRequires `json:"cachedRequires,omitempty"`
	Important      bool             `json:"important,omitempty"`
}
type Prismmmc struct {
	Components    []Components `json:"components"`
	FormatVersion int          `json:"formatVersion"`
}

func (m *Migration) DetectLaunchers() ([]DetectedInstances, error) {
	var dInst []DetectedInstances
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	prismPath := filepath.Join(appdata, "PrismLauncher", "instances")
	// vanillaLauncherPath := filepath.Join(appdata, ".minecraft") i would do vanilla but... wails doesnt allow me to turn launcher_profiles.json into a struct
	// modrinthPath := filepath.Join(appdata, "ModrinthApp", "profiles") A SQLITE DB ?????? yeah this can wait
	_, err = os.Stat(prismPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []DetectedInstances{}, nil
		}
		return nil, err
	}
	dir, err := os.ReadDir(prismPath)
	if err != nil {
		return nil, err
	}
	for _, d := range dir {
		if !d.IsDir() {
			continue
		}
		detectedInstances := DetectedInstances{
			Name: d.Name(),
			Path: filepath.Join(prismPath, d.Name()),
			Type: "prism",
		}
		dInst = append(dInst, detectedInstances)
	}
	return dInst, nil
}

func (m *Migration) ParsePrism(insts []DetectedInstances) ([]ParsedInstance, error) {
	var parsedInsts []ParsedInstance
	for _, i := range insts {
		var p Prismmmc
		mmcjsonPath := filepath.Join(i.Path, "mmc-pack.json")
		file, err := os.ReadFile(mmcjsonPath)
		if err != nil {
			continue
		}
		err = json.Unmarshal(file, &p)
		if err != nil {
			continue
		}
		var pI ParsedInstance
		pI.Path = i.Path
		var isUnsupported bool
		for _, c := range p.Components {
			if c.UID == "net.minecraft" {
				parts := strings.Split(c.Version, ".")
				pI.McVersion = c.Version
				if len(parts) >= 2 && parts[0] == "1" {
					minorVersion, atoiErr := strconv.Atoi(parts[1])
					if atoiErr != nil {
						continue
					}
					if minorVersion < 14 {
						isUnsupported = true
					}

				} else if parts[0] != "1" {
					majorVersion, atoiErr := strconv.Atoi(parts[0])
					if atoiErr != nil {
						continue
					}
					if majorVersion >= 1 {
						pI.McVersion = c.Version
					}
				}
			}
			if c.UID == "net.fabricmc.fabric-loader" {
				pI.FabricVersion = c.Version
			}
			if c.UID == "net.minecraftforge" || c.UID == "net.neoforged" || c.UID == "org.quiltmc.quilt-loader" || c.UID == "com.mumfrey.liteloader" {
				isUnsupported = true
			}
		}
		if isUnsupported {
			continue
		}
		configPath := filepath.Join(i.Path, "instance.cfg")
		cfg, err := ini.Load(configPath)
		if err != nil {
			continue
		}
		pI.Name = cfg.Section("General").Key("name").String()
		section := cfg.Section("General")
		exists := section.HasKey("MinMemAlloc")
		if exists {
			pI.MinRam = cfg.Section("General").Key("MinMemAlloc").MustInt(1024)
			pI.MaxRam = cfg.Section("General").Key("MaxMemAlloc").MustInt(4096)
			if pI.MinRam > pI.MaxRam {
				oldMax := pI.MaxRam
				pI.MinRam = oldMax
				pI.MaxRam = pI.MinRam
			}
		} else {
			pI.MinRam = 1024
			pI.MaxRam = 4096
		}
		parsedInsts = append(parsedInsts, pI)
	}
	return parsedInsts, nil
}

func copyFile(src, dst string) error {
	open, err := os.Open(src)
	if err != nil {
		return err
	}
	defer open.Close()
	create, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer create.Close()
	_, err = io.Copy(create, open)
	if err != nil {
		return err
	}
	return nil
}

func dataCopy(dst, src string) error {
	err := os.MkdirAll(dst, 0o755)
	if err != nil {
		return err
	}
	dir, err := os.ReadDir(src)
	if err != nil {
		return err
	}
	for _, d := range dir {
		srcPath := filepath.Join(src, d.Name())
		dstPath := filepath.Join(dst, d.Name())
		if d.IsDir() {
			derr := dataCopy(dstPath, srcPath)
			if derr != nil {
				return derr
			}
			continue
		}
		err := copyFile(srcPath, dstPath)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m *Migration) TransferFromPrism(p ParsedInstance) (*instances.Instance, error) {
	appdata, err := os.UserConfigDir()
	fabric := fabric2.NewFabric()
	if err != nil {
		return nil, err
	}
	i := instances.NewInstanceManager()
	instance, err := i.CreateInstance(p.Name, p.McVersion)
	if err != nil {
		return nil, err
	}
	fId := instance.Uuid
	if p.FabricVersion != "" {
		f, err := fabric.InstallFabric(p.McVersion, p.FabricVersion)
		if err != nil {
			return nil, err
		}
		err = i.UpdateFabricVersion(fId, f)
		if err != nil {
			return nil, err
		}
	}
	err = i.UpdateMemory(fId, p.MinRam, p.MaxRam)
	if err != nil {
		return nil, err
	}
	newInstDir := filepath.Join(appdata, "SaturnLauncher", "instances", instance.Uuid)
	_, err = os.Stat(p.Path)
	if err != nil {
		return nil, err
	}
	dir, err := os.ReadDir(p.Path)
	if err != nil {
		return nil, err
	}
	skipList := []string{"mmc-pack.json", "instance.cfg", ".minecraft", "patches", ".index", "logs", "crash-reports"}
	for _, d := range dir {
		var skip bool
		for _, s := range skipList {
			if d.Name() == s {
				skip = true
			}
		}
		if skip {
			continue
		}
		dstPath := filepath.Join(newInstDir, d.Name())
		srcPath := filepath.Join(p.Path, d.Name())
		if d.IsDir() {
			err := dataCopy(dstPath, srcPath)
			if err != nil {
				return nil, err
			}
		} else {
			err := copyFile(srcPath, dstPath)
			if err != nil {
				return nil, err
			}
		}
	}
	return instance, nil
}
