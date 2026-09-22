package Profile

import (
	"SaturnLauncher/backend/auth"
	"SaturnLauncher/backend/download"
	"context"
	"os"
	"path/filepath"
)

type Profile struct {
	ctx context.Context
}

func NewProfile() *Profile {
	return &Profile{}
}

func (p *Profile) GetPFP(mcinfo auth.MinecraftInfo) (*string, error) {
	appdatadir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	targetdir := filepath.Join(appdatadir, "SaturnLauncher", mcinfo.UUID+".png")
	url := "https://mc-heads.net/avatar/" + mcinfo.UUID
	d := &download.Download{}
	filePath, err := d.Downloader(targetdir, url)
	if err != nil {
		return nil, err
	}
	return filePath, nil
}

// bind to app if needed
