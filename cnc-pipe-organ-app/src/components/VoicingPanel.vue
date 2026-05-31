<template>
  <v-expansion-panels variant="accordion">
    <v-expansion-panel rounded="lg">
      <v-expansion-panel-title>
        <v-icon class="mr-2" icon="mdi-tune-vertical" size="small" />
        <span class="font-weight-medium">Voicing &amp; build</span>
        <v-chip
          class="ml-2"
          :color="speech.color"
          size="x-small"
          variant="flat"
        >
          {{ speech.status }} · I≈{{ ising.toFixed(1) }}
        </v-chip>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <p class="text-caption text-medium-emphasis mb-3">
          The mouth turns wind into tone. Ising's number <strong>I</strong> says how hard the
          pipe is blown vs. its mouth height: <strong>~2–3 speaks cleanly</strong>, low is
          breathy, high overblows. Tune the cut-up to land in the green.
        </p>

        <!-- Speech gauge -->
        <div class="d-flex align-center ga-2 mb-1">
          <span class="text-caption" style="min-width: 92px;">Ising number</span>
          <v-progress-linear
            bg-opacity="0.1"
            :color="speech.color"
            height="10"
            :max="5"
            :model-value="ising"
            rounded
          />
          <span class="text-body-2 font-weight-bold" style="min-width: 34px;">{{ ising.toFixed(1) }}</span>
        </div>
        <div class="text-caption mb-4" :class="`text-${speech.color}`">{{ speech.message }}</div>

        <!-- Adjustable mouth geometry -->
        <!-- Collapsible mouth-anatomy explainer with a cross-section diagram -->
        <v-btn
          class="px-1 mb-1"
          :prepend-icon="showAnatomy ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          size="small"
          variant="text"
          @click="showAnatomy = !showAnatomy"
        >
          Mouth anatomy — what are flue depth &amp; cut-up?
        </v-btn>
        <v-expand-transition>
          <div v-show="showAnatomy" class="anatomy-box mb-3">
            <svg
              aria-label="Cross-section of an organ pipe mouth showing the languid, flue, lips, cut-up and air jet"
              class="anatomy"
              role="img"
              viewBox="0 0 280 200"
            >
              <defs>
                <marker id="vp-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="4" refY="4">
                  <path class="dim-fill" d="M0,0 L8,4 L0,8 z" />
                </marker>
              </defs>

              <!-- hollow interior -->
              <rect class="interior" height="170" width="110" x="90" y="15" />
              <!-- walls -->
              <rect class="wall" height="170" width="10" x="200" y="15" />
              <rect class="wall" height="60" width="10" x="80" y="15" />
              <rect class="wall" height="65" width="10" x="80" y="120" />
              <!-- languid -->
              <rect class="part" height="16" width="92" x="108" y="120" />
              <text class="lbl lbl--on" text-anchor="middle" x="154" y="131">languid</text>

              <!-- wind entering the foot -->
              <line class="jet" marker-end="url(#vp-arrow)" x1="150" x2="150" y1="182" y2="150" />
              <text class="lbl" text-anchor="middle" x="150" y="196">wind from foot</text>

              <!-- the air jet: out of the flue, across the mouth, onto the upper lip -->
              <path class="jet jet--thick" d="M99,120 C99,103 93,90 90,77" marker-end="url(#vp-arrow)" />

              <!-- lips -->
              <circle class="lip" cx="90" cy="75" r="2.6" />
              <circle class="lip" cx="90" cy="120" r="2.6" />
              <path class="leader" d="M118,64 L92,74" />
              <text class="lbl" x="120" y="62">upper lip (sharp edge)</text>
              <path class="leader" d="M118,110 L92,119" />
              <text class="lbl" x="120" y="110">lower lip</text>

              <!-- cut-up dimension -->
              <path class="leader" d="M66,75 L82,75" />
              <path class="leader" d="M66,120 L82,120" />
              <line class="dim" marker-end="url(#vp-arrow)" marker-start="url(#vp-arrow)" x1="66" x2="66" y1="76" y2="119" />
              <text class="lbl" text-anchor="middle" transform="rotate(-90 55 98)" x="55" y="98">cut-up (H)</text>

              <!-- flue-depth dimension -->
              <line class="dim" marker-end="url(#vp-arrow)" marker-start="url(#vp-arrow)" x1="91" x2="107" y1="128" y2="128" />
              <path class="leader" d="M99,130 L99,150" />
              <text class="lbl" text-anchor="middle" x="99" y="162">flue depth (D)</text>
            </svg>

            <div class="text-caption text-medium-emphasis">
              Wind enters the <strong>foot</strong>, is squeezed through the thin
              <strong>flue (windway)</strong> into a flat ribbon of air (the “jet”), which
              shoots up across the <strong>mouth</strong> and flutters against the sharp
              <strong>upper lip</strong>. That flutter is the sound; the pipe’s length tunes it.
              <ul class="mt-1">
                <li>
                  <strong>Flue / windway depth (D)</strong> — how thick that slit is, i.e. how
                  thick the air ribbon is. Thinner → a faster, brighter, easy-to-start jet that
                  can get edgy; thicker → a fatter jet that needs more wind but sounds rounder.
                </li>
                <li>
                  <strong>Cut-up (H)</strong> — the mouth height from lower lip to upper lip: how
                  far the jet travels before it hits the edge. Taller → mellower/flutier and
                  handles stronger wind; shorter → brighter and louder but overblows sooner.
                </li>
              </ul>
            </div>
          </div>
        </v-expand-transition>

        <label class="text-caption text-medium-emphasis">Flue / windway depth: {{ flueDepthMm.toFixed(1) }} mm</label>
        <v-slider
          v-model="flueDepthMm"
          color="primary"
          density="compact"
          hide-details
          :max="15"
          :min="0.5"
          :step="0.1"
        />

        <label class="text-caption text-medium-emphasis d-flex align-center">
          Cut-up (mouth height): {{ cutUpIn.toFixed(2) }} in
          <span class="text-disabled ml-1">· {{ (cutUpRatio * 100).toFixed(0) }}% of mouth width</span>
          <v-spacer />
          <v-btn
            class="mb-1"
            color="primary"
            size="x-small"
            variant="tonal"
            @click="cutUpIn = roundTo(recommendedCut, 2)"
          >
            Use {{ recommendedCut.toFixed(2) }}″
          </v-btn>
        </label>
        <v-slider
          v-model="cutUpIn"
          color="primary"
          density="compact"
          hide-details
          :max="10"
          :min="0.1"
          :step="0.05"
        />

        <v-divider class="my-3" />

        <!-- Derived build numbers -->
        <div class="stats">
          <div v-for="stat in stats" :key="stat.label" class="stat">
            <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
            <div class="text-body-2 font-weight-medium">{{ stat.value }}</div>
          </div>
        </div>

        <div class="text-caption text-medium-emphasis mt-3">
          Tone colour: <strong>{{ waveform }}</strong> ({{ brightness > 0.6 ? 'bright/stringy' : brightness > 0.3 ? 'balanced' : 'mellow/flutey' }}) —
          the drone’s timbre follows the cut-up. All numbers are starting points; voice by ear.
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import {
    assessSpeech,
    brightnessFromCutUp,
    flueDemandCfm,
    isingNumber,
    jetVelocity,
    mouthWidthIn,
    recommendedCutUpIn,
    toeHoleDiameterIn,
    waveformForBrightness,
  } from '@/composables/voicing'

  const props = defineProps<{
    freq: number
    diameterIn: number
    tempF: number
    pressureInWc: number
  }>()

  const emit = defineEmits<{ 'update:timbre': [string] }>()

  const showAnatomy = ref(false)
  const flueDepthMm = ref(1)
  const cutUpIn = ref(1)

  const geom = computed(() => ({
    freq: props.freq,
    pressureInWc: props.pressureInWc,
    tempF: props.tempF,
    flueDepthMm: flueDepthMm.value,
  }))

  const ising = computed(() => isingNumber({ ...geom.value, cutUpIn: cutUpIn.value }))
  const speech = computed(() => assessSpeech(ising.value))
  const recommendedCut = computed(() => recommendedCutUpIn(geom.value))
  const mouthW = computed(() => mouthWidthIn(props.diameterIn))
  const cutUpRatio = computed(() => cutUpIn.value / Math.max(mouthW.value, 1e-6))
  const jetFtS = computed(() => jetVelocity(props.pressureInWc, props.tempF) / 0.3048)
  const demandCfm = computed(() => flueDemandCfm({
    diameterIn: props.diameterIn,
    flueDepthMm: flueDepthMm.value,
    pressureInWc: props.pressureInWc,
    tempF: props.tempF,
  }))
  const toeIn = computed(() => toeHoleDiameterIn(props.diameterIn, flueDepthMm.value))
  const brightness = computed(() => brightnessFromCutUp(cutUpIn.value, props.diameterIn))
  const waveform = computed(() => waveformForBrightness(brightness.value))

  const stats = computed(() => [
    { label: 'Mouth width (¼ circ.)', value: `${mouthW.value.toFixed(2)} in` },
    { label: 'Recommended cut-up', value: `${recommendedCut.value.toFixed(2)} in` },
    { label: 'Jet velocity', value: `${jetFtS.value.toFixed(0)} ft/s` },
    { label: 'Air the pipe needs', value: `${demandCfm.value.toFixed(1)} CFM` },
    { label: 'Toe-hole (start)', value: `${toeIn.value.toFixed(2)} in dia` },
  ])

  function roundTo (value: number, places: number): number {
    const f = 10 ** places
    return Math.round(value * f) / f
  }

  // Report the waveform up so the live drone's timbre tracks the cut-up.
  watch(waveform, w => emit('update:timbre', w), { immediate: true })
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px 12px;
}
.anatomy-box {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 8px 12px;
}
.anatomy {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 0 auto 8px;
}
.anatomy .interior { fill: rgba(var(--v-theme-on-surface), 0.04); }
.anatomy .wall {
  fill: rgba(var(--v-theme-on-surface), 0.18);
  stroke: rgba(var(--v-theme-on-surface), 0.5);
  stroke-width: 1;
}
.anatomy .part {
  fill: rgba(var(--v-theme-on-surface), 0.3);
  stroke: rgba(var(--v-theme-on-surface), 0.5);
  stroke-width: 1;
}
.anatomy .jet { stroke: rgb(var(--v-theme-primary)); stroke-width: 2; fill: none; }
.anatomy .jet--thick { stroke-width: 3; }
.anatomy .dim { stroke: rgb(var(--v-theme-primary)); stroke-width: 1; }
.anatomy .dim-fill { fill: rgb(var(--v-theme-primary)); }
.anatomy .leader { stroke: rgba(var(--v-theme-on-surface), 0.4); stroke-width: 0.75; fill: none; }
.anatomy .lip { fill: rgb(var(--v-theme-error)); }
.anatomy .lbl { fill: rgba(var(--v-theme-on-surface), 0.8); font-size: 9px; }
.anatomy .lbl--on { fill: rgba(var(--v-theme-on-surface), 0.95); }
</style>
