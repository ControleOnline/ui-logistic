<template>
  <div style="position: relative">
    <div v-if="generalWarningVisible" class="aviso_alerta">
      <q-icon name="warning" class="text-red" style="font-size: 14rem" />
      <q-banner dense inline-actions class="text-white bg-red q-pa-lg">
        <span v-html="htmlGeneralFailureWarning" style="font-size: 18px"> </span>
      </q-banner>
    </div>
    <div v-if="generalContentVisible">
      <q-form @submit="onSubmit" class="q-mt-sm" ref="myForm">
        <div class="q-pb-lg">
          <div class="row justify-center">
            <h5 class="no-padding no-margin">
              Vistoria ID: #{{ route.orderLogisticSurveys_id }}
            </h5>
          </div>
        </div>

        <q-list bordered class="rounded-borders">
          <q-expansion-item expand-separator group="somegroup" default-opened>
            <template v-slot:header>
              <q-item-section avatar class="avatar_margin">
                <q-avatar icon="source" size="48px" />
              </q-item-section>
              <q-item-section> Dados Principais </q-item-section>
              <q-item-section side>
                <div class="row items-center">
                  <q-badge :color="status.bgColor" class="text-subtitle1 q-mr-md">
                    {{ main_data_survey.status }}
                  </q-badge>
                  <q-badge
                    v-if="!verifyAllFields('main_data')"
                    color="red"
                    class="text-subtitle1 q-mr-md"
                  >
                    Campos vazios
                  </q-badge>
                </div>
              </q-item-section>
            </template>

            <div class="row q-px-md q-pt-md q-col-gutter-md">
              <div class="col-12 text-center" v-if="main_data_survey.updated_at">
                {{ main_data_survey.updated_at }}
              </div>
              <div class="col-sm-6 col-12">
                <q-input
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.customer"
                  standout
                  label="Cliente Nome"
                  tabindex="-1"
                  readonly
                />
              </div>
              <div class="col-sm-6 col-12">
                <q-input
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.customer_email"
                  standout
                  label="Email do Cliente"
                  tabindex="-1"
                  readonly
                >
                  <template v-slot:prepend>
                    <q-icon name="mail" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-pa-md q-col-gutter-md">
              <div class="col-sm-4 col-12">
                <q-input
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.vehicle_name"
                  standout
                  label="Veiculo"
                  tabindex="-1"
                  readonly
                />
              </div>
              <div class="col-sm-4 col-12">
                <q-input
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.vehicle_plate"
                  standout
                  label="Placa"
                  tabindex="-1"
                  readonly
                />
              </div>
              <div class="col-sm-4 col-12">
                <q-input
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.vehicle_color"
                  standout
                  label="Cor"
                  tabindex="-1"
                  readonly
                />
              </div>
            </div>

            <div class="row q-pa-md q-col-gutter-md">
              <div class="col-sm-4 col-12">
                <q-select
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.type_survey"
                  :options="options_type_survey"
                  label="Tipo Vistoria"
                  :rules="[isInvalid('type_survey')]"
                  :readonly="generalLock.readOnly"
                  :bg-color="generalLock.bgColor"
                />
              </div>

              <div class="col-sm-4 col-12">
                <q-input
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.surveyor_email"
                  label="E-Mail Vistoriador"
                  :rules="[isInvalid('email')]"
                  @blur="onBlur('surveyor_email_inp')"
                  debounce="300"
                  @update:model-value="surveyorEmailInputChangeValue"
                  autocomplete="off"
                  :readonly="generalLock.readOnly"
                  :bg-color="generalLock.bgColor"
                >
                  <template v-slot:prepend>
                    <q-icon name="mail" />
                  </template>
                </q-input>
              </div>

              <div class="col-sm-4 col-12">
                <q-input
                  dense
                  outlined
                  ref="surveyor_name_inp"
                  :tabindex="tabIndexInp.surveyor_name"
                  class="full-width"
                  v-model="main_data_survey.surveyor_name"
                  label="Nome Vistoriador"
                  :readonly="readonly.surveyor_name_inp || generalLock.readOnly"
                  @click="clickSurveyorTextField"
                  @focus="onFocus('surveyor_name_inp')"
                  :loading="loading.surveyor_name_inp"
                  autocomplete="off"
                  :rules="[isInvalid('surveyor_name')]"
                  :bg-color="generalLock.bgColor"
                />
              </div>
            </div>

            <div class="row q-px-md q-pb-md q-col-gutter-md">
              <div class="col-sm-4 col-12">
                <q-input
                  dense
                  outlined
                  type="number"
                  class="full-width"
                  v-model="main_data_survey.vehicle_km"
                  label="Km Odômetro"
                  suffix="Km"
                  :rules="[isInvalid('vehicle_km')]"
                  :readonly="generalLock.readOnly"
                  :bg-color="generalLock.bgColor"
                />
              </div>
              <div class="col-sm-4 col-12">
                <q-select
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.vehicle_fuel"
                  :options="fuel_options"
                  label="Combustível"
                  :rules="[isInvalid('vehicle_fuel')]"
                  :readonly="generalLock.readOnly"
                  :bg-color="generalLock.bgColor"
                />
              </div>
              <div class="col-sm-4 col-12">
                <q-select
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.belongings_removed"
                  :options="options_no_yes"
                  label="Pertences Retirados"
                  :rules="[isInvalid('belongings_removed')]"
                  :readonly="generalLock.readOnly"
                  :bg-color="generalLock.bgColor"
                />
              </div>
            </div>

            <div class="row q-px-md q-pb-md q-col-gutter-md">
              <div class="col-12">
                <q-select
                  dense
                  outlined
                  class="full-width"
                  v-model="main_data_survey.service_location.model"
                  use-input
                  use-chips
                  input-debounce="0"
                  label="Local Atendimento"
                  :options="main_data_survey.service_location.options"
                  @filter="serviceLocationFilterFn"
                  @filter-abort="serviceLocationAbortFilterFn"
                  @update:model-value="serviceLocationGetSelection"
                  :readonly="readonly.service_location_inp || generalLock.readOnly"
                  :loading="loading.service_location_inp"
                  :rules="[isInvalid('service_location')]"
                  :bg-color="generalLock.bgColor"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey"> Sem resultado </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
            </div>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="verified"
            group="somegroup"
            label="Condições Gerais"
          >
            <template v-slot:header>
              <q-item-section avatar class="avatar_margin">
                <q-avatar icon="source" size="48px" />
              </q-item-section>
              <q-item-section> Condições Gerais </q-item-section>
              <q-item-section side>
                <div class="row items-center">
                  <q-badge
                    v-if="!verifyAllFields('general_conditions')"
                    color="red"
                    class="text-subtitle1 q-mr-md"
                  >
                    Campos vazios
                  </q-badge>
                </div>
              </q-item-section>
            </template>

            <div class="row">
              <div
                v-for="(field, i) in carcase_fields"
                :key="i"
                class="col-sm-4 col-12 text-center"
              >
                <span :id="'carcase_fields_' + i" class="text-bold">
                  {{ field.label }}</span
                >
                <q-field
                  borderless
                  dense
                  v-model="group[field.value]"
                  :rules="[isInvalidOptions('carcase_fields_' + i)]"
                  :bg-color="generalLock.bgColor"
                >
                  <q-option-group
                    v-model="group[field.value]"
                    :options="carcase_options"
                    inline
                    :disable="generalLock.readOnly"
                    class="full-width text-center q-pr-sm"
                  />
                </q-field>
                <q-separator />
              </div>
            </div>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="drive_eta"
            label="Rodas"
            group="somegroup"
          >
            <template v-slot:header>
              <q-item-section avatar class="avatar_margin">
                <q-avatar icon="source" size="48px" />
              </q-item-section>
              <q-item-section> Rodas </q-item-section>
              <q-item-section side>
                <div class="row items-center">
                  <q-badge
                    v-if="!verifyAllFields('wheels')"
                    color="red"
                    class="text-subtitle1 q-mr-md"
                  >
                    Campos vazios
                  </q-badge>
                </div>
              </q-item-section>
            </template>

            <div class="row">
              <div
                v-for="(field, i) in wheels_fields"
                :key="i"
                class="col-sm-4 col-12 text-center"
              >
                <span :id="'wheels_fields_' + i" class="text-bold">
                  {{ field.label }}</span
                >
                <q-field
                  class="qfield_aqui"
                  borderless
                  dense
                  v-model="group[field.value]"
                  :rules="[isInvalidOptions('wheels_fields_' + i)]"
                  :bg-color="generalLock.bgColor"
                >
                  <q-option-group
                    required
                    v-model="group[field.value]"
                    :options="wheels_options"
                    inline
                    :disable="generalLock.readOnly"
                    class="full-width text-center q-pr-sm"
                  />
                </q-field>
                <q-separator />
              </div>
            </div>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="tungsten"
            label="Acessórios"
            group="somegroup"
          >
            <template v-slot:header>
              <q-item-section avatar class="avatar_margin">
                <q-avatar icon="source" size="48px" />
              </q-item-section>
              <q-item-section> Acessórios </q-item-section>
              <q-item-section side>
                <div class="row items-center">
                  <q-badge
                    v-if="!verifyAllFields('accessories')"
                    color="red"
                    class="text-subtitle1 q-mr-md"
                  >
                    Campos vazios
                  </q-badge>
                </div>
              </q-item-section>
            </template>
            <div class="row">
              <div
                v-for="(field, i) in accessories_fields"
                :key="i"
                class="col-sm-3 col-12 text-center"
              >
                <span :id="'accessories_fields_' + i" class="text-bold">
                  {{ field.label }}</span
                >
                <q-field
                  class="qfield_aqui"
                  borderless
                  dense
                  v-model="group[field.value]"
                  :rules="[isInvalidOptions('accessories_fields_' + i)]"
                  :bg-color="generalLock.bgColor"
                >
                  <q-option-group
                    required
                    v-model="group[field.value]"
                    :options="accessories_options"
                    color="primary"
                    inline
                    :disable="generalLock.readOnly"
                    class="full-width text-center q-pr-sm"
                  />
                </q-field>
                <q-separator />
              </div>
            </div>
          </q-expansion-item>

          <q-expansion-item expand-separator icon="image" label="Fotos" group="somegroup">
            <div class="row">
              <template>
                <div class="q-pa-sm-md q-pt-sm-lg q-pb-sm-none">
                  <q-uploader
                    ref="qup"
                    field-name="file"
                    label="Selecione JPG ou PNG fotos"
                    auto-upload
                    :url="qUpUrlUpload"
                    multiple
                    square
                    flat
                    accept="image/jpeg,image/png"
                    @finish="qUpFinishUploadAll"
                    @uploaded="qUploaded"
                    @added="qUpAddFiles"
                    @rejected="qUpRejected"
                    :disable="generalLock.readOnly"
                  />
                </div>
              </template>
            </div>

            <div class="row q-ml-sm-md" style="position: relative">
              <q-card
                v-for="(field, i) in photoGallery"
                :key="i"
                flat
                bordered
                class="my-card q-ml-sm-sm q-mb-lg"
              >
                <q-card-section>
                  <div>
                    <q-select
                      dense
                      outlined
                      v-model="galleryModels.region['photoId' + field.id]"
                      :options="region"
                      label="Região"
                      :outlined="generalLock.readOnly"
                      :rules="[isInvalid('service_location')]"
                      :readonly="generalLock.readOnly"
                      :bg-color="generalLock.bgColor"
                    />
                  </div>
                </q-card-section>
                <q-img
                  style="cursor: pointer"
                  :src="field.path_thumb"
                  :ratio="4 / 3"
                  @click="openModalViewPhoto(field.path_real_size, field.id)"
                />
                <q-card-section>
                  <div>
                    <q-select
                      dense
                      outlined
                      v-model="galleryModels.breakdown['photoId' + field.id]"
                      :options="breakdown"
                      label="Avaria"
                      :outlined="generalLock.readOnly"
                      :rules="[isInvalid('service_location')]"
                      :readonly="generalLock.readOnly"
                      :bg-color="generalLock.bgColor"
                    />
                  </div>
                </q-card-section>
              </q-card>

              <q-inner-loading :showing="loading.galerry">
                <q-spinner-gears size="120px" color="blue-grey-6" />
              </q-inner-loading>
            </div>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="info"
            label="Observações"
            group="somegroup"
          >
            <div class="row q-pa-md">
              <h6 class="no-margin">Observações</h6>
              <textarea
                v-model="main_data_survey.comments"
                class="full-width my_text_area"
                rows="10"
                v-bind:style="
                  generalLock.readOnly
                    ? 'background-color: #ECEFF1;padding: 7px;'
                    : 'padding: 7px;'
                "
                :readonly="generalLock.readOnly"
              >
              </textarea>
            </div>
            <div class="row q-pa-md">
              <q-checkbox
                class="q-py-lg"
                v-model="group.dirty"
                label="Veículo muito sujo, sem condições de apuração detalhada da lataria, não nos responsabilizamos por arranhões que venham a ser identificados após a lavagem."
                :disable="generalLock.readOnly"
              />
            </div>
          </q-expansion-item>
        </q-list>

        <div class="q-pa-md">
          A empresa não se responsabiliza pelos seguintes defeitos do veículo: Descarga da
          bateria, total ou parcial, queima de farol, luzes ou celibim, ou qualquer mal
          funcionamento do motor, vazamento do radiador, mangueiras ou correias
          arrebentadas, caixa escapando, disco platinado, objetos de valor, dinheiro,
          jóias, armas e documentos sob hipótese alguma.
        </div>

        <div class="row">
          <q-btn
            type="submit"
            icon="save"
            label="Salvar"
            size="md"
            class="q-mt-md full-width btn-primary"
            :loading="loading.btn_save"
            :disable="generalLock.readOnly"
          />
        </div>
      </q-form>
    </div>
    <q-dialog v-model="modalViewPhoto" transition-show="rotate" transition-hide="rotate">
      <q-card style="width: 100%; max-width: unset">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6" v-html="dialogModalTextTop"></div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <q-img
            :src="urlPhotoModal"
            spinner-color="red"
            style="width: 100%; min-height: 200px"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import axios from "axios";
import { mapGetters } from "vuex";


function findIn(obj, search) {
  return obj.find((c) => c.value === search);
}

export default {
  props: {
    carcase_options: {
      type: Array,
      required: true,
    },
    accessories_options: {
      type: Array,
      required: true,
    },
    wheels_options: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      generalLock: {
        readOnly: false,
        bgColor: null,
      },
      status: {
        bgColor: null,
      },
      dialogModalTextTop: null,
      urlPhotoModal: null,
      modalViewPhoto: false,
      photoGallery: null,
      qUpUrlUpload: null,
      generalContentVisible: true,
      generalWarningVisible: false,
      htmlGeneralFailureWarning: null,
      intervalo: null,
      storage: {
        defaultCompanyId: null,
      },
      route: {
        orderLogisticSurveys_id: this.$route.params.id,
        token_url: this.$route.params.token_url,
      },
      tabIndexInp: {
        surveyor_name: -1,
      },
      loading: {
        surveyor_name_inp: false,
        service_location_inp: true,
        btn_save: false,
        galerry: false,
      },
      readonly: {
        surveyor_name_inp: true,
        service_location_inp: true,
      },
      galleryModels: {
        region: {},
        breakdown: {},
      },
      surveyor_validations: {
        // Monitora status para preenchimento automático do campo do Vistoriador (nome) com base no email informado
        mail_validate_ok: false,
        mail_consulted_bd: false,
        mail_existis_bd: false,
        lastMailVerifiedInBD: null,
        foundMailInDatabase: false,
      },
      main_data_survey: {
        status: null,
        comments: null,
        surveyor_people_id: null,
        updated_at: null,
        type_survey: null,
        customer: null,
        customer_email: null,
        surveyor_email: null,
        surveyor_name: null,
        vehicle_name: null,
        vehicle_km: null,
        vehicle_fuel: {
          label: "Completo",
          value: "f",
        },
        vehicle_plate: null,
        vehicle_color: null,
        belongings_removed: null,
        service_location: {
          selectedTrainedId: null,
          selectedAddressId: null,
          model: null,
          optionsLoadedAjax: null,
          optionsLoadedAjaxFormated: [],
          options: [],
        },
      },
      fuel_options: [
        {
          label: "Completo",
          value: "f",
        },
        {
          label: "3/4",
          value: "34",
        },
        {
          label: "1/2",
          value: "12",
        },
        {
          label: "Reserva",
          value: "r",
        },
        {
          label: "Vazio",
          value: "e",
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
      options_no_yes: [
        {
          label: "Não",
          value: "no",
        },
        {
          label: "Sim",
          value: "yes",
        },
      ],
      group: {
        paint: null, // Pintura
        lining: null, // Forração
        tapestry: null, // Tapeçaria
        left_front_tire: null, // Pneu Dianteiro Esquerdo
        right_front_tire: null, // Pneu Dianteiro Direito
        left_rear_tire: null, // Pneu Traseiro Esquerdo
        right_rear_tire: null, // Pneu Traseiro Direito
        spare: null, // Stepe
        cigarette_lighter: null, // Acendedor de Cigarros
        air_conditioning: null, // Ar Condicionado
        common_antenna: null, // Antena Comum
        horn: null, // Buzina
        seat_belt: null, // Cinto de Segurança
        carpets: null, // Tapetes
        battery: null, // Bateria
        speaker: null, // Alto Falante
        hubcap: null, // Calota
        hitch: null, // Engate
        auxiliary_headlight: null, // Farol Auxiliar
        common_wheel: null, // Roda Comum
        special_wheel: null, // Roda Especial
        radio_cd: null, // Radio CD
        radio_fm: null, // Radio AM/FM
        document: null, // Documento
        manual: null, // Manual
        keys: null, // Chave
        extra_key: null, // Chave Reserva
        back_cap: null, // Tampão Traseiro
        extinguisher: null, // Extintor
        triangle: null, // Triângulo
        jack: null, // Macaco
        tire_iron: null, // Chave de Roda
        screwdriver: null, // Chave de Fenda
        dirty: false, // Veículo muito Sujo
      },
      carcase_fields: [
        {
          label: "Pintura",
          value: "paint",
        },
        {
          label: "Forração",
          value: "lining",
        },
        {
          label: "Tapeçaria",
          value: "tapestry",
        },
      ],
      region: [
        {
          label: "Frente",
          value: "front",
        },
        {
          label: "Lateral Esquerda",
          value: "left_side",
        },
        {
          label: "Lateral Direita",
          value: "right_side",
        },
        {
          label: "Traseira",
          value: "rear",
        },
        {
          label: "Painel",
          value: "panel",
        },
        {
          label: "Motor",
          value: "motor",
        },
        {
          label: "Outros",
          value: "others",
        },
      ],
      breakdown: [
        {
          label: "Nenhuma",
          value: "none",
        },
        {
          label: "Amassado",
          value: "kneaded",
        },
        {
          label: "Falta",
          value: "absence",
        },
        {
          label: "Pique",
          value: "chop",
        },
        {
          label: "Quebrado",
          value: "broke",
        },
        {
          label: "Riscado",
          value: "scratched",
        },
        {
          label: "Trincado",
          value: "cracked",
        },
      ],
      accessories_fields: [
        {
          label: "Acendedor de Cig.",
          value: "cigarette_lighter",
        },
        {
          label: "Ar Condicionado",
          value: "air_conditioning",
        },
        {
          label: "Antena Comum",
          value: "common_antenna",
        },
        {
          label: "Buzina",
          value: "horn",
        },
        {
          label: "Cinto de Segurança",
          value: "seat_belt",
        },
        {
          label: "Tapetes",
          value: "carpets",
        },
        {
          label: "Bateria",
          value: "battery",
        },
        {
          label: "Auto falante",
          value: "speaker",
        },
        {
          label: "Calota",
          value: "hubcap",
        },
        {
          label: "Engate",
          value: "hitch",
        },
        {
          label: "Farol Auxiliar",
          value: "auxiliary_headlight",
        },
        {
          label: "Roda Comum",
          value: "common_wheel",
        },
        {
          label: "Roda Especial",
          value: "special_wheel",
        },
        {
          label: "Rádio CD",
          value: "radio_cd",
        },
        {
          label: "Rádio AM/FM",
          value: "radio_fm",
        },
        {
          label: "Documento",
          value: "document",
        },
        {
          label: "Manual",
          value: "manual",
        },
        {
          label: "Chave",
          value: "keys",
        },
        {
          label: "Chave Reserva",
          value: "extra_key",
        },
        {
          label: "Tampão Traseiro",
          value: "back_cap",
        },
        {
          label: "Extintor",
          value: "extinguisher",
        },
        {
          label: "Triângulo",
          value: "triangle",
        },
        {
          label: "Macaco",
          value: "jack",
        },
        {
          label: "Chave de Roda",
          value: "tire_iron",
        },
        {
          label: "Chave de Fenda",
          value: "screwdriver",
        },
      ],
      wheels_fields: [
        {
          label: "Pneu Diant. Esq.",
          value: "left_front_tire",
        },
        {
          label: "Pneu Diant. Dir.",
          value: "right_front_tire",
        },
        {
          label: "Pneu Tras. Esq.",
          value: "left_rear_tire",
        },
        {
          label: "Pneu Tras. Dir.",
          value: "right_rear_tire",
        },
        {
          label: "Estepe",
          value: "spare",
        },
      ],
    };
  },
  computed: {
    ...mapGetters({
      defaultCompany: "people/defaultCompany",
    }),
    contextField() {
      return {
        main_data: [],
        general_conditions: [],
        wheels: [],
        accessories: [],
      };
    },
  },
  beforeCreate() {
    // this.$q.loading.show();
  },
  mounted() {
    // this.carcase_options[0].color = "green";
    // this.carcase_options[1].color = "yellow";
    // this.carcase_options[2].color = "red";

    // this.wheels_options[0].color = "green";
    // this.wheels_options[1].color = "yellow";
    // this.wheels_options[2].color = "red";
    // this.wheels_options[3].color = "grey";

    // this.accessories_options[0].color = "green";
    // this.accessories_options[1].color = "red";

    if (!this.intervalo && !this.storage.defaultCompanyId) {
      this.intervalo = setInterval(() => {
        if (this.defaultCompany !== null) {
          this.storage.defaultCompanyId = this.defaultCompany.id;
          this.callAjaxGetAllPeopleTrainerByDefaultCompanyId(
            this.storage.defaultCompanyId
          ).then((data) => {
            // this.preencheTeste();
            this.callAjaxGetOneSurveyById();
          });
          clearInterval(this.intervalo);
        }
      }, 50);
    }
    this.$q.loading.hide();
    // this.surveyInfo();
  },
  watch: {
    deep: true,
    // --- Observa o TextField 'Vistoriador Nome' se está como somente leitura(readonly:true) ou editável (readonly: false)
    "readonly.surveyor_name_inp": function (val, oldVal) {
      if (val) {
        // === true -> Se estiver somo somente leitura, define tabindex como -1 para não tentar foco ao pressionar o TAB
        this.tabIndexInp.surveyor_name = -1;
      } else {
        // === false -> Caso contrário deixa o tabindex no funcionamento normal
        this.tabIndexInp.surveyor_name = null;
      }
    },
  },
  methods: {
    verifyAllFields(context) {
      switch (context) {
        case "main_data":
          return (
            this.main_data_survey.type_survey &&
            this.main_data_survey.surveyor_email &&
            this.main_data_survey.surveyor_name &&
            this.main_data_survey.vehicle_km &&
            this.main_data_survey.belongings_removed &&
            this.main_data_survey.service_location.model
          );
          break;
        case "general_conditions":
          return this.group.paint && this.group.lining && this.group.tapestry;
          break;
        case "wheels":
          return (
            this.group.left_front_tire &&
            this.group.right_front_tire &&
            this.group.left_rear_tire &&
            this.group.right_rear_tire &&
            this.group.spare
          );
          break;
        case "accessories":
          return (
            this.group.cigarette_lighter &&
            this.group.air_conditioning &&
            this.group.common_antenna &&
            this.group.horn &&
            this.group.seat_belt &&
            this.group.carpets &&
            this.group.battery &&
            this.group.speaker &&
            this.group.hubcap &&
            this.group.hitch &&
            this.group.auxiliary_headlight &&
            this.group.common_wheel &&
            this.group.special_wheel &&
            this.group.radio_cd &&
            this.group.radio_fm &&
            this.group.document &&
            this.group.manual &&
            this.group.keys &&
            this.group.extra_key &&
            this.group.back_cap &&
            this.group.extinguisher &&
            this.group.triangle &&
            this.group.jack &&
            this.group.tire_iron &&
            this.group.screwdriver
          );
          break;
        default:
          break;
      }
    },
    addEventClickOnlyLockCondition() {
      // No bloqueio, adiciona evento de click aos campos de edição para alerta de falha

      var elements = document.querySelectorAll(".q-field__inner,.my_text_area");

      var myFunction = () => {
        let msg =
          "Bloqueado quando o Status foi igual a <strong>Completo</strong> ou <strong>Cancelado</strong>";
        this.alertNotify(msg, "n", true);
      };

      for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener("click", myFunction, false);
      }
    },
    openModalViewPhoto(urlPhoto, idPhoto) {
      let labelTmpRegion = null;
      let labelTmpBreakdown = null;
      let labelSplit = null;

      if (typeof this.galleryModels.region["photoId" + idPhoto] !== "undefined") {
        let labelRegion = this.galleryModels.region["photoId" + idPhoto].label;
        labelTmpRegion = labelRegion;
      } else {
        labelTmpRegion = "";
      }
      if (typeof this.galleryModels.breakdown["photoId" + idPhoto] !== "undefined") {
        let labelBreakdown = this.galleryModels.breakdown["photoId" + idPhoto].label;
        labelTmpBreakdown = labelBreakdown;
      } else {
        labelTmpBreakdown = "";
      }
      labelSplit = labelTmpRegion !== "" && labelTmpBreakdown !== "" ? " - " : "";

      if (labelTmpRegion || labelTmpBreakdown) {
        this.dialogModalTextTop = labelTmpRegion + labelSplit + labelTmpBreakdown;
      } else {
        this.dialogModalTextTop = "";
      }

      this.urlPhotoModal = urlPhoto;
      this.modalViewPhoto = true;
    },
    qUpRejected(rejectedEntries) {
      // Quando algum arquivo é rejeitado pelo motivos diversos, neste caso por não ser um JPG ou PNG
      rejectedEntries.forEach((log) => {
        let tmpData = log.file;
        let msg = `${tmpData.name} - Não Aceito - ${tmpData.type}`;
        this.alertNotify(msg, "n");
      });
    },
    qUpAddFiles(files) {
      // Quando os arquivos são selecionados para Upload Único ou Múltiplo
      this.loading.galerry = true;
    },
    qUploaded(info) {
      // Quando cada arquivo da lista é concluído
      let fileName = info.files[0].name;
      let response = (info.xhr.response);
      response = response.response;
      if (!response.success) {
        // --- Quando algum erro ocorre
        if (response.error_code === 311) {
          // Quando o registro de vistoria não foi localizado
          this.alertNotify(response.message, "n");
        }
        if (response.error_code === 253) {
          // Quando a Vistoria já está com Status de 'Completo' ou 'Cancelado'
          this.$refs.qup.reset(); // Cancela o andamento dos demais arquivos
          this.lockAndReloadSurvey(true, true);
          this.alertNotify(response.message, "n");
        }
      } else {
        // Quando obtêm sucesso na conclusão do upload de foto

        let surveyId = response.data.survey_id;
        let surveyFilesId = response.data.survey_files_id;

        let objImg = {
          id: surveyFilesId,
          region: null,
          breakdown: null,
          path_real_size:
            this.$entrypoint + `/order_logistic_surveys/${surveyId}/${surveyFilesId}/viewphoto/realsize`,
          path_thumb:
            this.$entrypoint + `/order_logistic_surveys/${surveyId}/${surveyFilesId}/viewphoto/thumb`,
        };

        if (this.photoGallery === null) {
          this.photoGallery = [];
        }

        this.photoGallery.unshift(objImg); // Adiciona a nova foto no começo do array de fotos.
      }
    },
    qUpFinishUploadAll() {
      // Quando o upload da lista chega a 100%, tendo ou não falhas.
      this.loading.galerry = false;
      this.$nextTick(() => {
        this.$refs.myForm.resetValidation();
      });
      this.$refs.qup.reset();
    },
    onSubmit() {
      if (this.loading.btn_save) {
        return;
      }
      if (this.loading.galerry) {
        this.alertNotify("Aguarde primeiramente o carregamento das imagens", "n");
        return;
      }
      if (this.photoGallery === null) {
        this.alertNotify("Você deve enviar ao menos 1 Foto do veículo.", "n");
        return;
      }
      this.loading.btn_save = true;
      this.callAjaxSaveSurveyDataById();
    },
    callAjaxGetAllPhotoGallery() {
      let idSurvey = this.route.orderLogisticSurveys_id;
      let tokenUrl = this.route.token_url;
      return axios({
        url:
          this.$entrypoint +
          `/order_logistic_surveys/${idSurvey}/${tokenUrl}/allfilesimages`,
        method: "get",
      }).then((response) => {
        let data = response.data.response;
        if (!data.success) {
          // Quando falha o retorno dos dados
          // --- 344 erro de imagens inexistentes na galeria
          if (data.error_code !== 344) {

            // Qualquer erro que não seja o erro de imagens inexistentes será apresentado
            this.alertNotify(data.message, "n");
          }
        }

        if (data.success) {
          
          // Quando os dados são retornados com êxito

          this.photoGallery = data.data;

          // ------------------------------- Atualiza a galeria de imagens
          data.data.forEach((value) => {
            let photoId = value.id;
            let regionValue = value.region;
            let breakdownValue = value.breakdown;
            // Reatividade para propriedades de array ou objeto inseridos após a montagem, usar o this.$set
            this.$set(
              this.galleryModels.region,
              "photoId" + photoId,
              findIn(this.region, regionValue)
            );
            this.$set(
              this.galleryModels.breakdown,
              "photoId" + photoId,
              findIn(this.breakdown, breakdownValue)
            );
          });
          // --------------------------------------------------------------
        }

        this.loading.galerry = false;
        this.$nextTick(() => {
          this.$refs.myForm.resetValidation();
        });
      });
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
    callAjaxGetOneSurveyById() {
      let id_local = this.route.orderLogisticSurveys_id;
      let token_url = this.route.token_url;

      axios({
        url:
          this.$entrypoint +
          `/order_logistic_surveys/surveys?id=${id_local}&token=${token_url}`,
        method: "get",
      }).then((response) => {
        let data = response.data.response;

        if (!data.success) {
          // Quando falha o retorno dos dados
          this.alertNotify(data.message, "n");
          this.htmlGeneralFailureWarning = data.message;
          this.generalContentVisible = false;
          this.generalWarningVisible = true;
          this.$q.loading.hide();
        }

        if (data.success) {
          // Quando os dados são retornados com êxito

          let dado = data.data;

          this.main_data_survey.customer = dado.clientName;
          this.main_data_survey.customer_email = dado.clientEmail ? dado.clientEmail : null;

          if (dado.belongings_removed !== null) {
            this.main_data_survey.belongings_removed = findIn(
              this.options_no_yes,
              dado.belongings_removed
            );
          }
          if (dado.type_survey !== null) {
            this.main_data_survey.type_survey = findIn(
              this.options_type_survey,
              dado.type_survey
            );
          }
          // --------------- Defini Status e Cor e Alerta de Edição bloqueada
          let objStatus = findIn(this.status_survey, dado.status);
          this.main_data_survey.status = objStatus.label;
          this.status.bgColor = this.colorStatus(objStatus.value);
          // ------------------------------------------------------------
          this.main_data_survey.surveyor_email = dado.surveyor_email ? dado.surveyor_email : null;
          this.main_data_survey.surveyor_name = dado.surveyor_name ? dado.surveyor_name : null;
          this.surveyor_validations.lastMailVerifiedInBD = dado.surveyor_email;
          this.surveyor_validations.mail_consulted_bd = true;
          this.surveyor_validations.mail_existis_bd = true;
          this.surveyor_validations.mail_validate_ok = true;
          this.surveyor_validations.foundMailInDatabase = true;
          this.main_data_survey.surveyor_people_id = dado.surveyor_people_id;
          if (dado.vehicle_km !== null) {
            this.main_data_survey.vehicle_km = String(dado.vehicle_km);
          }
          // this.main_data_survey.customer = dado.client_name;
          // this.main_data_survey.customer_email = dado.client_email;
          this.main_data_survey.vehicle_name = dado.car_type;
          this.main_data_survey.updated_at = dado.updated_at;
          this.main_data_survey.vehicle_plate = dado.car_inf.carNumber ? dado.car_inf.carNumber : "Não Cadastrado";
          this.main_data_survey.vehicle_color = dado.car_inf.carColor ? dado.car_inf.carColor : "Não Cadastrado";
          this.main_data_survey.comments = dado.comments;

          // ---------------------- Retorna dados do Local de Atendimento somente pelo ID do Endereço
          if (data.data.selectedAddressId !== null) {
            let address_id = data.data.selectedAddressId;
            let index_location = this.main_data_survey.service_location.optionsLoadedAjax
              .map((el) => el.address_id)
              .indexOf(address_id);
            this.main_data_survey.service_location.model = this.main_data_survey.service_location.optionsLoadedAjaxFormated[
              index_location
            ];
            this.main_data_survey.service_location.selectedAddressId = address_id;
            this.main_data_survey.service_location.selectedTrainedId = this.main_data_survey.service_location.optionsLoadedAjax[
              index_location
            ].trainer_id;
          }
          // ------------------------------------------------------------------------------

          if (dado.group !== null) {
            this.group = dado.group;
          }

          this.qUpUrlUpload =
            this.$entrypoint + "/order_logistic_surveys/" + id_local + "/" + token_url + "/filesimages"; // Define a URL de upload do componente q-uploader

          this.callAjaxGetAllPhotoGallery().then((response) => {
            // Carrega, se já existir a galeria de imagens
            if (objStatus.value === "complete" || objStatus.value === "canceled") {
              // Anexa evento para alerta de Status bloqueado para edição quando o usuário tentar clicar em algum campo
              this.lockAndReloadSurvey(true, false);
            }
            this.$q.loading.hide();
          });
        }
      });
    },
    lockAndReloadSurvey(lock, reload) {
      if (lock && !this.generalLock.readOnly) {
        // Apenas trava a vistoria contra edição
        this.generalLock.readOnly = true;
        this.generalLock.bgColor = "blue-grey-1";
        this.addEventClickOnlyLockCondition();
      }
      if (reload) {
        // Recarrega os dados da vistoria
        this.callAjaxGetOneSurveyById();
      }
    },
    callAjaxSaveSurveyDataById() {
      let id_local = this.route.orderLogisticSurveys_id;
      let token_url = this.route.token_url;

      axios({
        url:
          this.$entrypoint +
          `/order_logistic_surveys/${id_local}/${token_url}/surveys/update`,
        method: "put",
        data: {
          type_survey: this.main_data_survey.type_survey.value,
          surveyor_email: this.main_data_survey.surveyor_email,
          surveyor_name: this.main_data_survey.surveyor_name,
          vehicle_km: this.main_data_survey.vehicle_km,
          vehicle_fuel: this.main_data_survey.vehicle_fuel,
          belongings_removed: this.main_data_survey.belongings_removed.value,
          selectedTrainedId: this.main_data_survey.service_location.selectedTrainedId,
          selectedAddressId: this.main_data_survey.service_location.selectedAddressId,
          comments: this.main_data_survey.comments,
          group: this.group,
          galleryModels: this.galleryModels,
        },
      }).then((response) => {
        let data = response.data.response;

        if (!data.success) {
          // Quando dá um erro no salvamento
          if (data.error_code === 253) {
            // Vistoria já está com Status de 'Completo' ou 'Cancelado'
            this.lockAndReloadSurvey(true, true);
          }
          this.alertNotify(data.message, "n");
        }

        if (data.success) {
          // Quando o salvamento é executado com Êxito
          if (data.data.status === "complete" || data.data.status === "canceled") {
            this.lockAndReloadSurvey(true, true);
          }
          this.alertNotify("Dados Salvos com Êxito.", "p");
        }

        this.loading.btn_save = false;
      });
    },

    surveyorEmailInputChangeValue(val) {
      this.surveyor_validations.mail_consulted_bd = false;
      this.surveyor_validations.mail_existis_bd = false;
      setTimeout(() => {
        this.checkMailSurveyorOnBd(false);
      }, 10);
    },
    serviceLocationGetSelection(val) {
      // Quando seleciona um resultado no select do "Local Atendimento"
      let index = this.main_data_survey.service_location.optionsLoadedAjaxFormated.indexOf(
        val
      );
      if (index >= 0) {
        // Quando selecionar um Resultado
        let professional_id = this.main_data_survey.service_location.optionsLoadedAjax[index]
          .professional_id;
        
        let address_id = this.main_data_survey.service_location.optionsLoadedAjax[index]
          .address_id;
        this.main_data_survey.service_location.selectedTrainedId = professional_id;
        this.main_data_survey.service_location.selectedAddressId = address_id;
      } else {
        // Quando excluir um Resultado
        this.main_data_survey.service_location.selectedTrainedId = null;
        this.main_data_survey.service_location.selectedAddressId = null;
      }
    },
    serviceLocationFilterFn(val, update, abort) {
      // Quando busca por um resultado no select do "Local Atendimento"
      // call abort() at any time if you can't retrieve data somehow
      update(() => {
        if (val === "") {
          this.main_data_survey.service_location.options = this.main_data_survey.service_location.optionsLoadedAjaxFormated;
        } else {
          const needle = val.toLowerCase();
          this.main_data_survey.service_location.options = this.main_data_survey.service_location.optionsLoadedAjaxFormated.filter(
            (v) => v.toLowerCase().indexOf(needle) > -1
          );
        }
      });
    },
    serviceLocationAbortFilterFn() {
    },
    onKeyUp(inputAndKey) {
      switch (inputAndKey) {
        case "surveyor_email_inp_any_key":
          if (
            this.surveyor_validations.lastMailVerifiedInBD !==
            this.main_data_survey.surveyor_email
          ) {
            if (!this.readonly.surveyor_name_inp) {
              // this.readonly.surveyor_name_inp = true;
            }
          } else {
            if (this.readonly.surveyor_name_inp) {
              // this.readonly.surveyor_name_inp = false;
            }
          }
          break;
        default:
          break;
      }
    },
    onBlur(input) {
      switch (input) {
        case "surveyor_email_inp":
          this.checkMailSurveyorOnBd(true);
          break;
        default:
          break;
      }
    },
    onFocus(input) {
      switch (input) {
        case "surveyor_name_inp":
          break;
        default:
          break;
      }
    },
    validateEmpty(val) {
      if (val !== null && typeof val !== "undefined") {
        val = val.trim();
      }
      if (val === null || val.length === 0) {
        return "Deve ser preenchido";
      }
    },
    isInvalidOptions(key) {
      return (val) => {
        if (typeof val === "undefined" || val === null) {
          let container = this.$el.querySelector("#" + key);
          let top = container.offsetTop;
          window.scrollTo(0, top);
          return "Deve ser selecionado";
        }
      };
    },
    isInvalid(key) {
      return (val) => {
        switch (key) {
          case "carcase_fields":
            if (typeof val === "undefined") {
              return "Deve ser selecionado";
            }
            break;
          case "vehicle_km":
            return this.validateEmpty(val);
            break;
          case "vehicle_fuel":
            if (val === null) {
              return "Deve ser selecionado";
            }
            break;
          case "surveyor_name":
            return this.validateEmpty(val);
            break;
          case "belongings_removed":
            if (val === null) {
              return "Deve ser selecionado";
            }
            break;
          case "type_survey":
            if (val === null || typeof val === "undefined") {
              return "Selecione o Tipo de Vistoria";
            }
            break;
          case "service_location": // Usado também para o Select da região de cada foto
            if (val === null || typeof val === "undefined") {
              return "Deve ser selecionado";
            }
            break;
          case "email":
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
              this.main_data_survey.surveyor_name = null;
              this.main_data_survey.surveyor_people_id = null;
              this.readonly.surveyor_name_inp = false;
              this.surveyor_validations.lastMailVerifiedInBD = this.main_data_survey.surveyor_email;
              this.loading.surveyor_name_inp = false;
              this.surveyor_validations.mail_validate_ok = false;
              this.surveyor_validations.foundMailInDatabase = false;
              this.surveyor_validations.mail_consulted_bd = false;
              this.surveyor_validations.mail_existis_bd = false;
              return "O email informado não é válido";
            } else {
              this.surveyor_validations.mail_validate_ok = true;
            }
            break;
          default:
            if (!(val && val.length > 0)) return "Este campo é obrigatório";
        }
      };
    },
    clickSurveyorTextField() {
      if (
        !this.surveyor_validations.mail_existis_bd &&
        !this.loading.surveyor_name_inp &&
        this.readonly.surveyor_name_inp
      ) {
        if (
          !this.surveyor_validations.foundMailInDatabase &&
          (this.surveyor_validations.lastMailVerifiedInBD !==
            this.main_data_survey.surveyor_name ||
            this.main_data_survey.surveyor_name === null ||
            !this.surveyor_validations.mail_validate_ok)
        ) {
          this.alertNotify("Preencha Primeiramente o E-Mail do Vistoriador", "n");
        }
      }
    },
    checkMailSurveyorOnBd(disable_focus) {
      // Usando no evento BLUR no campo E-MAIL do Vistoriador
      if (
        this.surveyor_validations.mail_validate_ok &&
        !this.surveyor_validations.mail_existis_bd
      ) {
        if (
          this.surveyor_validations.lastMailVerifiedInBD !==
          this.main_data_survey.surveyor_email
        ) {
          this.loading.surveyor_name_inp = true;
          this.callAjaxSearchMailSurveyor(disable_focus);
        }
      }
    },
    /**
     * Retorna todos os Pontos de Encontro pelo ID da Default Company
     *
     * @param defaultCompanyId
     */
    callAjaxGetAllPeopleTrainerByDefaultCompanyId(defaultCompanyId) {
      let defaultCompanyId_local = this.storage.defaultCompanyId;

      return axios({
        url:
          this.$entrypoint +
          `/order_logistic_surveys/findpeopleprofessional?companyId=${defaultCompanyId_local}`,
        method: "get",
      }).then((response) => {
        let data = response.data.response;

        if (!data.success) {
          // Quando não encontra resultado
        }

        if (data.success) {
          // Quando encontra resultado com sucesso
          let tmp = data.data;
          for (let p = 0; p < tmp.length; p++) {
            this.main_data_survey.service_location.optionsLoadedAjaxFormated.push({
              label: `${tmp[p].alias} - ${tmp[p].district} - ${tmp[p].city} - ${tmp[p].UF}`,
              value: tmp[p].professional_id,
            });
          }
          this.main_data_survey.service_location.options = this.main_data_survey.service_location.optionsLoadedAjaxFormated;
          this.main_data_survey.service_location.optionsLoadedAjax = data.data;
          this.loading.service_location_inp = false;
          this.readonly.service_location_inp = false;
        }

        return data;
      });
    },
    callAjaxSearchMailSurveyor(disable_focus) {
      let email = this.main_data_survey.surveyor_email;

      axios({
        url:
          this.$entrypoint +
          `/order_logistic_surveys/findpsurveyorbyemail?email=${email}`,
        method: "get",
      }).then((response) => {
        let data = response.data.response;

        if (!data.success) {
          // Quando não encontra e-mail de vistoriador
          this.main_data_survey.surveyor_name = null;
          this.main_data_survey.surveyor_people_id = null;
          this.readonly.surveyor_name_inp = false;
          this.surveyor_validations.lastMailVerifiedInBD = this.main_data_survey.surveyor_email;
          this.surveyor_validations.foundMailInDatabase = false;
          this.surveyor_validations.mail_consulted_bd = true;
          this.surveyor_validations.mail_existis_bd = false;
          this.loading.surveyor_name_inp = false;
          if (disable_focus) {
            setTimeout(() => {
              this.$refs.surveyor_name_inp.focus();
            }, 20);
          }
        }

        if (data.success) {
          // Quando encontra um e-mail de vistoriador com sucesso

          this.main_data_survey.surveyor_name = data.data[0].name;
          this.main_data_survey.surveyor_people_id = data.data[0].id;
          this.surveyor_validations.lastMailVerifiedInBD = this.main_data_survey.surveyor_email;
          this.surveyor_validations.foundMailInDatabase = true;
          this.surveyor_validations.mail_consulted_bd = true;
          this.surveyor_validations.mail_existis_bd = true;
          this.readonly.surveyor_name_inp = true;
          this.loading.surveyor_name_inp = false;
        }
      });
    },
    /**
     * Exibe Alerta Positivo ou Negativo
     * @param msg
     * @param tipo ('n','p')
     */
    alertNotify(msg, tipo, group) {
      let actionsVar = [];
      if (typeof group === "undefined") {
        group = false;
        actionsVar = [];
      } else {
        actionsVar = [
          {
            label: "Fechar",
            color: "yellow",
            handler: () => {},
          },
        ];
      }
      let status = tipo === "n" ? "negative" : "positive";
      this.$q.notify({
        message: msg,
        html: true,
        group: group,
        multiLine: true,
        position: "bottom",
        type: status,
        actions: actionsVar,
      });
    },
    preencheTeste() {
      // ---------------------- Retorna dados do Local de Atendimento somente pelo ID do Endereço
      let address_id = 139;
      let index_location = this.main_data_survey.service_location.optionsLoadedAjax
        .map((el) => el.address_id)
        .indexOf(address_id);
      this.main_data_survey.service_location.model = this.main_data_survey.service_location.optionsLoadedAjaxFormated[
        index_location
      ];
      this.main_data_survey.service_location.selectedAddressId = address_id;
      this.main_data_survey.service_location.selectedTrainedId = this.main_data_survey.service_location.optionsLoadedAjax[
        index_location
      ].trainer_id;
      // ------------------------------------------------------------------------------

      this.main_data_survey.type_survey = findIn(this.options_type_survey, "delivery");
      this.main_data_survey.surveyor_email = "gilberto@eletronicamais.com.br";
      this.main_data_survey.surveyor_name = "Gilberto Lima";
      this.main_data_survey.vehicle_km = "407";
      this.main_data_survey.belongings_removed = findIn(this.options_no_yes, "yes");

      // ------------------- Condições Gerais

      this.group.paint = "good"; // Pintura
      this.group.lining = "steady"; // Forração
      this.group.tapestry = "poor"; // Tapeçaria

      // ------------------- Rodas

      this.group.left_front_tire = "missed"; // Pneu Dianteiro Esquerdo
      this.group.right_front_tire = "steady"; // Pneu Dianteiro Direito
      this.group.left_rear_tire = "poor"; // Pneu Traseiro Esquerdo
      this.group.right_rear_tire = "good"; // Pneu Traseiro Direito
      this.group.spare = "missed"; // Stepe

      // ------------------- Acessórios

      this.group.cigarette_lighter = "yes"; // Acendedor de Cigarros
      this.group.air_conditioning = "no"; // Ar Condicionado
      this.group.common_antenna = "no"; // Antena Comum
      this.group.horn = "yes"; // Buzina
      this.group.seat_belt = "yes"; // Cinto de Segurança
      this.group.carpets = "no"; // Tapetes
      this.group.battery = "yes"; // Bateria
      this.group.speaker = "no"; // Alto Falante
      this.group.hubcap = "no"; // Calota
      this.group.hitch = "no"; // Engate
      this.group.auxiliary_headlight = "yes"; // Farol Auxiliar
      this.group.common_wheel = "yes"; // Roda Comum
      this.group.special_wheel = "no"; // Roda Especial
      this.group.radio_cd = "no"; // Radio CD
      this.group.radio_fm = "no"; // Radio AM/FM
      this.group.document = "yes"; // Documento
      this.group.manual = "no"; // Manual
      this.group.keys = "yes"; // Chave
      this.group.extra_key = "no"; // Chave Reserva
      this.group.back_cap = "yes"; // Tampão Traseiro
      this.group.extinguisher = "yes"; // Extintor
      this.group.triangle = "no"; // Triângulo
      this.group.jack = "yes"; // Macaco
      this.group.tire_iron = "yes"; // Chave de Roda
      this.group.screwdriver = "no"; // Chave de Fenda
    },
  },
};
</script>

<style>
.avatar_margin {
  margin-left: -10px !important;
}
</style>

<style scoped>
.my-card {
  width: 100%;
  max-width: 230px;
}

.aviso_alerta {
  display: flex;
  align-content: center;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

@media (max-width: 599px) {
  .my-card {
    max-width: unset;
  }
}
</style>
