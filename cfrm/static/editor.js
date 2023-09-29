
const {assert, expect, should} = chai

import {LitElement, html, css} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js'

// import explicitly, because the autoloader does not work in this context
import 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.9.0/cdn/components/card/card.js'
import 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.9.0/cdn/components/rating/rating.js'
import 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.9.0/cdn/components/button/button.js'
import 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.9.0/cdn/components/input/input.js'


export class Editor extends LitElement {

  static get properties() {
    return {
      version: { type: String, reflect: true },
      triples: { state: true },
    }
  }

  static styles = css`
      .data {
        border-bottom: 1px solid lightgray;
        border-left: 1px solid lightgray;
        padding: 0.5em;
      }
    `

  constructor() {
    super();
    this.version = '0.0.1';
    this.triples = [
      {subject: "s1", predicate: "p1", object: "o1"},
    ]
    this.new_triple = {subject: "", predicate: "", object: ""}
  }

  _submit(event) {
    console.log("submit", event)
    const form = document.querySelector('form')
    console.log("form", form)
    const data = new FormData(form)
    console.log("data", data)
  }

  delete(i) {
    this.triples.splice(i, 1)
    this.requestUpdate()
    // publish a delete operation to the network
  }

  add_triple(event) {
    console.log("add_triple")
    this.triples.push(this.new_triple)
    this.new_triple = {subject: "", predicate: "", object: ""}
    this.requestUpdate()
  }

  set_new_subject(event) {
    this.new_triple.subject = event.target.value
  }
    
  set_new_predicate(event) {
    this.new_triple.predicate = event.target.value
  }

  set_new_object(event) {
    this.new_triple.object = event.target.value
  }

  render() {
    return html`
      <sl-card class="card-header card-footer">
        <div slot="header">
          Decentralized On/Offline Collaborative Conflict Free Structured Data Editor ${this.version}.
        </div>
        <table>
          <tr>
            <th>Subject</th>
            <th>Predicate</th>
            <th>Object</th>
            <th></th>
          </tr>
          ${this.triples.map( (triple, i)=> html`
            <tr>
              <td class="data">${triple.subject}</td>
              <td class="data">${triple.predicate}</td>
              <td class="data">${triple.object}</td>
              <td><sl-button variant="danger" @click="${e => this.delete(i)}">Delete</sl-button></td>
            </tr>
          `)}
          <form id="yourform">
          <tr>
            <td><sl-input @input=${this.set_new_subject}></sl-input></td>
            <td><sl-input @input=${this.set_new_predicate}></sl-input></td>
            <td><sl-input @input=${this.set_new_object}></sl-input></td>
            <td><sl-button type="submit" variant="primary" @click="${this.add_triple}">Add</sl-button></td>
          </tr>
          </form>
        </table>
        <div slot="footer">
        </div>
      </sl-card>
    `
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
    }) 
  
  it('Create Editor Element', async () => {
    with_host(async host => {
      const edit = document.createElement('editor-element')
      host.appendChild(edit)
      await edit.updateComplete
      // this finally works
      // now find ways to assert the DOM with chai
    })
  })
})

