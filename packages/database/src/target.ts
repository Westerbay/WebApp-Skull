export type DatabaseOperation = "migrate" | "seed"

export type VerifiedDatabaseTarget = Readonly<{
  databaseName: string
  databaseUrl: string
  environment: "development" | "test"
}>

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])

function refusal(reason: string): never {
  throw new Error(`Refusing database operation: ${reason}`)
}

export function verifyDatabaseTarget(
  source: Record<string, string | undefined>,
  operation: DatabaseOperation
): VerifiedDatabaseTarget {
  const environment = source.APP_ENV
  if (environment !== "development" && environment !== "test") {
    refusal("APP_ENV must be development or test")
  }

  const rawUrl = source.DATABASE_URL
  if (!rawUrl) refusal("DATABASE_URL is required")

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    refusal("DATABASE_URL must be a valid URL")
  }

  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
    refusal("only PostgreSQL targets are supported")
  }
  if (!LOOPBACK_HOSTS.has(target.hostname)) {
    refusal("the database host must be loopback")
  }

  const databaseName = decodeURIComponent(target.pathname.slice(1))
  const developmentTarget = {
    databaseName: source.POSTGRES_DB ?? "webapp_template",
    username: source.POSTGRES_USER ?? "webapp_template",
    password: source.POSTGRES_PASSWORD ?? "webapp_template_dev",
    port: source.POSTGRES_PORT ?? "5433",
  }
  const expectedName =
    environment === "development"
      ? developmentTarget.databaseName
      : "webapp_template_auth_test"
  if (databaseName !== expectedName) {
    refusal(`expected database ${expectedName}`)
  }

  const expectedCredentials =
    environment === "development"
      ? developmentTarget
      : {
          username: "webapp_template_auth_test",
          password: "isolated-fixture-only",
        }
  if (
    decodeURIComponent(target.username) !== expectedCredentials.username ||
    decodeURIComponent(target.password) !== expectedCredentials.password
  ) {
    refusal("expected local database credentials")
  }
  if (environment === "development" && target.port !== developmentTarget.port) {
    refusal(`development database port must be ${developmentTarget.port}`)
  }

  if (
    environment === "test" &&
    !source.DATABASE_TEST_OWNED?.startsWith("webapp-template-code004-test-")
  ) {
    refusal("an owned test run is required")
  }

  if (operation === "seed" && source.DATABASE_FIXTURE_MODE !== "enabled") {
    refusal("fixture mode enabled is required")
  }

  return {
    databaseName: expectedName,
    databaseUrl: target.toString(),
    environment,
  }
}

export async function withVerifiedDatabaseTarget<T>(
  source: Record<string, string | undefined>,
  operation: DatabaseOperation,
  run: (target: VerifiedDatabaseTarget) => Promise<T>
): Promise<T> {
  const target = verifyDatabaseTarget(source, operation)
  return run(target)
}
