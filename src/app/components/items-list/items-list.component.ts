import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { LocalDataService } from '../../services/local-data.service';
import { ItemFormComponent } from '../item-form/item-form.component';
import { Movie } from '../../models/movie';

@Component({
  selector: 'app-items-list',
  templateUrl: './items-list.component.html',
  styleUrls: ['./items-list.component.scss']
})
export class ItemsListComponent implements OnInit, AfterViewInit {
  apiName = 'tmdb_movies';
  displayedColumns: string[] = ['poster', 'title', 'year', 'actions'];
  dataSource = new MatTableDataSource<Movie>([]);
  filterTitle = '';
  filterYear = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private api: ApiService,
    private storage: LocalDataService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    // inicializa siempre desde la API al cargar la app (sobrescribe work)
    this.api.initFromSearch('marvel', 1).subscribe({
      next: (movies: Movie[]) => {
        this.storage.resetFromApi(this.apiName, movies);
        this.loadWork();
      },
      error: (err) => {
        // si falla, cargar lo que haya en localStorage (fallback)
        this.loadWork();
        console.error('Error inicializando desde API', err);
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadWork() {
    const work = this.storage.getWork(this.apiName);
    this.dataSource.data = work;
  }

  applyFilters() {
    const title = (this.filterTitle || '').trim().toLowerCase();
    const year = (this.filterYear || '').trim();

    // Aseguramos el tipo de predicate que siempre retorna boolean
    this.dataSource.filterPredicate = (data: Movie, _filter: string): boolean => {
      const matchesTitle = !title || (data.title || '').toLowerCase().includes(title);
      const matchesYear = !year || (data.year ? data.year.includes(year) : false);
      return !!(matchesTitle && matchesYear); // fuerza boolean
    };

    // Disparar el filtro: el valor concreto no importa, solo provoca el re-evaluado
    // Usamos un string constante para evitar confusiones con tipos
    this.dataSource.filter = 'applyFilter' + Date.now().toString();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  openCreate() {
    const ref = this.dialog.open(ItemFormComponent, {
      width: '500px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((result: Movie | undefined) => {
      if (result) {
        this.storage.create(this.apiName, result);
        this.loadWork();
      }
    });
  }

  openEdit(item: Movie) {
    const ref = this.dialog.open(ItemFormComponent, {
      width: '500px',
      data: { mode: 'edit', item: { ...item } } 
    });

    ref.afterClosed().subscribe((result: Movie | undefined) => {
      if (result) {
        this.storage.update(this.apiName, result.id, result);
        this.loadWork();
      }
    });
  }

  delete(item: Movie) {
    if (!confirm(`Eliminar "${item.title}"?`)) return;
    this.storage.delete(this.apiName, item.id);
    this.loadWork();
  }

  resetFromApi() {
    // volver a pedir API y sobrescribir trabajo
    this.api.initFromSearch('marvel', 1).subscribe({
      next: movies => {
        this.storage.resetFromApi(this.apiName, movies);
        this.loadWork();
      },
      error: (err) => {
        console.error('No se pudo resetear desde API', err);
      }
    });
  }
}
