'use strict'

const keystore = require('../services/keystore')

const { JWK } = require('jose')
const express = require('express')
const router = express.Router()

class KeysRoute {
  constructor () {
    // Define the routes
    router.get('/:type?', (req, res) => this.getKey(req, res))

    return router
  }

  async getKey (req, res, next) {
    try {
      // TODO (We only support ES256 currently)
      /* const lookup = {
        ES256: { crv: 'P-256', use: 'sig' }
      } */

      const key = keystore.getJWKS().keys.find((key) => key.crv === 'P-256' && key.use === 'sig')

      if (!key) {
        throw new Error('Key does not exist')
      }

      res.send(JWK.asKey(key).toPEM())
    } catch (err) {
      console.log(err)
      return res.status(500).send({ status: 500, message: err.message })
    }
  }
}

module.exports = KeysRoute
