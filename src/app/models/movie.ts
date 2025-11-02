export interface PosterUrls { w342?: string; w500?: string; w780?: string; original?: string; }

export interface Movie {
  id: number;
  title: string;
  year?: string;
  poster_path?: string | null;
  posterUrls?: PosterUrls;
  overview?: string;
  original_language?: string;
}
