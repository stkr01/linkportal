# LinkPortal

> Intern länkkatalog för IT-Operations – en "Password Manager för länkar". Samla alla länkar till verktyg och plattformar på ett ställe, organiserade i ett kategoriträd, med inloggning och rollstyrning.

Se [BLUEPRINT.md](./BLUEPRINT.md) för vision, datamodell och funktionsöversikt.

## Teknik

| Lager | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Vite 7 + React Query + React Router |
| Backend | Node.js + Express + TypeScript + Prisma |
| Databas | SQLite (en fil) |
| Auth | JWT i HTTP-only cookie, bcrypt-hashade lösenord, RBAC |

## Funktioner (V1)

- 🔐 Inloggning med lokala konton (3 roller: **Admin**, **Editor**, **Viewer**).
- 🌳 Klickbart kategoriträd (skapas/hanteras endast av Admin).
- 🔗 Länk-CRUD: Name, URL, Kategori, Manage Software, Beskrivning, Miljö, Ägande team, Taggar.
- 🔎 Sökning + filter, samt **command palette** (Ctrl/Cmd+K) med fuzzy-sök.
- 🗑️ Soft delete – endast Admin får radera (posten döljs, kan återställas i DB).
- 📝 Audit-logg på alla ändringar.
- 👥 Användarhantering (Admin): skapa konton, byt roll, aktivera/inaktivera, återställ lösenord.
- 🔑 Tvingat lösenordsbyte vid första inloggning.

## Komma igång

Förutsätter att **Node.js** (LTS) är installerat.

> OBS: I PowerShell kan `npm.ps1` blockeras av execution policy. Använd då `npm.cmd` / `npx.cmd`, eller kör `Set-ExecutionPolicy -Scope Process Bypass`.

### 1. Backend

```powershell
cd backend
npm install
copy .env.example .env          # justera JWT_SECRET och seed-uppgifter
npx prisma generate
npx prisma migrate dev --name init
npm run seed                    # skapar admin + exempelkategorier
npm run dev                     # startar API på http://localhost:4000
```

### 2. Frontend (ny terminal)

```powershell
cd frontend
npm install
npm run dev                     # startar webbappen på http://localhost:5173
```

Öppna http://localhost:5173 och logga in med seed-kontot:

- Användarnamn: `admin`
- Lösenord: `ChangeMe123!` (måste bytas vid första inloggning)

## Projektstruktur

```
LinkPortal/
├─ BLUEPRINT.md          Design & brainstorm
├─ backend/              Express + Prisma API
│  ├─ prisma/            schema.prisma, migrations, seed.ts
│  └─ src/
│     ├─ routes/         auth, links, categories, users
│     ├─ middleware/     auth (JWT/RBAC), error
│     ├─ services/       audit-logg
│     └─ server.ts
└─ frontend/             React + Vite
   └─ src/
      ├─ pages/          Login, Dashboard, ChangePassword, AdminUsers
      ├─ components/     CategoryTree, LinkCard, LinkForm, CommandPalette
      ├─ api/            API-klient
      └─ auth/           AuthContext
```

## Roller (behörigheter)

| Åtgärd | Viewer | Editor | Admin |
|--------|:------:|:------:|:-----:|
| Se & söka länkar | ✅ | ✅ | ✅ |
| Skapa/redigera länk | ❌ | ✅ | ✅ |
| Radera länk | ❌ | ❌ | ✅ |
| Hantera kategorier | ❌ | ❌ | ✅ |
| Hantera användare | ❌ | ❌ | ✅ |

## Säkerhet

- Lösenord hashas med bcrypt (cost 12). Inga klartextlösenord lagras.
- JWT skickas i HTTP-only, SameSite-cookie (och stöds även som `Bearer` för framtida Chrome-tillägg).
- RBAC kontrolleras på servern (inte bara i UI).
- Rate limiting på login. Zod-validering på all indata. Parametriserade queries via Prisma.
- **Inför produktion:** sätt ett långt slumpmässigt `JWT_SECRET`, kör bakom HTTPS, och ta backup av `backend/prisma/linkportal.db`.

## Nästa steg (V2)

- Chrome-tillägg som läser `/api/links` och visar trädet i en popup (se BLUEPRINT avsnitt 11).
- Bulk-import (CSV/JSON), health-check av länkar, favoriter, SSO via Entra ID.
