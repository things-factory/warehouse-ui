import { getCodeByName } from '@things-factory/code-base'
import '@things-factory/form-ui'
import { MultiColumnFormStyles } from '@things-factory/form-ui'
import '@things-factory/grist-ui'
import { i18next, localize } from '@things-factory/i18n-base'
import { client, CustomAlert, gqlBuilder, isMobileDevice, ScrollbarStyles, sleep } from '@things-factory/shell'
import gql from 'graphql-tag'
import { css, html, LitElement } from 'lit-element'

export class GenerateLocationList extends localize(i18next)(LitElement) {
  static get properties() {
    return {
      warehouseId: String,
      _searchFields: Array,
      _formatsFromCode: Array,
      _generatorConfig: Object,
      _previewConfig: Object,
      callback: Object,
      _selectedFormat: String
    }
  }

  constructor() {
    super()
    this._locationList = []
    this._zoneName = ''
    this._rowExtension = ''
    this._columnExtension = ''
    this._shelfExtension = ''
    this._caseSensitive = false
    this._useAlphabet = false
    this._rowLeadingZeroes = false
    this._columnLeadingZeroes = false
    this._shelfLeadingZeroes = false
    this._generatorConfig = {}
    this._formatsFromCode = []
    this._selectedFormat = ''
  }

  static get styles() {
    return [
      MultiColumnFormStyles,
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: white;
        }

        /*.location-formatting {
          border-style: none;
        }*/

        .location-formatting fieldset {
          border-style: none;
          margin: 0;
          padding: 0;
        }

        .location-formatting label {
          font: normal 14px var(--theme-font);
          color: var(--secondary-color);
          padding: 3px 0;
        }

        .location-formatting input {
          font: normal 14px var(--theme-font);
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: var(--border-radius);
          padding: 2px 9px;
        }

        .location-formatting .parent {
          display: flex;
          flex-direction: row;
          margin: 0px 5px;
        }

        .location-formatting .parent .section {
          flex-grow: 1;
          width: 33%;
          margin: 10px;
        }

        .location-formatting .parent .section legend {
          padding: 0px 5px 3px 10px;
          font: var(--subtitle-font);
          color: var(--secondary-color);
          border-bottom: var(--subtitle-border-bottom);
          position: relative;
        }

        .location-formatting .parent .section .child {
          padding-left: 10px;
        }

        .location-formatting .parent .section .child:first-of-type {
          padding-top: 5px;
        }

        .location-formatting .grist {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
          height: 220px;
        }

        .location-formatting data-grist {
          background-color: white;
          padding: 0px 15px 0px 15px;
          overflow-y: hidden;
          flex: 1;
        }

        h2 {
          padding: 10px 5px 3px 5px;
          font: var(--subtitle-font);
          color: var(--subtitle-text-color);
          border-bottom: var(--subtitle-border-bottom);
        }
        .grist h2 {
          margin: var(--grist-title-margin);
          border: var(--grist-title-border);
          color: var(--secondary-color);
        }
        .grist h2 mwc-icon {
          vertical-align: middle;
          margin: var(--grist-title-icon-margin);
          font-size: var(--grist-title-icon-size);
          color: var(--grist-title-icon-color);
        }
        h2 + data-grist {
          padding-top: var(--grist-title-with-grid-padding);
        }
        .location-formatting .button-container {
          display: flex;
          position: absolute;
          right: 0;
          bottom: 0;
        }
        .location-formatting .button-container > mwc-button {
          padding: 10px;
          position: relative;
        }
      `
    ]
  }

  render() {
    return html`
      <form class="multi-column-form">
        <fieldset>
          <legend>${i18next.t('title.generate_location_list')}</legend>
          <label>${i18next.t('label.location_format')}</label>

          <select name="locationFormat" @change="${e => this._validateForm(e.currentTarget.value)}">
            <option value="">-- ${i18next.t('text.please_select_any_location_format')} --</option>
            ${(this._formatsFromCode || []).map(
              format =>
                html`
                  <option value="${format && format.name}"
                    >${format && format.name}
                    ${format && format.description ? ` ${format && format.description}` : ''}</option
                  >
                `
            )}
          </select>

          <label>${i18next.t('label.zone_name')}</label>
          <input
            placeholder="${i18next.t('text.enter_zone_name')}"
            @input="${event => {
              const input = event.currentTarget
              this._zoneName = input.value
            }}"
            @keypress="${event => {
              if (event.keyCode === 13) {
                event.preventDefault()
                return false
              }
            }}"
          />

          <label>${i18next.t('label.case_sensitive')}</label>
          <input
            type="checkbox"
            @input="${event => {
              this._caseSensitive = event.currentTarget.checked
            }}"
            @keypress="${this._keyPressHandler.bind(this)}"
          />
        </fieldset>
      </form>

      <div class="location-formatting" ?hidden="${this._selectedFormat === ''}">
        <fieldset>
          <div class="parent">
            <!-- =========== section for location row =========== -->
            <div class="section">
              <legend>${this._rowInstance}</legend>
              <div class="child">
                <label>${i18next.t('label.add_extension')}</label>
                <input
                  placeholder="${i18next.t('row extension')}"
                  @input="${event => {
                    this._rowExtension = event.currentTarget.value
                  }}"
                  @keypress="${this._keyPressHandler.bind(this)}"
                />
              </div>
              <div class="child">
                <label>${i18next.t('label.add_leading_zero')}</label>
                <input
                  type="checkbox"
                  @input="${event => {
                    this._rowLeadingZeroes = event.currentTarget.checked
                  }}"
                  @keypress="${this._keyPressHandler.bind(this)}"
                />
              </div>
            </div>
            <!-- ================================================ -->

            <!-- ========== section for location column ========= -->
            <div class="section">
              <legend>${this._columnInstance}</legend>
              <div class="child">
                <label>${i18next.t('label.add_extension')}</label>
                <input
                  placeholder="${i18next.t('column extension')}"
                  @input="${event => {
                    this._columnExtension = event.currentTarget.value
                  }}"
                  @keypress="${this._keyPressHandler.bind(this)}"
                />
              </div>
              <div class="child">
                <label>${i18next.t('label.add_leading_zero')}</label>
                <input
                  type="checkbox"
                  @input="${event => {
                    this._columnLeadingZeroes = event.currentTarget.checked
                  }}"
                  @keypress="${this._keyPressHandler.bind(this)}"
                />
              </div>
            </div>
            <!-- ================================================ -->

            <!-- ========== section for location shelf ========== -->
            <div class="section">
              <legend>${this._shelfInstance}</legend>
              <div class="child">
                <label>${i18next.t('label.add_extension')}</label>
                <input
                  placeholder="${i18next.t('shelf extension')}"
                  @input="${event => {
                    this._shelfExtension = event.currentTarget.value
                  }}"
                  @keypress="${this._keyPressHandler.bind(this)}"
                />
              </div>
              <div class="child">
                <label>${i18next.t('label.add_leading_zero')}</label>
                <input
                  type="checkbox"
                  @input="${event => {
                    this._shelfLeadingZeroes = event.currentTarget.checked
                  }}"
                  @keypress="${this._keyPressHandler.bind(this)}"
                  ?disabled="${this._useAlphabet === true}"
                />
              </div>
            </div>
            <!-- ================================================ -->
          </div>
        </fieldset>

        <div class="grist">
          <h2><mwc-icon>list_alt</mwc-icon>${i18next.t('title.generator')}</h2>
          <data-grist
            .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
            .config=${this._generatorConfig}
            .data=${this.data}
            @record-change="${this._onChangeHandler.bind(this)}"
          ></data-grist>
        </div>

        <div class="grist">
          <h2><mwc-icon>list_alt</mwc-icon>${i18next.t('title.preview')}</h2>
          <data-grist
            id="preview_grist"
            .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
            .config=${this._previewConfig}
            .fetchHandler="${this._fetchHandler.bind(this)}"
            @limit-changed=${e => {
              this.limit = e.detail
            }}
          ></data-grist>
        </div>

        <div class="button-container">
          <mwc-button
            @click=${async () => {
              this.dataGrist.showSpinner()
              await sleep(1)
              this._validateGenerator()
              this.dataGrist.hideSpinner()
            }}
            >${i18next.t('button.preview')}</mwc-button
          >
          <mwc-button @click=${this._saveGeneratedLocation}>${i18next.t('button.save')}</mwc-button>
          <mwc-button @click=${this._clearGeneratedList}>${i18next.t('button.remove_selected')}</mwc-button>
        </div>
      </div>
    `
  }

  async firstUpdated() {
    this._formatsFromCode = await getCodeByName('LOCATION_FORMAT')
    this.data = { records: [] }
    this._generatorConfig = {
      pagination: { infinite: true },
      rows: { selectable: { multiple: true } },
      columns: [
        {
          type: 'integer',
          name: 'start',
          record: {
            align: 'center',
            editable: true
          },
          header: i18next.t('field.row_start'),
          width: 250
        },
        {
          type: 'integer',
          name: 'end',
          record: {
            align: 'center',
            editable: true
          },
          header: i18next.t('field.row_end'),
          width: 250
        },
        {
          type: 'integer',
          name: 'column',
          record: {
            align: 'center',
            editable: true
          },
          header: i18next.t('field.number_of_column'),
          width: 250
        },
        {
          type: 'integer',
          name: 'shelf',
          record: {
            align: 'center',
            editable: true
          },
          header: i18next.t('field.number_of_shelf'),
          width: 250
        }
      ]
    }

    this._previewConfig = {
      pagination: { pages: [100, 200, 500] },
      rows: { selectable: { multiple: true }, appendable: false },
      columns: [
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'string',
          name: 'name',
          record: {
            align: 'center',
            editable: false
          },
          header: i18next.t('field.name'),
          width: 200
        },
        {
          type: 'string',
          name: 'zone',
          record: {
            align: 'center',
            editable: false
          },
          header: i18next.t('field.zone'),
          width: 200
        },
        {
          type: 'string',
          name: 'row',
          record: {
            align: 'center',
            editable: false
          },
          header: i18next.t('field.row'),
          width: 200
        },
        {
          type: 'string',
          name: 'column',
          record: {
            align: 'center',
            editable: false
          },
          header: i18next.t('field.column'),
          width: 200
        },
        {
          type: 'string',
          name: 'shelf',
          record: {
            align: 'center',
            editable: false
          },
          header: i18next.t('field.shelf'),
          width: 200
        },
        {
          type: 'string',
          name: 'status',
          record: {
            align: 'center',
            editable: false
          },
          header: i18next.t('field.status'),
          width: 200
        }
      ]
    }
  }

  get dataGrist() {
    return this.shadowRoot.querySelector('#preview_grist')
  }

  _onChangeHandler(e) {
    const before = e.detail.before || {}
    const after = e.detail.after

    let record = this.data.records[e.detail.row]
    if (!record) {
      record = { ...after }
      this.data.records.push(record)
    } else if (record !== after) {
      record = Object.assign(record, after)
    }
  }

  _keyPressHandler(event) {
    if (event.keyCode === 13) {
      event.preventDefault()
      return false
    }
  }

  _validateForm(selectedFormat) {
    this._selectedFormat = selectedFormat

    const instances = selectedFormat.split('-')
    this._zoneInstance = instances[0]
    this._rowInstance = instances[1]
    this._columnInstance = instances[2]
    this._shelfInstance = instances[3]

    this._formatsFromCode.map(formatFromCode => {
      if (formatFromCode.name === selectedFormat) {
        this._locationFormat = formatFromCode.description
      }
    })

    const namePortions = this._locationFormat.split('-')
    const rowPortion = namePortions[1].match(/[a-zA-Z]+/g)
    const columnPortion = namePortions[2].match(/[a-zA-Z]+/g)
    const shelfPortion = namePortions[3].match(/[a-zA-Z]+/g)

    const useAlphabet = this._locationFormat.match(/@/g)
    this._useAlphabet = useAlphabet == '@' ? true : false

    this._rowLabel = rowPortion ? rowPortion[0] : ''
    this._columnLabel = columnPortion ? columnPortion[0] : ''
    this._shelfLabel = shelfPortion ? shelfPortion[0] : ''

    this._generatorConfig = {
      ...this._generatorConfig,
      columns: this._generatorConfig.columns.map(column => {
        switch (column.name) {
          case 'start':
            column.header = this._rowInstance + ' start'
            break
          case 'end':
            column.header = this._rowInstance + ' end'
            break
          case 'column':
            column.header = 'number of ' + this._columnInstance
            break
          case 'shelf':
            column.header = 'number of ' + this._shelfInstance
            break
        }
        return column
      })
    }

    this._previewConfig = {
      ...this._previewConfig,
      columns: this._previewConfig.columns.map(column => {
        switch (column.name) {
          case 'zone':
            column.header = this._zoneInstance
            break
          case 'row':
            column.header = this._rowInstance
            break
          case 'column':
            column.header = this._columnInstance
            break
          case 'shelf':
            column.header = this._shelfInstance
            break
        }
        return column
      })
    }
  }

  _validateGenerator() {
    let dataFromGrist = this.data.records
    let validationError = false
    for (let x = 1; x < dataFromGrist.length; x++) {
      if (dataFromGrist[x].start <= dataFromGrist[x - 1].end) {
        document.dispatchEvent(
          new CustomEvent('notify', {
            detail: {
              level: 'error',
              message: i18next.t('text.already_existed', {
                state: {
                  text: dataFromGrist[x].start
                }
              })
            }
          })
        )
        validationError = true
      }
    }

    if (this._zoneName === '') {
      document.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            level: 'error',
            message: i18next.t('text.missing_zone_name')
          }
        })
      )
      validationError = true
    }

    if (!validationError) this._generateLocationList()
  }

  async _generateLocationList() {
    let locations = this.data.records
    let validationError = false
    let tempLocationList = []

    if (locations && locations.length) {
      locations = locations.forEach(location => {
        if (location.start <= location.end) {
          if (location.column && location.shelf) {
            for (let i = location.start; i <= location.end; i++) {
              for (let j = 1; j <= location.column; j++) {
                for (let k = 1; k <= location.shelf; k++) {
                  let locationObj = {}
                  const rowExtension = this._caseSensitive ? this._rowExtension : this._rowExtension.toUpperCase()
                  const columnExtension = this._caseSensitive
                    ? this._columnExtension
                    : this._columnExtension.toUpperCase()

                  const shelfExtension = this._caseSensitive ? this._shelfExtension : this._shelfExtension.toUpperCase()

                  const row = this._rowLeadingZeroes ? i.toString().padStart(2, '0') : i.toString()
                  const column = this._columnLeadingZeroes ? j.toString().padStart(2, '0') : j.toString()
                  const shelf = this._shelfLeadingZeroes ? k.toString().padStart(2, '0') : k.toString()

                  locationObj.row =
                    this._rowExtension === '' ? this._rowLabel + row : this._rowLabel + row + rowExtension
                  locationObj.column =
                    this._columnExtension === ''
                      ? this._columnLabel + column
                      : this._columnLabel + column + columnExtension

                  if (this._useAlphabet) locationObj.shelf = this._getCellInstance(k)
                  else
                    locationObj.shelf =
                      this._shelfExtension === '' ? this._shelfLabel + shelf : this._shelfLabel + shelf + shelfExtension

                  locationObj.zone = this._caseSensitive ? this._zoneName : this._zoneName.toString().toUpperCase()

                  locationObj.name =
                    locationObj.zone + '-' + locationObj.row + '-' + locationObj.column + '-' + locationObj.shelf

                  locationObj.status = 'EMPTY'
                  locationObj.type = 'SHELF'
                  locationObj.warehouse = { id: this.warehouseId }
                  locationObj.cuFlag = '+'

                  tempLocationList.push(locationObj)
                }
              }
            }
          }
        }
      })

      if (!validationError) {
        this._locationList = tempLocationList
        tempLocationList = []
        this.dataGrist.fetch()
      }
    }
  }

  _getCellInstance(column) {
    var shelfInstance = ''
    switch (column) {
      case 1:
        shelfInstance = 'A'
        break
      case 2:
        shelfInstance = 'B'
        break
      case 3:
        shelfInstance = 'C'
        break
      case 4:
        shelfInstance = 'D'
        break
      case 5:
        shelfInstance = 'E'
        break
      case 6:
        shelfInstance = 'F'
        break
      case 7:
        shelfInstance = 'G'
        break
      case 8:
        shelfInstance = 'H'
        break
      case 9:
        shelfInstance = 'I'
        break
      case 10:
        shelfInstance = 'J'
        break
      case 11:
        shelfInstance = 'K'
        break
      case 12:
        shelfInstance = 'L'
        break
      case 13:
        shelfInstance = 'M'
        break
      case 14:
        shelfInstance = 'N'
        break
      case 15:
        shelfInstance = 'O'
        break
      case 16:
        shelfInstance = 'P'
        break
      case 17:
        shelfInstance = 'Q'
        break
      case 18:
        shelfInstance = 'R'
        break
      case 19:
        shelfInstance = 'S'
        break
      case 20:
        shelfInstance = 'T'
        break
      case 21:
        shelfInstance = 'U'
        break
      case 22:
        shelfInstance = 'V'
        break
      case 23:
        shelfInstance = 'W'
        break
      case 24:
        shelfInstance = 'X'
        break
      case 25:
        shelfInstance = 'Y'
        break
      case 26:
        shelfInstance = 'Z'
        break
      case 14:
        shelfInstance = 'N'
        break
      default:
        shelfInstance = column.toString()
    }
    return shelfInstance
  }

  _fetchHandler() {
    return {
      total: this._locationList.length || 0,
      records: this._locationList || []
    }
  }

  async _saveGeneratedLocation() {
    let chunkPatches = this._chunkLocationList(this._locationList, 500)

    if (!chunkPatches.length) {
      CustomAlert({
        type: 'warning',
        title: i18next.t('text.list_not_previewed'),
        text: i18next.t('text.please_hit_preview_button'),
        confirmButton: { text: i18next.t('button.confirm') }
      })
    } else {
      try {
        this.dataGrist.showSpinner()
        for (let x = 0; x < chunkPatches.length; x++) {
          const patches = chunkPatches[x]
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
        }

        if (this.callback && typeof this.callback === 'function') this.callback()
        history.back()
      } catch (e) {
        document.dispatchEvent(
          new CustomEvent('notify', {
            detail: {
              level: 'error',
              message: e.message
            }
          })
        )
      } finally {
        this.dataGrist.hideSpinner()
      }
    }
  }

  _chunkLocationList(locationArray, chunk_size) {
    let tempArray = []
    let locationChunk = []

    for (let i = 0; i < locationArray.length; i += chunk_size) {
      locationChunk = locationArray.slice(i, i + chunk_size)
      tempArray.push(locationChunk)
    }
    return tempArray
  }

  _clearGeneratedList() {
    const selections = []
    this.dataGrist.selected.forEach(selection => {
      selections.push(selection.__seq__ - 1)
    })

    for (let i = selections.length - 1; i >= 0; i--) {
      this._locationList.splice(selections[i], 1)
    }
    this.dataGrist.fetch()
  }
}

window.customElements.define('generate-location-list', GenerateLocationList)
