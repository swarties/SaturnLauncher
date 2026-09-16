package main

import (
	"context"
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

/*
func main() {
	// debug function before frontend
	app := NewAuth()
	payload, err := (*Auth).GetOAuthCode(app)
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println(payload)
	duration := time.Duration(payload.ExpiresIn) * time.Second
	fmt.Println("Your Device Code is:", payload.UserCode, "Please login at", payload.VerificationUri, "This code expires in", duration, "minutes")
	// temporary debug function
	at, err := (*Auth).PollOAuthCode(app, *payload)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println("microsoft access token:", at.AccessToken)
	xbt, err := (*Auth).GetXBL(app, *at)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Printf("%+v\n", xbt)
	xbltoken := xbt.Token
	userHash := xbt.DisplayClaims.Xui[0].Uhs
	fmt.Println("XblToken:", xbltoken)
	fmt.Println("Userhash:", userHash)

	xsts, err := (*Auth).GetXSTS(app, xbt)
	xststoken := xsts.Token
	fmt.Println("XSTS Token:", xststoken)
	mct, err := (*Auth).GetMinecraftAuth(app, xsts, xbt)
	mctoken := mct.AccessToken
	fmt.Println("\n\n\n\n Minecraft Access Token!!!!:", mctoken)
}
*/
