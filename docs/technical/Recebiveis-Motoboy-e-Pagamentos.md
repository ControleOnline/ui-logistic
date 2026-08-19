# Recebíveis do motoboy e Pagamentos a motoboys

## Objetivo

Separar duas perspectivas claras de invoices de entrega, com rotas e menus distintos (não reutilizar “Comissões”):

| Papel | Rota | Título | Filtro base | Filtro extra |
| --- | --- | --- | --- | --- |
| Motoboy | `delivery/receivables` (`DeliveryReceivablesPage`) | Recebíveis do motoboy | `receiver` = people do courier logado | Empresa (payer) entre homologadas |
| Empresa | `delivery/motoboy-payments` (`DeliveryMotoboyPaymentsPage`) | Pagamentos a motoboys | `payer` = empresa atual | Motoboy (receiver) entre links `courier` |

## Regras de negócio

- Invoice de entrega: `invoiceType=invoice`, com `payer` (empresa) e `receiver` (motoboy).
- Homologação: `people_link` com `linkType=courier` (people = motoboy, company = empresa).
- Motoboy só vê seus recebíveis (`receiver` fixo).
- Empresa só vê o que paga (`payer` fixo à `currentCompany`).

## Implementação

- Módulo: `ui-logistic`
- Helpers: `src/react/pages/receivables/receivablesHelpers.js`
- Páginas:
  - `src/react/pages/receivables/index.js`
  - `src/react/pages/motoboy-payments/index.js`
- Store de listagem: `invoice` (DefaultTable)
- Opções de filtro:
  - Motoboy → `people.myCompaniesByLinkType({ linkType: 'courier' })`
  - Empresa → `people_link.getItems({ company, linkType: 'courier' })`

## Testes

- Unit: `src/tests/react/pages/receivablesHelpers.test.js`
- Smoke browser: `src/tests/browser/delivery/delivery-receivables.spec.js`

## Relação com ui-crm#21 / #25

Task filha da reorganização de “Comissões” por papel. A visão de entrega permanece em `ui-logistic` / `APP_TYPE=DELIVERY` (e menu configurável para MANAGER), coerente com `MODOS_OPERACAO.md`.
