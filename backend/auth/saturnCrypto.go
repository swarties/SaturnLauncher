package auth

import "context"

type SaturnCrypto struct {
	ctx context.Context
}

func NewCrypto() *SaturnCrypto {
	return &SaturnCrypto{}
}
