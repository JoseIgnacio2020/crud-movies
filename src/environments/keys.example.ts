// Copia este archivo a src/environments/keys.ts o usa el script que genera keys.ts desde .env
export interface KeysEnv {
  TMDB_ACCESS_TOKEN?: string;
  TMDB_API_KEY?: string;
}

export const KEYS: KeysEnv = {
  TMDB_ACCESS_TOKEN: undefined,
  TMDB_API_KEY: undefined
};
