# QA

API tests for ordering, payments, bookings, accounts and Rewards (Node's built-in test runner, no installs needed).

1. Start the backend in test mode (the defaults in `backend/.env.example`: `PAYMENT_PROVIDER=test`, `EMAIL_PROVIDER=file`).
2. In this folder: `npm run test:api`

The tests create their own admin and staff accounts (`qa-admin@brewgrillz.test`, `qa-staff@brewgrillz.test`) with `backend/scripts/create-admin.js`, so use a local or test database, never live.

`02-payments.test.mjs` starts its own API on port 4002 in Stripe mode against a fake Stripe on port 4105, so no Stripe keys are needed.

Browser tests, speed (Lighthouse) and load tests (k6) are added in Sprint 6, like Ruchi.
