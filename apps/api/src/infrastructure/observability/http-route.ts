// Better Auth handles its own routing before Nest/Express supplies route metadata.
const authPaths = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/sign-out",
  "/get-session",
  "/verify-email",
  "/send-verification-email",
  "/request-password-reset",
  "/reset-password",
  "/error",
  "/ok",
])

export interface HttpRouteRequest {
  url?: string
  originalUrl?: string
  baseUrl?: string
  route?: unknown
}

export function getHttpRoute(request: HttpRouteRequest): string {
  const path = new URL(
    request.originalUrl ?? request.url ?? "/",
    "http://localhost"
  ).pathname
  if (path.startsWith("/api/auth/")) {
    const authPath = path.slice("/api/auth".length)
    if (authPaths.has(authPath)) return "/api/auth" + authPath
    if (/^\/reset-password\/[^/]+$/.test(authPath)) {
      return "/api/auth/reset-password/:token"
    }
    return "/api/auth/*"
  }
  const route = request.route
  if (
    typeof route === "object" &&
    route !== null &&
    "path" in route &&
    typeof route.path === "string"
  ) {
    if (["{/*splat}", "/*splat", "*"].includes(route.path)) return "unmatched"
    return (request.baseUrl ?? "") + route.path
  }
  return "unmatched"
}
