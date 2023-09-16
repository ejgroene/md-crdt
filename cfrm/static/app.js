
import { Editor } from "./editor.js"
customElements.define('crdt-editor', Editor)


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <crdt-editor id="editor0"/>
    `
}
