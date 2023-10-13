
const {assert, expect, should} = chai       // chai is globally imported earlier
import {LitElement, html, css, nothing} from "lit"


// import explicitly, because the autoloader does not work in this context
import 'shoelace/components/card/card.js'
import 'shoelace/components/button/button.js'
import 'shoelace/components/icon/icon.js'
import 'shoelace/components/input/input.js'
import 'shoelace/components/tree/tree.js'
import 'shoelace/components/tree-item/tree-item.js'


import {Store} from "./store.js"


export class Editor extends LitElement {

  static styles = [
    css`
      .editplus::part(expand-button) {
        display: none;
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


  constructor(triples) {
    super();
    this.store = new Store(triples)
    this.new_triple = {subject: "", predicate: "", object: ""}
  }


  delete(t) {
    this.store.delete(t)
    this.requestUpdate()
  }


  commit_triple() {
    this.store.publish(this.new_triple)
    this.new_triple = {subject: "", predicate: "", object: ""}
    this.requestUpdate()
  }

  publish_triple() {
    this.store.publish(this.new_triple)
  }

  async fetch_triples() {
    await this.store.fetch()
    this.requestUpdate()
  }


  set_root(root_input) {
    this.root_input = root_input
    this.requestUpdate()
  }

  save_root() {
    this.root = this.root_input
    this.requestUpdate()
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
        <sl-input name="predicate" placeholder="predicate" @input=${e => this.new_predicate(e)}> </sl-input>
        <sl-tree-item>
          <sl-input name="object" placeholder="value" @input=${e => this.new_object(e)}></sl-input>
          <sl-icon-button name="save" @click=${e => this.commit_triple()}></sl-icon-button>
        </sl-tree-item>
      </sl-tree-item>`
  }
   


  render_edit_or_plus_button(subject) {
      // ...but there is a new triple being edited
      if (this.new_triple.subject == subject)
        return this.render_triple_edit()

      // ...show URI and '+' button
      else
        return html`
          <sl-tree-item class="editplus">
            <sl-icon-button name="plus" @click="${e => this.new_subject(subject)}"></sl-icon-button>
          </sl-tree-item>
        `
  }


  render_one_object(subject) {
    // renders the subtree for one subject, recursively

    const triples = this.store.filter(t => t.subject == subject)

    // no properties for this subject
    if (triples.length == 0) 
      return this.render_edit_or_plus_button(subject)

    // there are properties for this subject
    else
      return [...triples.map((t, i) =>
        html`
          <sl-tree-item expanded>
            ${t.predicate}
            <sl-icon-button  name="x"  label="Delete"  @click="${e => this.delete(t)}"></sl-icon-button>
            ${t.object.startsWith("urn:")
              ? this.render_one_object(t.object)
              : html`<sl-tree-item>${t.object}</sl-tree-item>`
            }
          </sl-tree-item>`
        ),
        this.render_edit_or_plus_button(subject)
      ]
  }

  render() {
    const name_triple = this.store.find(t => t.predicate == "Name" && t.subject == this.root)
    const title = name_triple ? name_triple.object : this.root
    return html`
      <sl-card class="card-header">
        <div slot="header" style="display: flex; align-items: center">
          ${!title
            ? html`
               <sl-input  placeholder="<enter URI>"  @input="${e => this.set_root(e.target.value)}"></sl-input>
               <sl-icon-button name="save"  ?disabled=${!this.root_input}  @click="${this.save_root}"></sl-button>
             `
            : html`<p>${title}</p>`
          }
        </div>
        ${title
          ? html`<sl-tree> ${this.render_one_object(this.root)} </sl-tree>`
          : nothing
        }
      </sl-card>
    `
  }
}


customElements.define('editor-element', Editor);


function find_value(template, predicate_or_pattern) {
  const predicate = 
    predicate_or_pattern instanceof RegExp
      ? v => predicate_or_pattern.test(v)
      : predicate_or_pattern
  for (const v of template.values)
    if (predicate(v))
      return v
    else
      if (v.values)
        return find_value(v, predicate)
}


describe("Find Values Utility", () => {
  it('finds values', () => {
    expect(find_value(html`<p></p>`, v => v == "a")).to.be.undefined
    expect(find_value(html`<p>${"a"}</p>`, v => v == "a")).to.equal("a")
    expect(find_value(html`<p>${"a"}</p><a>${"b"}</a>`, v => v == "a")).to.equal("a")
    expect(find_value(html`<p>${"a"}</p><a>${"b"}</a>`, v => v == "b")).to.equal("b")
    expect(find_value(html`<p>${"a"}</p><a>${"b"}</a>`, v => v == "c")).to.be.undefined
  })
  it('finds values in nested templates', () => {
    expect(find_value(html`<p>${html`<p>${"a"}</p>`}</p>`, v => v == "a")).to.equal("a")
    expect(find_value(html`<p>${html`<p>${"a"}</p>`}</p>`, v => v == "b")).to.be.undefined
  })
  it('finds attributes', () => {
    expect(find_value(html`<p a=${"aap"}></p>`, v => v == "aap")).to.equal("aap")
    expect(find_value(html`<p ?a=${true}></p>`, v => v == true)).to.equal(true)
  })
  it('finds properties', () => {
    expect(find_value(html`<p .a=${"aap"}></p>`, v => v == "aap")).to.equal("aap")
  })
  it('finds event handlers', () => {
    expect(find_value(html`<p @a=${e => e}></p>`, v => v.toString() == "e => e")).to.be.a('function')
  })
  it('uses string as pattern', () => {
    expect(find_value(html`<p>${e => e}</p>`, /e => e/)).to.be.a('function')
  })

})


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
    editor.root = "urn:john"
    editor.store = new Store([
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ])
    it('has triples', () => {
      const {strings, values} = editor.render()
      expect(values[0].values[0]).to.equal("John Happy")
    })
    it('has root', () => {
      expect(editor.root).to.equal("urn:john")
    })
  })

  describe("Create And Delete Triple", () => {
    const editor = new Editor();
    editor.root = "urn:john"
    editor.store = new Store([
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ])
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
      expect(editor.store.length).to.equal(1)
      editor.commit_triple()
      expect(editor.store.length).to.equal(2)
      expect(editor.store.contains({subject: "urn:john", predicate: "Name", object: "John Happy"})).to.be.true
      expect(editor.new_triple).to.deep.equal({subject: "", predicate: "", object: ""})
    })
    it('can delete triple', () => {
      expect(editor.store.length).to.equal(2)
      editor.delete(editor.store[1])
      expect(editor.store.length).to.equal(1)
    })
  })

  describe("Raw Rendering", () => {
    it('renders + button', () => {
      const editor = new Editor();
      const {strings, values: [new_subject_fn]} = editor.render_one_object("urn:does-not-exist")
      new_subject_fn()
      expect(editor.new_triple.subject).to.equal("urn:does-not-exist")
    })
  })

  describe("Raw Rendering edit boxes", () => {
    let editor = new Editor([
      {subject: "urn:john", predicate: "Name", object: "John Happy"}
    ])
    editor.root = "urn:john"
    editor.new_subject("urn:pete")
    it('renders callbacks for setting triple', () => {
      const {strings, values: [new_predicate, new_object, commit_triple]} = editor.render_triple_edit()
      new_predicate({target: {value: "Name"}})
      new_object({target: {value: "Peter"}})
      commit_triple()
      expect(editor.store.contains({subject: "urn:pete", predicate: "Name", object: "Peter"})).to.be.true
    })
  })

  describe("Raw Rendering of One Node", () => {
    const editor = new Editor([{subject: "urn:john", predicate: "Name", object: "John Happy"}])
    editor.root = "urn:john"
    it('renders callbacks for deleting triple', () => {
      const [{values: [predicate, delete_callback, object_tree_item]}] = editor.render_one_object("urn:john")
      expect(predicate).to.equal("Name")
      expect(delete_callback).to.be.an('function')
      const {values: [john_happy]} = object_tree_item
      expect(john_happy).to.equal("John Happy")
      expect(editor.store.length).to.equal(1)
      delete_callback()
      expect(editor.store.length).to.equal(0)
    })
  })


  describe("Rendering of DOM", async () => {
    await with_host(async host => {
      const edit = document.createElement('editor-element')
      host.appendChild(edit)

      it("is not understood by Erik", () => {
        expect({}.a ? "1" : "0").to.equal("0")
        expect({a: ""}.a ? "1" : "0").to.equal("0")
        expect({a: "A"}.a ? "disabled" : "0").to.equal("disabled")
        const {strings, values} = html`<p>${{a: "A"}.a ? "disabled" : "0"}</p>`
        expect(strings).to.deep.equal(["<p>", "</p>"])
        expect(values).to.deep.equal(["disabled"])
        let h = html`<p ${{a: "A"}.a ? "disabled" : "0"}></p>`
        const {strings: s2, values: v2} = html`<p ${{a: "A"}.a ? "disabled" : "0"}></p>`
        expect(s2).to.deep.equal(["<p ", "></p>"])
        expect(v2).to.deep.equal(["disabled"])
      })

      it('renders empty editor', async () => {
          await edit.updateComplete
          const input = edit.shadowRoot.querySelector('sl-card div[slot=header] sl-input')
          expect(input).not.to.be.null
          expect(input).attr('placeholder', '<enter URI>')
          const save = edit.shadowRoot.querySelector('sl-card div[slot=header] sl-icon-button[name="save"]')
          expect(save).not.to.be.null
          expect(save).attr('disabled') 
          const tree = edit.shadowRoot.querySelector('sl-card sl-tree')
          expect(tree).to.be.null
        }) 

      it('activates save button', async () => {
        edit.set_root("urn:j")
        await edit.updateComplete
        const save = edit.shadowRoot.querySelector('sl-card div[slot=header] sl-icon-button[name="save"]')
        expect(save).not.to.be.null
        expect(save).not.attr('disabled')
      })

      it('saves root', async () => {
        edit.set_root("urn:john")
        edit.save_root()
        await edit.updateComplete
        const plus = edit.shadowRoot.querySelector('sl-card sl-tree sl-tree-item sl-icon-button[name="plus"]')
        expect(plus).not.to.be.null
      })

      it('renders plus button', async () => {
        await with_host(async host => {
          const edit = document.createElement('editor-element')
          edit.root = "urn:john"
          host.appendChild(edit)
          await edit.updateComplete
          const plus = edit.shadowRoot.querySelector('sl-card sl-tree sl-tree-item sl-icon-button')
          expect(plus).not.to.be.null
          expect(plus).attr('name', 'plus')
          // callbacks are tested above (on raw objects)
        })
      })

      it('renders delete button', async () => {
        await with_host(async host => {
          const edit = document.createElement('editor-element')
          edit.root = "urn:john"
          edit.store = new Store([ {subject: "urn:john", predicate: "address", object: "urn:address1"} ])
          host.appendChild(edit)
          await edit.updateComplete
          const trash = edit.shadowRoot.querySelector('sl-card sl-tree sl-tree-item sl-icon-button[name="x"]')
          expect(trash).not.to.be.null
          expect(trash).attr('name', 'x')
        })
      })
    })
  })


  describe("Send updates to Store", () => {
    let triples = []
    const editor = new Editor(triples);
    editor.root = "urn:john"
    editor.new_subject("urn:john")
    editor.new_predicate({target: {value: "Name"}})
    editor.new_object({target: {value: "John Happy"}})
    it('sends update to server', async () => {
      await editor.publish_triple()
      expect(triples).to.deep.equal([{subject: "urn:john", predicate: "Name", object: "John Happy"}])
    })
    //  await editor.fetch_triples()
  })
})

