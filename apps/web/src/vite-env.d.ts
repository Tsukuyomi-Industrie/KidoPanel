/// <reference types="vite/client" />

declare const __KP_PANEL_VERSION__: string;

interface ImportMetaEnv {
  /** URL de base de la passerelle (ex. http://127.0.0.1:3000), sans slash final. */
  readonly VITE_GATEWAY_BASE_URL?: string;
  /**
   * En dev : relais Vite vers `VITE_GATEWAY_PROXY_TARGET` (défaut `http://127.0.0.1:3000`).
   * `1`/`true` : toujours le proxy. `0`/`false` : jamais (direct `:3000` ou loopback). Absent : proxy
   * automatique si la page n’est pas sur localhost (accès distant au `pnpm dev` sans ouvrir le 3000).
   */
  readonly VITE_GATEWAY_DEV_USE_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
