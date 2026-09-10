<script>
  import { Asset } from "@vivalence/drapes";

  const { answer, example, file = null, label } = $props();
</script>

<div class="divider"></div>
<div class="reveal">
  <span class="label">{label}</span>
  <div class="row">
    <div class="text">
      <p class="answer">{answer}</p>
      {#if example}<p class="example">{example}</p>{/if}
    </div>
    {#if file}<Asset autoplay={true} variant="dot" {file} />{/if}
  </div>
</div>

<style>
  .divider {
    height: 1px;
    background: var(--divider);
    margin: 1.5rem 0;
  }
  .reveal {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .label {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .answer {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    color: var(--signal-primary-ink);
    margin: 0;
    line-height: 1.2;
  }
  .example {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    color: var(--text-light);
    font-style: italic;
    margin: 0.75rem 0 0 0;
  }
</style>
