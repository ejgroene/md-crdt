
const {assert, expect, should} = chai       // chai is globally imported earlier
import {LitElement, html, css, nothing} from "lit"


// import explicitly, because the autoloader does not work in this context
import 'shoelace/components/card/card.js'
import 'shoelace/components/button/button.js'
import 'shoelace/components/icon/icon.js'
import 'shoelace/components/input/input.js'
import 'shoelace/components/tree/tree.js'
import 'shoelace/components/tree-item/tree-item.js'


export class Editor extends LitElement {

  static styles = [
    css`
      sl-button {
        padding-left: 0.5em;
      }
      sl-card::part(header) {
        font-family: var(--sl-font-sans);
      }
      sl-input::part(base) {
        border: none;
        box-shadow: none;
        border-radius: 0;
        height: 100%;
      }
      sl-input::part(input) {
        padding-left: 0em;
      }
      sl-input::part(input):focus {  
        border-bottom: 2px dotted lightgray
      }
    `]

  constructor() {
    super();
    this.version = '0.0.1';
    this.triples = [
      //{subject: "urn:john", predicate: "Name", object: "John Happy"}
      //{subject: "urn:john", predicate: "Address", object: "urn:address-john"},
      //{subject: "urn:address-john", predicate: "Street", object: "Happy Alley 16"}
    ]
    this.root = "urn:john"
    this.new_triple = {subject: "", predicate: "", object: ""}
  }


  delete(t) {
    const i = this.triples.indexOf(t)
    this.triples.splice(i, 1)
    this.requestUpdate()
    // publish a delete operation to the network
  }


  commit_triple() {
    this.triples.push(this.new_triple)
    this.new_triple = {subject: "", predicate: "", object: ""}
    this.requestUpdate()
    // publish a create operation to the network
  }

  new_subject(subject) {
    this.new_triple.subject = subject
    this.requestUpdate()
  }
    
  new_predicate(event) {
    this.new_triple.predicate = event.target.value
  }

  new_object(event) {
    this.new_triple.object = event.target.value
  }

  render_triple_edit() {
    // renders the input fields for predicate and object + save button
    return html`
      <sl-tree-item expanded>
        <sl-input name="predicate" placeholder="Predicate" @input="${e => this.new_predicate(e)}"></sl-input>
        <sl-tree-item>
          <sl-input name="object" placeholder="Value" @input="${e => this.new_object(e)}"></sl-input>
          <sl-icon-button name="save" @click="${e => this.commit_triple()}"></sl-icon-button>
        </sl-tree-item>
      </sl-tree-item>`
  }
    
  render_one_object(subject) {
    // renders the subtree for one subject, recursively
    const triples = this.triples.filter(t => t.subject == subject)
    if (triples.length == 0) 
      if (this.new_triple.subject == subject)
        return this.render_triple_edit()
      else
        return html`
          <sl-tree-item>
            &lt;${subject}&gt;
            <sl-icon-button name="plus" @click="${e => this.new_subject(subject)}"></sl-icon-button>
          </sl-tree-item>
        `
    else
      return html`
        ${triples.map((t, i, all) => {
          return html`
            <sl-tree-item expanded>
              ${t.predicate}
              ${t.object.startsWith("urn:")
                ? this.render_one_object(t.object)
                : html`<sl-tree-item>${t.object}
                         <sl-icon-button name="trash" @click="${e => this.delete(t)}"></sl-icon-button>
                       </sl-tree-item>`
              }
            </sl-tree-item>
            ${i == all.length - 1
              ? t.subject == this.new_triple.subject
                ? this.render_triple_edit()
                : html`<sl-icon-button name="plus" @click="${e => this.new_subject(subject)}"></sl-icon-button>`
              : nothing
            }
          `
        })}
      `
  }

  render() {
    const name_triple = this.triples.find(t => t.predicate == "Name" && t.subject == this.root)
    const title = name_triple ? name_triple.object : this.root
    return html`
      <sl-card class="card-header">
        <div slot="header">
          <p>${title} ${this.version}</p>
        </div>
        <sl-tree>
          ${this.render_one_object(this.root)}
        </sl-tree>
      </sl-card>
    `
  }
}


customElements.define('editor-element', Editor);


async function with_host(tests) {
    // test helper; components need to be attached to the DOM to render
    const host = document.createElement('div')
    document.body.appendChild(host)
    try {
      await tests(host)
    } finally {
      document.body.removeChild(host)
    }
}


describe("Editor", () => {
  describe("Raw Object", () => {
    const editor = new Editor();
    editor.triples = [
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ]
    it('has version', () => {
      expect(editor).not.to.be.null
      expect(editor.version).to.equal('0.0.1')
    })
    it('has triples', () => {
     const {strings, values} = editor.render()
      expect(values[0]).to.equal("John Happy")
      expect(values[1]).to.equal(editor.version)
    })
    it('has root', () => {
      expect(editor.root).to.equal("urn:john")
    })
  })
  describe("Create And Delete Triple", () => {
    const editor = new Editor();
    editor.triples = [
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ]
    it('has new iempty triple', () => {
      expect(editor.new_triple.subject).to.equal("")
      expect(editor.new_triple.predicate).to.equal("")
      expect(editor.new_triple.object).to.equal("")
    })
    it('can set new triple', () => {
      editor.new_subject("urn:john")
      expect(editor.new_triple).to.deep.equal({subject: "urn:john", predicate: "", object: ""})
      editor.new_predicate({target: {value: "Name"}})
      expect(editor.new_triple).to.deep.equal({subject: "urn:john", predicate: "Name", object: ""})
      editor.new_object({target: {value: "John Happy"}})
      expect(editor.new_triple).to.deep.equal({subject: "urn:john", predicate: "Name", object: "John Happy"})
    })
    it('can commit new triple', () => {
      expect(editor.triples.length).to.equal(1)
      editor.commit_triple()
      expect(editor.triples.length).to.equal(2)
      expect(editor.triples[1]).to.deep.equal({subject: "urn:john", predicate: "Name", object: "John Happy"})
      expect(editor.new_triple).to.deep.equal({subject: "", predicate: "", object: ""})
    })
    it('can delete triple', () => {
      expect(editor.triples.length).to.equal(2)
      editor.delete(editor.triples[1])
      expect(editor.triples.length).to.equal(1)
    })
  })
  describe("Raw Rendering", () => {
    it('renders + button', () => {
      const editor = new Editor();
      editor.triples = []
      const {strings, values: [subject, new_subject_fn]} = editor.render_one_object("urn:does-not-exist")
      expect(strings[1]).to.include('<sl-icon-button name="plus"')
      expect(subject).to.equal("urn:does-not-exist")
      new_subject_fn()
      expect(editor.new_triple.subject).to.equal("urn:does-not-exist")
    })
  })
  describe("Raw Rendering edit boxes", () => {
    let editor = new Editor();
    editor.triples = [
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ]
    editor.new_subject("urn:pete")
    it('renders callbacks for setting triple', () => {
      const {strings, values: [new_predicate, new_object, commit_triple]} = editor.render_triple_edit()
      new_predicate({target: {value: "Name"}})
      new_object({target: {value: "Peter"}})
      commit_triple()
      expect(editor.triples[1]).to.deep.equal({subject: "urn:pete", predicate: "Name", object: "Peter"})
      expect(strings[0]).to.include("<sl-tree-item expanded>")
      expect(strings[1]).to.include("<sl-tree-item>")
      expect(strings[2]).to.include("<sl-icon-button name=\"save\"")
      expect(strings[3]).to.include("</sl-tree-item>")
    })
  })
  describe("Raw Rendering of One Node", () => {
    const editor = new Editor();
    editor.triples = [
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ]
    it('renders callbacks for deleting triple', () => {
      const {values} = editor.render_one_object("urn:john")
      const {values: [predicate, object_tree_item]} = values[0][0]
      expect(predicate).to.equal("Name")
      const {values: [john_happy, delete_callback]} = object_tree_item
      expect(john_happy).to.equal("John Happy")
      delete_callback()
      expect(editor.triples.length).to.equal(0)
    })
  })
  // 1. empty editor + button
  // 2. one triple
  // 3. one triple with one object
 
  describe("Rendering of DOM", () => {
    it('renders plus button', async () => {
      await with_host(async host => {
        const edit = document.createElement('editor-element')
        host.appendChild(edit)
        await edit.updateComplete
        const plus = edit.shadowRoot.querySelector('sl-icon-button')
        expect(plus).attr('name', 'plus')
        console.log(plus)
        console.log(plus.onclick)
      })
    })
  })
})

