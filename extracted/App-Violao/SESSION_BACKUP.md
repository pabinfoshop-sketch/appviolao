# SESSION BACKUP — songpcmusic (App-Violao)

## Última conversa: 03/06/2026

---

## Deploy
- **URL:** https://app-cifra.fly.dev
- **Mercado Pago:** PRODUÇÃO (Access Token `APP_USR-*`)
- **Método:** Fly.io API Machines via `deploy-fly.js` (lê `.env` automaticamente com `loadEnv()`)

## Credenciais Produção (arquivo `.env`)
```
PORT=3001
DOMAIN=https://app-cifra.fly.dev
MP_ACCESS_TOKEN=APP_USR-603250006316447-060123-a8bc821ba0c18f4701e712281a5f8555-471530148
MP_PUBLIC_KEY=APP_USR-cc311df7-d562-4abf-ad96-5a2178aac635
JWT_SECRET=cifras-secret-prod-2024
```

## Credenciais Teste (anotadas pelo usuário)
- Public Key: `TEST-00d0bcf3-fbe5-44e5-83ca-b76cd8207eb4`
- Token: `TEST-603250006316447-060123-7235af6690560433b661876260881b19-471530148`
- Client ID: `603250006316447`
- Client Secret: `BUkz8UPvZ2ZjTyHFaZlcg4wr13ykX5VV`

## Features Implementadas (última sessão)

### 1. ★ Favoritar músicas
- **Arquivos:** `App.jsx`, `SongView.jsx`, `index.css`
- Campo `favorite: false` adicionado ao parser (`parser.js:115`)
- Botão ☆/★ no header do SongView (modos normal e músico)
- Filtro "só favoritas" na barra de busca (`showFavorites` state)
- Indicador ★ nos cards da lista
- Toggle via `handleToggleFavorite(id)` → `setSongs(prev => prev.map(...))`

### 2. 📤 Exportar cifra
- Botão "Exportar" no SongView header → chama `onExport` (prop)
- `handleShare` no App.jsx: Web Share API ou clipboard
- Passado como `onExport={handleShare}`

### 3. 🎸 Afinador cromático
- Componente `Tuner.jsx` já existia
- Botão 🎵 no header (desktop) + "Afinar" no menu ⋮ (mobile)
- States: `showTuner` + `closeTuner` callback

### 4. 🥁 Batida na cifra
- Ritmo + strum pattern + BPM sempre visíveis abaixo do cabeçalho
- CSS: `.song-rhythm-info`, `.strum-inline`, `.bpm-inline`
- StrumBar component separado com toggle

### 5. 💿 Backup
- **Arquivos:** `db.js`, `index.js` (backend) + `App.jsx` (frontend)
- **Local:** Exportar/Importar JSON (menu ⋮ → 💾 Exportar / 📂 Importar)
- **Cloud (Premium):** `/api/sync/save` + `/api/sync/load` (autenticado JWT)
  - `setUserData(email, { songs, setlists })` + `getUserData(email)`
- Dados salvos em `data/users.json`

## Estado Atual do Código

### Backend (`backend/src/`)
- `index.js`: Servidor Express, rotas de fetch (cifralize + cifraclub), audio search, sync endpoints
- `mercadopago.js`: Checkout, webhook, status (produção ativo)
- `auth.js`: Autenticação JWT (register/login)
- `db.js`: JSON-based storage (usuários + dados)

### Frontend (`frontend/src/`)
- `App.jsx`: Componente principal (~1214 linhas)
  - States: songs, setlists, currentSong, transpose, filter, viewMode, showFavorites, showTuner, showPremium, etc.
  - Handlers: handleAdd, handleDelete, handleSelect, handleShare, handleToggleFavorite, handleExportBackup, handleImportBackup, handleCloudSync, handleCloudRestore, handleSubscribe, handleAuth, etc.
- `SongView.jsx`: Exibição da cifra (modos normal + músico)
  - renderChordLine com dedup de acordes consecutivos
  - Export button, favorite button, rhythm info
- `Modal.jsx`: Adicionar música (importa detectKey)
- `Tuner.jsx`: Afinador cromático
- `YouTubePlayer.jsx`: Player YouTube sem tela preta
- `StrumBar.jsx`: Batida visual
- `ChordDiagram.jsx`, `chordDiagrams.js`: Diagramas de acorde + detectKey + simplifyChord
- `parser.js`: Parse de cifra + mergeChordsWithLyrics com dedup
- `index.css`: ~3226 linhas

### Deploy (`deploy-fly.js`)
- Lê `.env` via `loadEnv()` para evitar hardcode
- Machine: node:20-slim, 1CPU/256MB, região gru

## Pendências

1. **Chave PIX** em `App.jsx:1096` — trocar `paulocbueno@exemplo.com` pela chave real
2. **Domínio próprio** (opcional) — apontar DNS para Fly.io
3. **Distribuição APK** — se quiser sair do PWA (Play Store requer taxa anual)
4. **Adicionar mais cifras** ao repositório local
