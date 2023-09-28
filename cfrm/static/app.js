
const {assert, expect, should} = chai


import { Editor } from "./editor.js"


export function main(root) {
    document.title = "Data Editor 0.1"
    root.innerHTML = `
        <h1>Data Editor 0.1</h1>
        <!--editor-element id="editor0"/-->
    `
}

describe("App", () => {
    it('Should Fuck All', () => {
        assert("Fuck All")
    })
})
