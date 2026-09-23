package instances

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/flytam/filenamify"
)

type InstanceManager struct {
	ctx context.Context
}

func NewInstanceManager() *InstanceManager {
	return &InstanceManager{}
}

type Instance struct {
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	TimeCreated time.Time `json:"timecreated"`
}

func (i *InstanceManager) InitStorage() (*string, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")

	dirs := []string{
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
	var NewInstance Instance
	// setup appdata vars
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")
	// sanitize the folder name
	sanitized, err := filenamify.Filenamify(name, filenamify.Options{
		Replacement: "-",
		MaxLength:   100,
	})
	// if foldername is safe and exists return err
	instanceDir := filepath.Join(base, "instances", sanitized)
	_, err = os.Stat(instanceDir)
	if err == nil {
		return nil, fmt.Errorf("instance already exists")
	}
	// if foldername is safe and doesn't exist make a folder for the instance

	if !errors.Is(err, fs.ErrNotExist) {
		return nil, err
	}
	dirs := []string{
		instanceDir,
		filepath.Join(instanceDir, "saves"),
		filepath.Join(instanceDir, "config"),
		filepath.Join(instanceDir, "mods"),
		filepath.Join(instanceDir, "ressourcepacks"),
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
		TimeCreated: time.Now(),
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

func (i *InstanceManager) ListInstances() ([]string, error) {
	var instances []string
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
		if inst.IsDir() {
			instances = append(instances, inst.Name())
		}
	}
	return instances, nil
}

func (i *InstanceManager) DeleteInstance(name string) (bool, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return false, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances")
	instanceDir := filepath.Join(base, name)
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

// CreateInstance  Func DONE
// ListInstances   Func DONE (Note: Only returns folder names)
// DeleteInstance  Func DONE (checks if instance folder exists then deletes it)
// GetInstanceInfo Func DONE (returns the instance info in a struct type for later use) not meant to be called by the js
