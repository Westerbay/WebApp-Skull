import { describe, expect, it, vi } from "vitest"

import {
  verifyDatabaseTarget,
  withVerifiedDatabaseTarget,
} from "../../src/target.js"

const developmentTarget = {
  APP_ENV: "development",
  DATABASE_URL:
    "postgresql://webapp_template:webapp_template_dev@127.0.0.1:5433/webapp_template",
}

describe("database target verification", () => {
  it.each([
    {
      ...developmentTarget,
      APP_ENV: "production",
    },
    {
      ...developmentTarget,
      DATABASE_URL:
        "postgresql://user:secret@database.example.com/webapp_template",
    },
    {
      ...developmentTarget,
      DATABASE_URL:
        "postgresql://webapp_template:local-only@127.0.0.1:5433/another_database",
    },
    {
      ...developmentTarget,
      DATABASE_URL:
        "postgresql://webapp_template:wrong@127.0.0.1:5433/webapp_template",
    },
    {
      ...developmentTarget,
      DATABASE_URL:
        "postgresql://webapp_template:webapp_template_dev@127.0.0.1:5432/webapp_template",
    },
  ])("refuses a migration target before a connection is opened", (source) => {
    expect(() => verifyDatabaseTarget(source, "migrate")).toThrow(
      "Refusing database operation"
    )
  })

  it("accepts the expected loopback development database for migrations", () => {
    expect(verifyDatabaseTarget(developmentTarget, "migrate")).toMatchObject({
      databaseName: "webapp_template",
      environment: "development",
    })
  })

  it("matches development targets against the Compose environment", () => {
    const source = {
      APP_ENV: "development",
      POSTGRES_DB: "custom_local",
      POSTGRES_USER: "custom_user",
      POSTGRES_PASSWORD: "custom_password",
      POSTGRES_PORT: "5544",
      DATABASE_URL:
        "postgresql://custom_user:custom_password@127.0.0.1:5544/custom_local",
    }
    expect(verifyDatabaseTarget(source, "migrate")).toMatchObject({
      databaseName: "custom_local",
    })
    expect(() =>
      verifyDatabaseTarget(
        { ...source, DATABASE_URL: developmentTarget.DATABASE_URL },
        "migrate"
      )
    ).toThrow("Refusing database operation")
  })

  it("requires explicit fixture mode before seeding", () => {
    expect(() => verifyDatabaseTarget(developmentTarget, "seed")).toThrow(
      "fixture mode"
    )

    expect(
      verifyDatabaseTarget(
        { ...developmentTarget, DATABASE_FIXTURE_MODE: "enabled" },
        "seed"
      )
    ).toMatchObject({ databaseName: "webapp_template" })
  })

  it("requires an owned test run for the isolated test database", () => {
    const target = {
      APP_ENV: "test",
      DATABASE_URL:
        "postgresql://webapp_template_auth_test:isolated-fixture-only@127.0.0.1:49152/webapp_template_auth_test",
      DATABASE_FIXTURE_MODE: "enabled",
    }

    expect(() => verifyDatabaseTarget(target, "seed")).toThrow("owned test")
    expect(
      verifyDatabaseTarget(
        { ...target, DATABASE_TEST_OWNED: "webapp-template-code004-test-1234" },
        "seed"
      )
    ).toMatchObject({ databaseName: "webapp_template_auth_test" })
  })

  it("refuses an unsafe target before opening a database connection", async () => {
    const openConnection = vi.fn(() => Promise.resolve())

    await expect(
      withVerifiedDatabaseTarget(
        {
          ...developmentTarget,
          DATABASE_URL:
            "postgresql://user:secret@database.example.com/webapp_template",
        },
        "migrate",
        openConnection
      )
    ).rejects.toThrow("Refusing database operation")
    expect(openConnection).not.toHaveBeenCalled()
  })
})
