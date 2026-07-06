# Repository Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the repository into `backend/`, `frontend/`, and `docs/` so code, runnable prototypes, and documentation each live in clear long-term homes.

**Architecture:** Move the ABP backend as a self-contained unit into `backend/`, move the parent web app and child prototype under `frontend/`, then rebuild `docs/` into product, engineering, marketing, and archive sections. After each move, rewrite path references and run focused verification commands so the new structure is internally consistent.

**Tech Stack:** PowerShell, .NET 10 / ABP, React 19 / Vite, Markdown, ripgrep

---

## Execution Notes

- This is a repository reorganization, so classic TDD is not the main tool. Use path assertions, search-based checks, and build commands as the verification gates.
- Many docs contain old root-relative paths. Update only active documents during the main pass; move clearly historical material into archive instead of over-editing it.
- Git commands are currently blocked by repository safe-directory settings in this environment. If that remains unresolved, skip commit steps and record checkpoints in the task notes instead.

### Task 1: Create the target skeleton

**Files:**
- Create: `backend/`
- Create: `frontend/`
- Create: `docs/product/vision/`
- Create: `docs/engineering/specs/backend/`
- Create: `docs/engineering/specs/frontend/`
- Create: `docs/engineering/plans/backend/`
- Create: `docs/engineering/plans/frontend/`
- Create: `docs/engineering/plans/child-prototype/`
- Create: `docs/engineering/runbooks/`
- Create: `docs/archive/engineering/`

**Step 1: Create the new top-level folders**

Run:

```powershell
$dirs = @(
  'backend',
  'frontend',
  'docs/product/vision',
  'docs/engineering/specs/backend',
  'docs/engineering/specs/frontend',
  'docs/engineering/plans/backend',
  'docs/engineering/plans/frontend',
  'docs/engineering/plans/child-prototype',
  'docs/engineering/runbooks',
  'docs/archive/engineering'
)
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }
```

Expected: all target directories exist.

**Step 2: Verify the skeleton**

Run:

```powershell
Get-ChildItem backend, frontend, docs/product, docs/engineering, docs/archive
```

Expected: the new folders are listed without errors.

**Step 3: Checkpoint**

- If git is available, commit the empty skeleton.
- If git is blocked, note that Task 1 completed before file moves begin.

### Task 2: Move the ABP backend into `backend/`

**Files:**
- Move: `src/` -> `backend/src/`
- Move: `test/` -> `backend/test/`
- Move: `Homework.slnx` -> `backend/Homework.slnx`
- Move: `Homework.sln.DotSettings` -> `backend/Homework.sln.DotSettings`
- Move: `common.props` -> `backend/common.props`
- Move: `NuGet.Config` -> `backend/NuGet.Config`

**Step 1: Move the backend files**

Run:

```powershell
Move-Item -LiteralPath 'src' -Destination 'backend/src'
Move-Item -LiteralPath 'test' -Destination 'backend/test'
Move-Item -LiteralPath 'Homework.slnx' -Destination 'backend/Homework.slnx'
Move-Item -LiteralPath 'Homework.sln.DotSettings' -Destination 'backend/Homework.sln.DotSettings'
Move-Item -LiteralPath 'common.props' -Destination 'backend/common.props'
Move-Item -LiteralPath 'NuGet.Config' -Destination 'backend/NuGet.Config'
```

Expected: all backend artifacts now live under `backend/`.

**Step 2: Verify core backend paths**

Run:

```powershell
Test-Path 'backend/src/Homework.HttpApi.Host/Homework.HttpApi.Host.csproj'
Test-Path 'backend/test/Homework.EntityFrameworkCore.Tests/Homework.EntityFrameworkCore.Tests.csproj'
Test-Path 'backend/common.props'
Test-Path 'backend/Homework.slnx'
```

Expected: every command returns `True`.

**Step 3: Smoke-check solution references**

Run:

```powershell
Get-Content 'backend/Homework.slnx'
```

Expected: project paths still point to `src/...` and `test/...` relative to the solution file.

**Step 4: Checkpoint**

- If git is available, commit the backend move.
- Otherwise record that the backend structure has been moved and verified.

### Task 3: Move runnable frontend surfaces under `frontend/`

**Files:**
- Move: `frontend/parent-web/` -> `frontend/parent-web/`
- Create: `frontend/child-web-prototype/`
- Move: `frontend/child-web-prototype/child-homepage.html` -> `frontend/child-web-prototype/child-homepage.html`

**Step 1: Move the parent web app**

Run:

```powershell
Move-Item -LiteralPath 'console' -Destination 'frontend/parent-web'
```

Expected: the Vite app now lives at `frontend/parent-web/`.

**Step 2: Promote the child prototype into `frontend/`**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'frontend/child-web-prototype' | Out-Null
Move-Item -LiteralPath 'frontend/child-web-prototype/child-homepage.html' -Destination 'frontend/child-web-prototype/child-homepage.html'
```

Expected: the prototype HTML is no longer under `docs/`.

**Step 3: Verify frontend paths**

Run:

```powershell
Test-Path 'frontend/parent-web/package.json'
Test-Path 'frontend/child-web-prototype/child-homepage.html'
```

Expected: both commands return `True`.

**Step 4: Remove the empty prototype folder if it is now empty**

Run:

```powershell
if ((Test-Path 'docs/prototypes') -and -not (Get-ChildItem 'docs/prototypes' -Force)) {
  Remove-Item -LiteralPath 'docs/prototypes'
}
```

Expected: `docs/prototypes/` is removed only if empty.

**Step 5: Checkpoint**

- If git is available, commit the frontend moves.
- Otherwise record that all runnable frontend surfaces have moved under `frontend/`.

### Task 4: Rebuild `docs/` taxonomy and move active documents

**Files:**
- Move: `docs/backlog.md` -> `docs/product/backlog.md`
- Move: `docs/marketing/site-content.md` -> `docs/marketing/site-content.md`
- Move: `docs/product/vision/2026-07-04-kids-homework-pet-game-design.md` -> `docs/product/vision/2026-07-04-kids-homework-pet-game-design.md`
- Move: `docs/engineering/specs/backend/2026-07-04-backend-headless-api-design.md` -> `docs/engineering/specs/backend/2026-07-04-backend-headless-api-design.md`
- Move: `docs/superpowers/specs/2026-07-04-phase3-parent-admin-design.md` -> `docs/engineering/specs/backend/2026-07-04-phase3-parent-admin-design.md`
- Move: `docs/superpowers/specs/2026-07-04-phase4-accounts-registration-design.md` -> `docs/engineering/specs/backend/2026-07-04-phase4-accounts-registration-design.md`
- Move: `docs/engineering/specs/frontend/2026-07-05-parent-console-design.md` -> `docs/engineering/specs/frontend/2026-07-05-parent-console-design.md`
- Move: `docs/engineering/specs/frontend/2026-07-05-child-homepage-design.md` -> `docs/engineering/specs/frontend/2026-07-05-child-homepage-design.md`
- Move: `docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md` -> `docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md`
- Move: `docs/superpowers/plans/*` -> matching `docs/engineering/plans/backend/` or `docs/engineering/plans/frontend/`
- Move: child prototype plans under `docs/engineering/plans/child-prototype/`

**Step 1: Move the product and engineering docs**

Run the moves in small groups with `Move-Item`, matching the approved mapping from the design doc.

Expected: active specs and plans now live under `docs/product/` and `docs/engineering/`.

**Step 2: Verify the active document tree**

Run:

```powershell
Get-ChildItem 'docs/product' -Recurse -File
Get-ChildItem 'docs/engineering' -Recurse -File
```

Expected: active docs appear in the new taxonomy.

**Step 3: Remove empty legacy folders**

Run:

```powershell
$legacy = @('docs/superpowers/specs', 'docs/superpowers/plans', 'docs/superpowers')
foreach ($path in $legacy) {
  if ((Test-Path $path) -and -not (Get-ChildItem $path -Force)) {
    Remove-Item -LiteralPath $path
  }
}
```

Expected: empty legacy folders are deleted; non-empty ones remain for later archive handling.

**Step 4: Checkpoint**

- If git is available, commit the documentation moves.
- Otherwise record that the new doc taxonomy is in place.

### Task 5: Rewrite root-level path references in active docs

**Files:**
- Modify: `README.md`
- Modify: `DEPLOY.md`
- Modify: active files under `docs/product/`
- Modify: active files under `docs/engineering/`

**Step 1: Rewrite core path patterns**

Update active docs using targeted search-and-replace:

- `frontend/parent-web/` -> `frontend/parent-web/`
- `frontend/child-web-prototype/child-homepage.html` -> `frontend/child-web-prototype/child-homepage.html`
- `cd backend/src/Homework.DbMigrator` -> `cd backend/src/Homework.DbMigrator`
- `cd backend/src/Homework.HttpApi.Host` -> `cd backend/src/Homework.HttpApi.Host`
- `dotnet build Homework.slnx` -> `cd backend && dotnet build Homework.slnx` when the command is written from repo root

**Step 2: Search for stale references**

Run:

```powershell
rg -n "docs/prototypes|frontend/parent-web/|cd backend/src/|test/|Homework\.slnx" README.md DEPLOY.md docs/product docs/engineering
```

Expected: only intentional historical references remain.

**Step 3: Manually inspect ambiguous matches**

Open the remaining matches and decide whether they are:

- active docs that still need rewriting, or
- historical docs that should move into archive instead

Expected: no active doc points readers to the wrong path.

**Step 4: Checkpoint**

- If git is available, commit the path rewrite pass.
- Otherwise record that active docs have been normalized.

### Task 6: Add section READMEs and clean ignores

**Files:**
- Create: `backend/README.md`
- Create: `frontend/README.md`
- Create: `docs/README.md`
- Modify: `README.md`
- Modify: `.gitignore`

**Step 1: Write `backend/README.md`**

Include:

- backend purpose
- build command
- migrator command
- API host command
- test command

**Step 2: Write `frontend/README.md`**

Include:

- `parent-web` purpose
- `child-web-prototype` purpose
- how to run/build each surface

**Step 3: Write `docs/README.md`**

Include:

- what belongs in `product`, `engineering`, `marketing`, and `archive`
- the rule that `docs/` does not store runnable prototypes

**Step 4: Update `.gitignore`**

Change backend log ignore rules from root-based paths such as:

```text
backend/src/Homework.HttpApi.Host/Logs/*
```

to:

```text
backend/src/Homework.HttpApi.Host/Logs/*
```

Also remove now-stale ignore entries that refer to deleted root paths.

**Step 5: Checkpoint**

- If git is available, commit the README and ignore updates.
- Otherwise record that the repository guidance files are in place.

### Task 7: Archive stale historical material

**Files:**
- Move: stale historical docs -> `docs/archive/engineering/`

**Step 1: Identify stale docs**

Search for documents that still describe removed architecture such as:

- `Homework.Web`
- old ABP MVC pages
- root-level `src/` / `test/` generation assumptions no longer presented as current truth

Run:

```powershell
rg -n "Homework\.Web|Pages/ParentAdmin|generated at repo root|frontend/parent-web/ built at repo root" docs
```

Expected: a shortlist of historical-only files.

**Step 2: Move clearly historical documents into archive**

Use `Move-Item` for files whose main value is historical traceability rather than current guidance.

Expected: current docs stay concise; history remains preserved.

**Step 3: Verify archive boundaries**

Run:

```powershell
Get-ChildItem 'docs/archive' -Recurse -File
```

Expected: only historical material sits under archive.

**Step 4: Checkpoint**

- If git is available, commit the archive pass.
- Otherwise record which documents were archived.

### Task 8: Final validation

**Files:**
- Verify: `backend/Homework.slnx`
- Verify: `frontend/parent-web/package.json`
- Verify: `frontend/child-web-prototype/child-homepage.html`
- Verify: `docs/README.md`

**Step 1: Verify backend build path**

Run:

```powershell
dotnet build 'backend/Homework.slnx'
```

Expected: `Build succeeded`.

**Step 2: Verify parent web build path**

Run:

```powershell
npm --prefix 'frontend/parent-web' run build
```

Expected: Vite build succeeds.

**Step 3: Verify no active stale path references remain**

Run:

```powershell
rg -n "frontend/child-web-prototype/child-homepage.html|`?frontend/parent-web/`?|cd backend/src/Homework|backend/src/Homework.HttpApi.Host|backend/src/Homework.DbMigrator" README.md DEPLOY.md docs/product docs/engineering frontend/README.md backend/README.md docs/README.md
```

Expected: no matches, or only intentionally quoted historical references in archive files.

**Step 4: Verify the top-level shape**

Run:

```powershell
Get-ChildItem -Force | Select-Object Name
```

Expected: the root clearly shows `backend`, `frontend`, and `docs` as the main working areas.

**Step 5: Final checkpoint**

- If git is available, create a final reorganization commit.
- If git is blocked, report the exact verification output and note that version-control checkpointing still needs safe-directory setup.
