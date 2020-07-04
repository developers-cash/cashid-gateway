'use strict'

const express = require('express')
const router = express.Router()

const cashIdService = require('../services/cashid')

class APIRoute {
  constructor () {
    // Define the routes
    router.post('/auth', (req, res) => this.postAuth(req, res))
    router.get('/events/:nonce', (req, res) => this.getEvents(req, res))

    return router
  }

  /**
   * TODO
   */
  async getRequest(req, res, text) {
    
  }
  
  /**
   * This is the Challenge Response endpoint
   */
  async postAuth (req, res, next) {
    // Declare here so that we can send event to SSE endpoint if catch triggers
    let cashIdReq = {}
    
    try {
      // Validate the request
      cashIdReq = cashIdService.validateRequest(req.body)

      console.log(cashIdReq)
      
      // Use SSE to send message to client listening (TODO send as id_token)
      if (cashIdReq.sseListener) {
        const payload = {
          code: 0,
          message: 'Authentication Successful',
          payload: cashIdReq.payload
        }
        cashIdReq.sseListener.write('data: ' + JSON.stringify(payload) + '\n\n')
      }

      return res.send({ status: 0 })
    } catch (err) {
      if (cashIdReq.sseListener) {
        const payload = {
          code: err.code || 500,
          message: err.message
        }
        cashIdReq.sseListener.write('data: ' + JSON.stringify(payload) + '\n')
      }
      
      return res.status(500).send({ status: 500, message: err.message })
    }
  }

  /**
   * This is an SSE endpoint that the browser can use to listen for Auth events
   */
  async getEvents (req, res, next) {
    try {
      const cashIdReq = cashIdService.cashid.adapter.get(req.params.nonce)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })
      
      // Add listener
      cashIdReq.sseListener = res
      cashIdService.cashid.adapter.store(req.params.nonce, cashIdReq)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }
}

module.exports = APIRoute
