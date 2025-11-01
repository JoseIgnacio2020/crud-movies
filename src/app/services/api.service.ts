// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KEYS } from '../../environments/keys'; // IMPORT RELATIVO: evita "Cannot find module 'src/...'" si baseUrl no está configurado

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'https://api.themoviedb.org/3';

  constructor(private http: HttpClient) {}

  private buildOptions(useBearer = true, extraParams?: Record<string, string>) {
    // usar token si existe, fallback a api_key
    const accessToken = (KEYS && KEYS.TMDB_ACCESS_TOKEN) ? String(KEYS.TMDB_ACCESS_TOKEN) : undefined;
    const apiKey = (KEYS && KEYS.TMDB_API_KEY) ? String(KEYS.TMDB_API_KEY) : undefined;

    if (useBearer && accessToken) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      });
      let params = new HttpParams();
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => { params = params.set(k, String(v)); });
      }
      return { headers, params };
    } else {
      // fallback a api_key en query string
      let params = new HttpParams();
      if (apiKey) {
        params = params.set('api_key', apiKey);
      }
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => { params = params.set(k, String(v)); });
      }
      const headers = new HttpHeaders({ 'Accept': 'application/json' });
      return { headers, params };
    }
  }

  getMovie(movieId: number): Observable<any> {
    const opts = this.buildOptions(true);
    return this.http.get(`${this.base}/movie/${movieId}`, opts);
  }

  getMovieVideos(movieId: number): Observable<any> {
    const opts = this.buildOptions(true);
    return this.http.get(`${this.base}/movie/${movieId}/videos`, opts);
  }

  searchMovies(query: string, page = 1): Observable<any> {
    const opts = this.buildOptions(true, { query: String(query), page: String(page) });
    return this.http.get(`${this.base}/search/movie`, opts);
  }
}
