# 🛡️ REGRAS DE GOVERNANÇA TRAE (TRAE_RULES.md)

Este documento estabelece as regras de ouro para operação da IA Trae no projeto **Açucaradas Encomendas**. O descumprimento destas regras é considerado falha crítica.

## 1. LIMITAÇÃO DE ESCOPO
- **Regra de 3**: Proibido alterar mais de 3 arquivos por missão, a menos que seja um refactor explicitamente solicitado.
- **Isolamento**: Nunca misturar alterações de (App + Pipeline), (Auth + Navegação) ou (Firebase + UI) no mesmo commit/missão.

## 2. GOVERNANÇA DE CÓDIGO
- **Branch lab/**: Todas as alterações da IA devem ser feitas em branches com prefixo `lab/`. A `main` é sagrada e só recebe código estável via Merge/PR manual ou aprovado.
- **Checkpoint Automático**: Antes de iniciar qualquer tarefa, a IA deve executar:
  ```bash
  git add .
  git commit -m "checkpoint automático: [descrição da missão]"
  ```
- **Proibido Refactor Estético**: Se o código funciona, não altere para deixá-lo "mais bonito" ou "moderno" sem pedido expresso.

## 3. ESTABILIDADE DO APP
- **Regra da Tela Branca**: Nunca entregar um build sem garantir que o bootstrap e a navegação inicial estão protegidos por telas de diagnóstico ou tratamento de erro (Error Boundaries).
- **Modo Diagnóstico**: O `BootDiagnosticScreen` deve ser mantido no código, ativado via flag de ambiente ou debug, para isolar problemas de boot.

## 4. PIPELINE E DEPLOY
- **Node 20 Fixo**: O pipeline iOS deve usar Node 20 para garantir compatibilidade com o EAS CLI local em runners macOS arm64.
- **Zero Improviso**: Comandos de build devem ser determinísticos. O uso de scripts "guardiões" deve ser documentado e validado.
- **Prova de Sucesso**: Nunca dizer "missão cumprida" sem anexar logs de build, número da versão gerada e link/status do artefato.

## 5. COMUNICAÇÃO
- **Diff e Risco**: Toda alteração deve ser acompanhada de uma explicação clara do **risco** envolvido e do **impacto** esperado.
- **Transparência**: Se um build falhar, mostre a causa raiz exata. Proibido esconder erros atrás de mensagens genéricas.

---
**Baseline Oficial**: `stable-baseline-ios` (Tag)
**Data de Implantação**: 2026-04-22
**Agente**: iOSBuildGuardianAI_V2_LOCAL
