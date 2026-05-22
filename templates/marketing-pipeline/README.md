# Marketing Pipeline — Fundação (IA + HostGator)

Fundação **offline** para automação de sites marketing da Açucaradas Encomendas.

> **Não ativa deploy.** Não contém secrets. Não altera Stripe, Firebase produção nem o app React Native.

## Visão

| Camada | Tecnologia | Estado |
|--------|------------|--------|
| Copy / estrutura | GPT, Cursor, TRAE | Prompts em `prompts/` |
| Template | HTML estático mobile-first | `landing-template/` |
| CI (futuro) | GitHub Actions | `github-actions/` (mock) |
| Hosting marketing | HostGator FTPS | `ftp-deploy-example/` |
| SEO | sitemap, robots, meta | `seo/` |
| Produto congelado | Firebase + Stripe | Repo principal — **não tocar** |

## Separação Firebase × HostGator

```
Firebase (acucaradas-encomendas)     HostGator (162.241.2.50)
├── stripe-success / refresh         ├── www / apex (institucional)
├── app web artifacts                └── lp.* / campanhas (futuro)
└── Cloud Functions Stripe
```

Marketing **nunca** publica em `public/stripe-success` nem altera `return_url`.

## Pipeline IA (futuro)

```
brief.yaml → prompts/ → landing-template/ → CI mock → FTPS (quando ativado)
```

1. Definir campanha (`campaigns/{slug}/brief.yaml` — criar no repo marketing futuro).
2. Correr prompt adequado em `prompts/`.
3. Preencher `landing-template/` com copy gerada.
4. Validar SEO com ficheiros em `seo/`.
5. Aprovar PR → deploy manual ou Actions (após configurar secrets).

## Deploy FTPS (futuro)

Ver `ftp-deploy-example/README.md` e `.env.example`. Variáveis placeholder:

- `HG_FTP_SERVER`, `HG_FTP_USER`, `HG_FTP_PASSWORD`
- `HG_SERVER_DIR=/public_html/lp/{{CAMPAIGN_SLUG}}/`

## Fluxo GPT → site

1. **Brief** — público, cidade, oferta, CTA (WhatsApp / lojas).
2. **Geração** — `prompts/landing-page-automatica.md`.
3. **Revisão humana** — tom, claims legais, preços.
4. **Build** — copiar template + injetar `config.json`.
5. **SEO** — `seo/meta-template.json` + sitemap entry.
6. **Deploy** — desativado nesta fundação.

## Estratégia SEO

- Uma URL por campanha: `https://lp.acucaradasencomendas.com.br/{slug}/` (quando DNS existir).
- `title` / `description` únicos; Open Graph para WhatsApp preview.
- `robots.txt` na raiz `lp/`; sitemap index apontando campanhas.
- Copy local (cidade, bairro) via `prompts/seo-local.md`.

## Separação marketing / app

| Marketing | App |
|-----------|-----|
| HTML estático HostGator | React Native + EAS |
| CTAs lojas / WhatsApp | Conta Bancária / Stripe Connect |
| Campanhas sazonais | Onboarding congelado |

## Estrutura desta pasta

```
templates/marketing-pipeline/
├── README.md                 ← este ficheiro
├── docs/GETTING_STARTED.md
├── prompts/                  ← 7 prompts IA
├── landing-template/         ← HTML base
├── github-actions/           ← workflow exemplo (mock)
├── ftp-deploy-example/
└── seo/
```

## Documentação completa

- Arquitetura enterprise: `docs/MARKETING_SITES_ARCHITECTURE.md`
- Hosting vs domínio: `docs/HOSTING_DOMAIN_AUDIT.md`
- Stripe freeze: `docs/STRIPE_CONNECT_FREEZE.md`

## Ativação (quando aprovado)

1. Criar repo `acucaradas-marketing-sites` (privado).
2. Copiar esta pasta para a raiz do novo repo.
3. Configurar secrets GitHub (FTP) — **não** no repo do app.
4. Testar FTPS numa pasta `lp/teste/`.
5. Primeira campanha real com aprovação manual.

**Tag de referência app:** `stripe-connect-stable-v1` — não regressar.
