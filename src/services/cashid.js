const config = require('../config')

const CashId = require('@developers.cash/cashid-js')

class CashIdService {
  constructor () {
    // Create space to Store nonces and their details
    this.nonces = {}

    // Create space to Store accounts and their details
    this.accounts = {}
  }

  async start () {
    // Initialize CashID
    this.cashid = new CashId(config.domain, '/api/auth')
  }

  createRequest (action, data, metadata) {
    // Generate Request URL
    const url = this.cashid.createRequest(action, data, metadata)

    // Find the nonce from this request URL
    const parsed = this.cashid.parseCashIDRequest(url)
    const nonce = parsed.parameters.nonce

    // Save the nonce along with timestamp
    this.nonces[nonce] = {
      request: url,
      time: new Date()
    }

    // If nonces should only be cached for x seconds...
    if (config.authTTL) {
      setTimeout(() => {
        delete this.nonces[nonce]
      }, config.authTTL * 1000)
    }

    // Return both the URL and the nonce
    return {
      nonce,
      state: this.nonces[nonce]
    }
  }

  validateRequest (payload) {
    // Parse the request sent and get the nonce
    const request = this.cashid.parseCashIDRequest(payload.request)
    const nonce = request.parameters.nonce

    // Make sure the Payment Request 'exactly' matches with the one we prev created
    const originalRequest = this.findNonce(nonce)
    if (originalRequest.state.request !== payload.request) {
      throw new Error('CashID Challenge does not match the original challenge')
    }

    // Validate the request
    if (!this.cashid.validateRequest(payload)) {
      throw new Error('CashID Request could not be validated')
    }

    // Update the state of the request
    // TODO OIDC portions should transform this - wrong to do it here
    originalRequest.state.result = {
      login: {
        account: payload.address,
        remember: false
      }
    }

    // Store account information
    this.accounts[payload.address] = payload.metadata

    // If accounts should only be cached for x seconds...
    if (config.accountTTL) {
      setTimeout(() => {
        delete this.accounts[payload.address]
      }, config.accountTTL * 1000)
    }

    // Store the user information
    originalRequest.state.metadata = payload.metadata

    return {
      nonce: nonce,
      state: originalRequest.state
    }
  }

  findNonce (nonce) {
    if (typeof this.nonces[nonce] === 'undefined') {
      throw new Error('CashID Request does not exist or has expired.')
    }

    return {
      nonce: nonce,
      state: this.nonces[nonce]
    }
  }
}

module.exports = new CashIdService()
