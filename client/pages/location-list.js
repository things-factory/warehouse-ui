import { USBPrinter } from '@things-factory/barcode-base'
import '@things-factory/form-ui'
import '@things-factory/grist-ui'
import { i18next, localize } from '@things-factory/i18n-base'
import { openImportPopUp } from '@things-factory/import-ui'
import { openPopup } from '@things-factory/layout-base'
import {
  client,
  CustomAlert,
  gqlBuilder,
  isMobileDevice,
  PageView,
  ScrollbarStyles,
  store
} from '@things-factory/shell'
import gql from 'graphql-tag'
import { css, html } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin'
import { LOCATION_LABEL_SETTING_KEY } from '../../setting-constants'
import './generate-location-list'

class LocationList extends connect(store)(localize(i18next)(PageView)) {
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
      _warehouseName: String,
      _searchFields: Array,
      config: Object,
      _selectedRecords: Array
    }
  }

  render() {
    return html`
      <search-form id="search-form" .fields=${this._searchFields} @submit=${e => this.dataGrist.fetch()}></search-form>

      <data-grist
        .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
        .config=${this.config}
        .fetchHandler="${this.fetchHandler.bind(this)}"
        @select-record-change=${e => (this._selectedRecords = e.detail.selectedRecords)}
      ></data-grist>
    `
  }

  get context() {
    return {
      title: this._warehouseName,
      actions: [
        {
          title: i18next.t('button.print_label'),
          action: this._printLocationLabel.bind(this)
        },
        {
          title: i18next.t('button.generate'),
          action: this._generateLocation.bind(this)
        },
        {
          title: i18next.t('button.save'),
          action: this._saveLocation(this.dataGrist.exportPatchList({ flagName: 'cuFlag' }))
        },
        {
          title: i18next.t('button.delete'),
          action: this._deleteLocation.bind(this)
        },
        {
          title: i18next.t('button.delete_all'),
          action: this._deleteAllLocations.bind(this)
        }
      ],
      exportable: {
        name: this._warehouseName,
        data: this._exportableData.bind(this)
      },
      importable: {
        handler: records => {
          const config = {
            rows: this.config.rows,
            columns: [...this.config.columns.filter(column => column.imex !== undefined)]
          }
          openImportPopUp(records, config, async patches => {
            await this._saveLocation(patches)
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

  pageUpdated(_changes, lifecycle) {
    if (this.active) {
      this._warehouseName = lifecycle.params.name ? lifecycle.params.name : undefined
      this._warehouseId = lifecycle.resourceId
      this.dataGrist.fetch()
    }
  }

  pageInitialized() {
    this._searchFields = [
      {
        label: i18next.t('field.name'),
        name: 'name',
        type: 'text',
        props: { searchOper: 'i_like' }
      },
      {
        label: i18next.t('field.type'),
        name: 'type',
        type: 'text',
        props: { searchOper: 'i_like' }
      },
      {
        label: i18next.t('field.zone'),
        name: 'zone',
        type: 'text',
        props: { searchOper: 'eq' }
      },
      {
        label: i18next.t('field.row'),
        name: 'row',
        type: 'text',
        props: { searchOper: 'eq' }
      },
      {
        label: i18next.t('field.column'),
        name: 'column',
        type: 'text',
        props: { searchOper: 'eq' }
      },
      {
        label: i18next.t('field.shelf'),
        name: 'shelf',
        type: 'text',
        props: { searchOper: 'eq' }
      },
      {
        label: i18next.t('field.status'),
        name: 'status',
        type: 'text',
        props: { searchOper: 'i_like' }
      }
    ]

    this.config = {
      rows: { selectable: { multiple: true } },
      list: { fields: ['name', 'type', 'status'] },
      columns: [
        { type: 'gutter', gutterName: 'dirty' },
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'string',
          name: 'name',
          header: i18next.t('field.name'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.name'), key: 'name', width: 50, type: 'string' },
          sortable: true,
          width: 150
        },
        {
          type: 'string',
          name: 'type',
          header: i18next.t('field.type'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.type'), key: 'type', width: 50, type: 'string' },
          sortable: true,
          width: 150
        },
        {
          type: 'string',
          name: 'zone',
          header: i18next.t('field.zone'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.zone'), key: 'zone', width: 50, type: 'string' },
          sortable: true,
          width: 80
        },
        {
          type: 'string',
          name: 'row',
          header: i18next.t('field.row'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.row'), key: 'row', width: 50, type: 'string' },
          sortable: true,
          width: 80
        },
        {
          type: 'string',
          name: 'column',
          header: i18next.t('field.column'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.column'), key: 'column', width: 50, type: 'string' },
          sortable: true,
          width: 80
        },
        {
          type: 'string',
          name: 'shelf',
          header: i18next.t('field.shelf'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.shelf'), key: 'shelf', width: 50, type: 'string' },
          sortable: true,
          width: 80
        },
        {
          type: 'string',
          name: 'status',
          header: i18next.t('field.status'),
          record: { editable: true, align: 'center' },
          imex: { header: i18next.t('field.status'), key: 'status', width: 50, type: 'string' },
          sortable: true,
          width: 80
        },
        {
          type: 'datetime',
          name: 'updatedAt',
          header: i18next.t('field.updated_at'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 150
        },
        {
          type: 'object',
          name: 'updater',
          header: i18next.t('field.updater'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 150
        }
      ]
    }
  }

  async fetchHandler({ page, limit, sorters = [{ name: 'name' }] }) {
    let filters = []
    if (this._warehouseId) {
      filters.push({
        name: 'warehouse_id',
        operator: 'eq',
        value: this._warehouseId
      })
    }

    const response = await client.query({
      query: gql`
        query {
          locations(${gqlBuilder.buildArgs({
            filters: [...filters, ...this.searchForm.queryFilters],
            pagination: { page, limit },
            sortings: sorters
          })}) {
            items {
              id
              name
              zone
              row
              type
              column
              shelf
              status
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
      total: response.data.locations.total || 0,
      records: response.data.locations.items || []
    }
  }

  async _saveLocation(patches) {
    if (patches && patches.length && this._warehouseId) {
      patches = patches.map(patch => {
        patch.warehouse = { id: this._warehouseId }
        return patch
      })

      const response = await client.query({
        query: gql`
            mutation {
              updateMultipleLocation(${gqlBuilder.buildArgs({
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

  async _deleteLocation() {
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
            deleteLocations(${gqlBuilder.buildArgs({ ids })})
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

  async _deleteAllLocations() {
    const answer = await CustomAlert({
      title: i18next.t('text.delete_all_locations?'),
      text: i18next.t('text.you_wont_be_able_to_revert_this'),
      type: 'warning',
      confirmButton: { text: i18next.t('button.delete_all') },
      cancelButton: { text: i18next.t('button.cancel') }
    })

    if (!answer.value) return

    const response = await client.query({
      query: gql`
        mutation {
          deleteAllLocations(${gqlBuilder.buildArgs({ warehouseId: this._warehouseId })})
        }
      `
    })

    if (!response.errors) {
      this.dataGrist.fetch()
      this.showToast(i18next.t('text.data_deleted_successfully'))
    }
  }

  async _printLocationLabel() {
    const records = this.dataGrist.selected
    var labelId = this._locationLabel && this._locationLabel.id

    if (!labelId) {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: `${i18next.t('text.no_label_setting_was_found')}. ${i18next.t('text.please_check_your_setting')}`
          }
        })
      )
    } else {
      for (var record of records) {
        var searchParams = new URLSearchParams()

        /* for location record mapping */
        searchParams.append('location', record.name)
        ;[('row', 'type', 'zone', 'column', 'shelf')].forEach(key => searchParams.append(key, record[key]))

        try {
          const response = await fetch(`/label-command/${labelId}?${searchParams.toString()}`, {
            method: 'GET'
          })

          if (response.status !== 200) {
            throw `Error : Can't get label command from server (response: ${response.status})`
          }

          var command = await response.text()

          if (!this.printer) {
            this.printer = new USBPrinter()
          }

          await this.printer.connectAndPrint(command)
        } catch (ex) {
          document.dispatchEvent(
            new CustomEvent('notify', {
              detail: {
                level: 'error',
                message: ex,
                ex
              }
            })
          )

          delete this.printer
          break
        }
      }
    }
  }

  async _generateLocation() {
    openPopup(
      html`
        <generate-location-list
          .warehouseId="${this._warehouseId}"
          .callback="${this.dataGrist.fetch.bind(this.dataGrist)}"
        ></generate-location-list>
      `,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.generate_location_list')
      }
    )
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

  stateChanged(state) {
    var locationLabelSetting = state.dashboard[LOCATION_LABEL_SETTING_KEY]
    this._locationLabel = (locationLabelSetting && locationLabelSetting.board) || {}
  }
}

window.customElements.define('location-list', LocationList)
