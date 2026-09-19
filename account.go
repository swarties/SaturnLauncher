package main

import (
	"context"
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
