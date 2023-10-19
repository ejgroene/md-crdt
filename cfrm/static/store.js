

const {assert, expect, should} = chai
import {Tester} from "selftest"

const test = Tester("store")


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


test('Store', test => {
  test('should separate storages', test => {
    const store1 = new Store()
    const store2 = new Store()
    store1.publish({subject: "a", predicate: "b", object: "c"})
    expect(store1.length).to.equal(1)
    expect(store2.length).to.equal(0)
  })
  test('should separate storages', test => {
    const store1 = new Store([{subject: "a", predicate: "b", object: "c"}])
    const store2 = new Store([])
    expect(store1.length).to.equal(1)
    expect(store2.length).to.equal(0)
  })
  test('should be a class', test => {
    expect(Store).to.be.a('function')
  })
  test("Store with Test Data", test => {
    const store = new Store([{subject: "a", predicate: "b", object: "c"}])
    test('should have a length of 1', test => {
      expect(store.length).to.equal(1)
    })
    test('should contain the triple {subject: "a", predicate: "b", object: "c"}', test => {
      expect(store.contains({subject: "a", predicate: "b", object: "c"})).to.be.true
    })
    test('should delete', test => {
      store.delete({subject: "a", predicate: "b", object: "c"})
      expect(store.length).to.equal(0)
    })
  })
  test("Send updates to server", test => {
    const editor = new Store();
    test('sends update to server', async test => {
    })
  })
})
