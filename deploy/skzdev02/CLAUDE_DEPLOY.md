# Uppdrag för Claude på skzdev02 — driftsätt LinkPortal

> Den här filen är skriven **för dig, Claude Code, som kör lokalt på Ubuntu-servern skzdev02**.
> Följ den uppifrån och ned. Den fullständiga referensen finns i [README.md](./README.md) i samma
> mapp — läs den vid behov, men stegen nedan är det du ska utföra.

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

# Verktyg som behövs
node -v 2>/dev/null || echo "Node saknas"
nginx -v 2>/dev/null || echo "nginx saknas"

# Krockar någon redan på våra loopback-portar?
sudo ss -ltnp | grep -E '127.0.0.1:(4010|8090)\b' || echo "4010/8090 lediga"
```

- Visar `tailscale serve status` redan `:443` → **stanna och fråga** människan (vi vill inte kapa
  en befintlig bindning).
- Saknas Node/nginx → installera i steg 4.1.

---

## 4. Engångsuppsättning

### 4.1 Node LTS + nginx (om de saknas)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node -v   # förvänta v22.x
```

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
# Seed ENDAST första gången (om databasen saknas). Kör inte om DB redan finns.
[ -f /opt/linkportal/data/linkportal.db ] || npm run seed
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
