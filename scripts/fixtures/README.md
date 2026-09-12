# Public test key

`ed25519-proposer.json` is copied byte-for-byte from
`oma3dao/mpas`'s `sdk/protocol/tests/fixtures/keys/proposer.json` at baseline
`54e27d6327f0b1f1af08a160982f891ada5915b6`. It is a publicly known test key,
not an operational identity. The signature probe preserves its existing DID
and absence of JWK `alg`; new HTTP signatures contain their own `alg` parameter.
