<template>
  <q-page padding>
    <q-card style="min-height: 90vh">
      <q-card-section>
        <div class="row">
          <div class="col-12">
            <ChecklistDetails
                :wheels_options="wheels_options"
                :accessories_options="accessories_options"
                :carcase_options="carcase_options"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>
<script>

export default {
  components: {
    ChecklistDetails,
  },
  data() {
    return {
      carcase_options: [
        {
          label: "Bom",
          value: "good",
          color: "green"
        },
        {
          label: "Regular",
          value: "steady",
          color: "yellow"
        },
        {
          label: "Ruim",
          value: "poor",
          color: "red"
        }
      ],
      accessories_options: [
        {
          label: "Sim",
          value: "yes",
          color: "green"
        },
        {
          label: "Não",
          value: "no",
          color: "red"
        }
      ],
      wheels_options: [
        {
          label: "Bom",
          value: "good",
          color: "green"
        },
        {
          label: "Regular",
          value: "steady",
          color: "yellow"
        },
        {
          label: "Ruim",
          value: "poor",
          color: "red"
        },
        {
          label: "Falta",
          value: "missed",
          color: "grey"
        }
      ]
    };
  },
};
</script>
