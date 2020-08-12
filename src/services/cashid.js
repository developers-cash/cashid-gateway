const config = require('../config')

const Adapter = require('../memory-adapter')

const { CashIdServer }  = require('@developers.cash/cashid-js')

const adapter = new Adapter('CashID')

module.exports = new CashIdServer(config.domain, '/api/auth', {
  get: async (id) => {
    return adapter.find(id)
  },
  
  set: async (id, payload) => {
    adapter.upsert(id, payload, config.authTTL, (payload) => {
      // If there's an SSE Socket, send it an expired message
      if (payload && payload.sseSocket) {
        payload.sseSocket.write('data: ' + JSON.stringify({
          status: 142,
          message: "Request has expired"
        }) + '\n\n')
      }
    })
  },
  
  delete: async (id) => {
    adapter.destroy(id)
  }
})
