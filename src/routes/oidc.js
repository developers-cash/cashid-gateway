const config = require('../config')

const express = require('express')
const router = express.Router()

const cashIdService = require('../services/cashid')
const oidc = require('../services/oidc')

class OIDCRoute {
  constructor () {
    // Setup interaction routes
    router.get('/interaction/:uid', this._noCache, (req, res) => this.getPrompt(req, res))
    router.get('/interaction/:uid/complete', this._noCache, (req, res) => this.getComplete(req, res))

    // Register OIDC Provider endpoints with Express
    router.use(oidc.provider.callback)

    return router
  }

  async getPrompt (req, res) {
    try {
      // Get details of the interaction prompt
      const interaction = await oidc.provider.interactionDetails(req, res)

      // Find our client (TODO do we really need this?)
      // const client = await oidc.provider.Client.find(interaction.params.client_id)

      //
      // Login prompt
      //
      if (interaction.prompt.name === 'login') {
        // Create CashID Challenge Request
        const cashIdReq = cashIdService.createRequest('auth', {
          optional: oidc.scopesToFields(interaction.params.scope.split(' '))
        })
        
        // Store a doNotDelete flag against the CashID Request
        // (We have to suport token flow!)
        cashIdReq.doNotDelete = true
        cashIdService.cashid.adapter.store(cashIdReq.nonce, cashIdReq)

        // Store a map of InteractionUID:CashIDNonce
        oidc.interactions[interaction.uid] = cashIdReq.nonce

        // If there is an authentication time-to-live...
        if (config.authTTL) {
          setTimeout(() => {
            delete oidc.interactions[interaction.uid]
          }, config.authTTL * 1000)
        }

        // Render a page containing the CashID Challenge...
        return res.render('oidc/login', {
          uid: interaction.uid,
          nonce: cashIdReq.nonce,
          uri: cashIdReq.request,
          disclaimer: config.disclaimer
        })
      }

      //
      // Consent prompt
      //
      if (interaction.prompt.name === 'consent') {
        const result = {
          consent: {}
        }

        // Consent isn't really relevant for CashID - User does this with their wallet...
        return await oidc.provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true })
      }

      // If we reach here, we received an invalid Prompt Type
      throw new Error(`Invalid prompt type: ${interaction.prompt.name}`)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }

  async getComplete (req, res) {
    try {
      // Get details of interaction and the client (TODO do we really need this? Maybe we should use this over req.params.uid?)
      // const interaction = await oidc.provider.interactionDetails(req, res)

      // Find our client (TODO do we really need this?)
      // const client = await oidc.provider.Client.find(interaction.params.client_id)

      // Find the Nonce based on the Interaction ID
      const cashIdReq = cashIdService.cashid.adapter.get(oidc.interactions[req.params.uid])
      
      let result = {
        login: {
          account: cashIdReq.payload.address,
          remember: false
        }
      }

      await oidc.provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false })
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }

  _noCache (req, res, next) {
    res.set('Pragma', 'no-cache')
    res.set('Cache-Control', 'no-cache, no-store')
    next()
  }
}

module.exports = OIDCRoute
