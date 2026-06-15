# Guia de Deploy — songpcmusic no Fly.io

## Pré-requisitos

Você precisa ter o `flyctl` instalado na sua máquina. Se não tiver:

```bash
# macOS / Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

---

## Passo 1 — Fazer login no Fly.io

```bash
flyctl auth login
```

Isso abrirá o navegador para autenticar. Se já estiver logado, pode pular.

---

## Passo 2 — Configurar as variáveis de ambiente (Secrets)

No painel do Fly.io, vá em **app-cifra → Secrets** e configure as seguintes variáveis. Ou use o terminal:

```bash
flyctl secrets set \
  MP_ACCESS_TOKEN="APP_USR-603250006316447-060123-a8bc821ba0c18f4701e712281a5f8555-471530148" \
  MP_PUBLIC_KEY="APP_USR-cc311df7-d562-4abf-ad96-5a2178aac635" \
  JWT_SECRET="cifras-secret-prod-2024" \
  DOMAIN="https://app-cifra.fly.dev" \
  PORT="3001" \
  --app app-cifra
```

> **Importante:** Esses valores já estão no seu arquivo `.env` local. Nunca os compartilhe publicamente.

---

## Passo 3 — Fazer o build do frontend

Antes de cada deploy, gere o build atualizado:

```bash
cd frontend
npm run build
cd ..
```

---

## Passo 4 — Fazer o deploy

O projeto usa o script `deploy-fly.js` que envia os arquivos diretamente para a API do Fly.io.

> **Atenção:** O token no `deploy-fly.js` pode ter expirado. Você precisa atualizar com o seu token atual.

### 4a. Atualizar o token no deploy-fly.js

1. Execute `flyctl auth token` no terminal para obter seu token atual
2. Abra o arquivo `deploy-fly.js` e substitua o valor da variável `TOKEN` na linha 21 pelo novo token

### 4b. Criar o arquivo .env na raiz do projeto

Crie um arquivo `.env` na raiz do projeto (onde está o `deploy-fly.js`) com o conteúdo:

```
PORT=3001
DOMAIN=https://app-cifra.fly.dev
MP_ACCESS_TOKEN=APP_USR-603250006316447-060123-a8bc821ba0c18f4701e712281a5f8555-471530148
MP_PUBLIC_KEY=APP_USR-cc311df7-d562-4abf-ad96-5a2178aac635
JWT_SECRET=cifras-secret-prod-2024
```

### 4c. Executar o deploy

```bash
node deploy-fly.js
```

O script irá:
1. Destruir as machines antigas
2. Empacotar o backend + frontend/dist
3. Criar uma nova machine com todos os arquivos

---

## Passo 5 — Verificar o deploy

Após o deploy, acesse:

- **App:** https://app-cifra.fly.dev
- **Health check:** https://app-cifra.fly.dev/api/health

Se o health check retornar `{"ok":true}`, o servidor está funcionando.

---

## Alternativa: Deploy via Dockerfile (mais robusto)

Se o `deploy-fly.js` não funcionar, use o Dockerfile com `flyctl`:

```bash
# Na raiz do projeto
flyctl deploy --app app-cifra
```

O `Dockerfile` na raiz já está configurado para:
1. Fazer o build do frontend (React/Vite)
2. Copiar o backend
3. Servir tudo na porta 3001

---

## Configurar o Webhook do Mercado Pago

Para que as assinaturas sejam ativadas automaticamente após o pagamento, configure o webhook no painel do Mercado Pago:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em **Webhooks → Configurar notificações**
3. URL do webhook: `https://app-cifra.fly.dev/api/pagamento/webhook`
4. Eventos: marque **Assinaturas (preapproval)** e **Pagamentos**

---

## Monitoramento

```bash
# Ver logs em tempo real
flyctl logs --app app-cifra

# Ver status das machines
flyctl status --app app-cifra

# Reiniciar o app
flyctl machine restart --app app-cifra
```

---

## Resumo das URLs importantes

| Recurso | URL |
|---|---|
| App (produção) | https://app-cifra.fly.dev |
| Health check | https://app-cifra.fly.dev/api/health |
| Webhook MP | https://app-cifra.fly.dev/api/pagamento/webhook |
| Painel Fly.io | https://fly.io/apps/app-cifra |
| Painel MP | https://www.mercadopago.com.br/developers |
