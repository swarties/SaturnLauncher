package instances

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/google/uuid"
)

type InstanceManager struct {
	ctx context.Context
}

func NewInstanceManager() *InstanceManager {
	return &InstanceManager{}
}

type Instance struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Uuid        string `json:"uuid"`
	TimeCreated string `json:"timecreated"`
	MinRam      int    `json:"minram"`
	MaxRam      int    `json:"maxram"`
}

func (i *InstanceManager) InitStorage() (*string, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")

	dirs := []string{
		filepath.Join(base, "minecraft", "assets", "indexes"),
		filepath.Join(base, "minecraft", "assets", "objects"),
		filepath.Join(base, "minecraft", "natives"),
		filepath.Join(base, "minecraft", "versions"),
		filepath.Join(base, "minecraft", "libraries"),
		filepath.Join(base, "minecraft", "assets"),
		filepath.Join(base, "instances"),
	}

	for _, dir := range dirs {
		err := os.MkdirAll(dir, 0o755)
		if err != nil {
			return nil, err
		}
	}

	return &base, nil
}

func (i *InstanceManager) CreateInstance(name string, version string) (*Instance, error) {
	id := uuid.New()
	idString := id.String()
	var NewInstance Instance
	// setup appdata vars
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")
	// if foldername is safe and exists return err
	instanceDir := filepath.Join(base, "instances", idString)
	dirs := []string{
		instanceDir,
		filepath.Join(instanceDir, "saves"),
		filepath.Join(instanceDir, "config"),
		filepath.Join(instanceDir, "mods"),
		filepath.Join(instanceDir, "resourcepacks"),
		filepath.Join(instanceDir, "shaderpacks"),
	}
	for _, dir := range dirs {
		err := os.MkdirAll(dir, 0o755)
		if err != nil {
			return nil, err
		}
	}

	NewInstance = Instance{
		Name:        name,
		Version:     version,
		TimeCreated: time.Now().Format(time.RFC3339),
		Uuid:        idString,
		MinRam:      2048,
		MaxRam:      4096,
	}

	jsonFile, err := json.MarshalIndent(NewInstance, "", "  ")
	if err != nil {
		return nil, err
	}
	jsonLocation := filepath.Join(instanceDir, "instance.json")
	err = os.WriteFile(jsonLocation, jsonFile, 0o600)
	if err != nil {
		return nil, err
	}
	return &NewInstance, nil
}

func (i *InstanceManager) ListInstances() ([]Instance, error) {
	var instances []Instance
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances")
	entries, err := os.ReadDir(base)
	if err != nil {
		return nil, err
	}
	for _, inst := range entries {
		var jsonFile Instance
		if inst.IsDir() {
			jsonPath := filepath.Join(base, inst.Name(), "instance.json")
			jsonReader, err := os.Open(jsonPath)
			if err != nil {
				continue
			}
			defer jsonReader.Close()
			bytes, err := io.ReadAll(jsonReader)
			if err != nil {
				continue
			}
			err = json.Unmarshal(bytes, &jsonFile)
			instances = append(instances, jsonFile)
		}
	}
	return instances, nil
}

func (i *InstanceManager) DeleteInstance(id string) (bool, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return false, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances")
	instanceDir := filepath.Join(base, id)
	err = os.RemoveAll(instanceDir)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (i *InstanceManager) GetInstanceInfo(folderId string) (*Instance, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")

	var inst Instance
	jsonData, err := os.ReadFile(base)
	if err != nil {
		return nil, err
	}
	if len(jsonData) == 0 {
		return nil, fmt.Errorf("JSON file is empty")
	}
	err = json.Unmarshal(jsonData, &inst)
	if err != nil {
		return nil, err
	}
	return &inst, nil
}

func (i *InstanceManager) UpdateMemory(folderId string, minram, maxram int) error {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	inst.MaxRam = maxram
	inst.MinRam = minram
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	data, err := json.MarshalIndent(inst, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) OpenInstanceFolder(folderId string) error {
	osName := runtime.GOOS
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId)
	if osName == "windows" {
		cmd := exec.Command("explorer", base)
		err := cmd.Start()
		if err != nil {
			return err
		}
	} else if osName == "linux" {
		cmd := exec.Command("xdg-open", base)
		err := cmd.Start()
		if err != nil {
			return err
		}
	} else {
		return fmt.Errorf("couldn't open the instance folder")
	}

	return nil
}

// CreateInstance  Func DONE
// ListInstances   Func DONE (Note: Only returns folder names)
// DeleteInstance  Func DONE (checks if instance folder exists then deletes it)
// GetInstanceInfo Func DONE (returns the instance info in a struct type for later use) not meant to be called by the js
