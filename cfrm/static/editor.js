
const {assert, expect, should} = chai       // chai is globally imported earlier
import {LitElement, html, css} from "lit"


// import explicitly, because the autoloader does not work in this context
import 'shoelace/components/card/card.js'
import 'shoelace/components/button/button.js'
import 'shoelace/components/icon/icon.js'
import 'shoelace/components/input/input.js'
import 'shoelace/components/tree/tree.js'
import 'shoelace/components/tree-item/tree-item.js'


export class Editor extends LitElement {

  // declare pokeable properties that cause automagic rerendering
  static properties = {
    I_am_here_to_remember: { type: String}
  }

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
      {subject: "urn:john", predicate: "Name", object: "John Happy"},
      {subject: "urn:john", predicate: "Address", object: "urn:address-john"},
      {subject: "urn:address-john", predicate: "Street", object: "Happy Alley 16"}
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
    let triples = this.triples.filter(t => t.subject == subject)
    if (triples.length == 0) {
      if (this.new_triple.subject != subject) {
        return html`
          <sl-tree-item>
            no properties (${subject})
            <sl-icon-button name="plus" @click="${e => this.new_subject(subject)}"></sl-icon-button>
          </sl-tree-item>`
      } else {
        return this.render_triple_edit()
      }
    } else {
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
            ? html`<sl-icon-button name="plus" @click="${e => this.new_subject(subject)}"></sl-icon-button>`
            : html``  
          }
          ${t.subject == this.new_triple.subject && i == all.length - 1
            ? this.render_triple_edit()
            : html``
          }
        `
      })}
    `}
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


function with_host(tests) {
    // test helper; components need to be attached to the DOM to render
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
    expect(editor.version).to.equal('0.0.1')
    const {strings, values} = editor.render()
    expect(values[0]).to.equal("John Happy")
    expect(values[1]).to.equal(editor.version)
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

