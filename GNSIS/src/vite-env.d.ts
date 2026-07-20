/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_URL?: string;
  readonly VITE_GITHUB_APP_SLUG?: string;
  readonly VITE_ENABLE_INTEGRATION_LAB?: string;
  readonly VITE_SMOKE_TEST_MODEL?: string;
  /** @deprecated use VITE_API_BASE_URL */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
