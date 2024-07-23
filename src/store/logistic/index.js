import * as actions from "@controleonline/quasar-default-ui/src/store/default/actions";
import * as getters from "@controleonline/quasar-default-ui/src/store/default/getters";
import mutations from "@controleonline/quasar-default-ui/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";


export default {
  namespaced: true,
  state: {
    resourceEndpoint: "order_logistics",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
    columns: [
      {
        isIdentity: true,
        name: "id",
        label: "id",
        align: "center",
        format(value) {
          return "#" + value;
        },
      },
      {
        externalFilter: true,
        name: "order",
        label: "order",
        align: "center",
        list: "salesOrder/getItems",
        searchParam: "id",
        formatList(value) {
          return {
            label: "#" + value.id,
            value: value.id,
          };
        },
        format(value) {
          return value ? "#" + value.id : "";
        },
        to(value) {
          return {
            name: "OrderDetails",
            params: {
              id: value.id,
            },
          };
        },
      },
      {
        externalFilter: true,
        editable: false,
        name: "order.contract.id",
        label: "contract",
        align: "center",
        format(value, column, row) {
          return row.order?.contract
            ? "#" + row.order?.contract?.id
            : "";
        },
        to(value, column, row) {
          return row.order?.contract?.id
            ? {
                name: "ContractDetails",
                params: {
                  id: row.order?.contract?.id,
                },
              }
            : "#";
        },
      },
      {
        sortable: true,
        name: "status",
        align: "left",
        label: "status",
        list: "status/getItems",
        searchParam: "status",
        externalFilter: true,
        format: function (value) {
          return translate("logistic", value?.status, "statuses");
        },
        formatList: function (value) {
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: translate("logistic", value.status, "statuses"),
            };
        },
        saveFormat: function (value) {
          return value ? "/statuses/" + (value.value || value) : null;
        },
      },

      {
        sortable: true,
        name: "originType",
        align: "left",
        label: "originType",
        list: "categories/getItems",
        searchParam: "name",
        externalFilter: true,
        format: function (value) {
          return value?.name;
        },
        saveFormat: function (value) {
          return value ? "/categories/" + (value.value || value) : null;
        },
        formatList: function (value) {
          return value
            ? {
                label: value?.name,
                value: value?.id,
              }
            : null;
        },
      },
      {
        sortable: true,
        name: "originCity",
        align: "left",
        label: "originCity",
        list: "city/getItems",
        searchParam: "city",
        externalFilter: true,
        format: function (value) {
          return value?.city + "/" + value?.state?.uf;
        },
        saveFormat: function (value) {
          return value ? "/cities/" + (value.value || value) : null;
        },
        formatList: function (value) {
          return value
            ? {
                label: value?.city + "/" + value?.state?.uf,
                value: value?.id,
              }
            : null;
        },
      },
      {
        name: "originAddress",
        label: "originAddress",
        align: "center",
      },
      {
        externalFilter: true,
        name: "originProvider",
        label: "originProvider",
        align: "left",
        searchParam: "name",
        list: "people/getItems",
        formatList(value, column) {
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: value.name + " - " + value.alias,
            };
        },
        format: (val) => (val ? `${val.name} - ${val.alias}` : ""),
      },
      {
        sortable: true,
        name: "destinationType",
        align: "left",
        label: "destinationType",
        list: "categories/getItems",
        searchParam: "name",
        externalFilter: true,
        format: function (value) {
          return value?.name;
        },
        saveFormat: function (value) {
          return value ? "/categories/" + (value.value || value) : null;
        },
        formatList: function (value) {
          return value
            ? {
                label: value?.name,
                value: value?.id,
              }
            : null;
        },
      },
      {
        sortable: true,
        name: "destinationCity",
        align: "left",
        label: "destinationCity",
        list: "city/getItems",
        searchParam: "city",
        externalFilter: true,
        format: function (value) {
          return value?.city + "/" + value?.state?.uf;
        },
        saveFormat: function (value) {
          return value ? "/cities/" + (value.value || value) : null;
        },
        formatList: function (value) {
          return value
            ? {
                label: value?.city + "/" + value?.state?.uf,
                value: value?.id,
              }
            : null;
        },
      },

      {
        name: "destinationAdress",
        label: "destinationAdress",
        align: "center",
      },

      {
        externalFilter: true,
        name: "destinationProvider",
        label: "destinationProvider",
        align: "center",
        searchParam: "name",
        list: "people/getItems",
        formatList(value, column) {
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: value.name + " - " + value.alias,
            };
        },
        format: (val) => (val ? `${val.name} - ${val.alias}` : ""),
      },
      {
        prefix: "R$ ",
        filter: false,
        name: "price",
        label: "price",
        align: "right",
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(value) {
          return formatFloat(value);
        },
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
      {
        prefix: "R$ ",
        filter: false,
        name: "amountPaid",
        label: "amountPaid",
        align: "right",
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(value) {
          return formatFloat(value);
        },
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
      {
        prefix: "R$ ",
        editable: false,
        filter: false,
        name: "balance",
        label: "balance",
        align: "right",
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(value) {
          return formatFloat(value);
        },
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
      {
        externalFilter: true,
        inputType: "date-range",
        name: "estimatedShippingDate",
        label: "estimatedShippingDate",
        align: "right",
        saveFormat: function (value) {
          return buildAmericanDate(value);
        },
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val) : ""),
      },
      {
        externalFilter: true,
        inputType: "date-range",
        name: "shippingDate",
        label: "shippingDate",
        align: "right",
        saveFormat: function (value) {
          return buildAmericanDate(value);
        },
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val) : ""),
      },
      {
        externalFilter: true,
        inputType: "date-range",
        name: "estimatedArrivalDate",
        label: "estimatedArrivalDate",
        align: "right",
        saveFormat: function (value) {
          return buildAmericanDate(value);
        },
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val) : ""),
      },
      {
        externalFilter: true,
        inputType: "date-range",
        name: "arrivalDate",
        label: "arrivalDate",
        align: "right",
        saveFormat: function (value) {
          return buildAmericanDate(value);
        },
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val) : ""),
      },
      {
        editable: false,
        type: "range-date",
        name: "lastModified",
        label: "lastModified",
        align: "center",
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val, true) : ""),
      },
      {
        editable: false,
        name: "created_by",
        label: "created_by",
        align: "right",
        format: (val) => (val ? `${val.name}` : ""),
      },
    ],
  },
  actions: actions,
  getters,
  mutations,
};
