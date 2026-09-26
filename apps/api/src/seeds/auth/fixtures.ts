import { Faker, en, fr } from "@faker-js/faker"
import type { AuthFixture } from "./scenario.js"

export function createDemoAuthFixtures(password: string): Array<AuthFixture> {
  const faker = new Faker({ locale: [fr, en] })
  faker.seed(20260926)
  return Array.from({ length: 60 }, (_, index) => {
    const number = String(index + 1).padStart(3, "0")
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    return {
      id: `seed-auth-user-demo-${number}`,
      accountId: `seed-auth-account-demo-${number}`,
      name: `${firstName} ${lastName}`,
      email: faker.internet
        .email({ firstName, lastName, provider: "example.test" })
        .replace("@", `.${number}@`)
        .toLowerCase(),
      emailVerified: index % 5 !== 0,
      password,
    }
  })
}
