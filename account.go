package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// important funcs
/*
Startlogin(for firstlogin) already made 											DONE
add mctoken usage for profile uuid username(in auth.go)						    	DONE
also check game ownership and check it with signature check docs(in account.go)     DONE


CheckAutoLogin() (App Startup) name in app.go is StartApp
reads json
calls refreshminecrafttoken then save keys to json func
if refreshminecrafttoken returns an error delete keys.json and emit auth:required sends back to /login make this func here

Launchgamecheck()		name in app.go is StartPreCheck
check if mctoken.AccessToken is valid (new func in auth.go)
if its not valid call refreshminecrafttoken and save to json

*/

type Account struct {
	ctx context.Context
}

func NewAccount() *Account {
	return &Account{}
}

type EntitlementItem struct {
	Name string `json:"name"`
}

type EntitlementPayload struct {
	Entitlements []EntitlementItem `json:"entitlements"`
}

func (ac *Account) GetEntitlementInfo(mctoken MinecraftPayload) (*EntitlementPayload, error) {
	accesstoken := mctoken.AccessToken
	req, err := http.NewRequest("GET", "https://api.minecraftservices.com/entitlements/mcstore", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+accesstoken)
	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("error getting entitlements information %d:%s", resp.StatusCode, string(b))
	}
	var payload EntitlementPayload
	err = json.NewDecoder(resp.Body).Decode(&payload)
	if err != nil {
		return nil, err
	}
	return &payload, nil
}

func (ac *Account) HasJavaEdition(payload *EntitlementPayload) bool {
	if payload == nil {
		return false
	}

	for _, item := range payload.Entitlements {
		switch item.Name {
		case "product_minecraft", "product_game_pass_pc", "product_game_pass_ultimate":
			return true
		}

	}
	return false
}
