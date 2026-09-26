import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { expect as browserExpect, chromium } from "@playwright/test"
import { expect, it } from "vitest"
import { schema } from "@workspace/database"
import {
  api,
  database,
  latestMailUrl,
  origin,
  password,
  webPort,
} from "../support/auth.harness.js"

it("completes French signup, verification, reset and logout in a mobile browser", async () => {
  await database.db
    .update(schema.rateLimit)
    .set({ lastRequest: Date.now() - 60000 })
  const browser = await chromium.launch()
  const web = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--config",
      "vite.e2e.config.ts",
      "--port",
      String(webPort),
    ],
    {
      cwd: "../web",
      env: { ...process.env, VITE_API_URL: api },
      stdio: "ignore",
    }
  )
  try {
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        ready = (await fetch(`${origin}/connexion`)).ok
      } catch {
        /* The owned Vite process is still starting. */
      }
      if (ready) break
      if (web.exitCode !== null)
        throw new Error("Test web server exited before startup")
      await delay(200)
    }
    expect(ready).toBe(true)
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    })
    const browserErrors: Array<string> = []
    page.on("pageerror", (error) => {
      browserErrors.push(error.message)
    })
    await page.goto(`${origin}/inscription`)
    await browserExpect(page.getByLabel("Nom", { exact: true })).toBeEnabled()
    expect(browserErrors).toEqual([])
    await browserExpect(page.locator("html")).toHaveAttribute("lang", "fr")
    await browserExpect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow"
    )
    await page.screenshot({
      path: "../../output/playwright/auth-inscription-mobile.png",
      fullPage: true,
    })
    await page.getByLabel("Nom", { exact: true }).fill("Élodie")
    await page.getByLabel("Adresse email").fill("browser@example.test")
    await page.getByLabel("Mot de passe", { exact: true }).fill(password)
    await page.getByRole("button", { name: "Créer mon compte" }).click()
    await browserExpect(page).toHaveURL(`${origin}/verification-email`)
    await page.goto(await latestMailUrl())
    await browserExpect(
      page.getByRole("heading", { name: "Adresse email confirmée" })
    ).toBeVisible()
    await page.getByRole("link", { name: "Revenir à la connexion" }).click()
    await page.getByLabel("Adresse email").fill("browser@example.test")
    await page.getByLabel("Mot de passe", { exact: true }).fill(password)
    await page.getByRole("button", { name: "Se connecter" }).click()
    await browserExpect(
      page.getByRole("heading", { name: "Bonjour, Élodie" })
    ).toBeVisible()
    const table = page.getByRole("table", { name: "Utilisateurs" })
    await browserExpect(table).toBeVisible()
    await browserExpect(table.locator("tbody tr")).toHaveCount(20)
    const firstPage = await table.locator("tbody").textContent()
    await browserExpect(
      page.getByRole("button", { name: "Précédent" })
    ).toBeDisabled()
    await page.getByRole("button", { name: "Suivant" }).click()
    await browserExpect(
      page.getByRole("status").filter({ hasText: "Page 2" })
    ).toBeVisible()
    expect(await table.locator("tbody").textContent()).not.toBe(firstPage)
    await page.getByRole("button", { name: "Précédent" }).click()
    await browserExpect(
      page.getByRole("status").filter({ hasText: "Page 1" })
    ).toBeVisible()
    expect(await table.locator("tbody").textContent()).toBe(firstPage)
    for (const number of [2, 3, 4]) {
      await page.getByRole("button", { name: "Suivant" }).click()
      await browserExpect(
        page.getByRole("status").filter({ hasText: `Page ${number}` })
      ).toBeVisible()
    }
    await browserExpect(table.locator("tbody tr")).toHaveCount(3)
    await browserExpect(
      page.getByRole("button", { name: "Suivant" })
    ).toBeDisabled()
    await page.screenshot({
      path: "../../output/playwright/auth-home-mobile.png",
      fullPage: true,
    })
    await page.route("**/api/auth/sign-out", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "SERVICE_UNAVAILABLE" }),
      })
    )
    await page.getByRole("button", { name: "Se déconnecter" }).click()
    await browserExpect(
      page.getByRole("heading", { name: "Bonjour, Élodie" })
    ).toBeVisible()
    await browserExpect(
      page.locator("[data-sonner-toast][data-type='error']")
    ).toHaveCount(1)
    await page.unroute("**/api/auth/sign-out")
    await page.getByRole("button", { name: "Se déconnecter" }).click()
    await browserExpect(page).toHaveURL(
      (url) =>
        url.origin === origin &&
        url.pathname === "/connexion" &&
        (url.search === "" || url.searchParams.get("redirect") === "/")
    )
    await page.screenshot({
      path: "../../output/playwright/auth-connexion-mobile.png",
      fullPage: true,
    })
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click()
    await browserExpect(page).toHaveURL(`${origin}/mot-de-passe-oublie`)
    await browserExpect(
      page.getByRole("heading", { name: "Retrouver votre accès" })
    ).toBeVisible()
    await page.getByLabel("Adresse email").fill("browser@example.test")
    await page.getByRole("button", { name: "Demander un lien" }).click()
    await browserExpect(page.locator("main")).toContainText("Demande reçue")
    await page.goto(await latestMailUrl())
    await page
      .getByLabel("Nouveau mot de passe", { exact: true })
      .fill("Browser-New-Password-2026!")
    await page
      .getByLabel("Confirmer le mot de passe")
      .fill("Browser-New-Password-2026!")
    await page
      .getByRole("button", { name: "Enregistrer le mot de passe" })
      .click()
    await browserExpect(page).toHaveURL(
      (url) =>
        url.origin === origin &&
        url.pathname === "/connexion" &&
        (url.search === "" || url.searchParams.get("redirect") === "/")
    )
    await page.getByLabel("Adresse email").fill("browser@example.test")
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill("Browser-New-Password-2026!")
    await page.getByRole("button", { name: "Se connecter" }).click()
    await browserExpect(
      page.getByRole("heading", { name: "Bonjour, Élodie" })
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true)
  } finally {
    await browser.close()
    web.kill("SIGTERM")
  }
}, 60000)
