package middleware

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"hash"
)

// newSHA256 creates a new SHA256 hasher.
func newSHA256() hash.Hash {
	return sha256.New()
}

// rsaVerifyPKCS1v15 verifies an RSA PKCS#1 v1.5 signature.
func rsaVerifyPKCS1v15(pub *rsa.PublicKey, hashed []byte, sig []byte) error {
	return rsa.VerifyPKCS1v15(pub, crypto.SHA256, hashed, sig)
}
