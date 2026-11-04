package download

import (
	"fmt"
	"os"
	"path/filepath"
)

func (d *Download) GetServerJar(vInfo VersionInfo, folderId string) error {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	//destPath := filepath.Join(appdata, "SaturnLauncher", "minecraft", "versions", vInfo.ID)
	filePath := filepath.Join(appdata, "SaturnLauncher", "serverInstances", folderId, "server.jar")
	serverUrl := vInfo.Downloads.Server.URL
	serverSha1 := vInfo.Downloads.Server.Sha1
	stat, err := os.Stat(filePath)
	if err == nil && int(stat.Size()) == vInfo.Downloads.Client.Size {
		return nil
	}
	_, err = d.Downloader(filePath, serverUrl)
	if err != nil {
		return err
	}
	hash, err := d.GetFileSha1(filePath)
	if err != nil {
		return err
	}
	if hash != serverSha1 {
		err := os.Remove(filePath)
		if err != nil {
			return err
		}
		return fmt.Errorf("sha1 mismatch error file is corrupted. version id: %s", vInfo.ID)
	}
	return nil
}

func (d *Download) DownloadServer(gameVer, folderId string) (*VersionInfo, error) {
	vManifest, err := d.GetVersionManifest()
	if err != nil {
		return nil, err
	}
	err = d.GetVersionInfo(*vManifest, gameVer, true)
	if err != nil {
		return nil, err
	}
	vInfo, err := d.ParseVersionInfo(gameVer, true)
	if err != nil {
		return nil, err
	}
	err = d.GetServerJar(*vInfo, folderId)
	if err != nil {
		return nil, err
	}
	return vInfo, nil
}
