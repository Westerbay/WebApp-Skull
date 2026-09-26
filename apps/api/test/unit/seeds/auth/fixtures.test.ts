import { expect, it } from "vitest"
import { createDemoAuthFixtures } from "../../../../src/seeds/auth/fixtures.js"
import {
  AUTH_FIXTURES,
  AUTH_FIXTURE_PASSWORD,
} from "../../../../src/seeds/auth/scenario.js"

it("generates reproducible French profiles with unique reserved identities", () => {
  const fixtures = createDemoAuthFixtures(AUTH_FIXTURE_PASSWORD)
  expect(fixtures).toEqual(createDemoAuthFixtures(AUTH_FIXTURE_PASSWORD))
  expect(fixtures).toHaveLength(60)
  expect(AUTH_FIXTURES).toHaveLength(62)
  for (const field of ["id", "accountId", "email"] as const) {
    expect(new Set(AUTH_FIXTURES.map((fixture) => fixture[field])).size).toBe(
      62
    )
  }
  expect(
    fixtures.every((fixture) => fixture.email.endsWith("@example.test"))
  ).toBe(true)
  expect(fixtures.some((fixture) => !fixture.emailVerified)).toBe(true)
})
