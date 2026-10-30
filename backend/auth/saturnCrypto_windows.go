//go:build windows

package auth

import "github.com/billgraziano/dpapi"

func (c *SaturnCrypto) EncryptKey(uuid, plaintext string) (string, error) {
	encrypted, err := dpapi.Encrypt(plaintext)
	if err != nil {
		return "", err
	}
	return encrypted, nil
}

func (c *SaturnCrypto) DecryptKey(uuid, cipherText string) (string, error) {
	decrypted, err := dpapi.Decrypt(cipherText)
	if err != nil {
		return "", err
	}
	return decrypted, nil
}
