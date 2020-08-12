const config = require('../config')

const express = require('express')
const router = express.Router()

const cashId = require('../services/cashid')
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

      //
      // Login prompt
      //
      if (interaction.prompt.name === 'login') {
        // Create CashID Challenge Request
        const cashIdReq = await cashId.createRequest({
          action: 'auth',
          optional: oidc.scopesToFields(interaction.params.scope.split(' '))
        }, {
          isOIDC: true
        })

        // Store a map of InteractionUID:CashIDNonce 
        oidc.storeInteraction(interaction.uid, cashIdReq.nonce)
        
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
        // ... so we pretty much skip it (but keep the endpoint here so things are less prone to fuck up)
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
      // Find the Nonce based on the Interaction ID
      const cashIdReq = await cashId.adapter.get(oidc.interactions[req.params.uid])
      
      // Store the account information associated with request
      // (We do this to support OIDC's code flow)
      // (Also, clone by stringify+parse so if it expires, don't matter)
      oidc.storeAccount(cashIdReq.payload.address, JSON.parse(JSON.stringify(cashIdReq.payload.metadata)))
      
      // Now let's consume (delete) the original request from CashID Adapter
      await cashId.adapter.delete(cashIdReq.nonce)
      
      // Declare our result
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
