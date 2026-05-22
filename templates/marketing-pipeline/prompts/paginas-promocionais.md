# Prompt — Páginas promocionais

## Objetivo

Landing de campanha temporal (Black Friday, Páscoa, Dia das Mães).

## Entrada

```yaml
nome_campanha: Dia das Mães 2026
data_inicio: 2026-05-01
data_fim: 2026-05-14
desconto: 15% primeira encomenda
codigo_app: MAES15
urgencia: alta
```

## Instruções

1. Hero com urgência ética (data_fim), sem countdown falso.
2. Destaque código do app (copiar código).
3. 3 produtos exemplo (nomes genéricos: bolo, brigadeiro, torta).
4. Regras da promo em bullet (elegibilidade, 1 uso, app only).
5. CTA primário WhatsApp; secundário lojas.
6. `meta` com datas na description.
7. Banner de compliance: "Promoção válida no app durante o período indicado."

## Restrições

- Não citar Stripe nem pagamento na landing.
- Preços "a partir de" só se fornecidos.

## Saída

JSON completo + lista de assets sugeridos (og:image alt text).
