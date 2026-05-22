# Auditoria — Firebase Hosting vs domínio customizado

**Data:** 2026-05-22  
**Projeto Firebase:** `acucaradas-encomendas` (`.firebaserc`)  
**Escopo:** somente infraestrutura Hosting/DNS — **sem alterações** Stripe, Functions ou app.

---

## Diagnóstico confirmado

| URL | Resultado |
|-----|-----------|
| `https://acucaradas-encomendas.web.app/stripe-success` | ✅ Página Stripe (`Cadastro financeiro concluído`, botão Abrir aplicativo) |
| `https://acucaradasencomendas.com.br/stripe-success` | ❌ Site marketing HostGator (HOME / rotas inexistentes no CMS) |
| `https://acucaradasencomendas.com.br/` | ❌ Landing marketing ("Inicio - Açucaradas Encomendas") — **não** é o `public/index.html` do Firebase |

**Conclusão:** Stripe, `firebase.json` rewrites e deploy Hosting estão corretos no site Firebase. O domínio `acucaradasencomendas.com.br` **não aponta para Firebase Hosting** no DNS.

---

## Causa raiz (DNS)

```
acucaradasencomendas.com.br  →  A  162.241.2.50
NS: ns902.hostgator.com.br / ns903.hostgator.com.br
www  →  CNAME  acucaradasencomendas.com.br
```

| Destino esperado (Firebase Hosting) | Destino atual |
|-------------------------------------|---------------|
| CNAME `ghs.googlehosted.com` ou registos A do assistente Firebase | **HostGator** `162.241.2.50` |

Enquanto o DNS apontar para HostGator, **nenhum** `firebase deploy --only hosting` afeta o que o Stripe e os utilizadores veem em `acucaradasencomendas.com.br`.

---

## PASSO 1–2 — Firebase CLI (ambiente local)

```bash
firebase hosting:sites:list   # falhou: credenciais expiradas (login --reauth)
firebase target             # vazio: "Resource targets for acucaradas-encomendas:"
```

**Ação manual:** no teu terminal autenticado:

```bash
firebase login --reauth
firebase hosting:sites:list
firebase target
```

Verificar se existe mais do que um site (ex.: `acucaradas-encomendas` default) e se algum custom domain está ligado no Console.

---

## PASSO 3 — `firebase.json` (repo)

- Hosting **single-site** (objeto único, não array multi-site).
- Sem `target` no bloco hosting.
- Rewrites Stripe **corretos** e na ordem certa (`/stripe-success`, `/stripe-refresh` antes de `**`).

**Não é necessário alterar rewrites** — o problema não está no ficheiro.

---

## PASSO 4 — Teste definitivo (reproduzível)

1. Aba anónima: `https://acucaradas-encomendas.web.app/stripe-success` → página Stripe.  
2. Aba anónima: `https://acucaradasencomendas.com.br/stripe-success` → HOME marketing ou 404 do HostGator.

Isto confirma **desvio de origem**, não cache CDN Firebase no custom domain.

---

## PASSO 5 — Firebase Console (checklist manual)

**Hosting → Custom domains**

| Verificar | Esperado se domínio Firebase |
|-----------|------------------------------|
| `acucaradasencomendas.com.br` listado? | Sim, se configurado |
| Status | Connected / Active |
| SSL | Ativo |
| Site associado | `acucaradas-encomendas` (default) |

Se o domínio **não** aparecer como Connected, ou aparecer com DNS pendente, o Console já indica que o DNS HostGator impede a ligação.

**DNS no registrador / HostGator:** substituir A record `162.241.2.50` pelos valores que o assistente Firebase Hosting fornece.

---

## PASSO 6 — Cache

Cache Safari/CDN **não explica** servir um site WordPress/marketing diferente do `web.app`. Mesmo com hard refresh, enquanto DNS = HostGator, o resultado permanece.

---

## Impacto Stripe (sem mudar código)

`return_url` / `refresh_url` em Functions apontam para:

- `https://acucaradasencomendas.com.br/stripe-success`
- `https://acucaradasencomendas.com.br/stripe-refresh`

O Stripe redireciona corretamente, mas o **servidor de destino** não é o deploy Firebase — daí a UX quebrada no iPhone após onboarding.

**Stack Stripe Connect (lógica) permanece correta.** Gap = infraestrutura DNS/domínio.

---

## Correção futura (sem tocar Stripe Connect freeze)

Escolher **uma** estratégia (ordem recomendada):

### Opção A — DNS para Firebase (recomendada)

1. Firebase Console → Hosting → Add custom domain → `acucaradasencomendas.com.br`
2. No HostGator/registrador: aplicar TXT + A/CNAME indicados pelo Firebase
3. Aguardar SSL + propagação (até 24–48 h)
4. `firebase deploy --only hosting` (já feito; conteúdo já no `web.app`)
5. Validar `/stripe-success` no domínio custom

**Risco:** site marketing atual deixa de ser servido na raiz — migrar landing para subdomínio (`www` ou `site.`) se necessário.

### Opção B — Subdomínio só para Stripe/App

Ex.: `app.acucaradasencomendas.com.br` → Firebase; apex mantém HostGator.

Requer **alteração futura** de `return_url`/`refresh_url` (fora do freeze atual) — só com novo tag e teste.

### Opção C — Ficheiros Stripe no HostGator

Copiar `public/stripe-success` e `public/stripe-refresh` para o servidor HostGator.

Duplicação de manutenção — não recomendado a longo prazo.

### Opção D — Redirect no HostGator

Redirect 302 `/stripe-success` → `https://acucaradas-encomendas.web.app/stripe-success`

Funciona como paliativo; URL visível muda para `web.app` (aceitável para Stripe se 302 preservar fluxo).

---

## O que NÃO fazer nesta fase

- Rebuild iOS  
- Alterar Functions Stripe / `return_url`  
- Alterar rewrites `firebase.json`  
- Universal links / app deep linking  

---

## Resumo executivo

| Componente | Estado |
|------------|--------|
| Stripe Connect | ✅ |
| `firebase.json` rewrites | ✅ |
| Deploy `web.app` | ✅ |
| Custom domain routing | ❌ DNS → HostGator, não Firebase |
| Cache CDN Firebase | N/A (domínio não chega ao Firebase) |

**Problema restante:** `acucaradasencomendas.com.br` não está ligado ao Firebase Hosting no DNS — não é regressão de deploy nem de rewrites.

---

## Comandos úteis pós-correção DNS

```bash
firebase login --reauth
firebase hosting:sites:list
curl -I https://acucaradasencomendas.com.br/stripe-success
# Esperado: 200 + HTML "Cadastro financeiro concluído"
```
