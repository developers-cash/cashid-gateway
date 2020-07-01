'use strict'

const express = require('express')
const router = express.Router()

const cashId = require('../services/cashid')

class APIRoute {
  constructor () {
    // Define the routes
    router.post('/auth', (req, res) => this.postAuth(req, res))
    router.get('/events/:nonce', (req, res) => this.getEvents(req, res))

    return router
  }

  /**
   * This is the Challenge Response endpoint
   */
  async postAuth (req, res, next) {
    try {
      // Validate the request
      const cashIdReq = cashId.validateRequest(req.body)

      // Use SSE to send message to client listening
      if (cashIdReq.state.res) {
        const payload = {
          code: 0,
          message: 'Authentication Successful',
          result: cashIdReq.state.result
        }
        cashIdReq.state.res.write('data: ' + JSON.stringify(payload) + '\n\n')
      }

      return res.send({ status: 0 })
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }

  /**
   * This is an SSE endpoint that the browser can use to listen for Auth events
   */
  async getEvents (req, res, next) {
    try {
      const cashIdReq = cashId.findNonce(req.params.nonce)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })

      cashIdReq.state.res = res
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }
}

module.exports = APIRoute
