import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KEYS } from '../../environments/keys'; // IMPORT RELATIVO: evita "Cannot find module 'src/...'" si baseUrl no está configurado
import { map } from 'rxjs/operators';
import { Movie } from '../models/movie';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'https://api.themoviedb.org/3';
  private tmdbImageBase = 'https://image.tmdb.org/t/p/';

  constructor(private http: HttpClient) { }

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

  // mapea un array de resultados TMDb a Movie[]
  private mapTmdbResultToMovies(results: any[]): Movie[] {
    return (results || []).map(r => {
      const posterPath = r.poster_path ?? null;
      const posterUrls = posterPath ? {
        w342: `${this.tmdbImageBase}w342${posterPath}`,
        w500: `${this.tmdbImageBase}w500${posterPath}`,
        w780: `${this.tmdbImageBase}w780${posterPath}`,
        original: `${this.tmdbImageBase}original${posterPath}`
      } : undefined;

      return {
        id: r.id,
        title: r.title || r.name || '',
        year: r.release_date ? r.release_date.split('-')[0] : (r.first_air_date ? r.first_air_date.split('-')[0] : undefined),
        poster_path: posterPath,
        posterUrls,
        overview: r.overview,
        original_language: r.original_language
      } as any;
    });
  }

  /**
   * initFromSearch: obtiene datos iniciales para poblar localStorage.
   * query: string inicial (p. ej. 'batman' o 'movie')
   */
  initFromSearch(query = 'popular', page = 1) {
    // usar searchMovies (ya implementado)
    return this.searchMovies(query, page).pipe(
      map((res: any) => {
        // TMDb retorna { page, results: [...] }
        const results = res && res.results ? res.results : [];
        return this.mapTmdbResultToMovies(results);
      })
    );
  }

}
