//go:build windows

package launch

import (
	"os/exec"
	"syscall"
)

func (l *Launch) HideConsole(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000, HideWindow: true}
}
