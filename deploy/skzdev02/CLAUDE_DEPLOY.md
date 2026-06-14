# Uppdrag för Claude på skzdev02 — driftsätt LinkPortal

> Den här filen är skriven **för dig, Claude Code, som kör lokalt på Ubuntu-servern skzdev02**.
> Följ den uppifrån och ned. Den fullständiga referensen finns i [README.md](./README.md) i samma
> mapp — läs den vid behov, men stegen nedan är det du ska utföra.

> **Är LinkPortal redan driftsatt här?** Då är det här en *uppdatering*, inte en nyinstallation —
> hoppa direkt till [avsnitt 9 (Uppdatering / re-deploy)](#9-uppdatering--re-deploy). Avsnitt 4–6 är
> engångsuppsättning och behöver normalt inte göras om.

---

## 0. Uppdrag

Driftsätt **LinkPortal** (Express/Prisma/SQLite-backend + React-frontend) på den här servern och
exponera den över HTTPS via **Tailscale Serve** på `https://skzdev02.tail898daf.ts.net/`. Bygg och
publicera även det självhostade Chrome/Edge-tillägget (signerad CRX + update-manifest).

Arbeta **idempotent**: kontrollera om något redan är gjort innan du gör om det. Stanna och fråga
människan när en åtgärd kräver en hemlighet eller är svår att ångra.

---

## 1. Hårda regler (bryt inte mot dessa)

- **Rör INTE** den befintliga todo-appen på port **9121**, dess `hermes`-process, eller någon
  annan tjänst du hittar. LinkPortal körs **parallellt** på egna portar.
- **Exponera aldrig** backend (`127.0.0.1:4010`) eller nginx (`127.0.0.1:8090`) utåt. Endast
  Tailscale Serve på `:443` ska vara nåbar. Öppna inga brandväggsportar.
- **Skriv aldrig hemligheter till git** eller till loggar. `.env` och `extension-key.pem` är
  git-ignorerade — håll det så.
- **Skriv inte över** en befintlig `/opt/linkportal/backend/.env` om den redan finns — fråga först.
- Kör Prisma (`generate`, `migrate deploy`) **på den här Linux-maskinen**. Kopiera aldrig
  `node_modules` från någon annan dator.
- Använd `prisma migrate deploy`, **aldrig** `migrate dev`, i produktion.
- Ändra **inte** källfilerna `extension/manifest.json` eller `extension/api.js`. Prod-värden
  injiceras automatiskt i byggkopior av paketeraren.

---

## 2. Ska vi dra ned allt från GitHub? — Ja

Hela repot klonas till `/opt/linkportal` (det är vad bygg-/uppdateringsskripten förutsätter):

- Remote: `https://github.com/stkr01/linkportal.git`
- Branch: `main`

**Innan du klonar:** testa om repot är publikt eller privat.

```bash
git ls-remote https://github.com/stkr01/linkportal.git >/dev/null 2>&1 \
  && echo "PUBLIC – klona direkt" \
  || echo "PRIVAT – kräver autentisering (deploy key eller PAT)"
```

Är det **privat**: stanna och be människan om en metod (read-only deploy key eller en
Personal Access Token). Försök inte gissa eller kringgå autentisering.

---

## 3. Förkontroller (kör först, ändra inget)

```bash
# Operativsystem + att vi är på rätt maskin
hostnamectl | sed -n '1,3p'
tailscale status | head -n 3                 # ska visa skzdev02 i tailnet:et

# Är port 443 redan upptagen i Tailscale Serve? (todo-appen ska ligga på 9121, inte 443)
sudo tailscale serve status

# Verktyg som behövs. Tjänsten kräver SYSTEM-Node på /usr/bin/node: unit-filen kör
# /usr/bin/node och ProtectHome=true döljer ev. Node i /home (t.ex. hermes egen).
/usr/bin/node -v 2>/dev/null || echo "System-Node (/usr/bin/node) saknas → installera i 4.1"
nginx -v 2>/dev/null || echo "nginx saknas"

# Krockar någon redan på våra loopback-portar?
sudo ss -ltnp | grep -E '127.0.0.1:(4010|8090)\b' || echo "4010/8090 lediga"
```

- Visar `tailscale serve status` redan `:443` → **stanna och fråga** människan (vi vill inte kapa
  en befintlig bindning).
- Visar `node -v` en Node under `/home` (t.ex. hermes egen) men `/usr/bin/node` saknas → tjänsten
  kan ändå inte nå den (`ProtectHome=true`). Installera **system-Node** i steg 4.1.
- Saknas Node/nginx → installera i steg 4.1.

---

## 4. Engångsuppsättning

### 4.1 Node LTS + nginx (om de saknas)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
# noninteractive: en väntande needrestart-/kernel-dialog ska inte stoppa installationen.
sudo DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get install -y nodejs nginx
/usr/bin/node -v   # förvänta v22.x (krävs av tjänsten + crx3 2.x)
```

> **Notis (reboot):** finns en väntande kernel-uppgradering rör du den **inte** här – rapportera
> bara till människan att en omstart rekommenderas vid tillfälle.

### 4.2 Tjänsteanvändare + kataloger

```bash
id linkportal &>/dev/null || sudo useradd --system --no-create-home --shell /usr/sbin/nologin linkportal
sudo mkdir -p /opt/linkportal /opt/linkportal/data /opt/linkportal/extension-dist
```

### 4.3 Klona koden

```bash
[ -d /opt/linkportal/.git ] || sudo git clone https://github.com/stkr01/linkportal.git /opt/linkportal
sudo git -C /opt/linkportal pull --ff-only
```

### 4.4 Backend: miljö, databas, bygg

```bash
cd /opt/linkportal/backend
npm ci
```

Skapa `.env` **endast om den saknas** (skriv inte över en befintlig):

```bash
if [ ! -f .env ]; then
  cp .env.production.example .env
  JWT=$(openssl rand -hex 48)
  # Generera JWT_SECRET automatiskt; resten redigeras nedan.
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
fi
```

Sätt sedan följande i `/opt/linkportal/backend/.env` (skzdev02-specifikt). `JWT_SECRET` är redan
ifylld ovan. **`SEED_ADMIN_PASSWORD` ska människan välja** — be om ett starkt engångslösenord och
låt hen klistra in det direkt i filen; eka det aldrig i terminalen.

```ini
PORT=4010
NODE_ENV=production
HOST=127.0.0.1
TRUST_PROXY=2
CORS_ORIGIN=https://skzdev02.tail898daf.ts.net
DATABASE_URL="file:/opt/linkportal/data/linkportal.db"
```

> **Varför `TRUST_PROXY=2`:** här finns två proxyhopp (Tailscale Serve → nginx). Med fel värde ser
> login-rate-limit alla användare som `127.0.0.1` och en enda användares felinloggningar låser ute
> alla. Detta måste vara `2` på den här servern.

Databas + bygg:

```bash
npx prisma generate
npx prisma migrate deploy

# Seed ENDAST vid första uppsättningen. `migrate deploy` skapar ALLTID .db-filen, så
# en fil-finns-koll triggar aldrig – räkna användare istället. seed.ts kör upsert och
# ÅTERSTÄLLER admin-lösenordet, så den får aldrig köras vid vanliga om-deployer.
USERS=$(node -e 'const{PrismaClient}=require("@prisma/client");new PrismaClient().user.count().then(n=>console.log(n)).catch(()=>console.log(0))')
if [ "$USERS" = "0" ]; then npm run seed; else echo "Användare finns redan ($USERS) – hoppar över seed."; fi

npm run build
```

### 4.5 Frontend: bygg statiska filer

```bash
cd /opt/linkportal/frontend
npm ci
npm run build      # -> frontend/dist
```

### 4.6 Rättigheter

```bash
sudo chown -R linkportal:linkportal /opt/linkportal
```

### 4.7 systemd-tjänst

```bash
sudo cp /opt/linkportal/deploy/linkportal.service /etc/systemd/system/linkportal.service
sudo systemctl daemon-reload
sudo systemctl enable --now linkportal
sleep 1
systemctl --no-pager status linkportal | head -n 8
journalctl -u linkportal -n 20 --no-pager   # ska visa "running on http://127.0.0.1:4010"
```

### 4.8 nginx (loopback 8090)

```bash
sudo cp /opt/linkportal/deploy/skzdev02/nginx-linkportal.conf /etc/nginx/sites-available/linkportal
sudo ln -sf /etc/nginx/sites-available/linkportal /etc/nginx/sites-enabled/linkportal
sudo nginx -t && sudo systemctl reload nginx
```

### 4.9 Tailscale Serve (HTTPS 443)

```bash
bash /opt/linkportal/deploy/skzdev02/tailscale-serve.sh
# = sudo tailscale serve --bg --https=443 http://127.0.0.1:8090
sudo tailscale serve status
```

> Klagar Tailscale på syntaxen (versionsskillnad): kör `tailscale serve --help` och anpassa, men
> behåll mappningen `https :443 -> http://127.0.0.1:8090`.

---

## 5. Verifiering (gör efter steg 4)

```bash
curl -fsS http://127.0.0.1:4010/api/health                     # backend direkt -> {"status":"ok",...}
curl -fsS http://127.0.0.1:8090/api/health                     # via nginx
curl -fsS https://skzdev02.tail898daf.ts.net/api/health        # via Tailscale+nginx
curl -fsSI https://skzdev02.tail898daf.ts.net/ | head -n 1     # ska ge 200 (frontend index.html)
```

Alla tre health-anrop ska ge `{"status":"ok",...}`. Rapportera resultatet till människan och be
hen logga in på `https://skzdev02.tail898daf.ts.net/` som `admin` och **byta lösenord direkt**.

---

## 6. Självhostat Chrome/Edge-tillägg (CRX)

```bash
cd /opt/linkportal/deploy/skzdev02/ext-packager
npm install
npm run build
```

Paketeraren skriver ut tilläggets **ID** och en policy-sträng, samt filer i `build/`. Publicera
dem där nginx serverar `/ext/`:

```bash
sudo cp build/linkportal.crx build/updates.xml /opt/linkportal/extension-dist/
sudo chmod 755 /opt/linkportal/extension-dist && sudo chmod 644 /opt/linkportal/extension-dist/*
curl -fsS https://skzdev02.tail898daf.ts.net/ext/updates.xml | head -n 5
```

**Viktigt om signeringsnyckeln:** `ext-packager/extension-key.pem` skapas första gången och avgör
tilläggets ID. Den är git-ignorerad. **Påminn människan att säkerhetskopiera den** (utanför servern)
— tappas den ändras ID:t och redan installerade klienter slutar auto-uppdatera.

**Utrullning på klienter** sker via Windows-policy (`build/policy-chrome.reg` / `policy-edge.reg`)
— det görs på Win11-klienterna, inte på den här servern. Lämna instruktionen till människan; se
[README.md](./README.md) avsnitt 5.3.

---

## 7. Vad du INTE ska göra själv (kräver människan)

- Välja/skriva `SEED_ADMIN_PASSWORD` och byta admin-lösenordet efter första inloggningen.
- Lämna ut autentisering om GitHub-repot är privat (deploy key / PAT).
- Säkerhetskopiera `extension-key.pem`.
- Köra `.reg`-policyfilerna på Windows-klienterna.
- Ta bort eller röra todo-appen, `hermes` eller andra befintliga tjänster.

---

## 8. Om något går fel

Se felsökningstabellen i [README.md](./README.md) avsnitt 7. Snabb sammanfattning:

| Symptom | Åtgärd |
|---------|--------|
| 502 på `…ts.net` | Backend nere → `journalctl -u linkportal -e`. Lyssnar den på `127.0.0.1:4010`? |
| Inloggning loopar | Inte HTTPS, eller `NODE_ENV` ≠ `production`. |
| Alla utelåsta vid felinloggning | `TRUST_PROXY` ej `2` → starta om tjänsten efter att ha rättat `.env`. |
| `tailscale serve status` saknar `:443` | Kör om `tailscale-serve.sh`; kolla att HTTPS-cert är på i admin-konsolen. |
| Prisma query-engine-fel | `node_modules` från fel OS → kör `npx prisma generate` här. |

När du är klar: sammanfatta för människan vad som gjordes, health-check-resultaten, tilläggets ID
och vad som återstår på hennes bord (lösenordsbyte, nyckel-backup, klientpolicy).

---

## 9. Uppdatering / re-deploy

Använd det här avsnittet när LinkPortal **redan är driftsatt** och du bara ska hämta ny kod. Det är
idempotent och säkert att köra om. Hoppa över avsnitt 4 (engångsuppsättning) såvida inte en
uppdatering uttryckligen kräver en ny env-variabel eller en ny migration (se 9.5).

### 9.1 Hämta ny kod

```bash
sudo git -C /opt/linkportal pull --ff-only
```

Vägrar pull pga lokala ändringar i en **spårad** fil → `sudo git -C /opt/linkportal status`.
Det enda kända säkra fallet är `deploy/skzdev02/ext-packager/package.json` (uppström har redan
`crx3 ^2.0.0`): `sudo git -C /opt/linkportal checkout -- deploy/skzdev02/ext-packager/package.json`
och pulla om. **Kasta inte** andra okända ändringar utan att titta — det kan vara pågående arbete.

> Genererade/ignorerade filer (`backend/version.json`, `.env`, `*.db`, `frontend/dist`,
> `ext-packager/build/`) ska **inte** dyka upp som spårade ändringar. Gör de det är något fel —
> undersök istället för att tvinga.

### 9.2 Bygg om

```bash
sudo -u linkportal APP_DIR=/opt/linkportal bash /opt/linkportal/deploy/deploy.sh
```

`deploy.sh` kör install → `prisma generate` → build → `prisma migrate deploy` → starta om tjänsten.
Versionsnumret genereras **automatiskt** av `prebuild`-hooken (`scripts/gen-version.mjs`) under
`npm run build` — inget eget steg behövs.

- ⚠️ **Seeda inte.** `seed.ts` återställer admin-lösenordet. `deploy.sh` seedar inte — kör inte
  `npm run seed` manuellt vid en uppdatering.
- ⚠️ **Rör inte `.env`** om inte 9.5 säger annat.
- `prisma migrate deploy` ska normalt säga *"No pending migrations"*. Listar den nya migrationer är
  det väntat **endast** om uppdateringen innehöll en schemaändring.

> **Känt skönhetsfel:** sista raden i `deploy.sh` gör en health-curl mot hårdkodad `:4000`. Här kör
> backend på `:4010`, så den raden "failar" ofarligt. Strunta i den — verifiera med 9.3 istället.

### 9.3 Verifiera versionen (kärnan i en uppdatering)

```bash
EXPECT=$(sudo git -C /opt/linkportal rev-parse --short HEAD)
curl -fsS https://skzdev02.tail898daf.ts.net/api/version
echo "förväntad commit: $EXPECT"
```

- `commit` i svaret ska vara lika med `$EXPECT`, och `display` ska se ut som `v1.0.0+<n>.<commit>`.
- `"dirty": true` (eller `-dirty` i `display`) → servern har ocommittade **spårade** ändringar.
  Undersök med `git status` innan du rapporterar klart; en ren deploy ska aldrig vara dirty.
- Kör samma `/api/version` lokalt/på dev-maskinen på samma commit → strängarna ska vara identiska.

Kör även de tre health-anropen från [avsnitt 5](#5-verifiering-gör-efter-steg-4) för att bekräfta
att tjänsten kom upp efter omstarten.

### 9.4 Tillägget (oftast inget att göra)

Den självhostade CRX:en auto-uppdateras bara om `extension/manifest.json` har fått en **ny
`version`**. Rena webb-/serveruppdateringar (som versionsfoten i popupen) kräver ingen ompaketering.
Är `manifest.json`-versionen bumpad: kör om avsnitt 6 (`ext-packager` → kopiera `crx` + `updates.xml`
till `extension-dist/`). Annars hoppa över.

### 9.5 Om uppdateringen kräver mer

- **Ny env-variabel:** lägg till den i `/opt/linkportal/backend/.env` (skriv inte över befintliga
  värden) enligt det uppdaterade `backend/.env.production.example`, starta sedan om:
  `sudo systemctl restart linkportal`.
- **Ny migration:** `prisma migrate deploy` i 9.2 applicerar den automatiskt. Backa aldrig en
  migration på prod-databasen utan att fråga människan; ta gärna en kopia av
  `/opt/linkportal/data/linkportal.db` först.

När du är klar: rapportera commit/version-strängen, health-check-resultaten och om tillägget
byggdes om.
