# Environment Security Runbook

This runbook defines how to protect, recover, and rotate environment secrets for TradeMatch.

## Scope

- API runtime env file: `apps/api/.env`
- Local backup file: `$HOME/.tradematch-secrets/api.env.backup`
- Guard script: `apps/api/scripts/ensure-env.sh`

## Current Safeguards

- `apps/api/.env` is ignored by git.
- API startup commands run an env guard before boot:
  - `npm run start`
  - `npm run start:local`
  - `npm run dev`
- Guard behavior:
  - If `apps/api/.env` exists and backup is missing, it creates backup.
  - If `apps/api/.env` is missing and backup exists, it restores automatically.
  - If both are missing, it fails fast.
- Permissions target: `600` for env files, `700` for backup directory.
- Immutable lock may be applied (`chattr +i`) to prevent accidental deletion.

## Daily Operations

### Verify protection status

```bash
ls -l apps/api/.env
ls -l "$HOME/.tradematch-secrets/api.env.backup"
lsattr apps/api/.env
lsattr "$HOME/.tradematch-secrets/api.env.backup"
```

Expected immutable flag in `lsattr` output: `i`

### Start API safely

```bash
cd apps/api
npm run dev
```

The guard script runs automatically before server startup.

## Recovery Procedure (Missing `.env`)

1. Run API start command or run guard directly:

```bash
cd apps/api
npm run env:ensure
```

2. Confirm file restored:

```bash
test -f apps/api/.env && echo "restored"
```

3. Re-apply immutable lock (if needed):

```bash
sudo chattr +i apps/api/.env
```

## Safe Edit Procedure

When `.env` is immutable, edits require temporary unlock.

Quick helper command:

```bash
cd apps/api
npm run env:rotate:prepare
```

1. Unlock:

```bash
sudo chattr -i apps/api/.env
```

2. Edit file.

3. Set secure permissions:

```bash
chmod 600 apps/api/.env
```

4. Re-lock:

```bash
sudo chattr +i apps/api/.env
```

Or finalize everything in one command after edits:

```bash
cd apps/api
npm run env:rotate:finalize
```

## Rotation Procedure (Required after any secret exposure)

Rotate all sensitive credentials in their providers first, then update `.env`:

- Database (`DATABASE_URL`)
- AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Stripe (`STRIPE_SECRET_KEY`, webhook secret)
- Resend (`RESEND_API_KEY`)
- OAuth providers (Google and Microsoft client secret)
- JWT secret (`JWT_SECRET`)
- Admin credentials (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- Any third-party API keys

After rotation:

1. Update `apps/api/.env` using safe edit procedure.
2. Force-create/refresh backup:

```bash
sudo chattr -i "$HOME/.tradematch-secrets/api.env.backup" 2>/dev/null || true
cp apps/api/.env "$HOME/.tradematch-secrets/api.env.backup"
chmod 600 "$HOME/.tradematch-secrets/api.env.backup"
sudo chattr +i "$HOME/.tradematch-secrets/api.env.backup"
```

3. Restart API and validate health:

```bash
cd apps/api
npm run start
```

## Hard Rules

- Never commit `.env` files.
- Never share secrets in tickets, chat, or screenshots.
- Use secret managers in production; `.env` is local/dev convenience only.
- If exposure is suspected, rotate first, investigate second.
