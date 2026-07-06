# Repository Reorganization Design

- Date: 2026-07-06
- Status: Approved
- Scope: Repository layout, documentation taxonomy, and path normalization

---

## Goal

Reorganize the repository into a long-lived product monorepo with three clear top-level concerns:

- `backend/` for the ABP/.NET solution and all backend test projects
- `frontend/` for runnable web code and prototypes
- `docs/` for non-runnable documentation only

The result should reduce cognitive load, make product surfaces easier to find, and keep future work from mixing code, plans, and prototypes in the same places.

## Current Problems

- The ABP backend is spread across the repository root (`src/`, `test/`, solution files, shared props).
- The parent web app lives at `frontend/parent-web/`, which does not communicate purpose.
- The child experience prototype is stored under `docs/prototypes/`, even though it is a runnable artifact.
- `docs/` mixes product vision, implementation specs, implementation plans, marketing content, and tool-originated folders such as `docs/superpowers/`.
- Many documents hardcode old root-relative paths such as `frontend/parent-web/`, `src/`, `test/`, and `frontend/child-web-prototype/child-homepage.html`.

## Target Repository Structure

```text
/
  README.md
  DEPLOY.md
  backend/
    README.md
    Homework.slnx
    Homework.sln.DotSettings
    common.props
    NuGet.Config
    src/
    test/
  frontend/
    README.md
    parent-web/
    child-web-prototype/
  docs/
    README.md
    product/
      backlog.md
      vision/
    engineering/
      specs/
        backend/
        frontend/
      plans/
        backend/
        frontend/
        child-prototype/
      runbooks/
    marketing/
      site-content.md
    archive/
      engineering/
```

## Backend Placement

- Move the current ABP backend root into `backend/`.
- Keep internal `src/` and `test/` folders intact so project-to-project relative references remain stable.
- Move repository-root backend support files together with the solution:
  - `Homework.slnx`
  - `Homework.sln.DotSettings`
  - `common.props`
  - `NuGet.Config`
- Preserve the current project graph and build commands, but run them from `backend/`.

Expected backend developer entrypoint:

- Build: `cd backend && dotnet build Homework.slnx`
- Run migrator: `cd backend/src/Homework.DbMigrator && dotnet run`
- Run API host: `cd backend/src/Homework.HttpApi.Host && dotnet run`

## Frontend Placement

### Parent Web

- Move `frontend/parent-web/` to `frontend/parent-web/`.
- Preserve its internal Vite layout and package scripts.
- Update all documentation that currently references `frontend/parent-web/`.

### Child Web Prototype

- Promote `frontend/child-web-prototype/child-homepage.html` into `frontend/child-web-prototype/child-homepage.html`.
- Treat the child prototype as runnable frontend code rather than as a documentation attachment.
- Update all plans and design docs that reference the old prototype path.

## Documentation Taxonomy

`docs/` should become documentation-only. Runnable assets should not live there.

### Product

- `docs/product/vision/` stores product-level truth, especially the long-form game/product design.
- `docs/product/backlog.md` stores approved but deferred ideas.

### Engineering Specs

- `docs/engineering/specs/backend/` stores backend design documents.
- `docs/engineering/specs/frontend/` stores parent-web and child-experience design documents.

### Engineering Plans

- `docs/engineering/plans/backend/` stores backend implementation plans.
- `docs/engineering/plans/frontend/` stores parent-web implementation plans.
- `docs/engineering/plans/child-prototype/` stores child prototype implementation plans.

### Marketing

- `docs/marketing/` stays focused on website and messaging content.

### Archive

- `docs/archive/engineering/` stores historical or no-longer-current implementation documents whose value is primarily historical.
- Documents that describe removed surfaces or outdated architecture can move here instead of being deleted.

## Document Migration Rules

- Do not keep `docs/superpowers/` as a first-class taxonomy. The origin of a document is less important than what the document is for.
- Preserve existing filenames where possible to minimize risk and keep history recognizable.
- Rewrite root-relative paths inside active documents:
  - `frontend/parent-web/` -> `frontend/parent-web/`
  - `frontend/child-web-prototype/child-homepage.html` -> `frontend/child-web-prototype/child-homepage.html`
  - `src/...` -> `backend/src/...` when the document speaks from repository root
  - `test/...` -> `backend/test/...` when the document speaks from repository root
  - `Homework.slnx` -> `backend/Homework.slnx` when the document speaks from repository root
- Avoid mechanical rewrites in archived historical material unless the old path is actively misleading.

## Recommended File Mapping

- `docs/backlog.md` -> `docs/product/backlog.md`
- `docs/product/vision/2026-07-04-kids-homework-pet-game-design.md` -> `docs/product/vision/2026-07-04-kids-homework-pet-game-design.md`
- `docs/engineering/specs/backend/2026-07-04-backend-headless-api-design.md` -> `docs/engineering/specs/backend/2026-07-04-backend-headless-api-design.md`
- `docs/superpowers/specs/2026-07-04-phase3-parent-admin-design.md` -> `docs/engineering/specs/backend/2026-07-04-phase3-parent-admin-design.md`
- `docs/superpowers/specs/2026-07-04-phase4-accounts-registration-design.md` -> `docs/engineering/specs/backend/2026-07-04-phase4-accounts-registration-design.md`
- `docs/engineering/specs/frontend/2026-07-05-parent-console-design.md` -> `docs/engineering/specs/frontend/2026-07-05-parent-console-design.md`
- `docs/engineering/specs/frontend/2026-07-05-child-homepage-design.md` -> `docs/engineering/specs/frontend/2026-07-05-child-homepage-design.md`
- `docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md` -> `docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md`
- `docs/superpowers/plans/2026-07-04-phase1-foundation-accounts.md` -> `docs/engineering/plans/backend/2026-07-04-phase1-foundation-accounts.md`
- `docs/superpowers/plans/2026-07-04-phase2-task-scoring-engine.md` -> `docs/engineering/plans/backend/2026-07-04-phase2-task-scoring-engine.md`
- `docs/superpowers/plans/2026-07-04-phase3-parent-admin.md` -> `docs/engineering/plans/backend/2026-07-04-phase3-parent-admin.md`
- `docs/superpowers/plans/2026-07-04-phase4-accounts-registration.md` -> `docs/engineering/plans/backend/2026-07-04-phase4-accounts-registration.md`
- `docs/superpowers/plans/2026-07-05-backend-headless-api.md` -> `docs/engineering/plans/backend/2026-07-05-backend-headless-api.md`
- `docs/superpowers/plans/2026-07-05-parent-console.md` -> `docs/engineering/plans/frontend/2026-07-05-parent-console.md`
- `docs/engineering/plans/child-prototype/2026-07-05-child-homepage-prototype.md` -> `docs/engineering/plans/child-prototype/2026-07-05-child-homepage-prototype.md`
- `docs/engineering/plans/child-prototype/2026-07-05-child-homepage-sacred-dragon-plan.md` -> `docs/engineering/plans/child-prototype/2026-07-05-child-homepage-sacred-dragon-plan.md`
- `docs/plans/2026-07-05-child-homepage-elemental-evolution-plan.md` -> `docs/engineering/plans/child-prototype/2026-07-05-child-homepage-elemental-evolution-plan.md`
- `docs/plans/2026-07-05-child-homepage-declutter-plan.md` -> `docs/engineering/plans/child-prototype/2026-07-05-child-homepage-declutter-plan.md`
- `frontend/child-web-prototype/child-homepage.html` -> `frontend/child-web-prototype/child-homepage.html`

## Runtime and Log Files

- Treat root `Logs/` as runtime output, not source.
- Prefer keeping runtime logs out of the top-level repository structure.
- Update `.gitignore` entries so backend log folders are ignored under `backend/src/...`.

## Validation Standard

The reorganization is complete when:

- A new reader can immediately identify `backend/`, `frontend/`, and `docs/`.
- Backend commands work from `backend/` without path confusion.
- Parent web commands work from `frontend/parent-web/`.
- Child prototype references point to `frontend/child-web-prototype/child-homepage.html`.
- `docs/` no longer contains runnable prototype code or `superpowers` taxonomy folders.
- Active docs use the new path conventions.

## Out of Scope

- Changing backend architecture or project boundaries inside the ABP solution
- Converting the child prototype into a formal React application
- Introducing a JavaScript workspace manager such as pnpm workspaces, Turborepo, or Nx
- Renaming every historical file purely for aesthetics
