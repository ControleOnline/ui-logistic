<template>
  <div>
    <div class="col-12">
      <!-- <div class="row q-mb-md">
        <q-btn
          :loading="addLoading"
          :disable="addDisable"
          label="Adicionar"
          icon="add"
          color="primary"
          class="full-width"
          @click="addSurvey"
        />
      </div> -->
    </div>
    <div v-if="generalWarningVisible" class="aviso_alerta q-mt-lg">
      <q-icon name="warning" class="text-red" style="font-size: 4rem" />
      <q-banner dense inline-actions class="text-white bg-red q-pa-xs">
        <span
          v-html="
            '<strong>Vistoria não ativada para este tipo de Ocorrência</strong> - order_id em task null'
          "
          style="font-size: 14px"
        >
        </span>
      </q-banner>
    </div>
    <q-table
      v-if="visibleQtable"
      :loading="isLoading"
      :rows="data"
      :columns="settings.columns"
      v-model:pagination="pagination"
      row-key="id"
      :visible-columns="settings.visibleColumns"
      style="min-height: 90vh"
      :flat="true"
      :rows-per-page-options="[5, 10, 15, 20, 25, 50]"
    >
      <template v-slot:body="props">
        <q-tr :props="props" :ref="'linha' + props.row.id">
          <q-td key="id" :props="props">
            <q-btn
              outline
              dense
              type="a"
              :href="'task/checklist/id/' + props.row.id + '/' + props.row.token_url"
              target="_blank"
              icon-right="visibility"
              class="q-mr-sm btn-primary"
            />
            #{{ props.row.id }}
          </q-td>
          <q-td key="client_name" :props="props">{{ props.row.client_name }}</q-td>
          <q-td key="vehicle" :props="props">{{ props.row.vehicle }}</q-td>
          <q-td key="date" :props="props">{{ props.row.date }}</q-td>
          <q-td key="type_survey" :props="props">{{ props.cols[4].value }}</q-td>
          <q-td key="status" :props="props">
            <q-badge
              :color="colorStatus(props.row.status)"
              class="q-pa-xs"
              style="padding-left: 10px"
            >
              {{ props.cols[5].value }}
              <q-btn
                class="mypersonalized btn-primary"
                size="8px"
                rounded
                flat
                style="margin-left: 8px; margin-right: 2px; padding: 0px 0px"
                @click="editStatus(props.row.status, props.row.id)"
              >
                <q-icon name="mode_edit" class="green-3" style="font-size: 17px" />
              </q-btn>
            </q-badge>
          </q-td>
          <q-td key="acoes" :props="props">
            <div
              v-if="props.row.status !== 'canceled'"
              class="row q-gutter-xs items-center justify-center"
            >
              <q-btn
                class="btn-danger"
                label="Cancelar"
                size="sm"
                @click="cancelConfirm(props.row.id)"
                :loading="false"
              />
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
    <q-dialog v-model="confirmCancel" persistent>
      <q-card style="width: 600px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="delete" color="red" text-color="white" />
          <div class="text-h6 q-ml-md">Cancelar Registro de Vistoria</div>
          <q-space />
          <q-btn
          class="btn-danger"
            icon="close"
            @click="setClassRow(idRowToDelete, false)"
            flat
            round
            dense
            v-close-popup
          />
        </q-card-section>
        <q-card-section class="row items-center">
          <span class="q-ml-sm" v-html="msgCancel"></span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
          class="btn-danger"
            flat
            label="Desistir"
            color="primary"
            @click="setClassRow(idRowToDelete, false)"
            v-close-popup
          />
          <q-btn
            flat
            label="Sim"
            class="btn-primary"
            @click="changeStatusSurvey(idRowToDelete, 'canceled', 'dialogDelete')"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="editDialog.visible" persistent>
      <q-card style="width: 600px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="mode_edit" color="blue-8" text-color="white" />
          <div class="text-h6 q-ml-md">
            Alterar Status da Vistoria - ID: #{{ editDialog.msgId }}
          </div>
          <q-space />
          <q-btn
          class="btn-primary"
            icon="close"
            @click="setClassRow(idRowToDelete, false)"
            flat
            round
            dense
            v-close-popup
          />
        </q-card-section>
        <q-card-section class="row items-center justify-center">
          <q-select
            dense
            outlined
            v-model="editDialog.status"
            :options="status_survey"
            label="Selecione o Novo Status"
            style="width: 200px"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
          class="btn-primary"
            icon="save"
            label="Salvar"
            size="md"
            :loading="editDialog.saveButtonIsLoading"
            @click="
              changeStatusSurvey(
                editDialog.idRowChangeStatus,
                editDialog.status.value,
                'dialogChange'
              )
            "
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import axios from "axios";


function findIn(obj, search) {
  let tmp = obj.find((c) => c.value === search);
  return tmp.label;
}

export default {
  name: "SurveysCollection",
  props: {
    orderId: {
      type: Number,
      required: true,
    },
  },
  data() {
    let statuses = [{ label: "Todos", value: -1 }];
    return {
      idRowToDelete: null,
      msgCancel: null,
      editDialog: {
        visible: false,
        saveButtonIsLoading: false,
        msgId: "",
        idRowChangeStatus: null,
        status: [],
      },
      confirmCancel: false,
      addLoading: false,
      addDisable: true,
      visibleQtable: true,
      generalWarningVisible: false,
      filters: {
        status: statuses[0],
      },
      statuses: statuses,
      loadingStatuses: false,
      settings: {
        visibleColumns: [
          "id",
          "client_name",
          "vehicle",
          "date",
          "type_survey",
          "status",
          "acoes",
        ],
        columns: [
          {
            name: "id",
            field: "id",
            align: "left",
            label: "ID",
          },
          {
            name: "client_name",
            field: "client_name",
            align: "left",
            label: "Cliente",
          },
          {
            name: "vehicle",
            field: "vehicle",
            align: "left",
            label: "Veículo",
          },
          {
            name: "date",
            field: "date",
            align: "left",
            label: "Data",
          },
          {
            name: "type_survey",
            field: "type_survey",
            align: "left",
            label: "Tipo",
            format: (val, row) => {
              if (val === null) {
                return "";
              }
              return findIn(this.options_type_survey, val);
            },
          },
          {
            name: "status",
            field: "status",
            align: "left",
            label: "Status",
            format: (val, row) => {
              return findIn(this.status_survey, val);
            },
          },
          {
            name: "acoes",
            field: (row) => row.id,
            align: "center",
            label: "Ações",
          },
        ],
      },
      data: [],
      isLoading: true,
      searchBy: "",
      pagination: {
        sortBy: "name",
        descending: false,
        page: 1,
        rowsPerPage: 10,
        rowsNumber: 10,
      },
      options_type_survey: [
        {
          label: "Coleta",
          value: "collect",
        },
        {
          label: "Entrega",
          value: "delivery",
        },
        {
          label: "Outros",
          value: "others",
        },
      ],
      status_survey: [
        {
          label: "Completo",
          value: "complete",
        },
        {
          label: "Pendente",
          value: "pending",
        },
        {
          label: "Cancelado",
          value: "canceled",
        },
      ],
    };
  },
  methods: {
    isInvalid(key) {
      return (val) => {
        switch (key) {
          case "status":
            if (val === null) {
              return "Deve ser selecionado";
            }
            break;
          default:
            if (!(val && val.length > 0)) return "Este campo é obrigatório";
        }
      };
    },
    editStatus(currentStatus, id) {
      this.editDialog.msgId = id;
      this.editDialog.idRowChangeStatus = id;
      this.editDialog.status = this.status_survey.find((c) => c.value === currentStatus);
      this.editDialog.visible = true;
      this.setClassRow(id, true, "bg-cyan-6 text-white");
    },
    colorStatus(status) {
      switch (status) {
        case "complete":
          return "green";
          break;
        case "pending":
          return "blue-grey-6";
          break;
        case "canceled":
          return "red-6";
          break;
        default:
          break;
      }
    },
    /**
     *
     * @param id
     * @param status
     * @param origem ('dialogDelete','dialogChange')
     */
    changeStatusSurvey(id, status, origem) {
      this.isLoading = true;

      let params = {
        status: status,
      };

      axios({
        url:
          this.$entrypoint +
          `/order_logistic_surveys/${id}/surveys/status_update?timestamp=${new Date().getTime()}`,
        params,
        method: "PUT",
        headers: { "api-token": this.API.token },
      }).then((response) => {
        let data = response.data.response;

        if (!data.success) {
          // Quando Falha
          this.alertNotify(data.message, "n");
          this.isLoading = false;
          this.setClassRow(id, false);
        }

        if (data.success) {
          // Quando tem Êxito
          this.callAjaxGetCollection(this.orderId).then((response) => {
            this.alertNotify(
              `Vistoria de ID:${id} teve o status alterado para: ` +
                this.status_survey[
                  this.status_survey.indexOf(
                    this.status_survey.find((c) => c.value === status)
                  )
                ].label,
              "p"
            );
            this.setClassRow(id, false);
          });
        }
      });
    },
    setClassRow(id, action, classe) {
      if (action) {
        this.idRowToDelete = id;
        this.$refs["linha" + id].$el.classList.value = classe;
      } else {
        this.idRowToDelete = null;
        this.$refs["linha" + id].$el.classList.value = "";
      }
    },
    cancelConfirm(id) {
      let data = this.data.find((i) => i.id === id);
      this.setClassRow(id, true, "bg-deep-orange-10 text-white");
      let company = data.company;
      let msg = "";
      msg += "Você deseja realmente Cancelar a Vistoria:<br>";
      msg += `ID: ${id}`;
      this.msgCancel = msg;
      this.confirmCancel = true;
    },
    addSurvey() {
      this.addLoading = true;
      this.callAjaxAddNewSurvey(this.orderId);
    },
    /**
     * Exibe Alerta Positivo ou Negativo
     * @param msg
     * @param tipo ('n','p')
     */
    alertNotify(msg, tipo) {
      let status = tipo === "n" ? "negative" : "positive";
      this.$q.notify({
        message: msg,
        html: true,
        group: false,
        multiLine: true,
        position: "bottom",
        type: status,
      });
    },
    callAjaxAddNewSurvey(orderId) {
      axios({
        url:
          this.$entrypoint +
          `/tasks_surveys/${orderId}/surveys?timestamp=${new Date().getTime()}`,
        method: "POST",
        headers: { "api-token": this.API.token },
      }).then((response) => {
        let data = response.data.response;

        if (!data.success) {
          // Quando Falha
          this.alertNotify(data.message, "n");
        }

        if (data.success) {
          // Quando tem Êxito
          this.callAjaxGetCollection(this.orderId);
          this.alertNotify("Registro de Vistoria Adicionado com Êxito.", "p");
        }

        this.addLoading = false;
      });
    },
    callAjaxGetCollection(orderId) {
      this.isLoading = true;
      return axios({
        url: this.$entrypoint + `/order_logistics_surveys/surveys/${orderId}`,
        method: "get",
        headers: { "api-token": this.API.token },
      }).then((response) => {
        console.log("response", response);
        let data = response.data.response;

        if (!data.success) {
          // Quando falha o retorno dos dados
          let allowSurvey = data.allow_survey;
          if (!allowSurvey) {
            this.visibleQtable = false;
            this.generalWarningVisible = true;
          } else {
            this.addDisable = false;
            this.alertNotify(data.message, "n");
          }
          this.data = [];
        }

        if (data.success) {
          // Quando os dados são retornados com êxito

          let allowSurvey = data.allow_survey;
          if (!allowSurvey) {
            this.visibleQtable = false;
            this.generalWarningVisible = true;
          } else {
            this.addDisable = false;
          }

          let _data = [];

          for (let index in data.data) {
            let item = data.data[index];
            _data.push({
              id: item.id,
              token_url: item.token_url,
              client_name: item.client_name,
              vehicle: item.vehicle,
              date: item.date,
              type_survey: item.type_survey,
              status: item.status,
            });
          }

          this.data = _data;
        }

        this.isLoading = false;
      });
    },
  },
  mounted() {
    this.callAjaxGetCollection(this.orderId);
  },
};
</script>

<style>
.mypersonalized .q-btn__wrapper {
  padding: 4px 4px !important;
}
</style>

<style scoped>
.aviso_alerta {
  display: flex;
  align-content: center;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
</style>
