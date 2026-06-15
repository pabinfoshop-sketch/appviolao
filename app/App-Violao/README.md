# Cifras App 🎸

App PWA de **cifras, acordes, repertórios, afinador, metrônomo e player de YouTube** para violão — com **assinatura mensal** via Mercado Pago.

## ✨ Features

- **Cifras** — busca e fetch de cifras (CifraClub, Cifralize), favoritos, categorias, export/import
- **Repertórios** — organize músicas por show, culto ou ocasião
- **Afinador cromático** + **Metrônomo visual** (StrumBar)
- **Player YouTube** integrado (original + playback lado a lado)
- **Backup em nuvem** para assinantes (sync entre dispositivos)
- **PWA instalável** com offline-first
- **Assinatura mensal R$ 24,90** via Mercado Pago (recorrente)
- **PIX avulso** (QR code dinâmico)

## 🏗️ Stack

- **Frontend:** React 18 + Vite, PWA (Service Worker, Manifest)
- **Backend:** Node.js 20, Express, better-sqlite3
- **Auth:** JWT + bcrypt + httpOnly cookies
- **Pagamento:** Mercado Pago (`/preapproval` recorrente + PIX dinâmico)
- **Deploy:** Fly.io (Docker + volume persistente)

## 🚀 Setup local

```bash
# Backend
cd backend
npm install
cp ../.env.example ../.env
# Edite .env com suas chaves
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173` (Vite) — proxy automático para `:3001`.

## 📦 Deploy no Fly.io

```bash
# 1) Instale o flyctl
#    macOS: brew install flyctl
#    win:   iwr https://fly.io/install.ps1 -useb | iex

# 2) Login
flyctl auth login

# 3) Primeira vez: crie a app
flyctl apps create cifras-app
flyctl volumes create cifras_data --size 1 --region gru

# 4) Configure os secrets (NÃO commite!)
flyctl secrets set \
  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")" \
  MP_ACCESS_TOKEN="APP_USR-..." \
  MP_PUBLIC_KEY="APP_USR-..." \
  --app cifras-app

# 5) Deploy
flyctl deploy

# 6) Abra
flyctl open
```

### Webhook do Mercado Pago

No painel do MP (`https://www.mercadopago.com.br/developers/panel/notifications/webhooks`):
- URL: `https://cifras-app.fly.dev/api/pagamento/webhook`
- Eventos: `Assinaturas` e `Pagamentos`

## 🔐 Segurança

- JWT em cookie httpOnly + sameSite=lax
- bcrypt com 10 rounds
- helmet, rate-limit, CORS restrito
- `JWT_SECRET` **obrigatório** (app não inicia se não tiver)
- Tokens de produção **nunca** commitados (revogue os que vazaram antes!)

## 📂 Estrutura

```
.
├── backend/
│   ├── src/
│   │   ├── index.js          # Express + helmet + rate-limit + rotas
│   │   ├── auth.js           # JWT, register, login, me
│   │   ├── mercadopago.js    # /preapproval, webhook, /pix, /cancel
│   │   └── db.js             # SQLite (better-sqlite3)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # UI principal
│   │   ├── components/       # SongView, Tuner, AuthModal, ...
│   │   └── utils/            # parser, chordDiagrams
│   ├── public/               # manifest, sw, icons
│   └── vite.config.js
├── Dockerfile                # build multi-stage
├── fly.toml                  # config Fly.io
├── .env.example
└── README.md
```

## ⚖️ Licença

© PauloC® — Uso pessoal.
