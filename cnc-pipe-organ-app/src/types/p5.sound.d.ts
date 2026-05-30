/**
 * p5.sound (0.3.x) ships no TypeScript types and attaches its classes onto a
 * global `p5` as a side effect. We only declare the module here so that
 * `import 'p5.sound'` type-checks; the small slice of the runtime API we use is
 * typed locally in `composables/useOrganAudio.ts`.
 */
declare module 'p5.sound'
