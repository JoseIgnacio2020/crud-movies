// src/app/components/items-list/items-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ApiService } from '../../services/api.service';
import { LocalDataService } from '../../services/local-data.service';
import { ItemFormComponent } from '../item-form/item-form.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
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

    this.dataSource.filter = 'applyFilter' + Date.now().toString();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openCreate() {
    const ref = this.dialog.open(ItemFormComponent, {
      width: '520px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((result: Movie | undefined) => {
      if (!result) return;

      try {
        // create() assigns id if not present and unshifts into array
        this.storage.create(this.apiName, result);
        this.loadWork();

        // Get created item (assume create unshifted the new item to index 0)
        const created = this.storage.getWork(this.apiName)[0];

        const snackRef = this.snack.open(`"${created.title}" creado.`, 'Deshacer', { duration: 6000 });
        snackRef.onAction().subscribe(() => {
          try {
            this.storage.delete(this.apiName, created.id);
            this.loadWork();
            this.snack.open('Creación deshecha.', 'Cerrar', { duration: 2500 });
          } catch (e) {
            console.error('Error al deshacer creación', e);
            this.snack.open('No se pudo deshacer.', 'Cerrar', { duration: 2500 });
          }
        });
      } catch (e) {
        console.error('Error creando item', e);
        this.snack.open('Error al crear el elemento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openEdit(item: Movie) {
    // Guardar snapshot para posible undo
    const original = { ...item };

    const ref = this.dialog.open(ItemFormComponent, {
      width: '520px',
      data: { mode: 'edit', item: { ...item } } // pasar copia
    });

    ref.afterClosed().subscribe((result: Movie | undefined) => {
      if (!result) return;

      try {
        this.storage.update(this.apiName, result.id, result);
        this.loadWork();

        const snackRef = this.snack.open(`"${result.title}" actualizado.`, 'Deshacer', { duration: 6000 });
        snackRef.onAction().subscribe(() => {
          try {
            // restaurar estado original (full object)
            this.storage.update(this.apiName, original.id, original);
            this.loadWork();
            this.snack.open('Cambios deshechos.', 'Cerrar', { duration: 2500 });
          } catch (e) {
            console.error('Error al deshacer edición', e);
            this.snack.open('No se pudo deshacer.', 'Cerrar', { duration: 2500 });
          }
        });
      } catch (e) {
        console.error('Error actualizando item', e);
        this.snack.open('Error al actualizar el elemento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  delete(item: Movie) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar película',
        message: `¿Estás seguro de eliminar la película <strong>${item.title}</strong>? `,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        danger: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      const deletedItem = { ...item };
      try {
        this.storage.delete(this.apiName, item.id);
        this.loadWork();

        const snackRef = this.snack.open(`"${item.title}" eliminado.`, 'Deshacer', { duration: 6000 });
        snackRef.onAction().subscribe(() => {
          try {
            this.storage.create(this.apiName, deletedItem);
            this.loadWork();
            this.snack.open('Eliminación deshecha.', 'Cerrar', { duration: 2500 });
          } catch (e) {
            console.error('Error al deshacer eliminación', e);
            this.snack.open('No se pudo deshacer.', 'Cerrar', { duration: 2500 });
          }
        });
      } catch (e) {
        console.error('Error eliminando', e);
        this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 });
      }
    });
  }

  resetFromApi() {
    this.initFromApi();
  }
}
