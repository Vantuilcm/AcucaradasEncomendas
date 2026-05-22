# Prompt — Páginas franquias / parceiros

## Objetivo

Landing para recrutar **produtores** ou **parceiros regionais** (não confundir com onboarding Stripe — sem dados bancários na página).

## Entrada

```yaml
regiao: Nordeste
modelo: parceria com confeiteiros homologados
cta: whatsapp_comercial
```

## Instruções

1. Hero focado em oportunidade de venda com demanda via app.
2. Seções: por que parceiro → requisitos → como começar (cadastro no app, **não** pedir documentos na web).
3. Destaque: pagamentos tratados no app de forma segura (sem detalhar Stripe).
4. FAQ: comissão, área, suporte (respostas genéricas se brief não tiver números).
5. CTA WhatsApp com mensagem "Quero ser parceiro Açucaradas - {regiao}".
6. Aviso legal curto: sujeito a análise e termos do app.

## Saída

JSON: `sections[]`, `faq[]`, `meta`, `cta_whatsapp_message`, `disclaimer`.
