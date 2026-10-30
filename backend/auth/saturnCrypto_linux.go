//go:build linux

package auth

import "github.com/zalando/go-keyring"

func (c *SaturnCrypto) EncryptKey(uuid, plaintext string) (string, error) {
	err := keyring.Set("SaturnLauncher", uuid, plaintext)
	if err != nil {
		return "", err
	}
	return "", nil
}

func (c *SaturnCrypto) DecryptKey(uuid, cipherText string) (string, error) {
	decrypted, err := keyring.Get("SaturnLauncher", uuid)
	if err != nil {
		return "", err
	}
	return decrypted, nil
}
