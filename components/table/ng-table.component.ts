import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'ng-table',
  template: `
    <table class="table dataTable" ngClass="{{config.className || ''}}"
           role="grid" style="width: 100%;">
      <thead>
        <tr role="row">
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
        <tr *ngFor="let row of rows">
          <ng-container *ngFor="let column of columns">
            <td (click)="cellClick(row, column.name)" *ngIf="column.title != 'Actions'" [innerHtml]="sanitize(getData(row, column.name))"></td>
            <td *ngIf="column.title === 'Actions'">
                <div class="input-group-btn">
                  <button class="actions-button btn" *ngFor="let link of column.links" title="{{ link }}"
                  [ngClass]="{'btn-info': link=='View', 
                  'btn-warning': link=='Edit', 'btn-danger': link=='Delete'}"
                  'btn-sm btn-link': link!='View' && link!='Edit' && link!='Delete'}"
                    (click)="handleLinks(link, row, column)">
                    <i *ngIf="link=='View'" class="fa fa-eye"></i>
                    <i *ngIf="link=='Edit'" class="fa fa-edit"></i>
                    <i *ngIf="link=='Delete'" class="fa fa-remove"></i>
                    <span *ngIf="link!='View' && link!='Edit' && link!='Delete'">{{link}}</span>
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
  // Table values
  @Input() public rows:Array<any> = [];

  @Input()
  public set config(conf:any) {
    if (!conf.className) {
      conf.className = 'table-striped table-bordered';
    }
    if (conf.className instanceof Array) {
      conf.className = conf.className.join(' ');
    }
    this._config = conf;
  }

  // Outputs (Events)
  @Output() public tableChanged:EventEmitter<any> = new EventEmitter();
  @Output() public cellClicked:EventEmitter<any> = new EventEmitter();
  @Output() public linkClicked:EventEmitter<any> = new EventEmitter();

  public showFilterRow:Boolean = false;

  @Input()
  public set columns(values:Array<any>) {
    values.forEach((value:any) => {
      if (value.filtering) {
        this.showFilterRow = true;
      }
      if (value.className && value.className instanceof Array) {
        value.className = value.className.join(' ');
      }
      let column = this._columns.find((col:any) => col.name === value.name);
      if (column) {
        Object.assign(column, value);
      }
      if (!column) {
        this._columns.push(value);
      }
    });
  }

  private _columns:Array<any> = [];
  private _config:any = {};

  public constructor(private sanitizer:DomSanitizer) {
  }

  public sanitize(html:string):SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  public get columns():Array<any> {
    return this._columns;
  }

  public get config():any {
    return this._config;
  }

  public get configColumns():any {
    let sortColumns:Array<any> = [];

    this.columns.forEach((column:any) => {
      if (column.sort) {
        sortColumns.push(column);
      }
    });

    return {columns: sortColumns};
  }

  public onChangeTable(column:any):void {
    this._columns.forEach((col:any) => {
      if (col.name !== column.name && col.sort !== false) {
        col.sort = '';
      }
    });
    this.tableChanged.emit({sorting: this.configColumns});
  }

  public getData(row:any, propertyName:string):string {
    return propertyName.split('.').reduce((prev:any, curr:string) => prev[curr], row);
  }

  public cellClick(row:any, column:any):void {
    this.cellClicked.emit({row, column});
  }

  public handleLinks(action:string, row:any, column:any): void {
    this.linkClicked.emit({action, row, column});
  }
}
