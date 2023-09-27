
import {LitElement, html, css} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js'
const {assert, expect, should} = chai

export class Editor extends LitElement {
  static properties = {
    version: {},
    triples: {},
  };

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
}



describe("Editor", () => {
  it('Create Editor', () => {
    const el = document.createElement('editor-element')
    expect(el).not.to.be.null
  })
})

