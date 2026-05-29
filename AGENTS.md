## Escopo
- Modulo logistico legado.
- Reune fluxos antigos de cotacao, quote e paginas operacionais dessa area.

## Estado
- Este modulo tem implementacao ativa em `src/react` para a superficie canonica de logistica de pedidos.
- `src/vue` continua legado e so deve ser tocado quando o fluxo antigo for explicitamente o alvo.
- A tela `OrderLogisticsPage`, o marketplace de entregadores e o contrato de solicitacao de entrega pertencem a este modulo.
- `OrderLogisticsPage` nao deve usar hero, subtitulo explicativo fixo ou bloco solto de orientacao. Informacao contextual extra, quando realmente precisar, deve aparecer por meio do componente de ajuda parametrizado de `ui-common` acionado por `?`.
- `OrderLogisticsPage` e `orderLogisticsPresentation` devem montar motorista, telefone, rastreio e status apenas com campos materializados do pedido e da resposta de logistica. Nao usar `otherInformations` como fonte de exibicao para motoboy.

## Quando usar
- Prompts sobre quote, cotacao, logistic e telas antigas dessa operacao.
