<script>
  import { Asset } from "@vivalence/drapes";
  import Chip from "./Chip.svelte";

  const { result, typed, answer, example, note, forgiving = true, file = null, dense = false } = $props();

  const landed = $derived(result.signal === "SUCCESS" || result.signal === "MASTERY");
  const label = $derived(result.corrected ? "corrected" : result.signal.toLowerCase());
</script>

{#if !dense}<div class="divider"></div>{/if}

<div class="eval" class:dense>
  {#if !dense}
    <div class="verdict">
      <span class="signal" class:landed>{result.corrected ? "CORRECTED" : result.signal}</span>
      {#if note}<span class="how">{note}</span>{/if}
    </div>
  {/if}

  {#if result.tokens}
    <div class="chips">
      {#each result.tokens as token, index (token.form + index)}
        <Chip {token} {forgiving} />
      {/each}
    </div>
  {/if}

  <div class="grid">
    {#if landed}
      <span class="key" class:landed>{dense ? label : "answer"}</span>
      <span class="value right">{answer}</span>
      <span class="dot">{#if file}<Asset {file} variant="dot" autoplay={true} />{/if}</span>
    {:else}
      <span class="key">you wrote</span>
      <span class="value wrong">{typed?.trim() || "—"}</span>
      <span class="dot"></span>
      <span class="key">expected</span>
      <span class="value right">{answer}</span>
      <span class="dot">{#if file}<Asset {file} variant="dot" autoplay={true} />{/if}</span>
    {/if}
  </div>

  {#if dense && note}<p class="note">{note}</p>{/if}

  {#if example}
    <p class="example">{example}</p>
  {/if}

  {#if result.feedback}
    <p class="note">{result.feedback}</p>
  {/if}

  {#each (result.tokens ?? []).filter((token) => token.feedback) as token, index (token.form + index)}
    <p class="note">
      <span class="note-key">{token.form}</span>
      {token.correction ? `→ ${token.correction} · ` : ""}{token.feedback}
    </p>
  {/each}
</div>

<style>
  .divider {
    height: 1px;
    background: color-mix(in srgb, var(--divider) 60%, transparent);
    margin: 1.75rem 0 1.5rem 0;
  }
  .eval {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .verdict {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }
  .signal {
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--signal-negative-ink);
  }
  .signal.landed {
    color: var(--signal-positive-ink);
  }
  .how {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    color: var(--text-light);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) auto;
    column-gap: 0.75rem;
    row-gap: 0.375rem;
    align-items: baseline;
  }
  .key {
    font-family: var(--font-family-code);
    font-size: var(--font-size-2xs);
    color: var(--text-light);
    white-space: nowrap;
  }
  .key.landed {
    color: var(--signal-positive-ink);
  }
  .value {
    font-family: var(--font-family-code);
    font-size: var(--font-size-md);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .dot {
    display: flex;
    align-items: center;
    align-self: center;
  }
  .wrong {
    color: var(--signal-negative-ink);
  }
  .right {
    color: var(--signal-positive-ink);
  }
  .example {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    color: var(--text-light);
    font-style: italic;
    margin: 0;
  }
  .note {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
    margin: 0;
  }
  .note-key {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--signal-caution-ink);
  }

  .eval.dense {
    gap: 0.375rem;
    margin-top: 0.75rem;
  }
  .eval.dense .grid {
    row-gap: 0.125rem;
  }
  .eval.dense .value {
    font-size: var(--font-size-base);
  }
  .eval.dense .example {
    font-size: var(--font-size-sm);
  }

  @media (max-width: 640px) {
    .divider {
      margin: 1rem 0;
    }
    .eval {
      gap: 0.75rem;
    }
    .chips {
      gap: 0.375rem;
    }
  }
</style>
