package mclogs

import (
	"SaturnLauncher/backend/projectInfo"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

type Mclogs struct {
	ctx context.Context
}

func NewmcLogs() *Mclogs {
	return &Mclogs{}
}

const UserAgent = projectInfo.UserAgent
const Version = projectInfo.ReleaseTag + " / " + projectInfo.CodeName

type JsonBody struct {
	Content string `json:"content"`
	Source  string `json:"source"`
}

type Response struct {
	Success bool   `json:"success"`
	ID      string `json:"id"`
	Source  string `json:"source"`
	URL     string `json:"url"`
	Token   string `json:"token"`
	Error   string `json:"error,omitempty"`
}

func (ml *Mclogs) UploadLatestLogs(folderId string) (*Response, error) {
	appdata, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	logsLoc := filepath.Join(appdata, "SaturnLauncher", "instances", folderId, "logs", "jvm.log")
	stat, err := os.Stat(logsLoc)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file doesnt exist")
		}
		return nil, err
	}
	if stat.Size() > 10485760 {
		return nil, fmt.Errorf("logs file too large. cannot proceed")
	}
	data, err := os.ReadFile(logsLoc)
	if err != nil {
		return nil, err
	}
	newJsonBody := JsonBody{
		Content: string(data),
		Source:  "SaturnLauncher " + Version,
	}
	marshalledBody, err := json.Marshal(newJsonBody)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequest("POST", "https://api.mclo.gs/1/log", bytes.NewReader(marshalledBody))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Add("User-Agent", UserAgent)

	do, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer do.Body.Close()
	var newResp Response
	if do.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mclo.gs returned status: %d", do.StatusCode)
	}
	err = json.NewDecoder(do.Body).Decode(&newResp)
	if err != nil {
		return nil, err
	}
	if newResp.Success != true {
		return nil, fmt.Errorf("mclo.gs return success as false. Error: %s", newResp.Error)
	}
	return &newResp, nil
}
