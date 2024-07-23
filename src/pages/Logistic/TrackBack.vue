<template>
<q-page class="flex flex-center">
    <GmapMap
  :center="{lat:currentLocation.lat, lng:currentLocation.lng}"
  :zoom="15"
  map-type-id="terrain"
  class="gmap-drive"
  ref="gmap"
>
<gmap-info-window
        :options="infoOptions"
        :position="infoPosition"
        :opened="infoOpened"
        @closeclick="infoWinOpen=false"
      >
        <div v-html="infoContent"></div>
      </gmap-info-window>      
<gmap-marker
      class="markers"
      :key="index"
      v-for="(m, index) in markers"
      :position="m.position"
      :clickable="true"
      :draggable="false"
      @click="toggleInfo(m, index)"
    ></gmap-marker>
<gmap-marker
      class="marker-location"
      :position="{lat:myLocation.lat, lng:myLocation.lng}"
      :clickable="true"
      :draggable="false"
      :icon="myIcon"
      ref="location"
    ></gmap-marker>
<DirectionsRenderer
    travelMode="DRIVING"
    :origin="origin"
    :destination="destination"/>         
</GmapMap>
<q-btn  class="btn-locate btn-primary" @click="getLocation()">
    Localizar
  </q-btn>
  </q-page>
</template>

<script>
import Vue from 'vue';
import * as VueGoogleMaps from 'vue2-google-maps';


Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyAo5TGpz8lQ5h47ocnyzD6wyqbZk6GRdvc',
    libraries: 'places,drawing,visualization'
  },
  installComponents: true
})
Vue.component('google-map', VueGoogleMaps.Map)
export default {
  name: 'PageIndex',
  mounted: function () {
    this.getLocation()
  },
  data () {
    return {
      currentLocation: { lat: 0, lng: 0 },
      myLocation: { lat: 0, lng: 0 },
      myIcon: {
        url: "https://bonssens.com.br/wp-content/uploads/2017/11/045-delivery-truck.png",
        size: { width: 80, height: 80, f: "px", b: "px" },
        scaledSize: { width: 50, height: 50, f: "px", b: "px" }
      },
      routingService: {},
      searchAddressInput: '',
      infoPosition: null,
      infoContent: '',
      infoOpened: false,      
      infoCurrentKey: null,
      infoOptions: {
        pixelOffset: {
          width: 0,
          height: -35
        }
      },
      origin:      { lat: -23.4506242, lng: -46.5401709 },
      destination: { lat: -23.4506642, lng: -46.5491709 },
      markers: [
        {
          name: 'Transportadora',
          description: 'Pedido #200467',
          date_build: '',
          position: { lat: -23.4506242, lng: -46.5401709 }
        },
        {
          name: 'Centro de Distribuição',
          description: 'Pedido #200467',
          date_build: '',
          position: { lat: -23.4506442, lng: -46.5454709 }
        },
        {
          name: 'Local de Entrega',
          description: 'Pedido #200467',
          date_build: '',
          position: { lat: -23.4506642, lng: -46.5491709 }
        }]
    }
  },
  methods: {
    getLocation () {
      navigator.geolocation.getCurrentPosition((position) => {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }

        this.$refs.location.$mapPromise.then((map) => {          
              this.myLocation = pos
        })

        this.$refs.gmap.$mapPromise.then((map) => {          
          map.setZoom(15)
          map.panTo(pos)

        })
      })
    },
    getPosition: function (marker) {
      return {
        lat: parseFloat(marker.position.lat),
        lng: parseFloat(marker.position.lng)
      }
    },
    toggleInfo: function (marker, key) {
      this.infoPosition     = this.getPosition(marker)
      this.infoContent      = this.getInfoWindowContent(marker)      
      
      if (this.infoCurrentKey === key) {
        this.infoOpened = !this.infoOpened
      } else {
        this.infoOpened = true
        this.infoCurrentKey = key
      }
    },
    getInfoWindowContent: function (marker) {
        return (`<div class="card">
  <div class="card-image">
    <figure class="image is-4by3">
      <img src="https://bulma.io/images/placeholders/96x96.png" alt="Placeholder image">
    </figure>
  </div>
  <div class="card-content">
    <div class="media">
      <div class="media-content">
        <p class="title is-4">${marker.name}</p>
      </div>
    </div>
    <div class="content">
      ${marker.description}
      <br>
      <time datetime="2016-1-1">${marker.date_build}</time>
    </div>
  </div>
</div>`);
      }
  }
}

</script>
<style>
.gmap-drive{
  width: 100vw;
  height: calc(100vh - 80px);
  top: -25px;
}
.btn-locate{
  position:absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 999;
}
</style>
