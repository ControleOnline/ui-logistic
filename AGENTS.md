## Logistica
- `OrderLogisticsPage` e a tela compartilhada de logistica com dois modos. Sem `route.params.order` ela e o overview do manager, exibindo somente origem e destino; com `route.params.order` ela e o detalhe da delivery e pode exibir a posicao atual e a rota estimada do motoboy.
- O bloco de lista de cotações/pedidos deve viver em `OrderLogisticsQuotesList` e fazer o proprio fetch. A tela principal apenas decide se inclui esse bloco.
- O bloco de aceite deve viver em `DeliveryAcceptanceCard` e ser montado apenas quando o modo de detail pedir.
- Os dados visiveis da entrega devem vir do pedido corrente materializado e nunca de `mainOrder` como fallback visual.
- Em `aguardando aceite`, o detalhe da delivery esconde troca de cliente/endereco e a barra inferior, mantendo a acao de aceite/recusa em card flutuante.
- CEP e complemento precisam aparecer no resumo de endereco quando existirem no pedido corrente.
- No detalhe da delivery, o estado pos-aceite e `aceito`, nao `preparando`; a corrida ativa precisa mostrar `Marcar como entregue` em cada parada aceita, seguir a ordem planejada e voltar ao estado inicial quando a fila acabar.
