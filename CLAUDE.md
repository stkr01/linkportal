# CLAUDE.md — LinkPortal

Guide för Claude Code som arbetar i det här repot. Håll det kort; djupare detaljer finns i de
länkade filerna.

## Vad är det här?

LinkPortal – intern länkkatalog för IT-Operations ("password manager för länkar"). Owner: Stefan
(stkr01). Repo: `https://github.com/stkr01/linkportal.git` (branch `main`).

| Lager | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Vite 7 + React Query + React Router (`frontend/`) |
| Backend | Node + Express + TypeScript + Prisma (`backend/`) |
| Databas | SQLite (en fil; `.env` och `*.db` är git-ignorerade) |
| Auth | JWT i HTTP-only cookie + Bearer, bcryptjs, RBAC (ADMIN/EDITOR/VIEWER) |
| Tillägg | Chrome/Edge MV3, vanilla JS (`extension/`) |

UI-språk: engelska. Dokumentation (README/BLUEPRINT) är på svenska.

## 🔴 Kör du på servern skzdev02? Börja här

Om du kör **lokalt på Ubuntu-servern skzdev02** och uppgiften är att driftsätta/publicera:

➡️ **Läs och följ [deploy/skzdev02/CLAUDE_DEPLOY.md](deploy/skzdev02/CLAUDE_DEPLOY.md)** — idempotent
steg-för-steg med skyddsregler (Tailscale Serve på `:443` → nginx `127.0.0.1:8090` → Node `:4010`).

Referens: [deploy/skzdev02/README.md](deploy/skzdev02/README.md). Generisk Ubuntu-guide (nginx + eget
cert) finns i [implementation.md](implementation.md).

## Utveckling lokalt (Windows)

Två terminaler:

```powershell
cd backend;  npm run dev    # API på http://localhost:4000
cd frontend; npm run dev    # webbapp på http://localhost:5173
```

- PowerShell kan blockera `npm.ps1` → använd `npm.cmd` / `npx.cmd`.
- Backend-setup första gången: `npm install; npx prisma generate; npx prisma migrate dev; npm run seed`.
- Seed-admin: `admin` (lösenord sätts via `SEED_ADMIN_PASSWORD`).

## Regler

- **Strikt MQL5? Nej** – det här är ett TS/Node-projekt. Använd projektets befintliga mönster.
- Kommentarer och UI på **engelska**.
- Ändra inte variabelnamn/konventioner som redan är satta utan att bli ombedd.
- Commita aldrig `.env`, `*.db`, `node_modules/`, `dist/` eller `extension-key.pem`.
- Kör Prisma (`generate`, `migrate deploy`) på den maskin koden ska köra på – kopiera aldrig
  `node_modules` mellan OS.
- I produktion: `prisma migrate deploy`, aldrig `migrate dev`.

## Var saker finns

| Område | Sökväg |
|--------|--------|
| Backend-källkod | `backend/src/` (routes, middleware, services, `server.ts`, `config.ts`) |
| Prisma-schema/migrations | `backend/prisma/` |
| Frontend-källkod | `frontend/src/` (pages, components, api, i18n) |
| Webbläsartillägg | `extension/` |
| Driftsättning (generisk) | `deploy/`, [implementation.md](implementation.md) |
| Driftsättning (skzdev02) | `deploy/skzdev02/` |
| Vision/datamodell | [BLUEPRINT.md](BLUEPRINT.md) |
