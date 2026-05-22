# FTP / FTPS deploy — exemplo (HostGator)

**Sem credenciais reais.** Usar apenas no repo marketing dedicado.

## Pré-requisitos HostGator

1. cPanel → **FTP Accounts** → criar utilizador restrito.
2. **Diretório home:** `public_html/lp/` (criar pasta vazia).
3. Anotar servidor FTPS (geralmente `ftp.seudominio.com.br` ou IP).
4. Porta **21** (FTPS explícito) ou conforme painel.

## Variáveis

Copiar `.env.example` → `.env` (local, **gitignore**).

| Variável | Exemplo |
|----------|---------|
| `HG_FTP_SERVER` | `ftp.acucaradasencomendas.com.br` |
| `HG_FTP_USER` | `deploy-lp@acucaradasencomendas.com.br` |
| `HG_FTP_PASSWORD` | `(definir no cPanel)` |
| `HG_SERVER_DIR` | `/public_html/lp/minha-campanha/` |
| `HG_PROTOCOL` | `ftps` |

## Deploy manual (teste)

1. Gerar pasta local: copiar `../landing-template/` → `dist/`.
2. Substituir placeholders HTML com copy da campanha.
3. Cliente FTP (FileZilla): ligar FTPS, upload para `HG_SERVER_DIR`.
4. Abrir `https://acucaradasencomendas.com.br/lp/minha-campanha/` (após subdomínio/pasta configurados no cPanel).

## Deploy CI (futuro)

Ver `../github-actions/deploy-marketing-example.yml`.

Secrets GitHub (repo marketing):

- `HG_FTP_SERVER`
- `HG_FTP_USER`
- `HG_FTP_PASSWORD`

## Segurança

- Nunca commitar `.env`.
- Conta FTP só com escrita em `public_html/lp/`.
- Não usar a mesma conta do WordPress admin.

## Isolamento Stripe / Firebase

Este deploy **não** deve publicar em:

- `public/stripe-success` (Firebase)
- Raiz `public_html/` do site institucional sem aprovação
