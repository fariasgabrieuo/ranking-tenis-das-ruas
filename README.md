# Ranking Tênis das Ruas

App de ranking de tênis entre amigos — hospedagem gratuita (GitHub Pages) + banco gratuito (Supabase).

## Stack

| Parte | Ferramenta | Custo |
|-------|-----------|-------|
| Frontend | Vite + JavaScript | Grátis |
| Hospedagem | GitHub Pages | Grátis |
| Banco de dados | Supabase (PostgreSQL) | Grátis (tier free) |

## Começar localmente

```bash
npm install
cp src/supabase-config.example.js src/supabase-config.js
# Edite supabase-config.js com URL e anon key do Supabase
npm run dev
```

Abra http://localhost:5173

## Personalizar

| O que mudar | Arquivo |
|-------------|---------|
| Nome, textos, colunas da tabela | `src/config/app.js` |
| Regras de pontuação (pontos ou ELO) | `src/config/rules.js` |
| Cores, fontes, visual | `src/styles/variables.css` |
| Layout/CSS geral | `src/styles/main.css` |

## Deploy

Siga o **TUTORIAL.md** — passo a passo completo para GitHub, Supabase e publicação.

URL final: `https://SEU-USUARIO.github.io/ranking-tenis-das-ruas/`

## Estrutura

```
src/
  config/app.js      → textos e UI
  config/rules.js    → lógica do ranking
  styles/            → visual
  lib/ranking.js     → cálculo (não precisa mexer na maioria dos casos)
  lib/supabase.js    → API do banco
supabase/schema.sql  → tabelas no Supabase
```
