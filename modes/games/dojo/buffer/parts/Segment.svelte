<script>
  const {
    label,
    on = false,
    tone = "primary",
    dim = false,
    title = null,
    dot = null,
    count = null,
    onclick,
    onpointerdown = null,
  } = $props();
</script>

<button
  class="segment"
  class:on
  class:dim
  data-tone={tone}
  {title}
  {onclick}
  onpointerdown={onpointerdown ?? ((event) => event.preventDefault())}>
  {#if dot}<span class="dot" style:background={dot}></span>{/if}
  <span class="label">{label}</span>
  {#if count != null}<span class="count">{count}</span>{/if}
</button>

<style>
  .segment {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.55rem;
    border-radius: 0.2rem;
    border: 1px solid var(--boundary-soft);
    background: transparent;
    color: var(--text-light);
    font-family: var(--font-family-code);
    font-size: var(--font-size-2xs);
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    min-height: 1.75rem;
  }
  .segment:hover {
    border-color: var(--text-light);
    color: var(--text-strong);
  }
  .segment.on {
    border-color: var(--signal-primary-ink);
    background: var(--surface-sunk);
    color: var(--signal-primary-ink);
  }
  .segment.on[data-tone="secondary"] {
    border-color: var(--signal-primary-ink);
    color: var(--signal-primary-ink);
  }
  .segment.on[data-tone="warning"] {
    border-color: var(--signal-caution-ink);
    color: var(--signal-caution-ink);
  }
  .segment.on[data-tone="danger"] {
    border-color: var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .segment.dim {
    opacity: 0.45;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    flex: none;
  }
  .count {
    opacity: 0.5;
  }
</style>
