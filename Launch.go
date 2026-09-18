package main

import "context"

type Launch struct {
	ctx context.Context
}

func NewLaunch() *Launch {
	return &Launch{}
}

type LaunchData struct {
	CurrentAccessToken MinecraftPayload `json:"access_token"`
	Username           string           `json:"name"`
	UUID               string           `json:"id"`
}
