<template>
  <v-card class="pa-4" rounded="lg" variant="tonal">
    <div class="d-flex align-center mb-2">
      <v-avatar :color="color" class="mr-3" size="40" variant="flat">
        <v-icon icon="mdi-pipe" />
      </v-avatar>
      <div>
        <div class="text-subtitle-1 font-weight-bold">{{ label }}</div>
        <div class="text-caption text-medium-emphasis">Open organ pipe · 5–10 ft</div>
      </div>
      <v-spacer />
      <v-chip
        :color="playing ? 'success' : 'default'"
        size="small"
        :variant="playing ? 'flat' : 'tonal'"
      >
        {{ playing ? 'Sounding' : 'Silent' }}
      </v-chip>
    </div>

    <!-- Pipe B only: lock pitch to a consonant interval above Pipe A. -->
    <v-switch
      v-if="showHarmonize"
      class="harmonize-switch mb-1"
      color="success"
      density="compact"
      hide-details
      :label="harmonizeLabel"
      :model-value="autoHarmonize"
      @update:model-value="autoHarmonize = !!$event"
    />

    <div class="d-flex align-end ga-4">
      <!-- Visual: a vertical "pipe" whose fill height tracks length, width tracks diameter. -->
      <div class="pipe-viz" :style="{ '--fill': `${lengthFill}%`, width: `${vizWidth}px` }">
        <div class="pipe-viz__fill" :class="{ 'pipe-viz__fill--on': playing }" />
      </div>

      <div class="flex-grow-1">
        <div class="d-flex align-center mb-2">
          <span class="text-h4 font-weight-bold">{{ frequency.toFixed(1) }}</span>
          <span class="text-subtitle-1 ml-1 text-medium-emphasis">Hz</span>
          <span class="text-caption text-medium-emphasis ml-2">{{ centsLabel }}</span>
          <v-spacer />
          <v-select
            density="compact"
            :disabled="lengthLocked"
            hide-details
            :items="noteOptions"
            label="Note"
            :model-value="currentMidi"
            style="max-width: 132px;"
            variant="outlined"
            @update:model-value="onSelectNote"
          />
        </div>

        <label class="text-caption text-medium-emphasis">Pipe length: {{ lengthFt.toFixed(1) }} ft</label>
        <v-slider
          color="primary"
          :disabled="lengthLocked"
          hide-details
          :max="PIPE_LENGTH_FT.max"
          :min="PIPE_LENGTH_FT.min"
          :model-value="lengthFt"
          :step="0.1"
          thumb-label
          @update:model-value="onLength"
        />

        <label class="text-caption text-medium-emphasis">
          Pipe diameter: {{ diameterIn.toFixed(1) }} in
          <span class="text-disabled">· +{{ endCorrectionIn.toFixed(1) }} in effective</span>
        </label>
        <v-slider
          color="primary"
          hide-details
          :max="PIPE_DIAMETER_IN.max"
          :min="PIPE_DIAMETER_IN.min"
          :model-value="diameterIn"
          :step="0.5"
          thumb-label
          @update:model-value="onDiameter"
        />

        <div class="d-flex align-center ga-3 mt-2">
          <v-btn
            :color="playing ? 'error' : color"
            :prepend-icon="playing ? 'mdi-stop' : 'mdi-play'"
            variant="flat"
            @click="toggle"
          >
            {{ playing ? 'Stop' : 'Start drone' }}
          </v-btn>

          <v-icon icon="mdi-volume-high" size="small" />
          <v-slider
            class="flex-grow-1"
            color="secondary"
            hide-details
            :max="1"
            :min="0"
            :model-value="volume"
            :step="0.01"
            @update:model-value="onVolume"
          />
        </div>
      </div>
    </div>

    <div class="mt-3">
      <VoicingPanel
        :diameter-in="diameterIn"
        :freq="frequency"
        :pressure-in-wc="pressureInWc"
        :temp-f="tempF"
        @update:timbre="onTimbre"
      />
    </div>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import {
    achievableNotes,
    chooseHarmony,
    effectiveLengthFt,
    frequencyToNote,
    isReachableByLength,
    lengthForFrequency,
    midiFromFrequency,
    midiToFrequency,
    openPipeFrequency,
    PIPE_DIAMETER_IN,
    PIPE_LENGTH_FT,
  } from '@/composables/acoustics'
  import { useOrganAudio } from '@/composables/useOrganAudio'
  import VoicingPanel from '@/components/VoicingPanel.vue'

  const props = withDefaults(defineProps<{
    pipeId: string
    label: string
    tempF: number
    color?: string
    initialLengthFt?: number
    initialDiameterIn?: number
    /** Show the auto-harmonize toggle (Pipe B). */
    showHarmonize?: boolean
    /** The partner pipe's live frequency to harmonize against. */
    partnerFrequency?: number
    /** Shared wind/foot pressure (inches of water column) for voicing. */
    pressureInWc?: number
  }>(), {
    color: 'primary',
    initialLengthFt: 7,
    initialDiameterIn: 6,
    showHarmonize: false,
    partnerFrequency: 0,
    pressureInWc: 3,
  })

  const emit = defineEmits<{ 'update:frequency': [number] }>()

  const audio = useOrganAudio()

  const lengthFt = ref(props.initialLengthFt)
  const diameterIn = ref(props.initialDiameterIn)
  const volume = ref(0.4)
  const autoHarmonize = ref(false)
  // Waveform reported by the voicing panel (timbre follows the cut-up).
  const oscType = ref('sine')

  // End correction in inches (how much "longer" the pipe acts), display only.
  const endCorrectionIn = computed(
    () => (effectiveLengthFt(lengthFt.value, diameterIn.value) - lengthFt.value) * 12,
  )
  const frequency = computed(
    () => openPipeFrequency(lengthFt.value, props.tempF, diameterIn.value),
  )
  const note = computed(() => frequencyToNote(frequency.value))
  const playing = computed(() => audio.isPlaying(props.pipeId))

  const centsLabel = computed(() => {
    const c = note.value.cents
    if (c === 0) return 'in tune'
    return `${c > 0 ? '+' : ''}${c}¢`
  })

  // Dropdown: every globally-achievable chromatic note; greyed out when the
  // current temperature + diameter can't reach it by length alone.
  const noteOptions = computed(() => achievableNotes().map(n => ({
    title: n.label,
    value: n.midi,
    props: { disabled: !isReachableByLength(n.freq, props.tempF, diameterIn.value) },
  })))
  const currentMidi = computed(() => Math.round(midiFromFrequency(frequency.value)))

  // While harmonizing, length/note are driven automatically.
  const lengthLocked = computed(() => props.showHarmonize && autoHarmonize.value)
  const harmony = computed(() => {
    if (!lengthLocked.value || !props.partnerFrequency) return null
    return chooseHarmony(props.partnerFrequency, props.tempF, diameterIn.value)
  })
  const harmonizeLabel = computed(() =>
    autoHarmonize.value && harmony.value
      ? `Auto-harmonizing — ${harmony.value.intervalLabel} above Pipe A`
      : 'Auto-harmonize with Pipe A',
  )

  // Map length/diameter onto the visual pipe's height/width.
  const lengthFill = computed(
    () => 40 + ((lengthFt.value - PIPE_LENGTH_FT.min) / (PIPE_LENGTH_FT.max - PIPE_LENGTH_FT.min)) * 60,
  )
  const vizWidth = computed(
    () => 22 + ((diameterIn.value - PIPE_DIAMETER_IN.min) / (PIPE_DIAMETER_IN.max - PIPE_DIAMETER_IN.min)) * 22,
  )

  // Keep the live drone in tune and report our pitch to the parent (for Pipe A → B).
  watch(frequency, hz => {
    audio.setFrequency(props.pipeId, hz)
    emit('update:frequency', hz)
  }, { immediate: true })

  // Drive length from the chosen harmony whenever it (re)computes.
  watch(harmony, h => {
    if (h) lengthFt.value = h.lengthFt
  }, { immediate: true })

  function onLength (value: number) {
    lengthFt.value = value
  }

  function onDiameter (value: number) {
    diameterIn.value = value
  }

  function onVolume (value: number) {
    volume.value = value
    audio.setAmp(props.pipeId, value)
  }

  function onTimbre (type: string) {
    oscType.value = type
    audio.setType(props.pipeId, type)
  }

  function onSelectNote (midi: number | null) {
    if (midi == null) return
    const target = midiToFrequency(midi)
    const wanted = lengthForFrequency(target, props.tempF, diameterIn.value)
    lengthFt.value = Math.min(PIPE_LENGTH_FT.max, Math.max(PIPE_LENGTH_FT.min, wanted))
  }

  function toggle () {
    if (playing.value) {
      audio.stop(props.pipeId)
    } else {
      audio.start(props.pipeId, frequency.value, volume.value, oscType.value)
    }
  }

  onBeforeUnmount(() => audio.stop(props.pipeId))
</script>

<style scoped>
.harmonize-switch {
  margin-top: -4px;
}
.pipe-viz {
  flex: 0 0 auto;
  height: 160px;
  transition: width 0.1s linear;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.25);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.pipe-viz__fill {
  width: 100%;
  height: var(--fill, 60%);
  background: rgba(var(--v-theme-primary), 0.35);
  transition: height 0.1s linear, background 0.2s ease;
}
.pipe-viz__fill--on {
  background: rgb(var(--v-theme-success));
}
</style>
