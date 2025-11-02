// src/app/services/local-data.service.ts
import { Injectable } from '@angular/core';
import { Movie } from '../models/movie';

@Injectable({ providedIn: 'root' })
export class LocalDataService {
  private keyInit(apiName: string) { return `crud_init_${apiName}`; }
  private keyWork(apiName: string) { return `crud_work_${apiName}`; }

  resetFromApi(apiName: string, items: Movie[]) {
    localStorage.setItem(this.keyInit(apiName), JSON.stringify(items));
    localStorage.setItem(this.keyWork(apiName), JSON.stringify(items));
  }

  getInit(apiName: string): Movie[] {
    const raw = localStorage.getItem(this.keyInit(apiName));
    return raw ? JSON.parse(raw) : [];
  }

  getWork(apiName: string): Movie[] {
    const raw = localStorage.getItem(this.keyWork(apiName));
    return raw ? JSON.parse(raw) : [];
  }

  saveWork(apiName: string, items: Movie[]) {
    localStorage.setItem(this.keyWork(apiName), JSON.stringify(items));
  }

  create(apiName: string, newItem: Movie) {
    const arr = this.getWork(apiName);
    // generar id temporal único si no existe
    if (!newItem.id) newItem.id = Date.now();
    arr.unshift(newItem);
    this.saveWork(apiName, arr);
    return arr;
  }

  update(apiName: string, id: number, patch: Partial<Movie>, idField = 'id') {
    const arr = this.getWork(apiName).map(x => (x[idField as keyof Movie] === id ? { ...x, ...patch } : x));
    this.saveWork(apiName, arr);
    return arr;
  }

  delete(apiName: string, id: number, idField = 'id') {
    const arr = this.getWork(apiName).filter(x => (x[idField as keyof Movie] !== id));
    this.saveWork(apiName, arr);
    return arr;
  }

  restoreInit(apiName: string) {
    const init = this.getInit(apiName);
    this.saveWork(apiName, init);
    return init;
  }
}