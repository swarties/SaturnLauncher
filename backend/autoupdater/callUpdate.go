package autoupdater

import "context"

type Updater struct {
	ctx context.Context
}

func NewUpdater() *Updater {
	return &Updater{}
}

func (u *Updater) Update() {
	updater := NewUpdater()
	updater.UpdateApp()
}
