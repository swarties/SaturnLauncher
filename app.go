package main

import (
	"context"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct

type App struct {
	ctx  context.Context
	Auth *Auth
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) StartLogin() {
	go func() {
		// 1. Get OAuth Device Code
		payload, err := a.Auth.GetOAuthCode()
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
		}
		// Send code & URL to frontend to render
		wailsRuntime.EventsEmit(a.ctx, "login:send_received", payload)
		// 2. Poll for Access Token (blocking call)
		at, err := a.Auth.PollOAuthCode(*payload)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
		}
		// 3. Exchange tokens through Xbox Live and Minecraft Services
		xbt, err := a.Auth.GetXBL(*at)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
		}

		xsts, err := a.Auth.GetXSTS(*xbt)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
		}

		mctoken, err := a.Auth.GetMinecraftAuth(*xsts, *xbt)
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "login:error", err.Error())
		}
		// 4. Save Refresh Session
		if len(xbt.DisplayClaims.Xui) > 0 {
			session := AuthSession{
				RefreshToken: at.RefreshToken,
				Uhs:          xbt.DisplayClaims.Xui[0].Uhs,
			}
			_, _ = a.Auth.SaveKeysToJson(session)
		}
		mcinfo, err := a.Auth.GetAccountInfo(*mctoken)
		_, _ = a.Auth.SaveAccountInfo(*mcinfo)
		// 5. Notify frontend on completion
		wailsRuntime.EventsEmit(a.ctx, "login:success", mcinfo) // replace nil with a map containing user uuid and username also add a ownership check that if fails returns login:error
	}()
}
