<script>
  import { Desk } from "@vivalence/drapes";

  const { terminal, buffer, surface } = $props();

  const data = buffer.data ?? {};
  const recall = data.recall ?? "LEARNING";
  const gameplay = data.gameplay ?? "TRANSLATE";
  const language = buffer.mode.daemon.statics?.language ?? {};
  const descriptions = data.descriptions ?? [];

  let literals = $state(buffer.literals ?? []);
  let loading = $state(!literals.length);

  let leftItems = $state([]);
  let rightItems = $state([]);
  let selected = $state(null);
  let selectedSide = $state(null);
  let connections = $state([]);
  let failed = $state(new Set());
  let errored = new Set();

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function leftText(lit, i) {
    if (gameplay === "DESCRIBE" && descriptions[i] !== undefined) {
      return descriptions[literals.indexOf(lit)];
    }
    return recall === "LEARNING"
      ? lit?.trait?.TRANSLATED?.known
      : lit?.trait?.TRANSLATED?.learning;
  }

  function rightText(lit) {
    return recall === "LEARNING"
      ? lit?.trait?.TRANSLATED?.learning
      : lit?.trait?.TRANSLATED?.known;
  }


  function init(lits) {
    leftItems = shuffle([...lits]);
    rightItems = shuffle([...lits]);
    connections = [];
    failed = new Set();
    errored = new Set();
    selected = leftItems[0];
    selectedSide = "left";
  }

  if (!literals.length) {
    buffer.mode.daemon.connection.call("/pick/literal/feed", { limit: 4 }).then((lits) => {
      literals = lits ?? [];
      init(literals);
      loading = false;
    });
  } else {
    init(literals);
  }

  const connected = $derived(new Set(connections.map((c) => c.id)));
  const allMatched = $derived(literals.length > 0 && connections.length === literals.length);

  function tap(lit, side) {
    if (connected.has(lit.id)) return;

    if (!selected || selectedSide === side) {
      selected = lit;
      selectedSide = side;
      return;
    }

    const isCorrect = selected.id === lit.id;

    if (isCorrect) {
      connections = [...connections, { id: lit.id }];
    } else {
      errored.add(selected.id);
      errored.add(lit.id);
      failed = new Set([...failed, selected.id, lit.id]);
      const a = selected.id, b = lit.id;
      setTimeout(() => {
        failed = new Set([...failed].filter((id) => id !== a && id !== b));
      }, 400);
    }

    selected = null;
    selectedSide = null;

    if (isCorrect && connections.length === literals.length - 1) {
      const matched = new Set(connections.map(c => c.id));
      const last = literals.find(l => !matched.has(l.id));
      setTimeout(() => {
        connections = [...connections, { id: last.id }];
        setTimeout(() => checkComplete(), 800);
      }, 300);
      return;
    }

    if (connections.length === literals.length) {
      checkComplete();
    }
  }

  function checkComplete() {
    if (connections.length !== literals.length) return;

    for (const lit of literals) {
      buffer.mode.daemon.connection.call("/review/literal", {
        signal: errored.has(lit.id) ? "MISTAKE" : "SUCCESS",
        scope: { literal: lit.id },
      });
    }

    buffer.release();
  }

</script>

<Desk maxWidth="560px">
  {#snippet surface()}
    {#if literals.length}
      <div class="meta">
        <span class="meta-lang">{gameplay === "DESCRIBE" ? "match" : (recall === "LEARNING" ? `${language.known?.name} → ${language.learning?.name}` : `${language.learning?.name} → ${language.known?.name}`)}</span>
        <span class="meta-count">{connections.length}/{literals.length}</span>
      </div>

      <div class="grid">
        <div class="column">
          {#each leftItems as lit}
            {@const isConnected = connected.has(lit.id)}
            {@const isSelected = selected?.id === lit.id && selectedSide === "left"}
            {@const isFailed = failed.has(lit.id)}
            <button
              class="cell"
              class:cell-connected={isConnected}
              class:cell-selected={isSelected}
              class:cell-failed={isFailed && !isConnected}
              onmousedown={(e) => e.preventDefault()}
              onclick={() => tap(lit, "left")}
              disabled={isConnected}
            >
              <span class="cell-text">{leftText(lit, leftItems.indexOf(lit))}</span>
            </button>
          {/each}
        </div>

        <div class="column">
          {#each rightItems as lit}
            {@const isConnected = connected.has(lit.id)}
            {@const isSelected = selected?.id === lit.id && selectedSide === "right"}
            {@const isFailed = failed.has(lit.id)}
            <button
              class="cell"
              class:cell-connected={isConnected}
              class:cell-selected={isSelected}
              class:cell-failed={isFailed && !isConnected}
              onmousedown={(e) => e.preventDefault()}
              onclick={() => tap(lit, "right")}
              disabled={isConnected}
            >
              <span class="cell-text">{rightText(lit)}</span>
            </button>
          {/each}
        </div>
      </div>

    {:else if loading}
      <div class="loading"><span class="dot"></span></div>
    {/if}
  {/snippet}

  {#snippet controls()}
    {#if loading}
      <span class="menu-hint">loading…</span>
    {:else if allMatched}
      <span class="menu-hint">complete</span>
    {:else if selected}
      <span class="menu-hint">now tap the match</span>
    {:else}
      <span class="menu-hint">tap a pair to connect</span>
    {/if}
  {/snippet}
</Desk>

<style>

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1rem;
  }
  .meta-lang {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--signal-primary-ink);
  }
  .meta-count {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--boundary);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-height: 48px;
    padding: 0.75rem 0.875rem;
    border-radius: 0.5rem;
    border: 1px solid var(--boundary);
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--text-light);
    font-size: var(--font-size-base);
    font-family: var(--font-family-serif-heading);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    line-height: 1.3;
  }
  .cell-text {
    display: block;
  }
  .cell:hover:not(:disabled) {
    border-color: var(--text-strong);
  }

  .cell-selected {
    border-color: var(--signal-primary-ink);
    background: color-mix(in srgb, var(--signal-primary-tint) 40%, transparent);
  }

  .cell-connected {
    opacity: 0.25;
    pointer-events: none;
    border-color: var(--signal-positive-ink);
  }

  .cell-failed {
    border-color: var(--signal-negative-ink);
    animation: shake 0.3s ease;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 4rem;
  }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--divider);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

  .menu-hint {
    display: block;
    text-align: center;
    padding: 1rem;
    color: var(--boundary);
    font-size: var(--font-size-sm);
    font-family: var(--font-family-code);
  }

  @media (max-width: 640px) {
    .cell { font-size: var(--font-size-sm); font-family: var(--font-family-sans-text); padding: 0.75rem 0.625rem; min-height: 48px; display: flex; align-items: center; }
    .grid { gap: 0.5rem; }
    .column { gap: 0.375rem; }
  }
</style>
