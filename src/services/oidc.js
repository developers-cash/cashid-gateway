const config = require('../config')

const { Provider } = require('oidc-provider')

const Crypto = require('crypto')

const cashId = require('./cashid')
const keystore = require('./keystore')

/**
 * TODO We want to find a way to flush the session whenever the Auth endpoint is hit.
 * If we can do this, we 'should' be able to have a public instance that can be used
 * without the security risks.
 * An alternative might also be to destroy the session on the 'authorization.success'
 * hook.
 */
class OIDCService {
  constructor () {
    // Create storage for OIDC Interaction to Nonce
    this.interactions = {}
  }

  /**
   * TODO Garbage Collect accounts
   */
  async start () {
    this.provider = new Provider(`https://${config.domain}`, {
      scopes: this.getMetadataFields(),
      claims: this.getClaims(),
      features: {
        introspection: { enabled: true },
        revocation: { enabled: false },
        devInteractions: { enabled: false }
      },
      formats: {
        AccessToken: 'jwt'
      },
      jwks: keystore.getJWKS(),
      clients: [{
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uris: config.redirectURI.split(','),
        response_types: ['code', 'id_token', 'code id_token'],
        grant_types: ['implicit', 'authorization_code']
      }],
      interactions: {
        url (ctx) {
          return `/oidc/interaction/${ctx.oidc.uid}`
        }
      },
      cookies: {
        keys: [Crypto.randomBytes(16).toString()]
      },
      // This might help when we want to destroy session at each auth request (see oidc-provider docs)
      expiresWithSession: async (ctx, token) => {
        return false
      },
      findAccount: async (ctx, id) => await this.findAccount(ctx, id)
    })

    // Reverse-Proxy support
    this.provider.proxy = true

    // @HACK
    // As this is only emulating an IdP we want to prompt the user for auth
    // each time they hit the Auth Endpoint is hit. We do not want to remember
    // their previous session, so we remove the cookie from the req.
    this.provider.use(async (ctx, next) => {
      if (ctx.path === '/auth') {
        delete ctx.request.header.cookie
      }
      await next()
    })

    // @HACK Whitelist all URLs if configured as a Public Instance
    if (config.redirectURI === 'https://public.instance') {
      this.provider.Client.prototype.redirectUriAllowed = function (redirectUri) {
        return true
      }
    }
  }

  async findAccount (ctx, id, token) {
    try {
      // let cashIdReq = cashId.findNonce(this.interactions[ctx.oidc.session.uid])
      const accountData = cashId.accounts[id]

      return {
        accountId: id,
        async claims (use, scope, claims, rejected) {
          return Object.assign({ sub: id }, accountData)
        }
      }
    } catch (err) { // If this shits the bed, I want to know about it
      console.log(err)
    }
  }

  getClaims () {
    return this.getMetadataFields()
      .reduce((acc, field) => {
        acc[field] = [field]
        return acc
      }, {})
  }

  // TODO Probably some nicer ES6 shortcut for this
  getMetadataFields (types = ['identity', 'position', 'contact']) {
    let res = []

    for (const type of types) {
      if (type === 'identity') {
        res = res.concat(['name', 'family', 'nickname', 'age', 'gender', 'birthdate', 'picture', 'national'])
      } else if (type === 'position') {
        res = res.concat(['country', 'state', 'city', 'streetname', 'streetnumber', 'residence', 'coordinate'])
      } else if (type === 'contact') {
        res = res.concat(['email', 'instant', 'social', 'phone', 'postal'])
      }
    }

    return res
  }

  scopesToFields (scopes) {
    const required = {
      identity: [],
      position: [],
      contact: []
    }

    for (const scope of scopes) {
      if (this.getMetadataFields(['identity']).includes(scope)) {
        required.identity.push(scope)
      }

      if (this.getMetadataFields(['position']).includes(scope)) {
        required.position.push(scope)
      }

      if (this.getMetadataFields(['contact']).includes(scope)) {
        required.contact.push(scope)
      }
    }

    return required
  }
}

module.exports = new OIDCService()
