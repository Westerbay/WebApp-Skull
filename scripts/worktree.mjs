import { spawnSync } from "node:child_process"
import { lstatSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

function git(args, cwd, inherit = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "Git command failed")
  }
  return result.stdout?.trim()
}

async function main() {
  const [action, argument, ...extra] = process.argv.slice(2)
  if (!["create", "remove"].includes(action) || extra.length) {
    throw new Error("Usage: node scripts/worktree.mjs <create|remove> [branch]")
  }
  let branch = argument
  if (branch === undefined) {
    const prompt = createInterface({ input: stdin, output: stdout })
    try {
      branch = await prompt.question("Branch name: ")
    } finally {
      prompt.close()
    }
  }
  branch = branch.trim()
  if (!branch || branch.startsWith("-")) throw new Error("Invalid branch name")
  git(["check-ref-format", "--branch", branch], process.cwd())
  // The shared Git directory locates the repository root from any worktree.
  const root = dirname(
    git(
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      process.cwd()
    )
  )
  const name = branch.slice(branch.indexOf("/") + 1)
  const parts = name.split("/")
  for (const part of parts) {
    if (
      /[<>:"\\|?*]/.test(part) ||
      /[. ]$/.test(part) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
    ) {
      throw new Error("Branch suffix is not a portable directory name")
    }
  }
  let path = root
  for (const part of [".worktree", ...parts]) {
    path = join(path, part)
    const entry = lstatSync(path, { throwIfNoEntry: false })
    if (entry && (entry.isSymbolicLink() || !entry.isDirectory())) {
      throw new Error("Worktree path must contain only real directories")
    }
  }
  if (action === "create") {
    if (lstatSync(path, { throwIfNoEntry: false })) {
      throw new Error("Worktree path already exists")
    }
    const existing = spawnSync(
      "git",
      ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
      { cwd: root }
    )
    if (existing.error) throw existing.error
    if (![0, 1].includes(existing.status))
      throw new Error("Cannot inspect local branch")
    mkdirSync(dirname(path), { recursive: true })
    const args = ["worktree", "add"]
    if (existing.status === 1) args.push("-b", branch)
    args.push(path)
    if (existing.status === 0) args.push(branch)
    git(args, root, true)
    console.log(`Created worktree: ${path}`)
    return
  }
  const entries = git(["worktree", "list", "--porcelain", "-z"], root).split(
    "\0\0"
  )
  const matches = entries.some((entry) => {
    const fields = entry.split("\0")
    return (
      fields.includes(`worktree ${path.replaceAll("\\", "/")}`) &&
      fields.includes(`branch refs/heads/${branch}`)
    )
  })
  if (!matches)
    throw new Error("No worktree at this path for the requested branch")
  if (
    resolve(process.cwd()) === path ||
    resolve(process.cwd()).startsWith(path + "/") ||
    resolve(process.cwd()).startsWith(path + "\\")
  ) {
    throw new Error("Run removal from outside the target worktree")
  }
  git(["worktree", "remove", path], root, true)
  console.log(`Removed worktree: ${path} (branch retained)`)
}

try {
  await main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
