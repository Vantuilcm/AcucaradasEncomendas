# Prompt — CTA WhatsApp

## Objetivo

Gerar links e microcopy para `wa.me` com tracking por campanha (UTM na mensagem, não na URL se possível).

## Entrada

```yaml
numero_e164: "5511987654321"
campaign_slug: pascoa-2026
produto: kit pascoa
idioma: pt-BR
```

## Instruções

1. Mensagem inicial ≤ 200 caracteres, inclui `campaign_slug` e produto.
2. 3 variações de texto do botão (ex.: "Pedir pelo WhatsApp", "Falar com atendimento").
3. URL completa: `https://wa.me/{numero}?text={encoded}` — mostrar encoded e decoded.
4. Bloco de instruções para colocar botão fixo no mobile (safe-area).
5. Não prometer resposta em X minutos se não estiver no brief.

## Saída

```json
{
  "button_labels": [],
  "messages": [],
  "wa_urls": [],
  "html_snippet": ""
}
```
