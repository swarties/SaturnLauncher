package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/cavaliergopher/grab/v3"
)

type Download struct {
	ctx context.Context
}

func NewDownload() *Download {
	return &Download{}
}

func (a *App) Downloader(destPath string, downloadUrl string) (bool, error) {
	client := grab.NewClient()
	req, err := grab.NewRequest(destPath, downloadUrl)
	if err != nil {
		return false, err
	}

	fmt.Printf("Downloading %v...\n", req.URL())
	resp := client.Do(req)
	fmt.Printf("  %v\\n", resp.HTTPResponse.Status)

	t := time.NewTicker(500 * time.Millisecond)
	defer t.Stop()
Loop:
	for {
		select {
		case <-t.C:
			fmt.Printf("  transferred %v / %v bytes (%.2f%%)\n",
				resp.BytesComplete(),
				resp.Size(),
				100*resp.Progress())
		case <-resp.Done:
			break Loop
		}
	}
	if err := resp.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Download failed: %v\n", err)
		return false, err
	}

	fmt.Printf("Download saved to ./%v \n", resp.Filename)
	return true, nil
}
