package main

import (
	"SaturnLauncher/backend/auth"
	"SaturnLauncher/backend/download"
	"SaturnLauncher/backend/fabric"
	"SaturnLauncher/backend/instances"
	"SaturnLauncher/backend/launch"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"

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
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
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
