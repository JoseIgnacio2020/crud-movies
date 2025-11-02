import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.initFromApi();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private initFromApi(query = 'marvel') {
    this.api.initFromSearch(query, 1).subscribe({
      next: (movies: Movie[]) => {
        this.storage.resetFromApi(this.apiName, movies);
        this.loadWork();
      },
      error: (err) => {
        console.error('Error inicializando desde API', err);
        // fallback si existe init previo
        this.loadWork();
        this.snack.open('No se pudo cargar datos desde TMDb. Usando datos locales si existen.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  loadWork() {
    const work = this.storage.getWork(this.apiName);
    this.dataSource.data = work;
  }

  applyFilters() {
    const title = (this.filterTitle || '').trim().toLowerCase();
    const year = (this.filterYear || '').trim();

    this.dataSource.filterPredicate = (data: Movie, _filter: string): boolean => {
      const matchesTitle = !title || (data.title || '').toLowerCase().includes(title);
      const matchesYear  = !year  || (data.year ? data.year.includes(year) : false);
      return !!(matchesTitle && matchesYear);
    };

    // disparar re-evaluación
    this.dataSource.filter = 'applyFilter' + Date.now().toString();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openCreate() {
    const ref = this.dialog.open(ItemFormComponent, {
      width: '520px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((result: Movie | undefined) => {
      if (result) {
        try {
          this.storage.create(this.apiName, result);
          this.loadWork();
          this.snack.open(`"${result.title}" creado.`, 'Cerrar', { duration: 3000 });
        } catch (e) {
          console.error('Error creando item', e);
          this.snack.open('Error al crear el elemento', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  openEdit(item: Movie) {
    const ref = this.dialog.open(ItemFormComponent, {
      width: '520px',
      data: { mode: 'edit', item: { ...item } } // pasar copia
    });

    ref.afterClosed().subscribe((result: Movie | undefined) => {
      if (result) {
        try {
          // result debe traer id
          this.storage.update(this.apiName, result.id, result);
          this.loadWork();
          this.snack.open(`"${result.title}" actualizado.`, 'Cerrar', { duration: 3000 });
        } catch (e) {
          console.error('Error actualizando item', e);
          this.snack.open('Error al actualizar el elemento', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  delete(item: Movie) {
    if (!confirm(`¿Eliminar "${item.title}"?`)) return;
    try {
      this.storage.delete(this.apiName, item.id);
      this.loadWork();
      this.snack.open(`"${item.title}" eliminado.`, 'Cerrar', { duration: 2500 });
    } catch (e) {
      console.error('Error eliminando', e);
      this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 });
    }
  }

  resetFromApi() {
    this.initFromApi(); // volver a llamar y sobrescribir
  }
}
