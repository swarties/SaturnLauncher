package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct

type App struct {
	ctx               context.Context
	Auth              *Auth
	Account           *Account
	ActiveAccessToken string
	Launch            *Launch
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		Auth:    NewAuth(),
		Account: NewAccount(),
		Launch:  NewLaunch()}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
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

		gameOwnership, err := a.Account.GetEntitlementInfo(*mctoken)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Failed to retrieve EntitlementInfo: "+err.Error())
			return
		}
		OwnsJava := a.Account.HasJavaEdition(gameOwnership)
		if OwnsJava == false {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "User does not own game")
			return
		}
		// 4. Save Refresh Session
		if len(xbt.DisplayClaims.Xui) == 0 {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Missing UserHash from Xbox Live response")
			return
		}

		session := AuthSession{
			RefreshToken: at.RefreshToken,
			Uhs:          xbt.DisplayClaims.Xui[0].Uhs,
		}
		_, err = a.Auth.SaveKeysToJson(session)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Failed to save session keys: "+err.Error())
		}
		mcinfo, err := a.Auth.GetAccountInfo(*mctoken)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Failed to retrieve profile: "+err.Error())
			return
		}

		if mcinfo.Error != "" || mcinfo.UUID == "" {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "No Minecraft Profile Found: Please create a username on minecraft.net first. ")
			return
		}

		_, err = a.Auth.SaveAccountInfo(*mcinfo)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", "Failed to save account information "+err.Error())
			return
		}
		// 5. Notify frontend on completion
		wailsRuntime.EventsEmit(a.ctx, "login:success", mcinfo)

	}()
}

func (a *App) StartApp() {
	go func() {
		appdatadir, err := os.UserConfigDir()
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		targetdir := filepath.Join(appdatadir, "SaturnLauncher")
		filePath := filepath.Join(targetdir, "keys.json")
		fileData, err := os.ReadFile(filePath)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		var Keys AuthSession
		err = json.Unmarshal(fileData, &Keys)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}

		mctoken, NewAuthSession, err := a.Auth.RefreshMinecraftToken(Keys)
		if err != nil {
			_ = os.Remove(filepath.Join(targetdir, "keys.json"))
			_ = os.Remove(filepath.Join(targetdir, "userinfo.json"))

			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		isDone, err := a.Auth.SaveKeysToJson(NewAuthSession)
		if isDone != true {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		a.ActiveAccessToken = mctoken.AccessToken

		mcinfo, err := a.Auth.GetAccountInfo(mctoken)
		if err != nil || mcinfo.Error != "" || mcinfo.UUID == "" {
			wailsRuntime.EventsEmit(a.ctx, "auth:required")
			return
		}
		_, err = a.Auth.SaveAccountInfo(*mcinfo)
		if err != nil {
			fmt.Println("Warning: Could not save updated account info")
		}
		wailsRuntime.EventsEmit(a.ctx, "auth:success", mcinfo)
		return
	}()
}

// logout deletes the 2 .jsons and clears all the vals
// AuthSession struct for unmarshalling json
