<template>
  <v-expansion-panels variant="accordion">
    <v-expansion-panel rounded="lg">
      <v-expansion-panel-title>
        <v-icon class="mr-2" icon="mdi-function-variant" />
        <span class="font-weight-bold">How the math works</span>
        <span class="text-caption text-medium-emphasis ml-2 d-none d-sm-inline">
          — plain-English walkthrough, updates as you drag
        </span>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <!-- Live inputs: temperature comes from the app; length is a local example. -->
        <div class="text-caption text-medium-emphasis mb-1">
          Try it: scrub an example pipe length and watch every step recalculate.
          (Air temperature follows the slider up top: {{ tempF.toFixed(0) }} °F.)
        </div>
        <div class="d-flex align-center ga-2 mb-1">
          <v-icon icon="mdi-arrow-expand-vertical" size="small" />
          <span class="text-caption" style="white-space: nowrap; min-width: 116px;">
            Example length: {{ exampleLengthFt.toFixed(1) }} ft
          </span>
          <v-slider
            v-model="exampleLengthFt"
            color="primary"
            density="compact"
            hide-details
            :max="10"
            :min="5"
            :step="0.1"
          />
        </div>
        <div class="d-flex align-center ga-2 mb-4">
          <v-icon icon="mdi-arrow-expand-horizontal" size="small" />
          <span class="text-caption" style="white-space: nowrap; min-width: 116px;">
            Example diameter: {{ exampleDiameterIn.toFixed(1) }} in
          </span>
          <v-slider
            v-model="exampleDiameterIn"
            color="primary"
            density="compact"
            hide-details
            :max="12"
            :min="2"
            :step="0.5"
          />
        </div>

        <!-- The chain of steps -->
        <ol class="steps">
          <li v-for="step in steps" :key="step.n" class="step">
            <div class="step__badge">{{ step.n }}</div>
            <div class="step__body">
              <div class="step__title">{{ step.title }}</div>
              <div class="step__plain text-medium-emphasis">{{ step.plain }}</div>
              <div class="step__math">
                <span class="formula">{{ step.expr }}</span>
                <v-icon class="mx-1" icon="mdi-arrow-right-thin" size="x-small" />
                <span class="result">{{ step.result }}</span>
              </div>
            </div>
          </li>
        </ol>

        <v-divider class="my-3" />
        <div class="text-caption text-medium-emphasis">
          <strong>Symbols:</strong>
          <span class="legend">v = speed of sound</span>
          <span class="legend">f = frequency (pitch)</span>
          <span class="legend">0.6 = end-correction factor</span>
          <span class="legend">√ = square root</span>
          <span class="legend">log₂ = how many doublings</span>
          <span class="legend">Hz = cycles per second</span>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import {
    effectiveLengthFt,
    fahrenheitToCelsius,
    frequencyToNote,
    openPipeFrequency,
    speedOfSound,
  } from '@/composables/acoustics'

  const props = defineProps<{ tempF: number }>()

  const exampleLengthFt = ref(7)
  const exampleDiameterIn = ref(6)

  const tempC = computed(() => fahrenheitToCelsius(props.tempF))
  const speed = computed(() => speedOfSound(tempC.value))
  const speedFtS = computed(() => speed.value / 0.3048)
  const effLengthFt = computed(
    () => effectiveLengthFt(exampleLengthFt.value, exampleDiameterIn.value),
  )
  const freq = computed(
    () => openPipeFrequency(exampleLengthFt.value, props.tempF, exampleDiameterIn.value),
  )
  const note = computed(() => frequencyToNote(freq.value))

  // Each step shows: plain-English reason, the formula with the live numbers
  // already plugged in, and the result it feeds into the next step. We work in
  // ft/s + feet so the pitch step needs no unit conversion.
  const steps = computed(() => [
    {
      n: 1,
      title: 'Find how fast sound travels (v)',
      plain: 'Sound moves faster in warmer air. At freezing it goes about 1087 ft every second; this scales that up for your temperature.',
      expr: `331.3 × √(1 + ${tempC.value.toFixed(1)}°C ÷ 273.15)`,
      result: `${speedFtS.value.toFixed(0)} ft/s  (${speed.value.toFixed(1)} m/s)`,
    },
    {
      n: 2,
      title: 'Allow for the pipe’s width (effective length)',
      plain: 'Air keeps moving a little past each open end before it turns around, so the pipe acts slightly longer than it measures. A wider pipe acts longer still — which lowers the pitch a touch.',
      expr: `${exampleLengthFt.value.toFixed(1)} ft + 0.6 × (${exampleDiameterIn.value.toFixed(1)} in ÷ 12)`,
      result: `${effLengthFt.value.toFixed(2)} ft`,
    },
    {
      n: 3,
      title: 'Turn that length into a pitch (f)',
      plain: 'An open pipe’s lowest note makes a sound wave twice as long as the pipe. The pitch is simply how many of those waves zip past each second.',
      expr: `${speedFtS.value.toFixed(0)} ÷ (2 × ${effLengthFt.value.toFixed(2)} ft)`,
      result: `${freq.value.toFixed(1)} Hz`,
    },
    {
      n: 4,
      title: 'Name the closest musical note',
      plain: 'We compare the pitch to a piano (the A above middle C is fixed at 440 Hz) and pick the nearest key. “Cents” say how sharp or flat it lands — 100 cents is one key.',
      expr: `12 × log₂(${freq.value.toFixed(1)} ÷ 440)`,
      result: note.value.label,
    },
  ])
</script>

<style scoped>
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.step__badge {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step__title {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.2;
}
.step__plain {
  font-size: 0.8rem;
  line-height: 1.3;
  margin: 2px 0 4px;
}
.step__math {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}
.formula {
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 1px 6px;
  border-radius: 4px;
}
.result {
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.legend {
  display: inline-block;
  margin-right: 10px;
  white-space: nowrap;
}
</style>
