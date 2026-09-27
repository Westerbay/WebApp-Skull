import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const script = resolve(import.meta.dirname, "../worktree.mjs")

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "skull-worktree-test-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  git("init", "--initial-branch=main")
  writeFileSync(join(root, ".gitignore"), ".worktree/\n")
  git("add", ".gitignore")
  git(
    "-c",
    "user.name=Worktree Test",
    "-c",
    "user.email=worktree@example.test",
    "commit",
    "-m",
    "fixture"
  )
  const run = (action, branch, cwd = root) =>
    spawnSync(process.execPath, [script, action, branch], {
      cwd,
      encoding: "utf8",
    })
  return { root, git, run }
}

test("interactive create and remove strip prefix and retain branch", (t) => {
  const { root, git } = fixture(t)
  for (const action of ["create", "remove"]) {
    const result = spawnSync(process.execPath, [script, action], {
      cwd: root,
      encoding: "utf8",
      input: "feat/feature\n",
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Branch name:/)
    assert.equal(
      existsSync(join(root, ".worktree/feature")),
      action === "create"
    )
  }
  assert.equal(git("rev-parse", "feat/feature"), git("rev-parse", "main"))
})

test("existing branches and nested suffixes work from another worktree", (t) => {
  const { root, git, run } = fixture(t)
  git("branch", "fix/team/task")
  assert.equal(run("create", "plain").status, 0)
  const result = run("create", "fix/team/task", join(root, ".worktree/plain"))
  assert.equal(result.status, 0, result.stderr)
  assert.ok(existsSync(join(root, ".worktree/team/task/.git")))
  assert.equal(run("remove", "fix/team/task").status, 0)
  assert.equal(run("remove", "plain").status, 0)
})

test("collisions and branch mismatches cannot remove another worktree", (t) => {
  const { root, git, run } = fixture(t)
  assert.equal(run("create", "feat/shared").status, 0)
  assert.equal(run("create", "fix/shared").status, 1)
  assert.equal(run("remove", "fix/shared").status, 1)
  assert.ok(existsSync(join(root, ".worktree/shared/.git")))
  assert.equal(
    git("-C", join(root, ".worktree/shared"), "branch", "--show-current"),
    "feat/shared"
  )
})

test("dirty, locked and current worktrees are preserved", (t) => {
  const { root, git, run } = fixture(t)
  assert.equal(run("create", "feat/safe").status, 0)
  const target = join(root, ".worktree/safe")
  writeFileSync(join(target, "unsaved.txt"), "keep me")
  assert.equal(run("remove", "feat/safe").status, 1)
  assert.ok(existsSync(join(target, "unsaved.txt")))
  rmSync(join(target, "unsaved.txt"))
  git("worktree", "lock", target)
  assert.equal(run("remove", "feat/safe").status, 1)
  git("worktree", "unlock", target)
  assert.equal(run("remove", "feat/safe", target).status, 1)
  assert.equal(run("remove", "feat/safe").status, 0)
})

test("invalid branches and unsafe directory names are rejected", (t) => {
  const { root, run } = fixture(t)
  for (const branch of ["", "-b", "feat/../escape", "feat/CON", "feat/task."]) {
    assert.equal(run("create", branch).status, 1, branch)
  }
  assert.equal(existsSync(join(root, ".worktree")), false)
})
