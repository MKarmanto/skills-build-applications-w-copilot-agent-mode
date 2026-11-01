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

- Presentation tier decision: Build a small React app with route-based sections for activities, teams, leaderboard, and workout suggestions, backed by a shared fetch client and explicit loading, empty, and alert states so the UI matches the accessibility contract.
- Logic tier decision: Keep Express handlers thin and move validation and business rules into the backend service layer, returning deliberate 4xx error objects for invalid IDs, empty inputs, and unknown users instead of leaking cast errors or generic 500s.
- Data tier decision: Use Mongoose schemas to enforce identity and required fields, keep seeded data idempotent, and preserve existing application-owned records while upserting demo users, teams, activities, and workouts.
- Activity tracking approach: Validate userId/teamId against real records, reject malformed or unknown references with 4xx, then store the canonical user/team refs along with computed points and occurredAt when a valid activity is created.
- Team management approach: Require a team name and mascot; allow members to be stored as ObjectId references and expose them through list responses without mutating unrelated records.
- Leaderboard approach: Aggregate each team’s activity points, sort descending by total, and assign a 1-based rank to each team entry using the team name and total points values expected by the contract.
- Workout suggestions approach: Match the requested user email to a seeded user, inspect recent activity history or fitnessGoal, and return the highest-priority workout suggestion whose focus aligns with the user’s pattern, including a reason string explaining the match.

## Current branch status

This branch is `build-octofit-app`. The repository is in the starter implementation state: the data contracts are incomplete, the backend service layer is still stubbed, and the frontend renders placeholder content instead of live API-backed UI.

The correct workflow is a narrow red-green loop: define the required schema rules, implement the backend service behavior, then finish the UI states that consume those APIs.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`  
  Current failure meaning: the Mongoose schemas are missing required validation, so the contract tests fail on undefined `name`, `email`, `fitnessGoal`, `mascot`, `type`, `minutes`, `points`, and `occurredAt` fields.
- API command: `npm run test:api --prefix octofit-tracker/backend`  
  Current failure meaning: the service layer is still stubbed and returns `501` for activity/team creation, an empty leaderboard, and a generic fallback suggestion instead of contract-compliant business logic.
- Frontend command: `npm test --prefix octofit-tracker/frontend`  
  Current failure meaning: the React app is still rendering “Implementation pending” and not handling real API data, loading states, empty states, or accessible error alerts.
- Backend build command: `npm run build --prefix octofit-tracker/backend`  
  Expected use: verifies the TypeScript backend compiles after the data and service fixes.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`  
  Expected use: verifies the React app compiles cleanly after the UI contract is implemented.
