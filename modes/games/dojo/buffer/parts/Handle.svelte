<script>
  const { summary = "", hint = null, right = "esc", onopen } = $props();
</script>

<button class="handle" title="pull the drawer down" onclick={onopen}>
  <span class="arrow">▼</span>
  <span class="pill"></span>
  <span class="summary" title={hint}>{summary}</span>
  <span class="right">{right}</span>
</button>

<style>
  .handle {
    flex: none;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 1rem;
    border: none;
    border-bottom: 1px solid var(--boundary);
    background: var(--surface-lift);
    cursor: pointer;
    text-align: left;
    color: inherit;
  }
  .handle:hover {
    background: var(--surface-sunk);
  }
  .arrow {
    font-family: var(--font-family-code);
    font-size: var(--font-size-2xs);
    color: var(--signal-primary-ink);
  }
  .pill {
    width: 34px;
    height: 4px;
    border-radius: 2px;
    background: var(--divider);
    flex: none;
  }
  .summary {
    font-family: var(--font-family-code);
    font-size: var(--font-size-2xs);
    color: var(--text-light);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .right {
    font-family: var(--font-family-code);
    font-size: var(--font-size-2xs);
    color: var(--text-light);
    opacity: 0.6;
  }
</style>
