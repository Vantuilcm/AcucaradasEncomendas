# Prompt — Campanhas regionais

## Objetivo

Variantes de campanha por estado ou capital — mesma estrutura, copy localizada.

## Entrada

```yaml
regioes:
  - nome: Minas Gerais
    cidade_anchor: Belo Horizonte
    expressao_local: "doce de leite artesanal"
  - nome: Rio de Janeiro
    cidade_anchor: Rio de Janeiro
    expressao_local: "doces para festa na praia"
campanha_base: verao-2026
```

## Instruções

Para **cada** região, gerar:

1. `slug` URL (kebab-case, sem acentos).
2. `headline` com cidade_anchor.
3. Parágrafo 80 palavras com expressao_local.
4. `meta.title` e `meta.description` únicos.
5. CTA WhatsApp diferenciado por região.
6. Manter paleta e mensagem de marca consistentes.

## Saída

JSON array `regional_pages[]` com todos os campos acima.
