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

## Funktioner

- 🔐 Inloggning med lokala konton (3 roller: **Admin**, **Editor**, **Viewer**).
- 🌳 Klickbart kategoriträd (skapas/hanteras endast av Admin).
- 🔗 Länk-CRUD: Name, URL, Kategori, Manage Software, Beskrivning, Miljö, Ägande team, Taggar.
- 🖼️ Valfri bild/logotyp per länk (miniatyr på kortet och stort uppe till höger i redigeringsformuläret; faller tillbaka på favicon eller begynnelsebokstav).
- 🔎 Sökning (✕-knapp och Esc rensar fältet) + filter på taggar och miljö, samt **command palette** (Ctrl/Cmd+K) med fuzzy-sök.
- 👁️ Tre listvyer som växlas fritt: **kort**, **detalj** (kompakt tabell) och **senast ändrad**. Egna vyer i menyn för **⭐ Favoriter**, **🆕 Senast tillagda** och **🔴 Övervakningslarm**.
- 🩺 **Övervakning / health-check** av länkar (HTTP/RDP/SSH): statusprick 🟢/🔴/⚪ med "senast lyckad"-tid, valfri extra-övervakning per länk och larm när en länk går upp → ner. Klicka på statuspricken för att testa direkt (Editor/Admin).
- ⭐ Favoriter – **personliga per användare**; var och en markerar sina egna länkar (★). Visas högst upp i både webappen och webbläsartillägget.
- 🗑️ **Soft delete med papperskorg** – endast Admin raderar (posten döljs från listor och sök). I vyn **🗑 Borttagna** kan admin **återställa** eller **radera permanent**.
- 🌍 **Flerspråkigt gränssnitt** (8 språk) med språkväljare i inställningar.
- 📝 Audit-logg på alla ändringar.
- 👥 Användarhantering (Admin): skapa konton, byt roll, aktivera/inaktivera, återställ lösenord.
- ⚙️ Inställningssida: **språk**, **färgtema per användare** (sparas på kontot), **antal "senast tillagda"** och **kategorihantering** (Admin: skapa/byt namn/flytta/radera).
- 🔑 Tvingat lösenordsbyte vid första inloggning.

## Senaste tillägg (juni 2026)

- **Övervakning & health-check:** statusprick med HTTP/port-koll, "senast lyckad"-tidpunkt (med sekunder), extra-övervakning per länk och vyn 🔴 Övervakningslarm. Klick på statuspricken kör ett test direkt – den gamla "Testa"-knappen är borttagen.
- **Soft delete + papperskorg:** raderade länkar hamnar i vyn 🗑 Borttagna (endast admin), där de kan återställas eller raderas permanent.
- **Tre listvyer** (kort/detalj/senast ändrad) med en kolumn för "senast lyckad".
- **Senast tillagda-vy:** visar de N nyaste länkarna (N ställs in i inställningar).
- **Flerspråkigt gränssnitt:** 8 språk med väljare i inställningar.
- **Sökfält:** ✕-knapp och Esc rensar sökningen.
- **Redigeringsformulär:** länkens logotyp visas högst upp till höger.
- **Produktionsdeploy:** komplett guide för Ubuntu (nginx + systemd) i [implementation.md](./implementation.md) och mappen `deploy/`.

## Komma igång

Förutsätter att **Node.js** (LTS) är installerat.

> OBS: I PowerShell kan `npm.ps1` blockeras av execution policy. Använd då `npm.cmd` / `npx.cmd`, eller kör `Set-ExecutionPolicy -Scope Process Bypass`.

### Snabbstart (när allt redan är installerat)

Starta de två servrarna i **varsin terminal**:

```powershell
# Terminal 1 – backend (API på http://localhost:4000)
cd backend
npm run dev

# Terminal 2 – frontend (webbapp på http://localhost:5173)
cd frontend
npm run dev
```

Öppna sedan http://localhost:5173 i webbläsaren.

> 💡 Se [Starta, stoppa och starta om tjänsterna](#starta-stoppa-och-starta-om-tjänsterna) för hur du **stoppar**, **startar om** och felsöker tjänsterna – samt produktionskommandon för systemd/nginx.

> **Så hänger delarna ihop:** I utveckling körs **två servrar** – frontend (Vite, port 5173) och backend (Express, port 4000). Vite proxar alla `/api`-anrop vidare till backend (se `frontend/vite.config.ts`), så webbläsaren pratar bara med 5173. Backend är **en enda process** som förutom REST-API:t även startar en intern schemaläggare för health-check/övervakning (`backend/src/services/scheduler.ts`) – ingen separat övervaknings­server behövs. Konfiguration (port, `JWT_SECRET`, `CORS_ORIGIN`, host) läses från `backend/.env` via `backend/src/config.ts`.

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
**Spara aktuell sida:** Editor/Admin ser en ➕-knapp i tillägget. Klicka på den för att spara fliken du har öppen – namn och URL fylls i automatiskt. Välj kategori, eller lämna den som **📥 Inbox (unsorted)** för att sortera in den senare i webappen.

**Kortkommando:** popup-fönstret kan öppnas med `Ctrl + Shift + L` (Mac: `Cmd + Shift + L`), men **du måste oftast aktivera genvägen själv en gång** – Chrome/Edge sätter bara ett *förslag* som inte binds automatiskt vid installation. Gör så här:

1. Öppna `chrome://extensions/shortcuts` (Edge: `edge://extensions/shortcuts`).
2. Hitta **LinkPortal** → raden *Open LinkPortal*, klicka i fältet och tryck `Ctrl + Shift + L`.
3. Vill du att genvägen ska funka även när webbläsaren inte är i fokus: ställ omfånget på **Global** (annars **I Chrome/Edge**).

Är kombinationen upptagen av ett annat tillägg tilldelas den inte – välj då en annan, t.ex. `Alt + Shift + L`.
> Ikonerna i `extension/icons/` genereras av `extension/make-icons.js` (`node make-icons.js`). Vill du peka tillägget mot en annan server än localhost ber det automatiskt om host-behörighet.

## Starta, stoppa och starta om tjänsterna

### Tjänsterna i korthet

| Tjänst | Kommando (dev) | Port | Stoppa |
|--------|----------------|:----:|--------|
| **Backend** – Express + Prisma API (kör även health-check-schemaläggaren) | `npm run dev` i `backend/` | 4000 | `Ctrl + C` i terminalen |
| **Frontend** – Vite dev-server (webbappen) | `npm run dev` i `frontend/` | 5173 | `Ctrl + C` i terminalen |

> Health-check/övervakningen är **ingen egen tjänst** – den startas inuti backend-processen (`backend/src/services/scheduler.ts`). Stoppar du backend stoppas även övervakningen. Webbläsartillägget körs i Chrome/Edge och behöver inte startas eller stoppas separat.

### Starta (utveckling)

Starta de två servrarna i **varsin terminal**:

```powershell
# Terminal 1 – backend (API på http://localhost:4000)
cd backend
npm run dev

# Terminal 2 – frontend (webbapp på http://localhost:5173)
cd frontend
npm run dev
```

Öppna sedan http://localhost:5173. (Första gången behöver beroenden och databasen sättas upp – se [Komma igång](#komma-igång).)

> PowerShell-tips: blockeras `npm.ps1` av execution policy, använd `npm.cmd run dev` / `npx.cmd …`, eller kör `Set-ExecutionPolicy -Scope Process Bypass` en gång i terminalen.

### Stoppa

- **Normalt:** tryck `Ctrl + C` i varje terminal som kör `npm run dev`. Backend (och därmed övervakningen) respektive frontend stängs direkt.
- **Stäng alltid backend innan du kopierar eller synkar databasen** – annars kan `backend/prisma/linkportal.db` låsas eller bli korrupt.

**Om en server hänger kvar (föräldralös process på porten)** – stoppa via porten i PowerShell:

```powershell
# Stoppa det som lyssnar på backend-porten (4000)
Get-NetTCPConnection -LocalPort 4000 -State Listen |
  Select-Object -Expand OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }

# Samma för frontend-porten (5173)
Get-NetTCPConnection -LocalPort 5173 -State Listen |
  Select-Object -Expand OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

> Detta dödar processen som äger porten – kör bara om du vet att det är LinkPortals dev-server (t.ex. en kvarhängande `node` / `ts-node-dev`).

### Starta om

Snabbast: `Ctrl + C` i terminalen och kör `npm run dev` igen.

- **Backend** startar normalt om sig själv när du sparar en `.ts`-fil (`ts-node-dev --respawn`). En full omstart behövs t.ex. efter `npx prisma generate` eller ändrad `.env`.
- **Frontend** (Vite) har hot reload och behöver sällan startas om manuellt – men startar om automatiskt om du ändrar `vite.config.ts`.

### Kontrollera att tjänsterna är uppe

```powershell
# Backend ska svara 200 med {"status":"ok"}
Invoke-WebRequest http://localhost:4000/api/health -UseBasicParsing | Select-Object StatusCode, Content

# Frontend ska svara 200
Invoke-WebRequest http://localhost:5173 -UseBasicParsing | Select-Object StatusCode

# Vilka av portarna lyssnar just nu?
Get-NetTCPConnection -LocalPort 4000,5173 -State Listen
```

### Produktion (Ubuntu: systemd + nginx)

I produktion körs backend som **systemd-tjänsten `linkportal`** och frontend serveras statiskt av **nginx** (se [implementation.md](./implementation.md)).

```bash
# Backend (Node-tjänsten)
sudo systemctl start linkportal      # starta
sudo systemctl stop linkportal       # stoppa
sudo systemctl restart linkportal    # starta om (t.ex. efter deploy)
sudo systemctl status linkportal     # status
journalctl -u linkportal -f          # följ loggen

# nginx (TLS + statisk frontend + /api-proxy)
sudo nginx -t                        # testa config innan omläsning
sudo systemctl reload nginx          # läs om config utan avbrott
sudo systemctl restart nginx         # full omstart
```

> `deploy/deploy.sh` gör hela kedjan automatiskt: hämtar koden, bygger frontend, kör `prisma migrate deploy`, startar om `linkportal` och kör en avslutande health-check.

## Projektstruktur

```
LinkPortal/
├─ BLUEPRINT.md          Design & brainstorm
├─ implementation.md     Produktionsdeploy-guide (Ubuntu: nginx + systemd)
├─ deploy/               deploy.sh, linkportal.service (systemd), nginx-linkportal.conf
├─ backend/              Express + Prisma API (en process, port 4000)
│  ├─ prisma/            schema.prisma, migrations, seed.ts
│  └─ src/
│     ├─ routes/         auth, categories, links, tags, users, settings
│     ├─ middleware/     auth (JWT/RBAC), error
│     ├─ services/       audit, healthcheck, scheduler (övervakning), settings
│     ├─ auth/           jwt.ts (signering/verifiering)
│     ├─ config.ts       env-läsning · constants.ts · db.ts (Prisma-klient)
│     └─ server.ts       Express-appen + startar health-check-schedulern
└─ frontend/             React + Vite (dev-server port 5173, proxar /api → 4000)
   └─ src/
      ├─ pages/          Login, Dashboard, ChangePassword, AdminUsers, Settings
      ├─ components/     CategoryTree, LinkCard, LinkList, LinkListEdited, TrashList, LinkForm, HealthDot, CommandPalette, MultiSelectDropdown
      ├─ i18n/           en.ts (huvudordbok) + sv/es/sl/de/no/da/pt + index.tsx (provider + useTranslation)
      ├─ api/            API-klient (axios, baseURL /api)
      └─ auth/           AuthContext

extension/               Chrome/Edge-tillägg (Manifest V3, vanilla JS)
├─ manifest.json
├─ popup.html/.css/.js   Popup med favoriter + kategoriträd
├─ options.html/.js      Inställningar (server-URL, logga in/ut)
├─ api.js                Delad API-hjälpare (Bearer-token)
└─ icons/                Genereras av make-icons.js
```

## Språk & översättning (i18n)

Webbappen finns på **8 språk** – engelska (standard), svenska, spanska, slovenska, tyska, norska, danska och portugisiska – och språket väljs i **Inställningar**. Allt bygger på en lättviktig i18n-grund så att fler språk kan läggas till utan att röra komponenterna. All synlig text hämtas via funktionen `t('nyckel')` i stället för hårdkodade strängar.

### Var språkfilerna ligger

| Fil | Roll |
|-----|------|
| `frontend/src/i18n/en.ts` | **Språkordbok** – ett platt objekt med all text, med punktade nycklar (t.ex. `'login.signIn'`). Exporterar även typen `TranslationKey`. |
| `frontend/src/i18n/index.tsx` | Motorn: `LanguageProvider`, hooken `useTranslation()`, själva `t()`-funktionen, platshållar-interpolation och val av aktivt språk (sparas i `localStorage` under nyckeln `linkportal.lang`). |

> Backend och webbläsartillägget har **ingen** i18n-motor – där ligger texterna direkt på engelska (backend returnerar engelska felmeddelanden, tillägget har engelsk UI). Endast React-webappen använder ordböckerna.

### Hur ordboken ser ut

Varje rad är en **nyckel → text**. Nyckeln är typad, så TypeScript varnar direkt om du stavar fel eller använder en nyckel som inte finns.

```ts
// frontend/src/i18n/en.ts
export const en = {
  'common.save': 'Save',
  'login.signIn': 'Sign in',
  'dashboard.deleteConfirm': 'Delete the link "{{name}}"? Only an admin can do this.',
  // …fler nycklar
} as const;

export type TranslationKey = keyof typeof en;
```

### Använda text i en komponent

```tsx
import { useTranslation } from '../i18n';

function SaveButton() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;
}
```

**Platshållare** skrivs som `{{namn}}` i ordboken och fylls i med ett andra argument:

```tsx
t('dashboard.deleteConfirm', { name: link.name })
// → Delete the link "vCenter"? Only an admin can do this.
```

Saknas en nyckel i det valda språket faller `t()` tillbaka på engelska, och i sista hand på själva nyckeln – appen kraschar alltså aldrig av en glömd översättning.

### Lägga till ett nytt språk (exempel: svenska)

1. **Kopiera ordboken:** `frontend/src/i18n/en.ts` → `sv.ts`. Behåll **alla nycklar** exakt, översätt bara **värdena**.
2. **Registrera språket** i `frontend/src/i18n/index.tsx`:
   ```ts
   import { sv } from './sv';
   export type Lang = 'en' | 'sv';                                  // lägg till koden
   const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, sv };
   ```
3. **Lägg till en språkväljare** i UI:t (t.ex. på inställningssidan) som anropar `setLang('sv')` från `useTranslation()`. Det valda språket sparas automatiskt i `localStorage` och gäller vid nästa besök.

Standardspråket styrs av `DEFAULT_LANG` i `index.tsx` (just nu `'en'`). En ny ordbok måste innehålla **samtliga** nycklar från `en.ts`, annars klagar TypeScript – det är med flit, så inget glöms bort.

## Övervakning & larm (health-check)

LinkPortal kan **automatiskt övervaka** att länkarna svarar och **larma** när en länk slutar fungera. Allt sköts av en intern schemaläggare i backend (`backend/src/services/scheduler.ts` + `healthcheck.ts`) – ingen separat övervakningsserver behövs.

### Vad som kontrolleras

| Schema | Metod | Räknas som UP |
|--------|-------|---------------|
| `http://` / `https://` | HTTP **HEAD**-anrop | **Vilket svar som helst** (även 401/403/500) – bara nätfel/timeout = DOWN |
| `rdp://` / `ssh://` | TCP-portkoll (öppnar en socket mot porten) | Porten **öppen** = UP · nekad/timeout = DOWN |
| Andra scheman / ogiltig URL | – | Testas inte → status **UNKNOWN** ⚪ |

- Standardportar om ingen anges: `rdp` → 3389, `ssh` → 22, `http` → 80, `https` → 443. En explicit port i URL:en (t.ex. `rdp://host:3390`) används i stället.
- HTTPS: självsignerade interna cert accepteras, inga redirects följs, ingen body läses och inga inloggningsuppgifter skickas.
- Timeout per test: **5 sek** (kan ändras av Admin).

### Status & färger

| Prick | Status | Betydelse |
|:-----:|--------|-----------|
| 🟢 | UP | Senaste kontrollen lyckades |
| 🔴 | DOWN | Senaste kontrollen misslyckades |
| ⚪ | UNKNOWN | Aldrig testad, eller ett schema som inte kan testas |
| 🟠 | – | **Övervakning avstängd** för länken (`doNotMonitor`) |

Håll muspekaren över pricken för detaljer (status, senaste kontroll, "senast lyckad", HTTP-kod, svarstid). I detaljvyn blir kolumnen **Last successful** dessutom **röd och fet** när länken larmar (DOWN).

### När den kontrollerar (och inte)

- **Bas-svep:** alla länkar testas **var 4:e timme** (Admin-inställningen `healthCheckIntervalHours`). Ett första svep körs ca **10 sek efter serverstart**.
- **Extra-övervakning:** sätt `extraMonitor` på en enskild länk för att testa den oftare, på sitt egna minut-intervall (1–1440 min). Schemaläggaren tittar **var 30:e sekund** efter vilka extra-länkar som är "due".
- **Testas aldrig:**
  - Länkar markerade **Do Not Monitor** (`doNotMonitor = true`) – visar alltid 🟠, har ingen testknapp, och ev. aktivt larm nollställs.
  - **Borttagna** länkar (de som ligger i papperskorgen).
  - Allt, om den globala inställningen är avstängd (`healthCheckEnabled = false`).
- **Manuellt test (Editor/Admin):** klicka på statuspricken för att testa **en** länk direkt, eller kör "testa alla" för att svepa nu. Länkar med Do Not Monitor hoppas över även här.

### Hur larmet fungerar

Varje länk har en larmflagga (`alertActive`). Larmet styrs av **övergången** mellan två kontroller:

- 🟢 → 🔴 (var UP, blev DOWN): **larm slås på** (`alertActive = true`).
- ⟶ 🟢 (en kontroll lyckas igen): **larm nollställs** automatiskt – länken har återhämtat sig.
- Markeras länken som **Do Not Monitor**: ev. larm nollställs.

> Larmet utlöses alltså bara på själva **fallet från grönt till rött**. En länk som redan var ⚪ UNKNOWN och blir 🔴 DOWN slår *inte* på larmet. Länkar med aktivt larm listas i vyn **🔴 Övervakningslarm**.

### "Senast lyckad" (Last successful)

Tidpunkten `lastUpAt` uppdateras **bara när en kontroll lyckas** (UP). Den ligger kvar även om länken senare går ner – så du ser när länken **senast** fungerade, även mitt under ett pågående larm.

### Historik & inställningar (Admin)

Varje UP/DOWN-kontroll sparas som en historikrad (UNKNOWN sparas inte), och gammal historik städas automatiskt var 6:e timme.

| Inställning | Standard | Vad den styr |
|-------------|:--------:|--------------|
| `healthCheckEnabled` | `true` | Slår på/av all automatisk övervakning |
| `healthCheckIntervalHours` | `4` | Hur ofta bas-svepet kör (timmar) |
| `healthCheckTimeoutSec` | `5` | Timeout per test (sekunder) |
| `healthRetentionDays` | `30` | Hur länge historiken sparas (dygn) |

### Säkerhet (SSRF-skydd)

Health-checken vägrar testa molnens metadata-endpoint (`169.254.169.254`) och loopback (`127.0.0.1`, `localhost`, `::1`) – de ger status UNKNOWN. Interna IP-adresser är **medvetet tillåtna**, eftersom portalen är till för just interna länkar.

## RDP-länkar (Remote Desktop) & andra scheman

Portalen lagrar **bara en URL-sträng** per länk – ingen fil. Valideringen kräver att URL:en har ett **schema**, men begränsar det inte till `http`/`https`. Därför går det bra att spara t.ex.:

| Exempel | Funkar att spara |
|---------|:----------------:|
| `https://vcenter.intern` | ✅ |
| `rdp://10.0.0.5` eller `rdp://server01` | ✅ |
| `rdp://10.0.0.5:3390` (med port) | ✅ |
| `ssh://host` · `vnc://1.2.3.4` | ✅ |
| `server01` / `10.0.0.5` (utan schema) | ❌ – schema krävs |

> Webappen renderar länken som en vanlig `<a href="rdp://…">`, så klicket skickas vidare till operativsystemets protokollhanterare.

### Detta måste göras på klient-PC:n för att `rdp://` ska starta Fjärrskrivbord

Windows har **ingen `rdp://`-hanterare som standard** – ett klick gör därför ingenting förrän ett protokoll-schema registreras på datorn. Det är en **engångsåtgärd per PC** (eller utrullat via GPO/Intune för hela organisationen).

Kör följande i PowerShell. Det registrerar `rdp://` **per användare (kräver ingen admin)** och skapar en liten wrapper som plockar bort `rdp://` och startar `mstsc`:

```powershell
# --- Installera rdp:// -> mstsc handler (per användare, ingen admin) ---
$dir     = Join-Path $env:LOCALAPPDATA 'LinkPortal'
$wrapper = Join-Path $dir 'rdp-launch.cmd'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# Wrapper som strippar "rdp://" + ev. avslutande "/" och startar mstsc
@'
@echo off
set "h=%~1"
set "h=%h:rdp://=%"
set "h=%h:/=%"
start "" mstsc.exe /v:"%h%"
'@ | Set-Content -Path $wrapper -Encoding ASCII

# Registrera schemat i HKCU (ingen admin behövs)
New-Item -Path 'HKCU:\Software\Classes\rdp' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\rdp' -Name '(default)'    -Value 'URL:RDP Protocol'
Set-ItemProperty -Path 'HKCU:\Software\Classes\rdp' -Name 'URL Protocol' -Value ''
New-Item -Path 'HKCU:\Software\Classes\rdp\shell\open\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\rdp\shell\open\command' -Name '(default)' -Value ('"' + $wrapper + '" "%1"')

Write-Host "Klart! rdp:// -> $wrapper" -ForegroundColor Green
```

**Testa:** spara en länk som `rdp://10.0.0.5` (eller `rdp://server01`) och klicka på den → webbläsaren frågar *"Öppna Anslutning till fjärrskrivbord?"* → `mstsc` startar mot rätt host.

**Ta bort igen:**

```powershell
Remove-Item -Path 'HKCU:\Software\Classes\rdp' -Recurse -Force
```

### Samma sak för `ssh://` (SSH-klient)

Exakt samma princip, med en skillnad: `ssh` är ett **konsolprogram** och behöver ett terminalfönster (till skillnad från `mstsc` som har eget GUI). Windows inbyggda OpenSSH-`ssh` förstår dessutom URI-formen `ssh://[user@]host[:port]` direkt, så wrappern blir enkel:

```powershell
# --- Installera ssh:// -> ssh-klient (per användare, ingen admin) ---
$dir     = Join-Path $env:LOCALAPPDATA 'LinkPortal'
$wrapper = Join-Path $dir 'ssh-launch.cmd'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# Wrapper: ta bort ev. avslutande "/" och öppna ssh i ett fönster som stannar kvar
@'
@echo off
set "u=%~1"
if "%u:~-1%"=="/" set "u=%u:~0,-1%"
start "" cmd /k ssh "%u%"
'@ | Set-Content -Path $wrapper -Encoding ASCII

# Registrera schemat i HKCU (ingen admin behövs)
New-Item -Path 'HKCU:\Software\Classes\ssh' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\ssh' -Name '(default)'    -Value 'URL:SSH Protocol'
Set-ItemProperty -Path 'HKCU:\Software\Classes\ssh' -Name 'URL Protocol' -Value ''
New-Item -Path 'HKCU:\Software\Classes\ssh\shell\open\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\ssh\shell\open\command' -Name '(default)' -Value ('"' + $wrapper + '" "%1"')

Write-Host "Klart! ssh:// -> $wrapper" -ForegroundColor Green
```

Då funkar `ssh://server01`, `ssh://admin@10.0.0.5` och `ssh://admin@10.0.0.5:2222` (ssh tolkar user/host/port själv).

**Krav:** OpenSSH-klienten (`ssh.exe`) måste finnas. På Win10/11 är den oftast redan på – annars: *Inställningar → Appar → Valfria funktioner → OpenSSH Client*. Vill du hellre använda **PuTTY**, byt sista wrapper-raden mot `start "" putty.exe "%u%"` (PuTTY öppnar eget fönster och förstår `ssh://`-URI:er).

**Ta bort igen:**

```powershell
Remove-Item -Path 'HKCU:\Software\Classes\ssh' -Recurse -Force
```

### Utrullning i hela organisationen

- Lägg samma nycklar under `HKLM:\Software\Classes\rdp` (och `HKLM:\Software\Classes\ssh`) (kräver admin) eller rulla ut via **GPO/Intune**.
- Slipp klick-prompten i Edge/Chrome med policyn **`AutoLaunchProtocolsFromOrigins`** (tillåt schemana `rdp` och `ssh` från portalens URL).

### Säkerhet

Hostnamnet skickas citerat till `mstsc /v:"…"` och alla `/` strippas, så en länk kan inte injicera extra växlar. Aktivera ändå bara detta för **betrodda interna länkar** – vem som helst som kan skapa en `rdp://`-länk kan annars få klienten att försöka ansluta någonstans. Samma princip gäller om du registrerar hanterare för `ssh://`, `vnc://` m.fl.

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

## Nästa steg

- ✅ Chrome/Edge-tillägg som läser `/api/links` och visar trädet i en popup.
- ✅ Favoriter, personliga per användare (visas högst upp).
- ✅ Snabbspara aktuell flik från tillägget (kategori eller 📥 Inbox).
- ✅ Health-check / övervakning av länkar (HTTP/RDP/SSH) med övervakningslarm.
- ✅ Flerspråkigt gränssnitt (8 språk).
- ✅ Produktionsdeploy på Ubuntu (nginx + systemd) – se [implementation.md](./implementation.md) och `deploy/`.
- ⬜ Bulk-import (CSV/JSON), SSO via Entra ID, versionshistorik per länk.

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

