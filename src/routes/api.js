'use strict'

const config = require('../config')

const keystore = require('../services/keystore')
const cashId = require('../services/cashid')

const { JWT, JWK } = require('jose')
const express = require('express')
const router = express.Router()

class APIRoute {
  constructor () {
    // Define the routes
    router.post('/request', (req, res) => this.postRequest(req, res))
    router.post('/auth', (req, res) => this.postAuth(req, res))
    router.get('/events/:nonce', (req, res) => this.getEvents(req, res))

    return router
  }

  /**
   * TODO aaa
   */
  async postRequest(req, res, text) {
    console.log(req.body)
    
    // Generate CashID Request
    const cashIdReq = await cashId.createRequest(req.body)

    // Return both the URL and the nonce
    return res.send(cashIdReq)
  }
  
  /**
   * This is the Challenge Response endpoint
   */
  async postAuth (req, res, next) {
    try {    
      // Validate the request
      const cashIdReq = await cashId.validateRequest(req.body)
      
      // If there's an SSE Listener, send info to it
      if (cashIdReq.sseSocket) {
        cashIdReq.sseSocket.write('data: ' + JSON.stringify({
          status: 0,
          message: 'Authentication successful',
          jwt: JWT.sign(
            cashIdReq.payload.metadata,
            keystore.getJWKS().keys.find((key) => key.crv === 'P-256' && key.use === 'sig'),
            {
              subject: cashIdReq.payload.address,
              issuer: config.domain,
              nonce: cashIdReq.nonce,
              expiresIn: `${config.authTTL} s`
            }
          )
        }) + '\n\n')
      }
      
      // Only delete if we're not using OIDC
      // (We need to keep accounts here for OIDC's flow)
      if (!cashIdReq.isOIDC) {
        cashId.adapter.delete(cashIdReq.nonce)
      }
      
      return res.status(200).send({ status: 0, message: 'Authentication successful' })
    } catch (err) {
      return res.status(200).send({ status: err.status, message: err.message })
    }
  }

  /**
   * This is an SSE endpoint that the browser can use to listen for Auth events
   */
  async getEvents (req, res, next) {
    try {
      const cashIdReq = await cashId.adapter.get(req.params.nonce)
      
      if (!cashIdReq) {
        throw new Error('Nonce does not exist or has expired')
      }
      
      // Add listener
      cashIdReq.sseSocket = res
      await cashId.adapter.set(req.params.nonce, cashIdReq)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })
      
      res.write('\n')
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }
}

module.exports = APIRoute
