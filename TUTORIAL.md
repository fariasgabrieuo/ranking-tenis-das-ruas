# Tutorial — Ranking Tênis das Ruas

Este guia cobre tudo que você precisa fazer **manualmente** (contas, configurações na web, publicação). O código do app já está pronto na pasta do projeto.

---

## Visão geral

```
Seu navegador  →  GitHub Pages (site estático, grátis)
                      ↓
                 Supabase (banco PostgreSQL, grátis)
```

- **GitHub Pages**: hospeda o site em `https://SEU-USUARIO.github.io/ranking-tenis-das-ruas/`
- **Supabase**: guarda jogadores e partidas. Tem plano gratuito generoso para um grupo de amigos.

---

## Passo 1 — Instalar ferramentas no seu PC

### Node.js (obrigatório)

1. Acesse https://nodejs.org
2. Baixe a versão **LTS**
3. Instale com as opções padrão
4. Abra um terminal novo e confira:

```bash
node -v
npm -v
```

### Git (obrigatório para publicar no GitHub)

1. Acesse https://git-scm.com/download/win
2. Instale (opções padrão)
3. Feche e abra o terminal de novo:

```bash
git --version
```

---

## Passo 2 — Criar conta e repositório no GitHub

1. Crie conta em https://github.com (se ainda não tiver)
2. Clique em **New repository**
3. Nome do repositório: **`ranking-tenis-das-ruas`** (igual ao nome do projeto — importante para a URL funcionar)
4. Deixe **Public**
5. **Não** marque "Add README" (já temos arquivos locais)
6. Clique em **Create repository**

Anote seu usuário GitHub — a URL final será:
`https://SEU-USUARIO.github.io/ranking-tenis-das-ruas/`

---

## Passo 3 — Criar projeto no Supabase

1. Acesse https://supabase.com e crie conta (pode entrar com GitHub)
2. **New project**
3. Escolha:
   - **Name**: ranking-tenis-das-ruas
   - **Database password**: invente uma senha forte e **guarde** (só para acessar o banco direto, se precisar)
   - **Region**: South America (São Paulo) se disponível
4. Aguarde ~2 minutos o projeto ficar pronto

---

## Passo 4 — Criar as tabelas no Supabase

> **Versão atual:** use `supabase/schema-v2.sql` (auth, perfis, partidas com confirmação).
> Se você já rodou o `schema.sql` antigo, apague as tabelas `matches` e `players` antes, ou crie um projeto Supabase novo.

1. No painel Supabase, vá em **SQL Editor** (menu lateral)
2. Clique **New query**
3. Abra o arquivo `supabase/schema-v2.sql` deste projeto, copie **todo** o conteúdo
4. Cole no editor SQL do Supabase
5. Clique **Run**

Deve aparecer "Success". Isso cria `profiles`, `matches`, conquistas, timeline e políticas de segurança.

### Passo 4b — Ativar login por e-mail

1. No Supabase: **Authentication** → **Providers** → **Email**
2. Deixe **Enable Email provider** ligado
3. Para testes rápidos com amigos, você pode desligar **Confirm email** (senão cada um precisa clicar no link do e-mail)

### Passo 4c — Storage de avatares (opcional)

O `schema-v2.sql` já cria o bucket `avatars`. Confira em **Storage** se o bucket apareceu com acesso público para leitura.

---

## Passo 5 — Copiar URL e chave do Supabase

1. No Supabase, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** key → chave longa começando com `eyJ...`

### Configurar localmente

No terminal, na pasta do projeto:

```bash
cd C:\Users\Gabriel\Projects\ranking-tenis-das-ruas
npm install
```

Copie o arquivo de exemplo:

```bash
copy src\supabase-config.example.js src\supabase-config.js
```

Edite `src/supabase-config.js` e cole seus valores:

```javascript
export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...sua-chave...';
```

Teste localmente:

```bash
npm run dev
```

Abra http://localhost:5173 — crie sua conta em **Mais → Entrar / Cadastrar**, complete o perfil e registre uma partida de teste (1 set, ex: 6-4).

---

## Passo 6 — Enviar código para o GitHub

No terminal, na pasta do projeto:

```bash
git init
git add .
git commit -m "App ranking tênis das ruas"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/ranking-tenis-das-ruas.git
git push -u origin main
```

Substitua `SEU-USUARIO` pelo seu usuário GitHub. Na primeira vez, o Git pode pedir login no navegador.

> **Importante:** `src/supabase-config.js` está no `.gitignore` e **não** sobe pro GitHub (correto). No deploy usamos secrets (próximo passo).

---

## Passo 7 — Configurar secrets no GitHub (para o site online funcionar)

1. No GitHub, abra o repositório **ranking-tenis-das-ruas**
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique **New repository secret** e crie:

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | Sua Project URL do Supabase |
| `SUPABASE_ANON_KEY` | Sua anon public key |

O workflow `.github/workflows/deploy.yml` usa esses secrets para montar o config na hora do build.

---

## Passo 8 — Ativar GitHub Pages

1. No repositório GitHub: **Settings** → **Pages**
2. Em **Build and deployment** → **Source**: escolha **GitHub Actions**
3. Faça um push qualquer (ou vá em **Actions** → **Deploy GitHub Pages** → **Run workflow**)

Quando o workflow terminar (ícone verde), o site estará em:
`https://SEU-USUARIO.github.io/ranking-tenis-das-ruas/`

---

## Passo 9 — Personalizar layout e regras

### Textos, abas e colunas

Edite `src/config/app.js`:

```javascript
export const APP = {
  name: 'Ranking Tênis das Ruas',
  subtitle: 'Pelada oficial entre amigos',
  // ...
};
```

### Regras de pontuação

Edite `src/config/rules.js`:

**Sistema de pontos** (padrão — estilo campeonato):
```javascript
system: 'points',
points: { win: 3, draw: 1, loss: 0 },
```

**Sistema ELO** (níveis se equilibram com o tempo):
```javascript
system: 'elo',
elo: { initialRating: 1200, kFactor: 32 },
```

Outras opções úteis:
- `tiebreakers` — ordem de desempate
- `minMatchesToRank` — mínimo de jogos para entrar no ranking
- `allowDraw` — permitir empate
- `requireScore` — obrigar placar

> Ao mudar regras, o ranking **recalcula** do histórico de partidas. Não precisa migrar dados.

### Visual (cores, fontes)

Edite `src/styles/variables.css`:

```css
:root {
  --color-primary: #40916c;
  --color-bg: #0f1419;
  /* ... */
}
```

Para mudanças maiores de layout, edite `src/styles/main.css`.

Depois de alterar, teste com `npm run dev` e faça commit + push para atualizar o site.

---

## Passo 10 — Compartilhar com os amigos

Envie o link do GitHub Pages. Qualquer pessoa com o link pode:
- Ver ranking e partidas
- Adicionar jogadores e registrar resultados

---

## Segurança (leitura importante)

O schema atual permite leitura/escrita **pública** com a anon key — ideal para começar rápido entre amigos de confiança.

**Riscos:** quem descobrir a URL do Supabase + anon key poderia alterar dados.

**Para reforçar depois** (opcional):
1. Supabase → **Authentication** → ativar login (e-mail ou magic link)
2. Ajustar as policies no SQL para exigir usuário logado
3. Ou adicionar um PIN simples na tabela `settings`

Para um grupo fechado de amigos, o risco costuma ser baixo. Se o ranking crescer ou ficar público, vale reforçar.

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Site em branco / 404 | Confirme que o repo se chama `ranking-tenis-das-ruas` e Pages usa GitHub Actions |
| "Supabase não configurado" local | Copie e preencha `src/supabase-config.js` |
| Site online sem dados | Verifique secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` no GitHub |
| Erro ao adicionar jogador duplicado | Nomes são únicos — use nomes diferentes |
| `git` não reconhecido | Reinstale Git e abra terminal novo |
| Workflow falhou | GitHub → Actions → clique no job vermelho → veja o log |

---

## Checklist rápido

- [ ] Node.js instalado
- [ ] Git instalado
- [ ] Repositório GitHub criado (`ranking-tenis-das-ruas`)
- [ ] Projeto Supabase criado
- [ ] SQL do `schema.sql` executado
- [ ] `supabase-config.js` preenchido localmente
- [ ] `npm run dev` funcionando
- [ ] Código no GitHub (`git push`)
- [ ] Secrets configurados no GitHub
- [ ] GitHub Pages ativado (source: GitHub Actions)
- [ ] Site online testado

Pronto — é só jogar tênis e registrar os resultados!
