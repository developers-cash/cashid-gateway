const config = require('../config')

const { CashIDServer }  = require('@developers.cash/cashid-js')

class CashIdService {
  constructor () {
    // Create space to Store accounts and their details
    this.accounts = {}
  }

  async start () {
    // Initialize CashID
    this.cashid = new CashIDServer(config.domain, '/api/auth')
  }

  createRequest (action, data, metadata) {
    // Generate CashID Request
    const request = this.cashid.createRequest(action, data, metadata)
    
    // If requests have an expiry (Time-to-live)...
    if (config.authTTL) {
      setTimeout(() => {
        this.cashid.adapter.delete(request.nonce)
      }, config.authTTL * 1000)
    }

    // Return both the URL and the nonce
    return request
  }

  validateRequest (payload) {
    // Validate the request
    let result = this.cashid.validateRequest(payload)

    // Store the account information (needed for "code" flows)
    this.accounts[payload.address] = payload.metadata

    // If accounts should only be cached for x seconds...
    if (config.accountTTL) {
      setTimeout(() => {
        delete this.accounts[payload.address]
      }, config.accountTTL * 1000)
    }

    return result
  }

  findByNonce (nonce) {
    let request = this.cashid.adapter.get(nonce)
    
    if (!request) {
      throw new Error('CashID Request does not exist or has expired.')
    }

    return {
      nonce: nonce,
      request: request
    }
  }
}

module.exports = new CashIdService()
