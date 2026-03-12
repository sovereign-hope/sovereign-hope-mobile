# Admin Dashboard

This directory contains the web admin dashboard for Sovereign Hope Mobile.

It is a Vite + React + TypeScript app that lets admins:

- manage reading plans
- use Sunday quick-add flows
- view and manage member records

## Access Requirements

Admin routes are protected by Firebase Auth and custom claims. A signed-in user must have one of these claims:

- `isAdmin: true`
- `admin: true` (legacy compatibility)

To grant or remove admin access from the repository root:

```bash
npm run admin:set-admin -- --email "admin@example.com"
npm run admin:set-admin -- --email "admin@example.com" --remove
```

## Local Development

Install dependencies once before running admin commands:

From the repository root:

```bash
npm ci
npm --prefix admin ci
```

Or inside this directory:

```bash
npm ci
```

Then start the dev server.

From the repository root:

```bash
npm run admin:dev
```

Or directly inside this directory:

```bash
npm run dev
```

The local server starts on Vite's default port (`5173`) unless overridden.

## Build and Lint

From the repository root:

```bash
npm run admin:build
```

Inside this directory:

```bash
npm run build
npm run lint
```

## Deploy

From the repository root:

```bash
npm run admin:deploy
```

This builds the admin app and runs `firebase deploy --only hosting`.
