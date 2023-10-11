
const {assert, expect, should} = chai


import { Editor } from "./editor.js"


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <editor-element id="editor0"/>
    `
}

describe("App Test", () => {
  it('Just a Placeholder', () => {
    assert("my first test")
  })
})

// probeer data
//this.store.publish({subject: "urn:john", predicate: "Name", object: "John Happy"})
//this.store.publish({subject: "urn:john", predicate: "Address", object: "urn:address-john"})
//this.store.publish({subject: "urn:address-john", predicate: "Street", object: "Happy Alley 16"})
//this.root = "urn:john"
