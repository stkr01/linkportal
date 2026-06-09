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
- 🖼️ Valfri bild/logotyp per länk (visas som miniatyr på kortet; faller tillbaka på favicon eller begynnelsebokstav).- 🔎 Sökning + filter, samt **command palette** (Ctrl/Cmd+K) med fuzzy-sök.
- ⭐ Favoriter – **personliga per användare**; var och en markerar sina egna länkar (★). Visas högst upp i både webappen och webbläsartillägget.
- 🗑️ Soft delete – endast Admin får radera (posten döljs, kan återställas i DB).
- 📝 Audit-logg på alla ändringar.
- 👥 Användarhantering (Admin): skapa konton, byt roll, aktivera/inaktivera, återställ lösenord.
- ⚙️ Inställningssida: **färgtema per användare** (sparas på kontot) och **kategorihantering** (Admin: skapa/byt namn/flytta/radera).
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

### 3. Webbläsartillägg (Chrome & Edge)

Tillägget ligger i mappen `extension/` och fungerar i **både Chrome och Edge** (Manifest V3). Det kräver ingen byggprocess.

**Installera (ladda som uppackat tillägg):**

1. Se till att backend körs (http://localhost:4000).
2. Chrome: öppna `chrome://extensions` · Edge: öppna `edge://extensions`.
3. Slå på **Utvecklarläge** (Developer mode).
4. Klicka **Läs in uppackat** (Load unpacked) och välj mappen `extension/`.
5. Klicka på LinkPortal-ikonen i verktygsfältet → ange server-URL + logga in.

**Använda:** Klicka på ikonen → favoriter visas högst upp, därunder kategoriträdet. Klicka på en länk så öppnas den i en ny flik. 🔄 uppdaterar listan, 🔎 söker, ⚙️ öppnar inställningar (server-URL, logga ut).
**Spara aktuell sida:** Editor/Admin ser en ➕-knapp i tillägget. Klicka på den för att spara fliken du har öppen – namn och URL fylls i automatiskt. Välj kategori, eller lämna den som **📥 Inkorg (osorterat)** för att sortera in den senare i webappen.
> Ikonerna i `extension/icons/` genereras av `extension/make-icons.js` (`node make-icons.js`). Vill du peka tillägget mot en annan server än localhost ber det automatiskt om host-behörighet.

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

extension/               Chrome/Edge-tillägg (Manifest V3, vanilla JS)
├─ manifest.json
├─ popup.html/.css/.js   Popup med favoriter + kategoriträd
├─ options.html/.js      Inställningar (server-URL, logga in/ut)
├─ api.js                Delad API-hjälpare (Bearer-token)
└─ icons/                Genereras av make-icons.js
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

- ✅ Chrome/Edge-tillägg som läser `/api/links` och visar trädet i en popup.
- ✅ Favoriter, personliga per användare (visas högst upp).
- ✅ Snabbspara aktuell flik från tillägget (kategori eller 📥 Inkorg).
- Bulk-import (CSV/JSON), health-check av länkar, SSO via Entra ID.

## Flytta / synka projektet till en annan dator

### Alternativ A – via Git (rekommenderas för koden)

```powershell
git clone https://github.com/stkr01/linkportal.git   # första gången
# eller, om du redan har repot:
git pull origin main
```

Installera sedan beroenden och sätt upp databasen på den nya datorn:

```powershell
# Backend
cd backend
npm install
copy .env.example .env        # om .env saknas
npx prisma migrate dev        # skapar/uppdaterar SQLite-databasen
npm run seed                  # admin + exempeldata
npm run dev

# Frontend (ny terminal)
cd frontend
npm install
npm run dev
```

> Databasen (`backend/prisma/linkportal.db`) och `.env` ligger **inte** i Git. Via Git får
> hemmamaskinen alltså en färsk databas (admin / `ChangeMe123!`) – ditt bytta lösenord,
> dina favoriter och egna länkar följer **inte** med.

### Alternativ B – kopiera hela mappen (t.ex. på USB-sticka)

Kopierar du hela mappen följer **allt** med, även det Git utelämnar:

- ✅ Databasen `backend/prisma/linkportal.db` (användare, bytt lösenord, favoriter, länkar, bilder)
- ✅ `.env` med `JWT_SECRET` och seed-inställningar
- ✅ All källkod, migrationer, tillägget, README

**Tänk på:**

1. **Stäng dev-servrarna först.** Stoppa `npm run dev` (backend + frontend) innan du kopierar –
   annars kan SQLite-filen vara låst/halvskriven och bli korrupt.
2. **Hoppa över `node_modules`.** De är stora och plattformsspecifika. Kör hellre `npm install`
   på den nya datorn (i både `backend/` och `frontend/`).
3. **OneDrive-sökväg:** se till att filerna är fullt nedladdade (inte moln-platshållare) innan du kopierar.

### Alternativ C – Git för koden + kopiera bara din data

Smidigast om du vill ha med ditt innehåll utan att släpa med tunga `node_modules`:

1. Synka koden hemma med `git pull origin main`.
2. Kopiera **bara** `backend/prisma/linkportal.db` och `backend/.env` via stickan.
3. Kör `npm install` i `backend/` och `frontend/`.

