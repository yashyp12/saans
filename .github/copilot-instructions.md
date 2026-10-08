# Saans — GitHub Copilot Instructions

## 1. Source of Truth

`PLAN.md` is the single source of truth for the Saans project.

Before making implementation decisions, read the relevant section of `PLAN.md`.

Do not add, remove, or modify architecture, AWS services, libraries, APIs, database schema, features, or scope unless explicitly permitted by `PLAN.md` or approved by the project owner.

If something is ambiguous, missing, or technically uncertain:

STOP and ask the project owner.

Do not guess.

---

## 2. Project Goal

Saans is a school air-quality decision engine, not an AQI dashboard.

Its purpose is to help principals make activity-level decisions for bad-air days:

- GO
- MODIFY
- MOVE
- CANCEL

The implementation must preserve this product direction.

---

## 3. Scope

Follow the implementation order defined in `PLAN.md`:

P0 → P1 → P2

Do not begin P1 or P2 work while required P0 work is incomplete.

Do not introduce features listed under "Out of scope".

---

## 4. Architecture

The architecture defined in `PLAN.md` must be preserved.

Required major components include:

- EventBridge Scheduler
- Lambda
- DynamoDB
- API Gateway
- S3
- CloudFront
- SNS
- Bedrock
- CloudWatch
- AWS SAM
- AWS Lambda Powertools

Do not substitute or introduce alternative AWS services without owner approval.

---

## 5. Agent Boundaries

The project uses three implementation areas:

### Backend/Core Agent

Owns:

- `backend/`
- decision engine
- policy logic
- safe-window logic
- API implementation
- ingestion
- advisor
- backend tests

### Infrastructure/DevOps Agent

Owns:

- `template.yaml`
- `samconfig.toml`
- IAM
- EventBridge
- DynamoDB infrastructure
- API Gateway infrastructure
- S3
- CloudFront
- SNS infrastructure
- CloudWatch
- GitHub Actions
- AWS deployment

### Frontend Agent

Owns:

- `frontend/`
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts/SVG
- UI states
- API integration
- Principal Brief
- Timeline
- Forecast
- Simulator
- Circular Composer

Agents must not cross these boundaries unless explicitly requested.

---

## 6. Backend Core Rule

`backend/src/core/` must contain pure application logic.

It must have:

- zero AWS imports
- no boto3 dependency
- no direct AWS API calls

The decision engine must remain independently testable.

Required interface:

    decide(timetable, hourlyForecast, policy, now) -> Decision

---

## 7. API Contract

The API contract in `PLAN.md` is frozen.

Required endpoints:

- GET `/schools`
- GET `/schools/{id}/brief`
- GET `/schools/{id}/forecast`
- POST `/schools/{id}/simulate`
- POST `/schools/{id}/circular`
- POST `/schools/{id}/notify`
- POST `/schools/{id}/subscribers`

Do not rename, remove, or invent endpoints without owner approval.

Frontend and backend must follow the same API contract.

---

## 8. DynamoDB Contract

The DynamoDB single-table schema defined in `PLAN.md` is authoritative.

Table:

`saans-main`

Do not introduce GSIs in P0.

Do not redesign partition keys, sort keys, or entity structures without owner approval.

---

## 9. Infrastructure Rules

Infrastructure must be defined through AWS SAM.

Use:

`template.yaml`

IAM must follow least privilege.

Do not use wildcard permissions such as:

`Action: "*"`

or

`Resource: "*"`

unless explicitly justified and approved.

AWS credentials must never be committed to the repository.

---

## 10. Security

Never:

- commit AWS access keys
- commit secrets
- hardcode credentials
- expose sensitive configuration
- create unnecessarily broad IAM permissions

Prefer secure AWS-native mechanisms defined by the project plan.

---

## 11. Testing

Tests are required for application logic.

The decision engine is the most important test area.

Before trusting changes:

- run tests
- inspect the diff
- verify behavior against `PLAN.md`

Do not claim a feature works without verification.

---

## 12. AI Agent Behavior

AI agents are implementation assistants, not architecture owners.

Do not:

- redesign the system
- optimize outside the requested milestone
- introduce speculative abstractions
- add unnecessary dependencies
- add services because they seem useful
- silently change contracts

If a better approach appears to conflict with `PLAN.md`, stop and ask.

---

## 13. Changes and Commits

Keep changes focused on the current milestone.

Do not modify unrelated files.

Prefer small, understandable commits.

Before completing a task, report:

1. Files changed
2. What was implemented
3. Tests/checks performed
4. Any unresolved issue
5. Any deviation from `PLAN.md`

---

## 14. Documentation

If an approved deviation from `PLAN.md` occurs, document it in:

`DECISIONS.md`

Do not silently change the architecture.

---

## 15. Working Rule

For every task:

1. Read the relevant part of `PLAN.md`.
2. Identify the current milestone.
3. Stay inside the assigned agent boundary.
4. Implement the smallest solution satisfying the contract.
5. Test it.
6. Review the diff.
7. Report what changed.

When uncertain:

STOP AND ASK.