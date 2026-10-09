package main

import (
	"SaturnLauncher/backend/auth"
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/fabric"
	"SaturnLauncher/backend/instances"
	"SaturnLauncher/backend/launch"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct

type App struct {
	ctx               context.Context
	Auth              *auth.Auth
	Account           *auth.Account
	ActiveAccessToken string
	Launch            *launch.Launch
	Download          *download.Download
	InstanceManager   *instances.InstanceManager
	Fabric            *fabric.Fabric
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		Auth:            auth.NewAuth(),
		Account:         auth.NewAccount(),
		Launch:          launch.NewLaunch(),
		Download:        download.NewDownload(),
		InstanceManager: instances.NewInstanceManager(),
		Fabric:          fabric.NewFabric(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	_, err := instances.NewInstanceManager().InitStorage()
	if err != nil {
		return
	}
	_, err = a.Download.GetVersionManifest()
	if err != nil {
		return
	}
	wailsRuntime.WindowSetMinSize(ctx, 1000, 700)
	wailsRuntime.WindowSetMaxSize(ctx, 0, 0)
}

// StartLogin is run in js on the login page
func (a *App) StartLogin() {
	go func() {
		// 1. Get OAuth Device Code
		payload, err := a.Auth.GetOAuthCode()
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
			return
		}
		// Send code & URL to frontend to render
		wailsRuntime.EventsEmit(a.ctx, "login:send_received", payload)
		// payload.DeviceCode is the code
		// payload.VerificationUri is the url
		// 2. Poll for Access Token (blocking call)
		at, err := a.Auth.PollOAuthCode(*payload)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
			return
		}
		// 3. Exchange tokens through Xbox Live and Minecraft Services
		xbt, err := a.Auth.GetXBL(*at)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
			return
		}

		xsts, err := a.Auth.GetXSTS(*xbt)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
			return
		}

		mctoken, err := a.Auth.GetMinecraftAuth(*xsts, *xbt)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
			return
		}

		mcinfo, err := a.Auth.GetAccountInfo(*mctoken)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Failed to retrieve profile ."+err.Error())
			return
		}
		if mcinfo.Error != "" || mcinfo.UUID == "" {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "User does not own Minecraft Java Edition."+err.Error())
			return
		}

		// 4. Save Refresh Session
		if len(xbt.DisplayClaims.Xui) == 0 {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Missing UserHash from Xbox Live response")
			return
		}

		session := auth.AuthSession{
			Username:     mcinfo.Username,
			UUID:         mcinfo.UUID,
			RefreshToken: at.RefreshToken,
			Uhs:          xbt.DisplayClaims.Xui[0].Uhs,
			Xuid:         xsts.DisplayClaims.Xui[0].Xid,
		}
		err = a.Auth.SaveAndActivateAccount(session)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Failed save the account ."+err.Error())
			return
		}
		// 5. Notify frontend on completion
		wailsRuntime.EventsEmit(a.ctx, "login:success", mcinfo)

	}()
}

func (a *App) StartApp() {
	go func() {
		a.ActiveAccessToken = ""
		Keys, err := a.Auth.GetActiveAccount()
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		mctoken, NewAuthSession, err := a.Auth.RefreshMinecraftToken(*Keys)
		if err != nil {
			_ = a.DeleteAccount(Keys.UUID)
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		if strings.TrimSpace(NewAuthSession.RefreshToken) == "" {
			wailsRuntime.EventsEmit(a.ctx, "auth:required", fmt.Errorf("refresh Key Is Empty"))
			return
		}
		err = a.Auth.SaveAndActivateAccount(NewAuthSession)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		a.ActiveAccessToken = mctoken.AccessToken

		mcinfo, err := a.Auth.GetAccountInfo(mctoken)
		if err != nil || mcinfo.Error != "" || mcinfo.UUID == "" {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}

		wailsRuntime.EventsEmit(a.ctx, "auth:success", mcinfo)
		return
	}()
}

func (a *App) StartGame(folderId string) error {
	/* err := a.InstallFabric(folderId, "0.19.5")
	if /* err != nil {
		return /* err
	} */
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	Keys, err := a.Auth.GetActiveAccount()
	if err != nil {
		return err
	}
	mcpayload, Session, err := a.Auth.RefreshMinecraftToken(*Keys)
	if err != nil {
		return err
	}
	err = a.Auth.SaveAndActivateAccount(Session)
	if err != nil {
		return err
	}
	mcinfo, err := a.Auth.GetAccountInfo(mcpayload)
	if err != nil {
		return err
	}
	instInfo, err := a.InstanceManager.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	version := instInfo.Version
	if version == "" {
		version = "26.2"
	}
	var manifest download.VersionManifest
	base := filepath.Join(appdatadir, "SaturnLauncher")
	jsonPath := filepath.Join(base, "version_manifest_v2.json")
	jsonReader, err := os.Open(jsonPath)
	if err != nil {
		return err
	}
	defer jsonReader.Close()
	bytes, err := io.ReadAll(jsonReader)
	if err != nil {
		return err
	}
	err = json.Unmarshal(bytes, &manifest)
	if err != nil {
		return err
	}
	var filteredManifest download.VersionManifest
	for _, ver := range manifest.Versions {
		if ver.Type != "release" {
			continue
		}
		if ver.ID == "1.13.2" {
			break
		}
		filteredManifest.Versions = append(filteredManifest.Versions, ver)
	}

	err = a.Download.GetVersionInfo(filteredManifest, version)
	if err != nil {
		return err
	}
	vInfo, err := a.Download.ParseVersionInfo(version)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "download:progress", "Downloading Client Jar")
	if instInfo.FabricVersion != "" {
		fInfo, err := a.Download.ParseVersionInfo(instInfo.FabricVersion)
		if err != nil {
			return err
		}

		vInfo.MainClass = fInfo.MainClass
		vInfo.Libraries = append(vInfo.Libraries, fInfo.Libraries...)
		vInfo.Arguments.Jvm = append(vInfo.Arguments.Jvm, fInfo.Arguments.Jvm...)
		vInfo.Arguments.Game = append(vInfo.Arguments.Game, fInfo.Arguments.Game...)
		vInfo.ID = fInfo.ID
	}
	err = a.Download.GetClientJar(*vInfo)
	if err != nil {
		return err
	}

	wailsRuntime.EventsEmit(a.ctx, "download:progress", "Downloading Libraries")
	err = a.Download.GetLibraries(*vInfo)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "download:progress", "Downloading Game Assets")
	err = a.Download.GetAssets(*vInfo)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "download:progress", "Extracting Natives")
	err = a.Download.ExtractNatives(*vInfo)
	if err != nil {
		return err
	}
	java, err := a.Download.GetJava(*vInfo)
	if err != nil {
		return err
	}
	ensureJava, err := a.Download.EnsureJava(java, *vInfo)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "download:progress", "Done!")
	classpath, err := a.Launch.ClasspathBuilder(*vInfo)
	if err != nil {
		return err
	}
	args, err := a.Launch.BuildArgs(*mcinfo, folderId, classpath, *vInfo, mcpayload, Session)
	if err != nil {
		return err
	}
	jvm, err := a.Launch.CreateArgs(args, vInfo.Arguments.Jvm)
	if err != nil {
		return err
	}
	jvm = append([]string{
		fmt.Sprintf("-Xms%dM", instInfo.MinRam),
		fmt.Sprintf("-Xmx%dM", instInfo.MaxRam),
	}, jvm...)
	game, err := a.Launch.CreateArgs(args, vInfo.Arguments.Game)
	if err != nil {
		return err
	}
	fullargs := make([]string, 0, len(jvm)+1+len(game))
	fullargs = append(fullargs, jvm...)
	fullargs = append(fullargs, vInfo.MainClass)
	fullargs = append(fullargs, game...)
	instDir := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId)
	logDir := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId, "logs")
	err = os.MkdirAll(logDir, 0o755)
	if err != nil {
		return err
	}
	logPath := filepath.Join(logDir, "jvm.log")
	file, err := os.Create(logPath)
	if err != nil {
		return err
	}
	cmd := exec.Command(*ensureJava, fullargs...)
	// cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	a.Launch.HideConsole(cmd)
	cmd.Dir = instDir // saves logs to jvm.log in the future make a func that reads the files and returns its content for the frontend
	cmd.Stdout = file
	cmd.Stderr = file
	err = cmd.Start()
	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "game:error", err.Error())
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "game:start", "Game Launching....")
	go func() {
		if err := cmd.Wait(); err != nil {
			fmt.Printf("minecraft exited with error: %s\n", err)
		}
		err := file.Close()
		if err != nil {
			return
		}
	}()
	return nil
}

func (a *App) GetVersions() ([]download.Version, error) {
	var manifest download.VersionManifest
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")
	jsonPath := filepath.Join(base, "version_manifest_v2.json")
	jsonReader, err := os.Open(jsonPath)
	if err != nil {
		return nil, err
	}
	defer jsonReader.Close()
	bytes, err := io.ReadAll(jsonReader)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(bytes, &manifest)
	if err != nil {
		return nil, err
	}
	var filteredManifest download.VersionManifest
	for _, ver := range manifest.Versions {
		if ver.Type != "release" {
			continue
		}
		if ver.ID == "1.13.2" {
			break
		}
		filteredManifest.Versions = append(filteredManifest.Versions, ver)
	}
	return filteredManifest.Versions, nil
}

// init instancemanager
func (a *App) ListInstances() ([]instances.Instance, error) {
	return a.InstanceManager.ListInstances()
}

func (a *App) CreateInstance(name string, version string) (*instances.Instance, error) {
	inst, err := a.InstanceManager.CreateInstance(name, version)
	if err != nil {
		return nil, err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return inst, err
}

func (a *App) DeleteInstance(id string) (bool, error) {
	instance, err := a.InstanceManager.DeleteInstance(id)
	if err != nil {
		return false, err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return instance, nil
}

func (a *App) GetInstanceInfo(folderId string) (*instances.Instance, error) {
	info, err := a.InstanceManager.GetInstanceInfo(folderId)
	if err != nil {
		return nil, err
	}
	return info, nil
}

func (a *App) UpdateMem(folderId string, minram, maxram int) error {
	err := a.InstanceManager.UpdateMemory(folderId, minram, maxram)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}
func (a *App) RenameInstance(folderId, name string) error {
	err := a.InstanceManager.RenameInstance(folderId, name)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}

func (a *App) Logout() {
	a.ActiveAccessToken = ""
	account, err := a.GetActiveAccount()
	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "auth:required")
		return
	}
	err = a.DeleteAccount(account.UUID)
	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "auth:required")
		return
	}

	wailsRuntime.EventsEmit(a.ctx, "auth:required")
}

func (a *App) OpenInstanceFolder(folderId string) error {
	err := a.InstanceManager.OpenInstanceFolder(folderId)
	if err != nil {
		return err
	}

	return nil
}

func (a *App) ListAccounts() ([]auth.AuthSession, error) {
	return a.Auth.ListAccounts()
}

func (a *App) GetActiveAccount() (*auth.AuthSession, error) {
	return a.Auth.GetActiveAccount()
}

func (a *App) SetActiveAccount(uuid string) error {
	err := a.Auth.SetActiveAccount(uuid)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "account:changed")
	return nil
}

func (a *App) DeleteAccount(uuid string) error {
	_, err := a.Auth.DeleteAccount(uuid)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "account:changed")
	return nil
}

func (a *App) GetTotalRam() (*instances.Ram, error) {
	ram, err := a.InstanceManager.GetTotalRam()
	if err != nil {
		return nil, err
	}
	return ram, nil
}

func (a *App) InstallFabric(folderId, loaderVersion string) error {
	if loaderVersion == "" {
		return fmt.Errorf("loader version field is empty, cannot proceed")
	}
	instInfo, err := a.InstanceManager.GetInstanceInfo(folderId)
	if err != nil {
		return err
	}
	profileId, err := a.Fabric.InstallFabric(instInfo.Version, loaderVersion)
	if err != nil {
		return err
	}
	err = a.InstanceManager.UpdateFabricVersion(folderId, profileId)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}

func (a *App) GetFabricLoaders(gameVersion string) ([]fabric.LoaderVersion, error) {
	versions, err := a.Fabric.GetLoaderVersions(gameVersion)
	if err != nil {
		return nil, err
	}
	return versions, nil
}

func (a *App) UpdateInstanceDescription(folderId, description string) error {
	err := a.InstanceManager.UpdateInstanceDescription(folderId, description)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}

func (a *App) PickInstanceIcon(folderId string) (string, error) {
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select an icon",
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: "Images",
				Pattern:     "*.png,*.jpg,*.jpeg",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

func (a *App) SetInstanceIcon(folderId, path string) (string, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher")
	instIconDir := filepath.Join(base, "instances", folderId, "icon.png")
	open, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer open.Close()
	extension := filepath.Ext(path)
	var img image.Image
	switch extension {
	case ".jpg", ".jpeg":
		img, err = jpeg.Decode(open)
		if err != nil {
			return "", err
		}
	case ".png":
		img, err = png.Decode(open)
		if err != nil {
			return "", err
		}
	default:
		return "", fmt.Errorf("image format not supported")
	}
	file, err := os.Create(instIconDir)
	if err != nil {
		return "", err
	}
	defer file.Close()
	resizedImg := imaging.Fill(img, 512, 512, imaging.Center, imaging.CatmullRom)
	err = png.Encode(file, resizedImg)
	if err != nil {
		return "", err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	readFile, err := os.ReadFile(instIconDir)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(readFile), nil
}

func (a *App) UninstallFabric(folderId string) error {
	err := a.InstanceManager.UpdateFabricVersion(folderId, "")
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}

func (a *App) GetInstanceIcon(folderId string) (string, error) {
	appdataDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	iconDir := filepath.Join(appdataDir, "SaturnLauncher", "instances", folderId, "icon.png")
	file, err := os.ReadFile(iconDir)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}

	return base64.StdEncoding.EncodeToString(file), nil
}

func (a *App) InstallContent(folderId, contentType string) (string, error) {
	contentDir, fileFormat, err := ContentDir(folderId, contentType)
	if err != nil {
		return "", err
	}
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Content",
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: contentType,
				Pattern:     fileFormat,
			},
		}})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}
	destPath := filepath.Join(contentDir, filepath.Base(path))
	err = os.MkdirAll(contentDir, 0o755)
	if err != nil {
		return "", err
	}
	file, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	err = os.WriteFile(destPath, file, 0644)
	if err != nil {
		return "", err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return filepath.Base(path), nil
}

func ContentDir(folderId, contentType string) (string, string, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return "", "", err
	}
	base := filepath.Join(appdatadir, "SaturnLauncher", "instances", folderId)
	modDir := filepath.Join(base, "mods")
	rpDir := filepath.Join(base, "resourcepacks")
	shadersDir := filepath.Join(base, "shaderpacks")
	var contentDir string
	var fileFormat string
	switch contentType {
	case "mods":
		fileFormat = "*.jar"
		contentDir = modDir
	case "resourcepacks":
		fileFormat = "*.zip"
		contentDir = rpDir
	case "shaders":
		fileFormat = "*.zip"
		contentDir = shadersDir
	default:
		return "", "", fmt.Errorf("content type is not supported")
	}

	return contentDir, fileFormat, nil
}

func (a *App) GetInstalledContent(folderId, contentType string) ([]string, error) {
	contentDir, _, err := ContentDir(folderId, contentType)
	if err != nil {
		return nil, err
	}
	dir, err := os.ReadDir(contentDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	Content := make([]string, 0, len(dir))
	for _, r := range dir {
		if r.IsDir() {
			continue
		}
		Content = append(Content, r.Name())
	}

	return Content, nil
}

func (a *App) RemoveContent(folderId, contentType, filename string) error {
	if strings.Contains(filename, "/") {
		return fmt.Errorf("filename is invalid")
	}
	if strings.Contains(filename, "\\") {
		return fmt.Errorf("filename is invalid")
	}
	if strings.Contains(filename, "..") {
		return fmt.Errorf("filename is invalid")
	}
	contentDir, _, err := ContentDir(folderId, contentType)
	if err != nil {
		return err
	}
	dest := filepath.Join(contentDir, filename)
	err = os.Remove(dest)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}
