
const {assert, expect, should} = chai

import {LitElement, html, css} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js'


export class Editor extends LitElement {
  static get properties() {
    return {
      version: { type: String, reflect: true },
      triples: {},
    }
  }

  static styles = css`
    :host {
       background-color: grey;
    }
  `

  constructor() {
    super();
    this.version = '0.0.1';
  }


  render() {
    return html`
    <div class="p-3 m-0 border-0 bd-example m-0 border-0">
        <p>Decentralized On/Offline Collaborative Conflict Free Structured Data Editor ${this.version}.</p>
        <div class="mb-3">
          <label for="formGroupExampleInput" class="form-label">Example label</label>
          <input type="text" class="form-control" id="formGroupExampleInput" placeholder="Example input placeholder">
        </div>
        <div class="mb-3">
          <label for="formGroupExampleInput2" class="form-label">Another label</label>
          <input type="text" class="form-control" id="formGroupExampleInput2" placeholder="Another input placeholder">
        </div>
    </div>
    `;
  }

  my_logic() {
    return "I am logic, or what?"
  }
}


customElements.define('editor-element', Editor);


function with_host(tests) {
    // components need to be attached to the DOM to render
    const host = document.createElement('div')
    document.body.appendChild(host)
    try {
      tests(host)
    } finally {
      document.body.removeChild(host)
    }
}


describe("Editor", () => {
  it('Create Editor Object', () => {
    const editor = new Editor();
    expect(editor).not.to.be.null
    expect(editor.my_logic()).to.equal("I am logic, or what?")
    expect(editor.version).to.equal('0.0.1')
    const {strings, values} = editor.render()
    expect(values[0]).to.equal(editor.version)
    expect(strings[0]).to.equal("\n    <div class=\"p-3 m-0 border-0 bd-example m-0 border-0\">\n        <p>Decentralized On/Offline Collaborative Conflict Free Structured Data Editor ")
    }) 
  
  it('Create Editor Element', async () => {
    with_host( async host => {
      const edit = document.createElement('editor-element')
      host.appendChild(edit)
      await edit.updateComplete
      console.log("edit:", edit)
      // this finally works
      // now find ways to assert the DOM with chai
    })
  })
})

