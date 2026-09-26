export function buildUrlPatterns(routing, locales) {
  if (locales.length > 1 && !routing.prefixLocales)
    throw new Error("Multiple locales require URL prefixes")
  const paths = new Map([
    ["internal", new Set()],
    ...locales.map((locale) => [locale, new Set()]),
  ])
  const checkPath = (locale, path) => {
    if (
      typeof path !== "string" ||
      !path.startsWith("/") ||
      path.startsWith("//")
    )
      throw new Error(`Invalid route for ${locale}: ${path}`)
    const seen = paths.get(locale)
    if (seen.has(path))
      throw new Error(`Duplicate route for ${locale}: ${path}`)
    seen.add(path)
  }
  const patterns = routing.routes.map((route) => {
    checkPath("internal", route.path)
    if (
      JSON.stringify(route.localized.map(([locale]) => locale).sort()) !==
      JSON.stringify([...locales].sort())
    )
      throw new Error(`Locale coverage differs for route: ${route.path}`)
    return {
      pattern: route.path,
      localized: route.localized.map(([locale, path]) => {
        checkPath(locale, path)
        return [
          locale,
          routing.prefixLocales
            ? `/${locale}${path === "/" ? "" : path}`
            : path,
        ]
      }),
    }
  })
  patterns.push({
    pattern: "/:path(.*)?",
    localized: locales.map((locale) => [
      locale,
      routing.prefixLocales ? `/${locale}/:path(.*)?` : "/:path(.*)?",
    ]),
  })
  return patterns
}
