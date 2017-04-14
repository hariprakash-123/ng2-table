import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'ng-table',
  template: `
   <table class="table dataTable" ngClass="{{config.className || ''}}"
           role="grid" style="width: 100%;">
      <thead>
        <tr role="row">
          <th *ngIf="config && config['multiSelect']"><input type="checkbox" [checked]="selectedRowIndexes.length == (rows.length - disabledRowIndexes.length)? 'checked': null" (change)="toggleSelect($event)"/></th>

          <ng-container *ngFor="let column of columns">
              <th *ngIf="column.title != 'Actions'" [ngTableSorting]="config" [column]="column" 
              (sortChanged)="onChangeTable($event)" ngClass="{{column.className || ''}}">
                {{column.title}}
                <i *ngIf="config && column.sort" class="pull-right fa"
                  [ngClass]="{'fa-chevron-down': column.sort === 'desc', 'fa-chevron-up': column.sort === 'asc'}"></i>
              </th>
              <th *ngIf="column.title === 'Actions'" ngClass="{{ column.className || '' }}">
                {{ column.title }}
              </th>
          </ng-container>
        </tr>
      </thead>
      <tbody>
      <tr *ngIf="showFilterRow" class="search-title-section">
        <ng-container *ngFor="let column of columns">
          <td *ngIf="column.title != 'Actions'"> 
             <input *ngIf="column.filtering && column.filtering.inputType == 'text'" placeholder="{{column.filtering.placeholder}}"
                   [ngTableFiltering]="column.filtering"
                   class="form-control"
                   style="width: auto;"
                  (tableChanged)="onChangeTable(config)"/>
                  
            <select [ngTableFiltering]="column.filtering" class="form-control"
             (tableChanged)="onChangeTable(config)" 
             *ngIf="column.filtering && column.filtering.inputType == 'select'">
                <option *ngFor="let obj of column.filtering.options" [value]="obj.id">{{obj.value}}</option>
            </select>
          </td>
          <td *ngIf="column.title === 'Actions'">
          </td>
        </ng-container>
      </tr>
        <tr *ngFor="let row of rows; let i = index">
          <td *ngIf="config['multiSelect']"><input type="checkbox" [checked]="selectedRowIndexes.indexOf(i) >=0? 'checked': null" (change)="toggleSelect($event, i)" [disabled]="disabledRowIndexes.indexOf(i) >= 0"/></td>

          <ng-container *ngFor="let column of columns">
            <td (click)="cellClick(row, column.name)" *ngIf="column.title != 'Actions' && !column.edit" [innerHtml]="sanitize(getData(row, column.name))"></td>
            <td *ngIf="column.edit">
                <input (keyup)="valueChanged($event.target.value, column.name, i)" (change)="valueChanged($event.target.value, column.name, i)" [type]="column.type" [value]="getData(row, column.name)" />
            </td>
            <td *ngIf="column.title === 'Actions'">
                <div class="input-group-btn">
                  <button class="actions-button btn {{link.mainClass}}" *ngFor="let link of column.links" title="{{ link.name }}"
                    (click)="handleLinks(link.name, row, column)">
                    <i *ngIf="link.iconClass!=''" class="{{link.iconClass}}"></i>
                    <span *ngIf="link.iconClass==''">{{link.name}}</span>
                  </button>
                </div>
            </td>
          </ng-container>
        </tr>
      </tbody>
    </table>
  `
})
export class NgTableComponent {

  @Input()
  public set config(conf: any) {
    if (!conf.className) {
      conf.className = 'table-striped table-bordered';
    }
    if (conf.className instanceof Array) {
      conf.className = conf.className.join(' ');
    }
    this._config = conf;
  }

  // Table values
  public rows: Array<any> = [];

  @Input('rows')
  set rowsData(data: Array<any>) {
    this.rows = data;
    this.defineCheckboxesState();
  }

  // Outputs (Events)
  @Output() public tableChanged: EventEmitter<any> = new EventEmitter();
  @Output() public cellClicked: EventEmitter<any> = new EventEmitter();
  @Output() public linkClicked: EventEmitter<any> = new EventEmitter();

  public showFilterRow: Boolean = false;

  @Input()
  public set columns(values: Array<any>) {
    values.forEach((value: any) => {
      if (value.filtering) {
        this.showFilterRow = true;
      }
      if (value.className && value.className instanceof Array) {
        value.className = value.className.join(' ');
      }
      let column = this._columns.find((col: any) => col.name === value.name);
      if (column) {
        Object.assign(column, value);
      }
      if (!column) {
        this._columns.push(value);
      }
    });

    this.defineCheckboxesState();
  }

  private _columns: Array<any> = [];
  private _config: any = {};

  public constructor(private sanitizer: DomSanitizer) {
  }

  public sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  public get columns(): Array<any> {
    return this._columns;
  }

  public get config(): any {
    return this._config;
  }

  public get configColumns(): any {
    let sortColumns: Array<any> = [];

    this.columns.forEach((column: any) => {
      if (column.sort) {
        sortColumns.push(column);
      }
    });

    return { columns: sortColumns };
  }

  public onChangeTable(column: any): void {
    this._columns.forEach((col: any) => {
      if (col.name !== column.name && col.sort !== false) {
        col.sort = '';
      }
    });
    this.tableChanged.emit({ sorting: this.configColumns });
  }

  public getData(row: any, propertyName: string): string {
    return propertyName.split('.').reduce((prev: any, curr: string) => prev[curr], row);
  }

  public cellClick(row: any, column: any): void {
    this.cellClicked.emit({ row, column });
  }

  public handleLinks(action: string, row: any, column: any): void {
    this.linkClicked.emit({ action, row, column });
  }

  // Multi select configs
  public disabledRowIndexes: Array<number> = [];
  public selectedRowIndexes: Array<number> = [];
  @Output() public selectedRecords: EventEmitter<any> = new EventEmitter();

  public defineCheckboxesState() {
    let columnNames: Array<string> = this._columns.map(item => item['name']);

    if (this.rows.length > 0 && columnNames.length > 0 && this._config && this._config['multiSelect'] && this._config['checkboxRule']) {

      this.rows.forEach((row, index) => {
        let keys: Array<string> = Object.keys(row);

        // Replacing field names with their values in checkbox rule
        let equation = this._config['checkboxRule'].replace(/\<(.*?)\>/g, (match: string, name: string) => {
          let sigments: Array<string> = name.split('.');

          if (keys.indexOf(sigments[0]) >= 0) {
            let exp: string = `row['${sigments.join("']['")}']`;

            try { return eval(exp); } catch (e) { alert(`Failed to evaluate expression "${exp}"`); }
          } else {
            return null;
          }
        });

        // Checking for syntax errors
        let evalResult: any;
        try {
          evalResult = eval(equation);
        } catch (e) {
          // If has syntax errors then previous value of the field will be assigned
          if (e instanceof SyntaxError) {
            alert(`Failed to evaluate expression "${equation}"`);
            evalResult = false;
          }
        }

        if (!evalResult) { this.disabledRowIndexes.push(index); }
      });

    }
  }

  public toggleSelect(event: any, rowIndex?: number) {

    if (rowIndex || rowIndex >= 0) {
      if (this.selectedRowIndexes.indexOf(rowIndex) >= 0) {
        this.selectedRowIndexes.splice(this.selectedRowIndexes.indexOf(rowIndex), 1);

      } else { this.selectedRowIndexes.push(rowIndex); }

    } else {
      if (this.selectedRowIndexes.length > 0 && !event.target.checked) {
        this.selectedRowIndexes = [];

      } else {
        let indexes: Array<number> = this.rows.map((item, index) => index);
        this.selectedRowIndexes = indexes.filter((row, index) => this.disabledRowIndexes.indexOf(index) < 0);
      }
    }

    this.selectedRowIndexes = this.selectedRowIndexes.sort();
    this.emitSelected();
  }

  public emitSelected() {
    let records: Array<any> = this.rows.filter((item, index) => this.selectedRowIndexes.indexOf(index) >= 0);
    this.selectedRecords.emit(records);
  }


  // Editable cells
  @Output() valueChanges: EventEmitter<any> = new EventEmitter();

  valueChanged(value: any, propertyName: string, rowIndex: number) {
    this.rows[rowIndex][propertyName] = value;
    this.valueChanges.emit({'value': value, 'property':propertyName, 'row':this.rows[rowIndex]})
  }

}
