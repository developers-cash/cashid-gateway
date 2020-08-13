const LRU = require('lru-cache')

let storage = new LRU({})

function grantKeyFor (id) {
  return `grant:${id}`
}

function sessionUidKeyFor (id) {
  return `sessionUid:${id}`
}

function userCodeKeyFor (userCode) {
  return `userCode:${userCode}`
}

class MemoryAdapter {
  constructor (model) {
    this.model = model
  }

  key (id) {
    return `${this.model}:${id}`
  }

  async destroy (id) {
    const key = this.key(id)
    storage.del(key)
  }

  async consume (id) {
    storage.del(this.key(id))
  }

  async find (id) {
    return storage.get(this.key(id))
  }

  async findByUid (uid) {
    const id = storage.get(sessionUidKeyFor(uid))
    return this.find(id)
  }

  async findByUserCode (userCode) {
    const id = storage.get(userCodeKeyFor(userCode))
    return this.find(id)
  }

  async upsert (id, payload, expiresIn, onExpired = null) {
    const key = this.key(id)

    if (this.model === 'Session') {
      storage.set(sessionUidKeyFor(payload.uid), id, expiresIn * 1000)
      setTimeout(() => {
        storage.del(sessionUidKeyFor(payload.uid))
      }, expiresIn * 1000)
    }

    const { grantId, userCode } = payload
    if (grantId) {
      const grantKey = grantKeyFor(grantId)
      const grant = storage.get(grantKey)
      if (!grant) {
        storage.set(grantKey, [key])
      } else {
        grant.push(key)
      }
    }

    if (userCode) {
      storage.set(userCodeKeyFor(userCode), id, expiresIn * 1000)
      setTimeout(() => {
        storage.del(userCodeKeyFor(userCode))
      }, expiresIn * 1000)
    }

    storage.set(key, payload, expiresIn * 1000)
    setTimeout(() => {
      if (typeof onExpired === 'function') {
        onExpired(storage.get(key))
      }

      storage.del(key)
    }, expiresIn * 1000)
  }

  async revokeByGrantId (grantId) { // eslint-disable-line class-methods-use-this
    const grantKey = grantKeyFor(grantId)
    const grant = storage.get(grantKey)
    if (grant) {
      grant.forEach((token) => storage.del(token))
      storage.del(grantKey)
    }
  }
}

module.exports = MemoryAdapter
module.exports.setStorage = (store) => { storage = store }
