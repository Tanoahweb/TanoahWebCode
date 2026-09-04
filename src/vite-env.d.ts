/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STORE_NAME: string;
  readonly VITE_STORE_CURRENCY: string;
  readonly VITE_STORE_CURRENCY_SYMBOL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
