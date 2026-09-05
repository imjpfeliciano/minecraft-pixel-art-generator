---
name: plan-bootstrap
description: One-time setup of the GitHub project-management substrate — verify gh auth, create the label taxonomy, and create the Projects v2 board with its custom fields. Run once per repo, then only to repair drift.
allowed-tools: Read, Bash(gh auth status*), Bash(gh repo view*), Bash(gh label list*), Bash(node scripts/pm/bootstrap.mjs*)
disable-model-invocation: true
user-invocable: true
arguments: "[--check] [--labels] [--project] [--all]"
---

# plan-bootstrap

Creates durable GitHub state. It is deliberately not model-invocable — it should only ever
run because a human typed `/plan-bootstrap`.

## Procedure

1. **Always start with `--check`.** It reports auth, scopes, which labels exist, and whether
   the project has been created. It is read-only and safe to re-run any time.

   ```
   node scripts/pm/bootstrap.mjs --check
   ```

2. **If unauthenticated**, stop and give the user this command to run themselves — it opens
   a browser and cannot be done for them:

   ```
   gh auth login -s repo,read:org,project
   ```

   The `project` scope is **not** in gh's default set. Without it every `gh project` command
   fails with an opaque scope error. If they are already logged in without it:

   ```
   gh auth refresh -h github.com -s project
   ```

3. **Labels** — `node scripts/pm/bootstrap.mjs --labels`. Idempotent (`--force` updates
   colour and description in place), so re-running is safe and is how you repair drift.

4. **Project** — `node scripts/pm/bootstrap.mjs --project`. Creates "MC Pixel Art —
   Roadmap" plus the Area / Priority / Size / Spec / Milestone / Agent fields, and records
   the project number and field ids in `.claude/pm/state.json`.

5. **Relay the manual steps.** The script prints them; they genuinely cannot be done from
   the CLI or the public API. The important one is **Workflows → Auto-add to project**,
   because enabling it removes item-add from the sync path entirely.

6. **Verify**: re-run `--check` and confirm all labels present and a project number
   recorded.

## Notes

- The project is owned by the **user account**, not the repo, and must be linked to the
  repo manually (manual step 4) before it shows in issue sidebars.
- `spec/*` labels are not created here — `pm:sync` creates one per spec file on demand.
- The `agent/*` labels and the `Agent` project field are created now and read by nothing.
  They are the seam for later agent dispatch; leaving them in place costs nothing.
