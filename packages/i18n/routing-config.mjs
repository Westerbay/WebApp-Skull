function routeShape(path) {
  if (typeof path !== "string" || !path.startsWith("/"))
    throw new Error(`Invalid route path: ${path}`)
  if (path === "/") return { shape: "/", parameters: [] }
  const parameters = []
  const segments = path
    .slice(1)
    .split("/")
    .map((segment) => {
      if (/^:[A-Za-z][A-Za-z0-9_]*$/.test(segment)) {
        parameters.push(segment.slice(1))
        return ":parameter"
      }
      if (
        !/^[\p{L}\p{N}._~-]+$/u.test(segment) ||
        [".", ".."].includes(segment)
      )
        throw new Error(`Unsupported route segment in ${path}`)
      return segment
    })
  if (new Set(parameters).size !== parameters.length)
    throw new Error(`Duplicate route parameter in ${path}`)
  return { shape: "/" + segments.join("/"), parameters: parameters.sort() }
}

export function buildUrlPatterns(routing, locales) {
  if (
    !Array.isArray(locales) ||
    !locales.length ||
    new Set(locales).size !== locales.length
  )
    throw new Error("Choose distinct locales")
  if (
    typeof routing.prefixLocales !== "boolean" ||
    !Array.isArray(routing.routes)
  )
    throw new Error("Invalid routing configuration")
  if (locales.length > 1 && !routing.prefixLocales)
    throw new Error("Multiple locales require URL prefixes")
  const internalPaths = new Set()
  const localizedPaths = new Map(locales.map((locale) => [locale, new Set()]))
  const patterns = routing.routes.map((route) => {
    const internal = routeShape(route.path)
    if (internalPaths.has(internal.shape))
      throw new Error(`Duplicate internal route: ${route.path}`)
    internalPaths.add(internal.shape)
    if (
      !Array.isArray(route.localized) ||
      route.localized.some(
        (entry) => !Array.isArray(entry) || entry.length !== 2
      ) ||
      JSON.stringify(route.localized.map(([locale]) => locale).sort()) !==
        JSON.stringify([...locales].sort())
    )
      throw new Error(`Locale coverage differs for route: ${route.path}`)
    return {
      pattern: route.path,
      localized: route.localized.map(([locale, path]) => {
        const localized = routeShape(path)
        if (
          JSON.stringify(internal.parameters) !==
          JSON.stringify(localized.parameters)
        )
          throw new Error(
            `Route parameters differ for ${locale}: ${route.path}`
          )
        const paths = localizedPaths.get(locale)
        if (paths.has(localized.shape))
          throw new Error(`Duplicate localized route for ${locale}: ${path}`)
        paths.add(localized.shape)
        const pathname = routing.prefixLocales
          ? `/${locale}${path === "/" ? "" : path}`
          : path
        return [locale, pathname]
      }),
    }
  })
  // Specific paths must precede dynamic siblings in Paraglide's first-match routing.
  patterns.sort((left, right) => {
    const leftSegments = left.pattern.split("/")
    const rightSegments = right.pattern.split("/")
    for (
      let index = 0;
      index < Math.min(leftSegments.length, rightSegments.length);
      index++
    ) {
      const difference =
        Number(leftSegments[index].startsWith(":")) -
        Number(rightSegments[index].startsWith(":"))
      if (difference) return difference
    }
    return 0
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
