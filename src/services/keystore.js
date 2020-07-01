const jose = require('jose')

class KeystoreService {
  constructor () {
    this._keystore = new jose.JWKS.KeyStore()
  }

  async start () {
    await this._keystore.generate('RSA', 2048, { use: 'sig' })
    await this._keystore.generate('RSA', 2048, { use: 'enc' })
    await this._keystore.generate('EC', 'P-256', { use: 'sig' })
    await this._keystore.generate('EC', 'P-256', { use: 'enc' })
    await this._keystore.generate('EC', 'secp256k1', { use: 'sig' })
    await this._keystore.generate('EC', 'secp256k1', { use: 'enc' })
    await this._keystore.generate('OKP', 'Ed25519', { use: 'sig' })

    this._keys = this._keystore.toJWKS(true)
  }

  getJWKS () {
    return this._keys
  }
}

module.exports = new KeystoreService()
