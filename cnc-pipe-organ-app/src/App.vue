<template>
  <v-app>
    <v-app-bar color="surface" flat>
      <v-app-bar-title>
        <v-icon class="mr-2" icon="mdi-pipe-wrench" />
        CNC Pipe Organ
      </v-app-bar-title>
      <template #append>
        <v-btn
          class="mr-2"
          prepend-icon="mdi-stop-circle-outline"
          variant="text"
          @click="audio.stopAll()"
        >
          Stop all
        </v-btn>
        <v-btn
          icon="mdi-theme-light-dark"
          @click="$vuetify.theme.cycle()"
        />
      </template>
    </v-app-bar>

    <v-main>
      <v-container class="py-6" max-width="1100">
        <p class="text-body-2 text-medium-emphasis mb-6">
          Two articulated pipes hang off the router's fans and resonate like open
          organ pipes. Air temperature sets the speed of sound; pipe length sets
          the pitch. Start a drone, then drag a length slider to glide its pitch
          in real time.
        </p>

        <!-- Shared environment / fan inputs -->
        <v-card class="pa-4 mb-6" rounded="lg" variant="tonal">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon class="mr-1" icon="mdi-thermometer" size="small" />
            Environment &amp; airflow
          </div>

          <v-row align="center" dense>
            <v-col cols="12" md="6">
              <label class="text-caption text-medium-emphasis">
                Air temperature: {{ tempF.toFixed(0) }} °F
                ({{ tempC.toFixed(1) }} °C)
              </label>
              <v-slider
                color="primary"
                hide-details
                :max="AIR_TEMP_F.max"
                :min="AIR_TEMP_F.min"
                :model-value="tempF"
                :step="1"
                thumb-label
                @update:model-value="tempF = $event"
              />
            </v-col>

            <v-col cols="6" md="3">
              <v-text-field
                density="comfortable"
                hide-details
                label="Fan airflow"
                :model-value="airflowCfm"
                suffix="CFM"
                type="number"
                variant="outlined"
                @update:model-value="airflowCfm = Number($event)"
              />
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Speed of sound</div>
              <div class="text-h6">{{ speed.toFixed(1) }} m/s</div>
            </v-col>
          </v-row>
        </v-card>

        <!-- The two pipes -->
        <v-row>
          <v-col cols="12" md="6">
            <PipeControl
              color="primary"
              :initial-diameter-in="5"
              :initial-length-ft="6"
              label="Pipe A"
              pipe-id="A"
              :temp-f="tempF"
              @update:frequency="pipeAFreq = $event"
            />
          </v-col>
          <v-col cols="12" md="6">
            <PipeControl
              color="teal"
              :initial-diameter-in="8"
              :initial-length-ft="8"
              label="Pipe B"
              :partner-frequency="pipeAFreq"
              pipe-id="B"
              show-harmonize
              :temp-f="tempF"
            />
          </v-col>
        </v-row>

        <!-- Plain-English, live walkthrough of the formulas -->
        <div class="mt-6">
          <FormulaGuide :temp-f="tempF" />
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref } from 'vue'
  import FormulaGuide from '@/components/FormulaGuide.vue'
  import PipeControl from '@/components/PipeControl.vue'
  import { AIR_TEMP_F, fahrenheitToCelsius, speedOfSound } from '@/composables/acoustics'
  import { useOrganAudio } from '@/composables/useOrganAudio'

  const audio = useOrganAudio()

  const tempF = ref(68)
  const airflowCfm = ref(1200)
  const pipeAFreq = ref(0)

  const tempC = computed(() => fahrenheitToCelsius(tempF.value))
  const speed = computed(() => speedOfSound(tempC.value))

  onBeforeUnmount(() => audio.dispose())
</script>
