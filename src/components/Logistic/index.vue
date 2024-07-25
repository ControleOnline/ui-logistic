<template>
  <DefaultTable :configs="configs"></DefaultTable>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import DefaultTable from "@controleonline/ui-default/src/components/Default/DefaultTable.vue";
import * as DefaultFiltersMethods from "@controleonline/ui-default/src/components/Default/Scripts/DefaultFiltersMethods";

export default {
  props: {
    orderId: {
      type: Number,
      required: false,
    },
  },

  components: {
    DefaultTable,
  },
  created() {
    if (this.orderId) {
      let columns = this.columns.map((column) => {
        if (column.name === "order") {
          return { ...column, filter: false, externalFilter: false };
        }
        return { ...column, externalFilter: false };
      });
      this.addFilter("order", this.orderId);

      this.$store.commit(this.configs.store + "/SET_COLUMNS", columns);
    }
  },
  data() {
    return {
      context: "logistic",
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
    }),
    filters() {
      return this.$copyObject(
        this.$store.getters[this.configs.store + "/filters"]
      );
    },
    columns() {
      return this.$copyObject(
        this.$store.getters[this.configs.store + "/columns"]
      );
    },
    configs() {
      return {
        store: "logistic",
        categories: ["logistic"],
        add: true,
        filters: true,
        editable: true,
        delete: true,
        selection: false,
        search: false,
        columns: {
          destinationType: {
            filters: {
              context: this.context,
              company: "/people/" + this.myCompany.id,
            },
          },
          originType: {
            filters: {
              context: this.context,
              company: "/people/" + this.myCompany.id,
            },
          },
          status: {
            filters: {
              context: this.context,
            },
          },
        },
      };
    },
  },

  methods: {
    ...DefaultFiltersMethods,
  },
};
</script>
