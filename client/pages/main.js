import { html } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { store, PageView } from '@things-factory/shell'

import logo from '../../assets/images/hatiolab-logo.png'

class WarehouseUiMain extends connect(store)(PageView) {
  static get properties() {
    return {
      warehouseUi: String
    }
  }
  render() {
    return html`
      <section>
        <h2>WarehouseUi</h2>
        <img src=${logo}></img>
      </section>
    `
  }

  stateChanged(state) {
    this.warehouseUi = state.warehouseUi.state_main
  }
}

window.customElements.define('warehouse-ui-main', WarehouseUiMain)
