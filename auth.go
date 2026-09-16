package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

type Auth struct {
	ctx context.Context
}

func NewAuth() *Auth {
	return &Auth{}
}

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

type XSTSPayload struct {
	Token string `json:"Token"`
}

type MinecraftPayload struct {
	AccessToken string `json:"access_token"`
}

func (a *Auth) GetOAuthCode() (*MicrosoftOAuthPayload, error) {
	// if nothing happens in 15 mins refresh code
	var payload MicrosoftOAuthPayload
	form := url.Values{
		"client_id":     {"000000004C12AE6F"},
		"response_type": {"device_code"},
		"scope":         {"service::user.auth.xboxlive.com::MBI_SSL"},
	}
	resp, err := http.PostForm("https://login.live.com/oauth20_connect.srf", form)
	if err != nil {
		log.Fatal(err)
	} else if resp.StatusCode == http.StatusOK {
		fmt.Println("Succesfully retrived the OAuth Code!")

		err := json.NewDecoder(resp.Body).Decode(&payload)
		if err != nil {
			log.Fatal(err)
		}

	} else if resp.StatusCode != http.StatusOK {
		respbody, _ := io.ReadAll(resp.Body)
		fmt.Println("error", string(respbody), resp.StatusCode)
	}
	defer resp.Body.Close()
	return &payload, err
	// payload returns UserCode(The Code The User Types), VerificationUri(the url where u put the code) and ExpiresIn(Time until code expires in minutes)
}

func (a *Auth) PollOAuthCode(payload MicrosoftOAuthPayload) (*MicrosoftAccessToken, error) {
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
			log.Fatal(err)
		} else if resp.StatusCode == http.StatusOK {
			fmt.Println("User Logged In!")
			err := json.NewDecoder(resp.Body).Decode(&accesstoken)
			if err != nil {
				log.Fatal(err)
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
func (a *Auth) GetXBL(at MicrosoftAccessToken) (XBLPayload, error) {
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
		log.Fatal(err)
	}
	req, err := http.NewRequest("POST", "https://user.auth.xboxlive.com/user/authenticate", bytes.NewBuffer(JsonBody))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	} else if resp.StatusCode == http.StatusOK {
		err := json.NewDecoder(resp.Body).Decode(&XBLToken)
		if err != nil {
			log.Fatal(err)
		}
	} else {
		b, _ := io.ReadAll(resp.Body)
		fmt.Printf("Xbox Error HTTP %d: %s\n\n", resp.StatusCode, string(b))

	}
	defer resp.Body.Close()
	return XBLToken, err

}
func (a *Auth) GetXSTS(xblToken XBLPayload) (XSTSPayload, error) {
	var XSTSToken XSTSPayload
	body := map[string]any{
		"Properties": map[string]any{
			"SandboxId":  "RETAIL",
			"UserTokens": []interface{}{xblToken.Token},
		},
		"RelyingParty": "rp://api.minecraftservices.com/",
		"TokenType":    "JWT",
	}
	JsonBody, err := json.Marshal(body)
	if err != nil {
		log.Fatal(err)
	}
	req, err := http.NewRequest("POST", "https://xsts.auth.xboxlive.com/xsts/authorize", bytes.NewBuffer(JsonBody))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	} else if resp.StatusCode == http.StatusOK {
		err := json.NewDecoder(resp.Body).Decode(&XSTSToken)
		if err != nil {
			log.Fatal(err)
		}
	} else if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		fmt.Println("Status Code", resp.StatusCode)
		// check https://minecraft.wiki/w/Microsoft_authentication for xbox error codes meaning
		fmt.Println(string(b))
	}
	defer resp.Body.Close()
	return XSTSToken, err
}

func (a *Auth) GetMinecraftAuth(xstsToken XSTSPayload, XBLuhs XBLPayload) (MinecraftPayload, error) {
	var MinecraftToken MinecraftPayload
	body := map[string]any{
		"identityToken": "XBL3.0 x=" + XBLuhs.DisplayClaims.Xui[0].Uhs + ";" + xstsToken.Token,
	}
	JsonBody, err := json.Marshal(body)
	if err != nil {
		log.Fatal(err)
	}
	req, err := http.NewRequest("POST", "https://api.minecraftservices.com/authentication/login_with_xbox", bytes.NewBuffer(JsonBody))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	} else if resp.StatusCode == http.StatusOK {
		err := json.NewDecoder(resp.Body).Decode(&MinecraftToken)
		if err != nil {
			log.Fatal(err)
		} else if resp.StatusCode != http.StatusOK {
			b, _ := io.ReadAll(resp.Body)
			fmt.Println("Status Code", resp.StatusCode)
			fmt.Println(string(b))
		}
	}
	return MinecraftToken, err
}

// Refresh Token Function use RefreshToken string `json:"refresh_token"` save and/or update to a json file in appdata encrypt it
// Note: Minecraft Access Token Is One Use And regenerated before launch
