<script>
  import { fade, fly } from "svelte/transition";

  // word: the place's signature word, the one it is known by, or null where no place's words live
  const { name, word, tongue } = $props();
</script>

<!-- every arrival is a word's moment: the card floats over the stage and takes no touch, so the
     learner walks on through it -->
<div
  class="arrival"
  role="status"
  aria-live="polite"
  in:fly|global={{ y: -10, duration: 240 }}
  out:fade|global={{ duration: 420 }}>
  <span class="label">{name}</span>
  {#if word}
    <span class="said" lang={tongue}>{word.learning}</span>
    <span class="meant">{word.known}</span>
  {/if}
</div>

<style>
  .arrival {
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    max-width: min(22rem, calc(100% - 2rem));
    padding: var(--size-space-sm) var(--size-space-md);
    border-radius: var(--shape-radius-card);
    background: var(--surface-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      var(--shape-lift);
    text-align: center;
    pointer-events: none;
  }
  .label {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .said {
    font-family: var(--font-family-serif-heading);
    font-size: calc(var(--font-size-xl) * 1.3);
    line-height: 1.15;
    color: var(--text-strong);
    overflow-wrap: anywhere;
  }
  .meant {
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
    color: var(--text-ink);
  }
</style>
