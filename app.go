package main

import (
	"SaturnLauncher/backend/Skins"
	"SaturnLauncher/backend/auth"
	"SaturnLauncher/backend/autoupdater"
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/fabric"
	"SaturnLauncher/backend/instances"
	"SaturnLauncher/backend/launch"
	"SaturnLauncher/backend/modpacks"
	"SaturnLauncher/backend/modrinth"
	"archive/zip"
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	"github.com/hugolgst/rich-go/client"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct

type App struct {
	ctx                context.Context
	Auth               *auth.Auth
	ActiveAccessToken  string
	Launch             *launch.Launch
	Download           *download.Download
	InstanceManager    *instances.InstanceManager
	Fabric             *fabric.Fabric
	Modrinth           *modrinth.Modrinth
	Mrpack             *modpacks.Mrpack
	RunningInstances   map[string]*exec.Cmd
	mu                 sync.Mutex
	Skins              *Skins.Skins
	Updater            *autoupdater.Updater
	IsDiscordConnected bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		Auth:             auth.NewAuth(),
		Launch:           launch.NewLaunch(),
		Download:         download.NewDownload(),
		InstanceManager:  instances.NewInstanceManager(),
		Fabric:           fabric.NewFabric(),
		Modrinth:         modrinth.NewModrinth(),
		Mrpack:           modpacks.NewMrpack(),
		RunningInstances: make(map[string]*exec.Cmd),
		Skins:            Skins.NewSkinsManager(),
		Updater:          autoupdater.NewUpdater(),
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
	go func() {
		err := client.Login("1563418347733786754")
		if err != nil {
			fmt.Print("couldn't find discord")
		}
		a.IsDiscordConnected = true
		a.UpdateDiscordActivity("Idling...", "just... doing nothing i guess ?")
	}()
	go func() {
		time.Sleep(3 * time.Second)
		a.Updater.Update()
	}()
}

func (a *App) UpdateDiscordActivity(state, details string) {
	now := time.Now()
	if a.IsDiscordConnected != true {
		return
	}
	err := client.SetActivity(client.Activity{
		Details:    details,
		State:      state,
		LargeImage: "",
		LargeText:  "",
		SmallImage: "",
		SmallText:  "",
		Party:      nil,
		Timestamps: &client.Timestamps{
			Start: &now, // why
		},
		Buttons: nil, // maybe use to join the same server or smth as an option ????
	})
	if err != nil {
		fmt.Print("couldn't set activity")
	}
}

// StartLogin is run in js on the login page
func (a *App) StartLogin() {
	go func() {
		a.UpdateDiscordActivity("Logging In", "")
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
	a.UpdateDiscordActivity("Installing Game", "Installing Minecraft "+instInfo.Version)

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
	wailsRuntime.EventsEmit(a.ctx, "download:progress", "Installing Java")
	ensureJava, err := a.Download.EnsureJava(*vInfo)
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
	if instInfo.JvmArgs != "" {
		customArgs := strings.Fields(instInfo.JvmArgs)
		jvm = append(jvm, customArgs...)
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
	mc := exec.Command(*ensureJava, fullargs...)
	var waitGroup sync.WaitGroup
	waitGroup.Add(2)
	a.Launch.HideConsole(mc)
	mc.Dir = instDir // saves logs to jvm.log in the future make a func that reads the files and returns its content for the frontend
	stdout, err := mc.StdoutPipe()
	if err != nil {
		err := file.Close()
		if err != nil {
			return err
		}
		return err
	}
	stderr, err := mc.StderrPipe()
	if err != nil {
		err := file.Close()
		if err != nil {
			return err
		}
		return err
	}
	a.UpdateDiscordActivity("Starting Game", "Playing Minecraft "+instInfo.Version)
	err = mc.Start()
	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "game:error", err.Error())
		err := file.Close()
		if err != nil {
			return err
		}
		a.UpdateDiscordActivity("Idling...", "just... doing nothing i guess ? Well they crashed.")
		return err
	}
	a.mu.Lock()
	a.RunningInstances[folderId] = mc
	a.mu.Unlock()
	wailsRuntime.EventsEmit(a.ctx, "game:started", folderId)
	go func() {
		defer waitGroup.Done()
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			wailsRuntime.EventsEmit(a.ctx, "game:info", line)
			_, err := fmt.Fprintln(file, line)
			if err != nil {
				fmt.Println(err)
			}
		}
		if scanner.Err() != nil {
			fmt.Println(scanner.Err())
		}
	}()
	go func() {
		defer waitGroup.Done()
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			wailsRuntime.EventsEmit(a.ctx, "game:error", line)
			_, err := fmt.Fprintln(file, line)
			if err != nil {
				fmt.Println(err)
			}
		}
		if scanner.Err() != nil {
			fmt.Println(scanner.Err())
		}
	}()

	go func() {
		a.UpdateDiscordActivity("Playing Game", "Playing Minecraft "+instInfo.Version)
		waitGroup.Wait()
		err := mc.Wait()
		var code int
		var exitError *exec.ExitError
		if err != nil {
			if errors.As(err, &exitError) {
				code = exitError.ExitCode()
			} else {
				code = -1
			}
		}

		err = file.Close()
		if err != nil {
			fmt.Println(err)
		}
		wailsRuntime.EventsEmit(a.ctx, "game:stopped", map[string]any{
			"folderId": folderId,
			"exitCode": code,
		})
		a.UpdateDiscordActivity("Stopping Game", "Stopping Minecraft "+instInfo.Version)

		a.mu.Lock()
		delete(a.RunningInstances, folderId)
		a.mu.Unlock()
		a.UpdateDiscordActivity("Idling...", "just... doing nothing i guess ?")
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

func (a *App) PickInstanceIcon() (string, error) {
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select an icon",
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: "Images",
				Pattern:     "*.png;*.jpg;*.jpeg",
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

func (a *App) InstallContent(folderId, contentType, path string) (string, error) {
	contentDir, fileFormat, err := a.Download.ContentDir(folderId, contentType)
	if err != nil {
		return "", err
	}
	if path == "" {
		path, err = wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
			Title: "Select Content",
			Filters: []wailsRuntime.FileFilter{
				{
					DisplayName: contentType,
					Pattern:     fileFormat,
				},
			}})
	}
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
	foundPackMcmeta := false
	if contentType == "resourcepacks" {
		reader, err := zip.OpenReader(path)
		if err != nil {
			return "", err
		}
		defer reader.Close()
		for _, f := range reader.File {
			if f.FileInfo().IsDir() {
				continue
			}
			if filepath.Base(f.Name) == "pack.mcmeta" {
				foundPackMcmeta = true
				break
			}
		}
		if !foundPackMcmeta {
			return "", fmt.Errorf("zip is not a resource pack")
		}
	} else if contentType == "shaders" {
		reader, err := zip.OpenReader(path)
		if err != nil {
			return "", err
		}
		defer reader.Close()
		isShader := false
		for _, f := range reader.File {
			if f.FileInfo().IsDir() {
				continue
			}
			if strings.HasPrefix(f.Name, "shaders/") {
				isShader = true
				break
			}
		}
		if !isShader {
			return "", fmt.Errorf("zip is not a shader")
		}
	}
	err = os.WriteFile(destPath, file, 0644)
	if err != nil {
		return "", err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return filepath.Base(path), nil
}

func (a *App) GetInstalledContent(folderId, contentType string) ([]download.ContentInfo, error) {
	content, err := a.Download.GetInstalledContent(folderId, contentType)
	if err != nil {
		return nil, err
	}
	return content, nil
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
	contentDir, _, err := a.Download.ContentDir(folderId, contentType)
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

func (a *App) GetDiscoveryPage(projectType, version, categories, query string) (*modrinth.DiscoverProjects, error) {
	discoveryPage, err := a.Modrinth.GetDiscoveryPage(projectType, version, categories, query)
	if err != nil {
		return nil, err
	}
	return discoveryPage, nil
}

func (a *App) GetProjectPage(projectId string) (*modrinth.ProjectPage, error) {
	project, err := a.Modrinth.GetProject(projectId)
	if err != nil {
		return nil, err
	}
	return project, nil
}

func (a *App) GetProjectVersions(projectId, gameVersion string) ([]modrinth.VersionInfo, error) {
	versions, err := a.Modrinth.GetVersions(projectId, gameVersion)
	if err != nil {
		return nil, err
	}
	return versions, nil
}

func (a *App) InstallProjectContent(folderId, contentType, versionId string) (string, error) {
	instInfo, err := a.GetInstanceInfo(folderId)
	if err != nil {
		return "", err
	}
	version, err := a.Modrinth.GetVersion(versionId)
	if err != nil {
		return "", err
	}
	seen := make(map[string]bool)
	err = a.Modrinth.InstallDeps(*version, seen, instInfo.Uuid, contentType, instInfo.Version)
	if err != nil {
		return "", err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")

	return version.Files[0].Filename, nil
}

func (a *App) GetInstanceLogs(folderId string) (string, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	logsLocation := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "logs", "jvm.log")
	file, err := os.ReadFile(logsLocation)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(file), nil
}

func (a *App) OpenContentFolder(folderId, contentType string) error {
	osName := runtime.GOOS
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	contentLocation := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, contentType)
	if osName == "windows" {
		cmd := exec.Command("explorer", contentLocation)
		err := cmd.Start()
		if err != nil {
			return err
		}
	} else if osName == "linux" {
		cmd := exec.Command("xdg-open", contentLocation)
		err := cmd.Start()
		if err != nil {
			return err
		}
	} else {
		return fmt.Errorf("could not open content folder")
	}
	return nil
}

func (a *App) ToggleContent(folderId, contentType, filename string) (bool, error) {
	//appdata, err := os.UserConfigDir()
	//if err != nil {
	//	return false, nil
	//}
	path, _, err := a.Download.ContentDir(folderId, contentType)
	if err != nil {
		return false, err
	}
	path = filepath.Join(path, filename)
	// path := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, contentType, filename)
	cleanedPath := filepath.Clean(path)
	if strings.HasSuffix(cleanedPath, ".disabled") {
		newPath := strings.TrimSuffix(cleanedPath, ".disabled")
		err := os.Rename(cleanedPath, newPath)
		if err != nil {
			return false, err
		}
		return true, nil
	} else {
		newPath := cleanedPath + ".disabled"
		err := os.Rename(cleanedPath, newPath)
		if err != nil {
			return false, err
		}
		return true, nil
	}

}

func (a *App) InstallMrpack(modpackPath string) (string, error) {
	var err error
	if modpackPath == "" {
		modpackPath, err = wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
			Title: "Select a Modpack",
			Filters: []wailsRuntime.FileFilter{
				{
					DisplayName: "Modpacks",
					Pattern:     "*.mrpack",
				},
			},
		})
		if err != nil {
			return "", err
		}
		if modpackPath == "" {
			return "", nil
		}
	}
	folderId, err := a.Mrpack.InstallModpack(modpackPath)
	if err != nil {
		return "", err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return folderId, nil
}

func (a *App) KillGame(folderId string) error {
	a.UpdateDiscordActivity("Killing Game", "Closing Minecraft")
	a.mu.Lock()
	defer a.mu.Unlock()
	mc, ok := a.RunningInstances[folderId]
	if !ok {
		return fmt.Errorf("instance does not exist")
	}
	err := mc.Process.Kill()
	if err != nil {
		return err
	}
	a.UpdateDiscordActivity("Idling...", "just... doing nothing i guess ?")

	return nil
}

func (a *App) UpdateJavaArgs(folderId, args string) error {
	err := a.InstanceManager.UpdateJavaArgs(folderId, args)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}

func (a *App) GetJavaArgs(folderId string) (string, error) {
	args, err := a.InstanceManager.GetJavaArgs(folderId)
	if err != nil {
		return "", err
	}
	return args, nil
}

func (a *App) GetContentUpdates(folderId, gameVersion string) ([]modrinth.UpdateInfo, error) {
	updates, err := a.Modrinth.GetContentUpdates(folderId, gameVersion)
	if err != nil {
		return nil, err
	}
	return updates, nil
}

func (a *App) ApplyContentUpdate(folderId, contentType, oldFileName, newVersionId string) error {
	err := a.RemoveContent(folderId, contentType, oldFileName)
	if err != nil {
		return err
	}
	_, err = a.InstallProjectContent(folderId, contentType, newVersionId)
	if err != nil {
		return err
	}
	wailsRuntime.EventsEmit(a.ctx, "instance:changed")
	return nil
}

func (a *App) ListScreenshots(folderId string) ([]string, error) {
	screenshots, err := a.InstanceManager.ListScreenshots(folderId)
	if err != nil {
		return nil, err
	}
	return screenshots, nil
}

func (a *App) GetScreenshot(folderId, filename string) (string, error) {
	screenshot, err := a.InstanceManager.GetScreenshot(folderId, filename)
	if err != nil {
		return "", err
	}
	return screenshot, err
}

func (a *App) DeleteScreenshot(folderId, filename string) (bool, error) {
	screenshot, err := a.InstanceManager.DeleteScreenshot(folderId, filename)
	if err != nil {
		return false, err
	}
	wailsRuntime.EventsEmit(a.ctx, "screenshot:deleted", filename)
	return screenshot, nil
}
