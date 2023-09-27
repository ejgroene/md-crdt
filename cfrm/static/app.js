
import { Editor } from "./editor.js"
customElements.define('crdt-editor', Editor)


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <crdt-editor id="editor0"/>
    `
}


it('should fuck all', () => {
    console.log("Fuck All")
})
