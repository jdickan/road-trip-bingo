export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  onFetchStatus,
  customFetch,
} from "./custom-fetch";
export type {
  AuthTokenGetter,
  FetchStatus,
  FetchStatusListener,
  CustomFetchOptions,
} from "./custom-fetch";
export { useApiStatus } from "./use-api-status";
export type { ApiStatus } from "./use-api-status";
