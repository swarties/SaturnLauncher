package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// App struct

type MicrosoftOAuthPayload struct {
	UserCode        string `json:"user_code"`
	DeviceCode      string `json:"device_code"`
	VerificationUri string `json:"verification_uri"`
	Interval        int    `json:"interval"`
	ExpiresIn       int    `json:"expires_in"`
}
type MicrosoftAccessToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}
type XBLPayload struct {
	Token         string `json:"Token"`
	DisplayClaims struct {
		Xui []struct {
			Uhs string `json:"uhs"`
		} `json:"xui"`
	} `json:"DisplayClaims"`
	// userhash = resp.DisplayClaims.Xui[0].Uhs
}
type App struct {
	ctx context.Context
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

func main() {
	app := NewApp()
	payload, err := (*App).GetOAuthCode(app)
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println(payload)
	duration := time.Duration(payload.ExpiresIn) * time.Second
	fmt.Println("Your Device Code is:", payload.UserCode, "Please login at", payload.VerificationUri, "This code expires in", duration, "minutes")
	// temporary debug function
	at, err := (*App).PollOAuthCode(app, *payload)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println("microsoft access token:", at.AccessToken)
	xbt, err := (*App).GetXBL(app, *at)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Printf("%+v\n", xbt)
	xbltoken := xbt.Token
	userHash := xbt.DisplayClaims.Xui[0].Uhs
	fmt.Println("XblToken:", xbltoken)
	fmt.Println("Userhash:", userHash)
}

func (a *App) GetOAuthCode() (*MicrosoftOAuthPayload, error) {
	var payload MicrosoftOAuthPayload
	form := url.Values{
		"client_id":     {"000000004C12AE6F"},
		"response_type": {"device_code"},
		"scope":         {"service::user.auth.xboxlive.com::MBI_SSL"},
	}
	resp, err := http.PostForm("https://login.live.com/oauth20_connect.srf", form)
	if err != nil {
		fmt.Println("Error occured", err)
	} else if resp.StatusCode == http.StatusOK {
		fmt.Println("Succesfully retrived the OAuth Code!")

		err := json.NewDecoder(resp.Body).Decode(&payload)
		if err != nil {
			return nil, err
		}

	} else if resp.StatusCode != http.StatusOK {
		respbody, _ := io.ReadAll(resp.Body)
		fmt.Println("error", string(respbody), resp.StatusCode)
	}
	defer resp.Body.Close()
	return &payload, err
	// payload returns UserCode(The Code The User Types), VerificationUri(the url where u put the code) and ExpiresIn(Time until code expires in minutes)
}

func (a *App) PollOAuthCode(payload MicrosoftOAuthPayload) (*MicrosoftAccessToken, error) {
	body := url.Values{
		"client_id":   {"000000004C12AE6F"},
		"grant_type":  {"urn:ietf:params:oauth:grant-type:device_code"},
		"device_code": {payload.DeviceCode},
		"scope":       {"service::user.auth.xboxlive.com::MBI_SSL"},
	}
	var accesstoken MicrosoftAccessToken
	for {
		resp, err := http.PostForm("https://login.live.com/oauth20_token.srf", body)
		if err != nil {
			fmt.Println("Error Occured", err)
		} else if resp.StatusCode == http.StatusOK {
			fmt.Println("User Logged In!")
			err := json.NewDecoder(resp.Body).Decode(&accesstoken)
			if err != nil {
				return nil, err
			}
			resp.Body.Close()
			break
		} else if resp.StatusCode == http.StatusBadRequest {
			//respbody, _ := io.ReadAll(resp.Body)
			//fmt.Println("status code:", resp.StatusCode)
			//fmt.Println("body:", string(respbody))
			resp.Body.Close()
			time.Sleep(time.Duration(payload.Interval) * time.Second)
		} else {
			respbody, _ := io.ReadAll(resp.Body)
			fmt.Println("status code:", resp.StatusCode)
			fmt.Println("body:", string(respbody))
			resp.Body.Close()
			time.Sleep(time.Duration(payload.Interval) * time.Second)
		}
	}
	return &accesstoken, nil
}
func (a *App) GetXBL(at MicrosoftAccessToken) (XBLPayload, error) {
	// user.auth.xboxlive.com
	var XBLToken XBLPayload
	body := map[string]any{
		"Properties": map[string]any{
			"AuthMethod": "RPS",
			"SiteName":   "user.auth.xboxlive.com",
			"RpsTicket":  "t=" + at.AccessToken,
		},
		"RelyingParty": "http://auth.xboxlive.com",
		"TokenType":    "JWT",
	}
	JsonBody, err := json.Marshal(body)
	if err != nil {
		fmt.Println(err)
	}
	req, err := http.NewRequest("POST", "https://user.auth.xboxlive.com/user/authenticate", bytes.NewBuffer(JsonBody))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println(err)
	} else if resp.StatusCode == http.StatusOK {
		err := json.NewDecoder(resp.Body).Decode(&XBLToken)
		if err != nil {
			fmt.Println(err)
		}
	} else {
		b, _ := io.ReadAll(resp.Body)
		fmt.Printf("Xbox Error HTTP %d: %s\n\n", resp.StatusCode, string(b))

	}
	defer resp.Body.Close()
	return XBLToken, err

}
