
const {assert, expect, should} = chai


import { Editor } from "./editor.js"


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <editor-element id="editor0"/>
    `
}

describe("App Tetss", () => {
  it('Just a Placeholder', () => {
    assert("my first test")
  })
})
