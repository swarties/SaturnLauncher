package instances

import (
	"SaturnLauncher/backend/download"
	skins2 "SaturnLauncher/backend/skins"
	"archive/zip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shirou/gopsutil/v4/mem"
	"gopkg.in/ini.v1"
)

type InstanceManager struct {
	ctx context.Context
}

func NewInstanceManager() *InstanceManager {
	return &InstanceManager{}
}

type Instance struct {
	Name            string `json:"name"`
	Description     string `json:"description,omitempty"`
	Version         string `json:"version"`
	Uuid            string `json:"uuid"`
	TimeCreated     string `json:"timecreated"`
	MinRam          int    `json:"minram"`
	MaxRam          int    `json:"maxram"`
	FabricVersion   string `json:"fabricVersion,omitempty"`
	QuiltVersion    string `json:"quiltVersion,omitempty"`
	NeoForgeVersion string `json:"neoForgeVersion,omitempty"`
	ForgeVersion    string `json:"forgeVersion,omitempty"`
	JvmArgs         string `json:"jvmArgs"`
	JavaPath        string `json:"javaPath,omitempty"`
	PlaytimeSeconds int64  `json:"playtimeSeconds,omitempty"`
	PrelaunchCmd    string `json:"prelaunchCmd"`
	WrapperCmd      string `json:"wrapperCmd"`
	PostExitCmd     string `json:"postExitCmd"`
}

type ServerInstance struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Version     string `json:"version"`
	Uuid        string `json:"uuid"`
	TimeCreated string `json:"timecreated"`
	MinRam      int    `json:"minram"`
	MaxRam      int    `json:"maxram"`
	EulaStatus  bool   `json:"eula"`
}
type Ram struct {
	TotalRamMB int
}

type Whitelist struct {
	UUID string `json:"uuid"`
	Name string `json:"name"`
}

type Banlist struct {
	UUID   string `json:"uuid"`
	Name   string `json:"name"`
	Reason string `json:"reason"`
	Source string `json:"source"`
}

type OpsList struct {
	UUID  string `json:"uuid"`
	Name  string `json:"name"`
	Level int    `json:"level"`
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
		filepath.Join(base, "accounts"),
		filepath.Join(base, "java"),
		filepath.Join(base, "server"),
		filepath.Join(base, "server", "versions"),
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
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")
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
			bytes, err := os.ReadFile(jsonPath)
			if err != nil {
				return nil, err
			}
			err = json.Unmarshal(bytes, &jsonFile)
			if err != nil {
				return nil, err
			}
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
	if minram == 0 || maxram == 0 {
		return fmt.Errorf("memory fields are invalid")
	}
	if minram > maxram {
		return fmt.Errorf("memory fields are invalid")
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

func (i *InstanceManager) GetTotalRam() (*Ram, error) {
	var ram Ram
	v, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}
	ram.TotalRamMB = int(v.Total / (1024 * 1024))

	return &ram, nil
}

func (i *InstanceManager) RenameInstance(folderId, name string) error {
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("instance name cannot be empty")
	}
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("name is empty")
	}
	inst.Name = name
	data, err := json.MarshalIndent(inst, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) UpdateFabricVersion(folderId, fabricVersion string) error {
	instInfo, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	instInfo.FabricVersion = fabricVersion
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	data, err := json.MarshalIndent(instInfo, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) UpdateInstanceDescription(folderId, description string) error {
	instInfo, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	instInfo.Description = description
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	data, err := json.MarshalIndent(instInfo, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) UpdateJavaArgs(folderId, args string) error {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	inst.JvmArgs = args
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

func (i *InstanceManager) GetJavaArgs(folderId string) (string, error) {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return "", err
	}
	return inst.JvmArgs, nil
}

func (i *InstanceManager) ListScreenshots(folderId string) ([]string, error) {
	var ScreenshotFileNames []string
	appdata, err := os.UserConfigDir()
	if err != nil {
		return []string{}, err
	}
	ssPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "screenshots")
	dir, err := os.ReadDir(ssPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return []string{}, err
	}
	for _, d := range dir {
		if d.IsDir() {
			continue
		}
		if !strings.HasSuffix(d.Name(), ".png") {
			continue
		}
		ScreenshotFileNames = append(ScreenshotFileNames, d.Name())
	}
	return ScreenshotFileNames, nil
}

func (i *InstanceManager) GetScreenshot(folderId, filename string) (string, error) {
	if strings.Contains(filename, "/") {
		return "", fmt.Errorf("filename is invalid")
	}
	if strings.Contains(filename, "\\") {
		return "", fmt.Errorf("filename is invalid")
	}
	if strings.Contains(filename, "..") {
		return "", fmt.Errorf("filename is invalid")
	}
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	ssPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "screenshots", filename)
	file, err := os.ReadFile(ssPath)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(file), nil
}

func (i *InstanceManager) DeleteScreenshot(folderId, filename string) (bool, error) {
	if strings.Contains(filename, "/") {
		return false, fmt.Errorf("filename is invalid")
	}
	if strings.Contains(filename, "\\") {
		return false, fmt.Errorf("filename is invalid")
	}
	if strings.Contains(filename, "..") {
		return false, fmt.Errorf("filename is invalid")
	}
	appdata, err := os.UserConfigDir()
	if err != nil {
		return false, err
	}
	ssPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "screenshots", filename)
	err = os.Remove(ssPath)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (i *InstanceManager) GetJavaPath(folderId string) (string, error) {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return "", err
	}
	return inst.JavaPath, nil
}

func (i *InstanceManager) UpdateJavaPath(folderId, javaPath string) error {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	inst.JavaPath = javaPath
	indent, err := json.MarshalIndent(inst, "", "  ")
	if err != nil {
		return err
	}
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	jsonFile := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "instance.json")
	err = os.WriteFile(jsonFile, indent, 0600)
	if err != nil {
		return err
	}
	return nil
}

func (i *InstanceManager) ListWorlds(folderId string) ([]string, error) {
	var validWorlds []string
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	worldPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "saves")
	dir, err := os.ReadDir(worldPath)
	if err != nil {
		return nil, nil
	}
	for _, d := range dir {
		if !d.IsDir() {
			continue
		}
		datFile := filepath.Join(worldPath, d.Name(), "level.dat")
		_, err := os.Stat(datFile)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		validWorlds = append(validWorlds, d.Name())
	}
	return validWorlds, nil
}

func (i *InstanceManager) GetLatestCrash(folderID string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	crashPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderID, "crash-reports")
	dir, err := os.ReadDir(crashPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	var newestFile string
	var newestTime time.Time
	for _, d := range dir {
		if d.IsDir() {
			continue
		}
		if !strings.HasSuffix(d.Name(), ".txt") {
			continue
		}
		info, derr := d.Info()
		if derr != nil {
			return "", derr
		}
		if info.ModTime().After(newestTime) {
			newestFile = filepath.Join(crashPath, info.Name())
			newestTime = info.ModTime()
		}
	}
	if newestFile == "" {
		return "", fmt.Errorf("couldn't find a crash report")
	}
	file, err := os.ReadFile(newestFile)
	if err != nil {
		return "", err
	}
	fileContents := string(file)
	return fileContents, nil
}

func (i *InstanceManager) ParseCrash(crash string) (string, error) {
	searchTerm := "Description: "
	index := strings.Index(crash, searchTerm)
	if index == -1 {
		if len(crash) < 2000 {
			return crash, nil
		}
		return crash[0:2000], nil
	}
	startIndex := index + len(searchTerm)
	endIndex := strings.Index(crash[startIndex:], "\n")
	if endIndex == -1 {
		if len(crash) < 2000 {
			return crash, nil
		}
		return crash[0:2000], nil
	}
	searchTerm = "Stacktrace: "
	sindex := strings.Index(crash, searchTerm)
	if sindex == -1 {
		if len(crash) < 2000 {
			return crash, nil
		}
		return crash[0:2000], nil
	}
	sindex += len(searchTerm)
	eindex := strings.Index(crash, "-- System Details --")
	if eindex == -1 {
		eindex = len(crash)
	}
	newCrash := "Description: \n" + strings.TrimSpace(crash[startIndex:startIndex+endIndex]) + "\n" + "Stacktrace: \n" + strings.TrimSpace(crash[sindex:eindex])
	return newCrash, nil
}

func (i *InstanceManager) AddPlaytime(folderId string, playtime int64) error {
	info, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	info.PlaytimeSeconds += playtime
	indentFile, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return err
	}
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	return os.WriteFile(base, indentFile, 0o600)
}

func (i *InstanceManager) GetInstPlaytime(folderId string) (int64, error) {
	info, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return 0, err
	}

	return info.PlaytimeSeconds, nil
}

func (i *InstanceManager) GetTotalPlaytime() (int64, error) {
	instances, err := i.ListInstances()
	if err != nil {
		return 0, err
	}
	var total int64
	for _, a := range instances {
		total += a.PlaytimeSeconds
	}
	return total, nil
}

func (i *InstanceManager) UpdateQuiltVersion(folderId, quiltVersion string) error {
	instInfo, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	instInfo.QuiltVersion = quiltVersion
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	data, err := json.MarshalIndent(instInfo, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) BackupInstance(folderId string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	instLocation := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	backupDir := filepath.Join(instLocation, "backups")
	err = os.MkdirAll(backupDir, 0o755)
	if err != nil {
		return "", err
	}
	fileName := time.Now().Format("2006-01-02_15-04-05")
	zipPath := filepath.Join(backupDir, "backup-"+fileName+".zip")
	file, err := os.Create(zipPath)
	if err != nil {
		return "", err
	}
	defer file.Close()
	zipWrite := zip.NewWriter(file)
	err = i.AddToZip(filepath.Join(instLocation, "saves"), "saves", zipWrite)
	if err != nil {
		return "", err
	}
	err = i.AddToZip(filepath.Join(instLocation, "config"), "config", zipWrite)
	if err != nil {
		return "", err
	}
	optionsPath := filepath.Join(instLocation, "options.txt")
	_, err = os.Stat(optionsPath)
	if err == nil {
		open, err := os.Open(optionsPath)
		if err != nil {
			return "", err
		}
		create, err := zipWrite.Create("options.txt")
		if err != nil {
			return "", err
		}
		_, err = io.Copy(create, open)
		if err != nil {
			return "", err
		}
		err = open.Close()
		if err != nil {
			return "", err
		}
	}
	err = zipWrite.Close()
	if err != nil {
		return "", err
	}
	return zipPath, nil
}

func (i *InstanceManager) AddToZip(src, zipPrefix string, zipWrite *zip.Writer) error {
	_, err := os.Stat(src)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	err = filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		relPath, _ := filepath.Rel(src, path)
		open, err := os.Open(path)
		if err != nil {
			return err
		}
		create, err := zipWrite.Create(filepath.ToSlash(filepath.Join(zipPrefix, relPath)))
		if err != nil {
			return err
		}
		_, err = io.Copy(create, open)
		if err != nil {
			return err
		}
		err = open.Close()
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (i *InstanceManager) ClearOldLogs(folderId string, val int) error {
	if val == 0 {
		return nil
	}
	refreshP := time.Duration(val)
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	logsPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "logs")
	dir, err := os.ReadDir(logsPath)
	if err == nil {
		for _, d := range dir {
			if d.IsDir() {
				continue
			}
			info, err := d.Info()
			if err != nil {
				continue
			}
			if time.Since(info.ModTime()) > refreshP*24*time.Hour {
				if d.Name() == "jvm.log" || d.Name() == "latest.log" {
					continue
				}
				err = os.Remove(filepath.Join(logsPath, d.Name()))
				if err != nil {
					continue
				}
			}
		}
	}
	crashPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "crash-reports")
	dir, err = os.ReadDir(crashPath)
	if err == nil {
		for _, d := range dir {
			if d.IsDir() {
				continue
			}
			info, err := d.Info()
			if err != nil {
				continue
			}
			if time.Since(info.ModTime()) > refreshP*24*time.Hour {
				if d.Name() == "jvm.log" || d.Name() == "latest.log" {
					continue
				}
				err = os.Remove(filepath.Join(crashPath, d.Name()))
				if err != nil {
					continue
				}
			}
		}
	}
	return nil
}

func (i *InstanceManager) ClearAllOldLogs() error {
	instances, err := i.ListInstances()
	if err != nil {
		return err
	}
	for _, in := range instances {
		err := i.ClearOldLogs(in.Uuid, 7)
		if err != nil {
			continue
		}
	}
	return nil
}

func (i *InstanceManager) UpdatePrelaunchCmd(folderId, prelaunch string) error {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	inst.PrelaunchCmd = prelaunch
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

func (i *InstanceManager) UpdateWrapperCmd(folderId, wrapper string) error {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	inst.WrapperCmd = wrapper
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

func (i *InstanceManager) UpdatePostExitCmd(folderId, postExit string) error {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	inst.PostExitCmd = postExit
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

func (i *InstanceManager) GetWrapperCmd(folderId string) (string, error) {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return "", err
	}
	return inst.WrapperCmd, nil
}

func (i *InstanceManager) GetPreLaunchCmd(folderId string) (string, error) {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return "", err
	}
	return inst.PrelaunchCmd, nil
}

func (i *InstanceManager) GetPostExitCmd(folderId string) (string, error) {
	inst, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return "", err
	}
	return inst.PostExitCmd, nil
}

func (i *InstanceManager) DuplicateInstance(folderId, newName string) (*Instance, error) {
	info, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return nil, err
	}
	instance, err := i.CreateInstance(newName, info.Version)
	if err != nil {
		return nil, err
	}
	err = i.UpdateMemory(instance.Uuid, info.MinRam, info.MaxRam)
	if err != nil {
		return nil, err
	}
	if info.FabricVersion != "" {
		err = i.UpdateFabricVersion(instance.Uuid, info.FabricVersion)
		if err != nil {
			return nil, err
		}
	} else if info.QuiltVersion != "" {
		err = i.UpdateQuiltVersion(instance.Uuid, info.QuiltVersion)
		if err != nil {
			return nil, err
		}
	} else if info.NeoForgeVersion != "" {
		err = i.UpdateNeoForgeVersion(instance.Uuid, info.NeoForgeVersion)
		if err != nil {
			return nil, err
		}
	} else if info.ForgeVersion != "" {
		err = i.UpdateForgeVersion(instance.Uuid, info.ForgeVersion)
		if err != nil {
			return nil, err
		}
	}
	if info.JavaPath != "" {
		err = i.UpdateJavaPath(instance.Uuid, info.JavaPath)
		if err != nil {
			return nil, err
		}
	}
	if info.JvmArgs != "" {
		err = i.UpdateJavaArgs(instance.Uuid, info.JvmArgs)
		if err != nil {
			return nil, err
		}
	}
	if info.PrelaunchCmd != "" {
		err = i.UpdatePrelaunchCmd(instance.Uuid, info.PrelaunchCmd)
		if err != nil {
			return nil, err
		}
	}
	if info.WrapperCmd != "" {
		err = i.UpdateWrapperCmd(instance.Uuid, info.WrapperCmd)
		if err != nil {
			return nil, err
		}
	}
	if info.PostExitCmd != "" {
		err = i.UpdatePostExitCmd(instance.Uuid, info.PostExitCmd)
		if err != nil {
			return nil, err
		}
	}
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	oldInst := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	newInst := filepath.Join(appdata, "SaturnLauncher", "instances", instance.Uuid)
	skipList := map[string]bool{"logs": true, "backups": true, "crash-reports": true, "instance.json": true}
	err = filepath.WalkDir(oldInst, func(path string, d fs.DirEntry, err error) error {
		if skipList[d.Name()] {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if d.IsDir() {
			return nil
		}
		relPath, err := filepath.Rel(oldInst, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(newInst, relPath)
		err = os.MkdirAll(filepath.Dir(dstPath), 0o755)
		if err != nil {
			return err
		}
		srcFile, err := os.Open(path)
		if err != nil {
			return err
		}
		dstFile, err := os.Create(dstPath)
		if err != nil {
			srcFile.Close()
			return err
		}
		_, err = io.Copy(dstFile, srcFile)
		if err != nil {
			return err
		}
		err = srcFile.Close()
		if err != nil {
			return err
		}
		err = dstFile.Close()
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return instance, nil
}

func (i *InstanceManager) ClearInstanceCache(folderId string) error {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	instDir := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	err = os.RemoveAll(filepath.Join(instDir, "logs"))
	if err != nil {
		return err
	}
	err = os.RemoveAll(filepath.Join(instDir, "crash-reports"))
	if err != nil {
		return err
	}
	err = os.RemoveAll(filepath.Join(instDir, ".mixin.out"))
	if err != nil {
		return err
	}
	return nil
}

func (i *InstanceManager) RestoreBackup(folderId, backupFilename string) error {
	if strings.Contains(backupFilename, "/") {
		return fmt.Errorf("backupFilename is invalid")
	}
	if strings.Contains(backupFilename, "\\") {
		return fmt.Errorf("backupFilename is invalid")
	}
	if strings.Contains(backupFilename, "..") {
		return fmt.Errorf("backupFilename is invalid")
	}
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	zipPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "backups", backupFilename)
	instPath := filepath.Join(appdata, "SaturnLauncher", "instances", folderId)
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, f := range reader.File {
		isConfig := strings.HasPrefix(f.Name, "config/")
		isSaves := strings.HasPrefix(f.Name, "saves/")
		isOptions := f.Name == "options.txt"
		if !isConfig && !isSaves && !isOptions {
			continue
		}
		destPath := filepath.Join(instPath, f.Name)
		if !strings.HasPrefix(destPath, instPath+string(os.PathSeparator)) {
			continue
		}
		err = os.MkdirAll(filepath.Dir(destPath), 0o755)
		if err != nil {
			return err
		}
		srcFile, err := f.Open()
		if err != nil {
			return err
		}
		dstFile, err := os.Create(destPath)
		if err != nil {
			return err
		}
		_, err = io.Copy(dstFile, srcFile)
		if err != nil {
			return err
		}
		err = dstFile.Close()
		if err != nil {
			return err
		}
		err = srcFile.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func (i *InstanceManager) ListBackups(folderId string) ([]string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	instDir := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "backups")
	dir, err := os.ReadDir(instDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	var backups []string
	for _, d := range dir {
		if d.IsDir() {
			continue
		}
		if strings.HasSuffix(d.Name(), ".zip") {
			backups = append(backups, d.Name())
		}
	}
	return backups, nil
}

func (i *InstanceManager) UpdateNeoForgeVersion(folderId, neoforgeVersion string) error {
	instInfo, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	instInfo.NeoForgeVersion = neoforgeVersion
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	data, err := json.MarshalIndent(instInfo, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) UpdateForgeVersion(folderId, forgeVersion string) error {
	instInfo, err := i.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	instInfo.ForgeVersion = forgeVersion
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "instance.json")
	data, err := json.MarshalIndent(instInfo, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(base, data, 0o600)
}

func (i *InstanceManager) CreateServerInstance(name string, version string) (*ServerInstance, error) {
	id := uuid.New()
	idString := id.String()
	var serverInstance ServerInstance
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdata, "SaturnLauncher")
	instanceDir := filepath.Join(base, "serverInstances", idString)
	err = os.MkdirAll(instanceDir, 0o755)
	if err != nil {
		return nil, err
	}
	serverInstance = ServerInstance{
		Name:        name,
		Version:     version,
		TimeCreated: time.Now().Format(time.RFC3339),
		Uuid:        idString,
		MinRam:      2048,
		MaxRam:      4096,
		EulaStatus:  false,
	}

	jsonFile, err := json.MarshalIndent(serverInstance, "", "  ")
	if err != nil {
		return nil, err
	}
	jsonLocation := filepath.Join(instanceDir, "instance.json")
	err = os.WriteFile(jsonLocation, jsonFile, 0o600)
	if err != nil {
		return nil, err
	}

	// Install Server Files now
	dl := download.NewDownload()
	vInfo, err := dl.DownloadServer(version, idString)
	if err != nil {
		return nil, err
	}
	java, err := dl.EnsureJava(*vInfo)
	if err != nil {
		return nil, err
	}
	// First run to generate files + eula
	server := exec.Command(*java, "-Xms"+strconv.Itoa(serverInstance.MinRam)+"M", "-Xmx"+strconv.Itoa(serverInstance.MaxRam)+"M", "-jar", "server.jar", "nogui")
	server.Dir = instanceDir
	output, err := server.CombinedOutput()
	fmt.Println(string(output))
	if err != nil {
		return nil, err
	}
	return &serverInstance, nil
}

func (i *InstanceManager) GetServerInstanceInfo(folderId string) (*ServerInstance, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "instance.json")

	var inst ServerInstance
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

func (i *InstanceManager) GetServerProperties(folderId string) (map[string]string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	propertiesPath := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "server.properties")
	_, err = os.Stat(propertiesPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("no server.properties file exists")
		}
		return nil, err
	}
	cfg, err := ini.Load(propertiesPath)
	if err != nil {
		return nil, err
	}
	sProps := cfg.Section("").KeysHash()
	return sProps, nil
}

func (i *InstanceManager) EditServerProperties(folderId, key, val string) error {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	propertiesPath := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "server.properties")
	cfg, err := ini.Load(propertiesPath)
	if err != nil {
		return err
	}
	section := cfg.Section("")
	section.Key(key).SetValue(val)
	err = cfg.SaveTo(propertiesPath)
	if err != nil {
		return err
	}
	return nil
}

func (i *InstanceManager) AddUsernameToWhitelist(folderId, username string) error {
	skins := skins2.NewSkinsManager()
	UserInfo, err := skins.GetUUIDByUsername(username)
	if err != nil {
		return err
	}
	whitelist, err := i.ReadWhitelist(folderId)
	if err != nil {
		return err
	}
	newWhitelist := Whitelist{
		UUID: UserInfo.Id,
		Name: UserInfo.Name,
	}
	whitelist = append(whitelist, newWhitelist)
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	serverWhitelist := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "whitelist.json")
	filebytes, err := json.MarshalIndent(whitelist, "", "  ")
	if err != nil {
		return err
	}
	err = os.WriteFile(serverWhitelist, filebytes, 0600)
	if err != nil {
		return err
	}
	return nil
}

func (i *InstanceManager) ReadWhitelist(folderId string) ([]Whitelist, error) {
	var whitelist []Whitelist
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	serverWhitelist := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "whitelist.json")
	file, err := os.ReadFile(serverWhitelist)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(file, &whitelist)
	if err != nil {
		return nil, err
	}
	return whitelist, nil
}

func (i *InstanceManager) ReadBanList(folderId string) ([]Banlist, error) {
	var banlist []Banlist
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	serverBanlist := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "banned-players.json")
	file, err := os.ReadFile(serverBanlist)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(file, &banlist)
	if err != nil {
		return nil, err
	}
	return banlist, nil
}

func (i *InstanceManager) AddUserNameToBanList(folderId, username, reason string) error {
	skins := skins2.NewSkinsManager()
	userId, err := skins.GetUUIDByUsername(username)
	if err != nil {
		return err
	}
	banlist, err := i.ReadBanList(folderId)
	if err != nil {
		return err
	}
	if reason == "" {
		reason = "Banned by server manager"
	}
	newBanlist := Banlist{
		UUID:   userId.Id,
		Name:   userId.Name,
		Reason: reason,
		Source: "Server",
	}
	banlist = append(banlist, newBanlist)
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	serverBanlist := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "banned-players.json")
	data, err := json.MarshalIndent(serverBanlist, "", "  ")
	if err != nil {
		return err
	}
	err = os.WriteFile(serverBanlist, data, 0600)
	if err != nil {
		return err
	}
	return nil
}

func (i *InstanceManager) ReadOpsList(folderId string) ([]OpsList, error) {
	var opsList []OpsList
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	serverOpsList := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "ops.json")
	file, err := os.ReadFile(serverOpsList)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(file, &opsList)
	if err != nil {
		return nil, err
	}
	return opsList, nil
}

func (i *InstanceManager) AddUsernameToOpsList(folderId, username string, level int) error {
	if level > 4 {
		return fmt.Errorf("level is invalid. Please choose a level between 0-4")
	}
	skins := skins2.NewSkinsManager()
	userId, err := skins.GetUUIDByUsername(username)
	if err != nil {
		return err
	}
	opList, err := i.ReadOpsList(folderId)
	if err != nil {
		return err
	}
	newOpList := OpsList{
		UUID:  userId.Id,
		Name:  userId.Name,
		Level: level,
	}
	opList = append(opList, newOpList)
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	serverOpsList := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "ops.json")
	data, err := json.MarshalIndent(opList, "", "  ")
	if err != nil {
		return err
	}
	err = os.WriteFile(serverOpsList, data, 0600)
	if err != nil {
		return err
	}
	return nil
}
