---
name: traduzindo-pedidos-do-cliente
description: Use when o cliente ou Ewel envia mensagem, comentário, reclamação ou pedido informal (WhatsApp, áudio transcrito, e-mail) sobre o sistema Dezem e é preciso convertê-lo em requisitos formais antes de implementar.
---

# Traduzindo pedidos do cliente em requisitos

## Princípio
O cliente descreve **sintomas e desejos**; o requisito descreve **comportamento verificável**. Separe o que ele *disse* do que *precisa*. Nenhum código é escrito antes de o usuário aprovar os requisitos.

## Passos
1. **Cite a mensagem original** literalmente (autor, data, canal).
2. **Ancore no código atual** (somente leitura): `src/main/modules/*/*.handlers.ts`, `src/main/database.ts`, `src/shared/schemas.ts`, `src/renderer/src/pages/`. Registre o comportamento de hoje com `arquivo:linha`.
3. **Resolva ambiguidades**: se a dúvida muda o requisito, pergunte ao usuário (AskUserQuestion) com opções e uma recomendação. Se não muda, registre como premissa.
4. **Entregue o documento no chat** (formato abaixo) e peça aprovação.
5. **Após aprovado**, invoque `superpowers:writing-plans` para o plano de implementação.

## Formato de saída (markdown, nesta ordem)
1. **Mensagem original**
2. **Interpretação**: 1–3 frases + problema real
3. **Comportamento atual** (com `arquivo:linha`)
4. **Requisitos funcionais**: `RF-01…` — "O sistema deve …", cada um testável
5. **Regras de negócio**: `RN-01…` — o que entra/não entra em DRE, saldo bancário, CPK, etc.
6. **Restrições**: migração compatível (`ALTER TABLE` com checagem), validação Zod no front e no main, padrão de IPC
7. **Fora de escopo**
8. **Critérios de aceite**: Dado / Quando / Então, ao menos um por RF
9. **Premissas e perguntas em aberto**
10. **Alternativas descartadas** (com motivo)
11. **Impacto**: telas, tabelas, handlers afetados

## Referência rápida: frase do cliente → pergunta a fazer
| Cliente diz | Perguntar / verificar |
|---|---|
| "não pode ir pro DRE" | Entra no caixa? Na receita? Em ambos? Em qual card/gráfico? |
| "quero lançar parcial" | Quantos lançamentos por período? Valor editável? Quem pode? |
| "mostrar X no dashboard" | O dado já existe? Qual fórmula/unidade? Em qual card? |
| "está errado" | Qual valor esperado vs. exibido? Em qual período/filtro? |

## Erros comuns
- Requisito vago ("melhorar", "facilitar") sem critério de aceite.
- Solução disfarçada de requisito (dizer "criar tabela" em vez do comportamento).
- Misturar DRE (resultado operacional) com saldo bancário (posição de caixa).
- Esquecer migração de dados existentes.
- Começar a editar código antes da aprovação.
