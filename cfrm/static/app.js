
const {assert, expect, should} = chai
import {describe, it} from "selftest"


import { Editor } from "./editor.js"


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <editor-element id="editor0"/>
    `
    load_test_data(root)
}


export function load_test_data(root) {
  const editor = root.querySelector("editor-element")
  editor.store.publish({subject: "urn:john", predicate: "Name", object: "John Happy"})
  editor.store.publish({subject: "urn:john", predicate: "Address", object: "urn:address-john"})
  editor.store.publish({subject: "urn:address-john", predicate: "Street", object: "Happy Alley 16"})
  editor.root = "urn:john"
}



describe("App Test", () => {
  it('Just a Placeholder', () => {
    assert("my first test")
  })
})


