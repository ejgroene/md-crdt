
const {assert, expect, should} = chai


import { Editor } from "./editor.js"
customElements.define('crdt-editor', Editor)


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <crdt-editor id="editor0"/>
    `
}

describe("App", () => {
    it('Should Fuck All', () => {
        assert("Fuck All")
    })
})
