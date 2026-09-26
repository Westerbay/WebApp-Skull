import { getLocale, localizeHref } from "./generated/runtime.js"

export function getLocalizedPath(path: string) {
  return localizeHref(path, { locale: getLocale() })
}

export function getLocalizedCallbackUrl(path: string, origin: string) {
  return new URL(getLocalizedPath(path), origin).href
}
