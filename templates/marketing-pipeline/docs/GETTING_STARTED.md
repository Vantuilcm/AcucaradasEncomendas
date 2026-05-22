# Getting Started — Marketing Pipeline (fundação)

## Pré-requisitos

- Conta HostGator com cPanel (checklist em `docs/MARKETING_SITES_ARCHITECTURE.md`)
- Repo Git separado do app (recomendado)
- Cursor ou IDE com acesso aos prompts em `../prompts/`

## Passo a passo (local, sem deploy)

### 1. Escolher tipo de campanha

| Tipo | Prompt |
|------|--------|
| Landing geral | `prompts/landing-page-automatica.md` |
| SEO cidade | `prompts/seo-local.md` |
| Franquia | `prompts/paginas-franquias.md` |
| Promoção | `prompts/paginas-promocionais.md` |

### 2. Preencher brief

Copiar `landing-template/config.example.json` → `config.json` (local, não commitar se tiver dados sensíveis).

### 3. Gerar copy com IA

Colar o prompt + brief no Cursor. Pedir saída em JSON:

```json
{
  "headline": "...",
  "subheadline": "...",
  "sections": [],
  "cta_whatsapp": "...",
  "meta": { "title": "...", "description": "..." }
}
```

### 4. Atualizar HTML

Editar `landing-template/index.html` ou script futuro que injeta `config.json`.

### 5. Validar SEO

- Comparar com `seo/meta-template.json`
- Adicionar URL em `seo/sitemap.example.xml` (cópia para campanha)

### 6. Preview

Abrir `index.html` no browser ou `npx serve landing-template`.

## O que não fazer nesta fase

- `firebase deploy` no projeto app
- Alterar `functions/index.js` ou `return_url`
- Guardar passwords FTP no Git
- Ativar `deploy-marketing-example.yml` sem `workflow_dispatch` e secrets

## Próximo milestone

Repo dedicado + workflow FTPS com aprovação manual + subdomínio `lp.` no HostGator.
