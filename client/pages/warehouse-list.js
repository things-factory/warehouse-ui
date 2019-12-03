import { getCodeByName } from '@things-factory/code-base'
import '@things-factory/form-ui'
import '@things-factory/grist-ui'
import { i18next, localize } from '@things-factory/i18n-base'
import { openImportPopUp } from '@things-factory/import-ui'
import {
  client,
  CustomAlert,
  gqlBuilder,
  isMobileDevice,
  navigate,
  PageView,
  ScrollbarStyles
} from '@things-factory/shell'
import gql from 'graphql-tag'
import { css, html } from 'lit-element'

class WarehouseList extends localize(i18next)(PageView) {
  static get styles() {
    return [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        search-form {
          overflow: visible;
        }
        data-grist {
          overflow-y: auto;
          flex: 1;
        }
      `
    ]
  }

  static get properties() {
    return {
      searchFields: Array,
      config: Object,
      data: Object
    }
  }

  render() {
    return html`
      <search-form id="search-form" .fields=${this._searchFields} @submit=${e => this.dataGrist.fetch()}></search-form>

      <data-grist
        .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
        .config=${this.config}
        .fetchHandler="${this.fetchHandler.bind(this)}"
      ></data-grist>
    `
  }

  get context() {
    return {
      title: i18next.t('title.warehouse'),
      actions: [
        {
          title: i18next.t('button.save'),
          action: () => this._saveWarehouse(this.dataGrist.exportPatchList({ flagName: 'cuFlag' }))
        },
        {
          title: i18next.t('button.delete'),
          action: this._deleteWarehouse.bind(this)
        }
      ],
      exportable: {
        name: i18next.t('title.warehouse'),
        data: this._exportableData.bind(this)
      },
      importable: {
        handler: records => {
          const config = {
            rows: this.config.rows,
            columns: [...this.config.columns.filter(column => column.imex !== undefined)]
          }
          openImportPopUp(records, config, async patches => {
            await this._saveWarehouse(patches)
            history.back()
          })
        }
      }
    }
  }

  get searchForm() {
    return this.shadowRoot.querySelector('search-form')
  }

  get dataGrist() {
    return this.shadowRoot.querySelector('data-grist')
  }

  async pageInitialized() {
    const warehouseTypes = await getCodeByName('WAREHOUSE_TYPES')
    this._searchFields = [
      {
        label: i18next.t('field.name'),
        name: 'name',
        type: 'text',
        props: { searchOper: 'i_like' }
      },
      {
        label: i18next.t('field.description'),
        name: 'description',
        type: 'text',
        props: { searchOper: 'i_like' }
      },
      {
        label: i18next.t('field.type'),
        name: 'type',
        type: 'text',
        props: { searchOper: 'i_like' }
      }
    ]

    this.config = {
      list: { fields: ['name', 'description', 'type'] },
      rows: { selectable: { multiple: true } },
      columns: [
        { type: 'gutter', gutterName: 'dirty' },
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'reorder',
          handlers: {
            click: (_columns, _data, _column, record, _rowIndex) => {
              if (record.id) navigate(`locations/${record.id}?name=${record.name}`)
            }
          }
        },
        {
          type: 'string',
          name: 'name',
          header: i18next.t('field.name'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.name'), key: 'name', width: 50, type: 'string' },
          sortable: true,
          width: 100
        },
        {
          type: 'string',
          name: 'description',
          header: i18next.t('field.description'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.description'), key: 'description', width: 100, type: 'string' },
          sortable: true,
          width: 150
        },
        {
          type: 'code',
          name: 'type',
          header: i18next.t('field.type'),
          record: {
            editable: true,
            align: 'center',
            codeName: 'WAREHOUSE_TYPES'
          },
          imex: {
            header: i18next.t('field.type'),
            key: 'type',
            width: 50,
            type: 'array',
            arrData: warehouseTypes.map(warehouseType => {
              return {
                name: warehouseType.name,
                id: warehouseType.name
              }
            })
          },
          sortable: true,
          width: 100
        },
        {
          type: 'datetime',
          name: 'updatedAt',
          header: i18next.t('field.updated_at'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 180
        },
        {
          type: 'object',
          name: 'updater',
          header: i18next.t('field.updater'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 180
        }
      ]
    }
  }

  pageUpdated(_changes, _lifecycle) {
    if (this.active) {
      this.dataGrist.fetch()
    }
  }

  async fetchHandler({ page, limit, sorters = [{ name: 'name' }] }) {
    const response = await client.query({
      query: gql`
        query {
          warehouses(${gqlBuilder.buildArgs({
            filters: this.searchForm.queryFilters,
            pagination: { page, limit },
            sortings: sorters
          })}) {  
            items {
              id
              name
              type
              description
              updatedAt
              updater{
                name
                description
              }
            }
            total
          }
        }
      `
    })

    return {
      total: response.data.warehouses.total || 0,
      records: response.data.warehouses.items || []
    }
  }

  async _saveWarehouse(patches) {
    if (patches && patches.length) {
      const response = await client.query({
        query: gql`
            mutation {
              updateMultipleWarehouse(${gqlBuilder.buildArgs({
                patches
              })}) {
                name
              }
            }
          `
      })

      if (!response.errors) {
        this.dataGrist.fetch()
        this.showToast(i18next.t('text.data_updated_successfully'))
      }
    } else {
      CustomAlert({
        title: i18next.t('text.nothing_changed'),
        text: i18next.t('text.there_is_nothing_to_save')
      })
    }
  }

  async _deleteWarehouse() {
    const ids = this.dataGrist.selected.map(record => record.id)
    if (ids && ids.length) {
      const anwer = await CustomAlert({
        type: 'warning',
        title: i18next.t('button.delete'),
        text: i18next.t('text.are_you_sure'),
        confirmButton: { text: i18next.t('button.delete') },
        cancelButton: { text: i18next.t('button.cancel') }
      })

      if (!anwer.value) return

      const response = await client.query({
        query: gql`
          mutation {
            deleteWarehouses(${gqlBuilder.buildArgs({ ids })})
          }
        `
      })

      if (!response.errors) {
        this.dataGrist.fetch()
        this.showToast(i18next.t('text.data_deleted_successfully'))
      }
    } else {
      CustomAlert({
        title: i18next.t('text.nothing_selected'),
        text: i18next.t('text.there_is_nothing_to_delete')
      })
    }
  }

  _exportableData() {
    let records = []
    if (this.dataGrist.selected && this.dataGrist.selected.length > 0) {
      records = this.dataGrist.selected
    } else {
      records = this.dataGrist.data.records
    }

    var headerSetting = this.dataGrist._config.columns
      .filter(column => column.type !== 'gutter' && column.record !== undefined && column.imex !== undefined)
      .map(column => {
        return column.imex
      })

    var data = records.map(item => {
      return {
        id: item.id,
        ...this.config.columns
          .filter(column => column.type !== 'gutter' && column.record !== undefined && column.imex !== undefined)
          .reduce((record, column) => {
            record[column.imex.key] = column.imex.key
              .split('.')
              .reduce((obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined), item)
            return record
          }, {})
      }
    })

    return { header: headerSetting, data: data }
  }

  showToast(message) {
    document.dispatchEvent(new CustomEvent('notify', { detail: { message } }))
  }
}

window.customElements.define('warehouse-list', WarehouseList)
