const config = require('./config')

const express = require('express')
const cors = require('cors')
const path = require('path')
const bodyParser = require('body-parser')

const keystore = require('./services/keystore')
const cashId = require('./services/cashid')
const oidc = require('./services/oidc')

const APIRoute = require('./routes/api')
const OIDCRoute = require('./routes/oidc')

class App {
  async start () {
    //
    // Make sure Domain is set
    //
    if (!config.domain) {
      throw new Error('You must set the DOMAIN environment variable. E.g. DOMAIN=cashid.yourdomain.com')
    }

    //
    // Keystore
    //
    console.log('Starting Keystore Service')
    await keystore.start()

    //
    // CashID
    //
    console.log('Starting CashID Service')
    await cashId.start()

    //
    // OIDC
    //
    console.log('Starting OIDC Service')
    await oidc.start()

    //
    // Setup ExpressJS Middleware, etc
    //
    console.log(`Starting Express on Port ${config.port}`)
    const app = express()
    app.set('trust proxy', true)
    app.set('view engine', 'ejs')
    app.set('views', path.resolve(__dirname, 'views'))
    app.use(cors())
    app.use(bodyParser.json())
    bodyParser.urlencoded({ extended: false })
    app.use(express.static(path.resolve(__dirname, 'public')))

    app.use('/api', new APIRoute())
    app.use('/oidc', new OIDCRoute())

    app.listen(config.port)

    console.log('CashID Gateway Ready')
    console.log(`Discovery URL: https://${config.domain}/oidc/.well-known/openid-configuration`)
    console.log(`Client ID: ${config.clientId}`)
    console.log(`Client Secret: ${config.clientSecret}`)
    console.log(`Whitelisted URLs: ${config.redirectURI}`)
  }
}

new App().start()
