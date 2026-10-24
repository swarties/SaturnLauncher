package autoupdater

func (u *Updater) Update() {
	updater := NewUpdater()
	updater.UpdateApp()
}
