import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";
import * as customActions from "@controleonline/ui-orders/src/store/orders/customActions";

export default {
  namespaced: true,
  state: {
    item: null,
    items: null,
    resourceEndpoint: "orders",
    isLoading: false,
    isSaving: false,
    error: "",
    totalItems: 0,
    summary: {},
    isLoadingList: false,
    loadedKey: "",
    loadedAt: 0,
    add: false,
    messages: [],
    message: {},
    filters: {},
    reload: false,
    columns: [
      {
        isIdentity: true,
        sortable: true,
        editable: false,
        filters: false,
        name: "id",
        label: "pedido",
        align: "left",
        to: function (value) {
          return {
            name: "OrderDetails",
            params: { id: value },
          };
        },
        format(value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "client",
        editable: false,
        filters: false,
        label: "cliente",
        align: "left",
        sortField: "client.name",
        format: function (value) {
          return value ? value?.name + " - " + value?.alias : " - ";
        },
        formatList: function (value) {
          if (value && value["@id"])
            return {
              value: value["@id"].split("/").pop(),
              label: value?.name + " - " + value?.alias,
            };

          return value;
        },
        saveFormat: function (value) {
          return value ? "/people/" + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: "deliveryContact",
        editable: false,
        filters: false,
        label: "recebedor",
        align: "left",
        sortField: "deliveryContact.name",
        format: function (value) {
          return value ? value?.name + " - " + value?.alias : " - ";
        },
        formatList: function (value) {
          if (value && value["@id"])
            return {
              value: value["@id"].split("/").pop(),
              label: value?.name + " - " + value?.alias,
            };

          return value;
        },
        saveFormat: function (value) {
          return value ? "/people/" + (value.value || value) : null;
        },
      },
      {
        translate: true,
        sortable: true,
        name: "status",
        editable: false,
        label: "status",
        align: "left",
        list: "status/getItems",
        searchParam: "status",
        externalFilter: true,
        sortField: "status.status",
        style: function (row) {
          return { color: row?.status?.color };
        },
        format: function (value) {
          return value?.status;
        },
        saveFormat: function (value) {
          return value ? "/statuses/" + (value.value || value) : null;
        },
      },
      {
        inputType: "date-range",
        sortable: true,
        editable: false,
        name: "orderDate",
        align: "center",
        label: "data",
        externalFilter: true,
        saveFormat: function (_value) {
          return undefined;
        },
        format: function (value) {
          return Formatter.formatDateYmdTodmY(value);
        },
      },
      {
        inputType: "float",
        filterClass: "col-2 q-pa-xs",
        formClass: "col-6",
        filters: false,
        editable: false,
        sortable: true,
        name: "price",
        align: "right",
        label: "total",
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(_value) {
          return Formatter.formatFloat(_value);
        },
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
    ],
  },
  actions: { ...actions, ...customActions },
  getters,
  mutations,
};
