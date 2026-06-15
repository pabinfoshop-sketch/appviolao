# Status do Projeto: App de Violão (songpcmusic)

## 1. O que já está pronto

### Backend (Node.js + Express)
- Servidor Express rodando com suporte a rotas de API e servindo os arquivos estáticos do frontend.
- Autenticação via JWT com registro, login e endpoints protegidos (`auth.js`).
- Banco de dados em JSON local (`db.js`) armazenando usuários e dados sincronizados.
- Integração com Mercado Pago já implementada (`mercadopago.js`), com rotas para `/checkout` e webhook (`/webhook`) para aprovação de pagamentos e assinaturas.
- Rota para buscar cifras de sites externos (cifraclub/cifralize).
- Sincronização em nuvem para usuários Premium (salvar e carregar repertórios/músicas).

### Frontend (React + Vite)
- Interface de PWA bem estruturada.
- Funcionalidades do App:
  - **Músicas e Repertórios:** Listagem, filtro, adicionar, remover, criar repertórios.
  - **Visualização de Cifra:** Modos normal e músico, afinador, metrônomo visual (StrumBar), e transposição de tom.
  - **Autenticação:** Modais de login e registro, controle de estado do usuário.
  - **Premium:** Modal "Apoiar o App" com opções de assinatura e chave PIX manual.

### Deploy
- Arquivos de deploy para Fly.io configurados (`fly.toml`, `Dockerfile`, `deploy-fly.js`).

## 2. O que falta implementar (Pendências)

Conforme o arquivo `SESSION_BACKUP.md` e a análise do código:

1. **Chave PIX**: Em `App.jsx` na linha 1186/1187, está usando uma chave de exemplo (`paulocbueno@exemplo.com`). Precisa ser trocada pela chave real.
2. **Revisão do Fluxo Premium/Assinatura**: O Mercado Pago já está integrado no backend, mas é preciso garantir que o botão "Assinar Premium" do frontend esteja acionando corretamente a rota e que o fluxo de checkout e retorno esteja fluido.
3. **Domínio e DNS (Opcional)**: Apontamento para o Fly.io.
4. **Variáveis de Ambiente**: Orientar o usuário sobre como configurar os *secrets* (Mercado Pago, JWT) no painel do Fly.io, já que o ambiente caiu e precisa ser refeito.

## 3. Próximos Passos
- Editar o `App.jsx` para atualizar a chave PIX.
- Testar a comunicação do frontend com a API de pagamento.
- Preparar as instruções para o usuário restaurar o deploy no Fly.io.
