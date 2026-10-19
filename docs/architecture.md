# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Implement the data tier first, then the logic tier, then the presentation tier. Keep the existing three-tier boundaries and API response shapes. Do not add authentication in this exercise.

- Presentation tier decision: Keep route-level views in React components and use the shared `getJson` client for all API reads. Use relative `/api` paths through the Vite proxy; each view must expose accessible loading, empty, and error states.
- Logic tier decision: Implement behavior in `octofitService.ts` behind the existing Express routes. Validate inputs and return deliberate 4xx errors for invalid or missing records; keep HTTP handling separate from persistence rules and preserve the response envelopes in the API contract.
- Data tier decision: Use Mongoose schemas for required fields, references, and defaults. Make seed operations idempotent with upserts and preserve unrelated records; do not clear collections as part of seeding.
- Activity tracking approach: Validate the user and team IDs and confirm both records exist before writing. Require a non-empty activity type and positive minutes, store the user/team references and occurrence time, and compute points deterministically as one point per minute.
- Team management approach: Require a non-blank name and mascot, default members to an empty array, and preserve submitted team fields. Validate supplied member IDs and retain them in the created and listed team.
- Leaderboard approach: Sum activity points per team, include teams with no activity at zero, sort by total points descending, and assign 1-based ranks in the returned order.
- Workout suggestions approach: Find the user by email and return a deliberate 4xx when no user matches. Prefer workouts aligned with recent activity when available, otherwise use the user's fitness goal; put the best match first and include a reason for the recommendation.

## Test plan

Run the focused contract tests after each tier, then run both builds. The baseline results below were observed before implementing the decisions above; rerun each command after its tier is complete.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` - checks model validation and safe, idempotent seeding. Baseline: 4 of 5 tests fail because required model fields are missing; the seed contract passes.
- API command: `npm run test:api --prefix octofit-tracker/backend` - checks activity creation/listing and input rejection, team creation/listing, point totals/ranks, and user-specific workout suggestions. Baseline: all 4 tests fail; create endpoints return placeholder `501` responses, the leaderboard is empty, and the first workout suggestion does not match the requested user's goal/activity.
- Frontend command: `npm test --prefix octofit-tracker/frontend` - checks data rendering, the workout request, and loading/empty/error states for each view. Baseline: all 15 tests fail because the views still show the implementation-pending state.
- Backend build command: `npm run build --prefix octofit-tracker/backend` - checks TypeScript compilation independently of runtime behavior. Baseline: passes.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` - checks TypeScript compilation and the Vite production build. Baseline: passes.
- Repository validation command: `node --test tests/exercise-validation.test.mjs` - checks exercise metadata and grading safeguards, not app-tier behavior. Baseline: 4 of 40 tests fail because the README Copy Exercise badge does not match the template owner/name expected by the validator; resolve this separate metadata mismatch before using the suite as a clean final gate.
