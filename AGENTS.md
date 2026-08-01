## Logistica
- `OrderLogisticsPage` e a tela compartilhada de logistica com dois modos. Sem `route.params.order` ela e o overview do manager, exibindo somente origem e destino; com `route.params.order` ela e o detalhe da delivery e pode exibir a posicao atual e a rota estimada do motoboy.
- `OrderLogisticsPage` e `OrderLogisticsQuotesList` devem consumir o store `order_logistics`; a tela nao chama `api.fetch` direto.
- `OrderLogisticsQuotesList` usa `StateStore` em modo generico de `compact` e `DefaultErrors` como popup de erro inline, lendo o `error` do store correspondente, sem spinner local nem banner paralelo.
- O bloco de aceite deve viver em `DeliveryAcceptanceCard` e ser montado apenas quando o modo de detail pedir.
- `/delivery/companies` deve buscar `people/companies/my` com `linkType=courier` e exibir apenas empresas com vinculo courier ativo do motoboy logado; nao usar essa tela como seletor comercial geral.
- Os dados visiveis da entrega devem vir do pedido corrente materializado e nunca de `mainOrder` como fallback visual.
- Em `aguardando aceite`, o detalhe da delivery esconde troca de cliente/endereco e a barra inferior, mantendo a acao de aceite/recusa em card flutuante.
- CEP e complemento precisam aparecer no resumo de endereco quando existirem no pedido corrente.
- No detalhe da delivery, o estado pos-aceite e `aceito`, nao `preparando`; a corrida ativa precisa mostrar `Marcar como entregue` em cada parada aceita, seguir a ordem planejada e voltar ao estado inicial quando a fila acabar.

## Qualidade de código

- A barra comum de modularizacao, testes, smoke tests e limite de tamanho de componentes vive em `https://github.com/ControleOnline/agents-mcp/blob/master/skills/shared/code-quality.md`.
