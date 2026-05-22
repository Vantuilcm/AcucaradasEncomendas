# Prompt — SEO local (cidade / região)

## Objetivo

Otimizar uma landing para busca local: "doces artesanais em {cidade}", "encomenda de bolos {bairro}".

## Entrada

```yaml
cidade: Curitiba
estado: PR
bairros_alvo: [Batel, Água Verde]
servico: encomenda de doces e bolos artesanais
url_canonica: https://lp.acucaradasencomendas.com.br/curitiba-doces/
```

## Instruções

1. `meta.title`: incluir cidade + marca (≤60 caracteres).
2. `meta.description`: CTA + cidade + diferencial (≤155 caracteres).
3. Gerar `h1` único e `h2` para seções (benefícios, como pedir, área de entrega).
4. Parágrafo introdutório com **cidade e estado** naturais (sem keyword stuffing).
5. Bloco "Área de atendimento" listando bairros do brief.
6. JSON-LD `LocalBusiness` (tipo `FoodEstablishment` ou `Organization`) — campos apenas se fornecidos; usar `@id` = url_canonica.
7. 5 perguntas FAQ com vocabulário local.
8. Lista de 8 keywords long-tail em pt-BR.

## Saída

JSON com: `meta`, `headings`, `body_sections`, `json_ld`, `faq`, `keywords`.
