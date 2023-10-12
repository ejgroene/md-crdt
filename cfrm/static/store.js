

const {assert, expect, should} = chai


export class Store {
  constructor(triples) {
    this.triples = triples || []
  }

  publish(triple) {
    this.triples.push(triple)
    return fetch("/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(triple)
    }).then(response => {
      assert(response.ok)
    })
  }

  delete(t) {
    const i = this.triples.indexOf(t)
    this.triples.splice(i, 1)
    // publish a delete operation to the network
  }

  fetch_triples() {
    return fetch("/fetch")
      .then(response => response.json())
      .then(triples => {
        this.triples.push(...triples)
      })
  }

  find(...args) {
    return this.triples.find(...args)
  }

  filter(...args) {
    return this.triples.filter(...args)
  }

  get length() {
    return this.triples.length
  }

  contains(triple) {
    return Boolean(this.triples.find(t => {
      return t.subject === triple.subject &&
        t.predicate === triple.predicate &&
        t.object === triple.object
    }))
  }
}


describe('Store', () => {
  it('should separate storages', () => {
    const store1 = new Store()
    const store2 = new Store()
    store1.publish({subject: "a", predicate: "b", object: "c"})
    expect(store1.length).to.equal(1)
    expect(store2.length).to.equal(0)
  })
  it('should separate storages', () => {
    const store1 = new Store([{subject: "a", predicate: "b", object: "c"}])
    const store2 = new Store([])
    expect(store1.length).to.equal(1)
    expect(store2.length).to.equal(0)
  })
  it('should be a class', () => {
    expect(Store).to.be.a('function')
  })
  describe("Store with Test Data", () => {
    const store = new Store([{subject: "a", predicate: "b", object: "c"}])
    it('should have a length of 1', () => {
      expect(store.length).to.equal(1)
    })
    it('should contain the triple {subject: "a", predicate: "b", object: "c"}', () => {
      expect(store.contains({subject: "a", predicate: "b", object: "c"})).to.be.true
    })
    it('should delete', () => {
      store.delete({subject: "a", predicate: "b", object: "c"})
      expect(store.length).to.equal(0)
    })
  })
  describe("Send updates to server", () => {
    const editor = new Store();
    it('sends update to server', async () => {
    })
  })
})
