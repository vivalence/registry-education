<script>
  import { string } from "@vivalence/typology";
  import { Keyboard, Asset, ViewportLock, Desk, persist } from "@vivalence/drapes";

  const { terminal, buffer, surface } = $props();
  const files = terminal.client.runtime.entities.file.$entities;

  let keyboard;

  const data = buffer.data ?? {};
  const gameplay = data.gameplay ?? "TYPE";
  let language = $state.raw(buffer.mode.daemon.statics?.language ?? {});
  const blankIndices = new Set(data.blankIndices ?? []);
  const forgiving = data.forgiving ?? true;

  buffer.mode.daemon.connection
    .call("/language", {})
    .then((pair) => {
      if (pair?.known || pair?.learning) language = pair;
    })
    .catch((error) => console.warn("[cloze] /language failed", error));

  let literal = $state(buffer.literals?.[0] ?? null);
  let loading = $state(!literal);
  let submitted = $state(false);
  let answers = $state({});

  const tokens = $derived(literal?.trait?.ANNOTATED?.tokens ?? []);
  const known = $derived(literal?.trait?.TRANSLATED?.known);
  const file = $derived(
    $files.find((file) => file.path === literal?.trait?.VOCALIZED?.asset?.path && file.mode.daemon === buffer.mode.daemon) ?? null,
  );
  const isListenMode = $derived(gameplay === "LISTEN");

  if (!literal) {
    buffer.mode.daemon.connection.call("/pick/literal/feed", { limit: 1, where: { traits: { $contains: "ANNOTATED" } } }).then(([lit]) => {
      literal = lit ?? null;
      if (literal && !blankIndices.size) blankIndices.add(0);
      loading = false;
    });
  }

  function evaluate(index) {
    const token = tokens[index];
    if (!token) return false;
    return string.matches(answers[index] ?? "", token.form, {
      forgiving,
      contractions: language.learning?.contractions ?? null,
      elision: language.learning?.elision ?? false,
    });
  }

  function submit() {
    if (submitted) return;
    submitted = true;

    for (const i of blankIndices) {
      const token = tokens[i];
      if (!token) continue;
      const correct = evaluate(i);
      const literalRef = token.literal ?? literal.id;
      buffer.mode.daemon.connection.call("/review/literal", {
        signal: correct ? "SUCCESS" : "MISTAKE",
        scope: { literal: typeof literalRef === "object" ? literalRef.id ?? literalRef : literalRef },
      });
    }

  }

  function advance() {
    buffer.release();
  }

  function handleKey(event) {
    if (event.key === "Enter" && !submitted) {
      event.preventDefault();
      submit();
    } else if (event.key === "Enter" && submitted) {
      event.preventDefault();
      advance();
    }
  }

  function selectOption(index, option) {
    if (submitted) return;
    answers[index] = option;
    const allFilled = [...blankIndices].every((i) => answers[i]);
    if (allFilled) submit();
  }

  $effect(() => {
    if (submitted && keyboard) keyboard.focus();
  });

  const options = $derived(
    gameplay === "PICK" && data.options?.length
      ? data.options
      : gameplay === "PICK"
        ? [...new Set([...blankIndices].map((i) => tokens[i]?.form).filter(Boolean))]
        : [],
  );
</script>

<Keyboard bind:this={keyboard} />
<ViewportLock />
<svelte:window onkeydown={handleKey} />

<Desk>
  {#snippet surface()}
    {#if literal}
      {#if !isListenMode}
        <div class="meta">
          <span class="meta-lang">{language.learning?.name}</span>
          {#if known}
            <span class="meta-hint">{known}</span>
          {/if}
        </div>
      {:else}
        <div class="meta">
          <span class="meta-lang">Listen</span>
          {#if file}
            <div class="audio-block"><Asset autoplay={true} {file} /></div>
          {/if}
        </div>
      {/if}

      <div class="tokens">
        {#each tokens as token, i}
          {#if blankIndices.has(i)}
            <span class="gap">
              {#if submitted}
                {@const correct = evaluate(i)}
                <span class="gap-answer" class:gap-ok={correct} class:gap-wrong={!correct}>
                  {token.form}
                </span>
                {#if !correct && answers[i]}
                  <span class="gap-yours">{answers[i]}</span>
                {/if}
              {:else if gameplay === "TYPE" || gameplay === "LISTEN"}
                <input
                  class="gap-input"
                  type="text"
                  placeholder={token.gloss ?? "…"}
                  bind:value={answers[i]}
                  use:persist={{ active: i === [...blankIndices][0] }}
                />
              {:else}
                <span class="gap-gloss">{token.gloss ?? "…"}</span>
              {/if}
            </span>
          {:else if !isListenMode}
            <span class="tok">{token.form}</span>
          {:else}
            <span class="tok tok-hidden">{'_'.repeat(token.form.length)}</span>
          {/if}
        {/each}
      </div>

      {#if gameplay === "PICK" && !submitted}
        <div class="options">
          {#each options as opt}
            {@const selected = Object.values(answers).includes(opt)}
            <button
              class="opt"
              class:opt-selected={selected}
              onclick={() => {
                const nextBlank = [...blankIndices].find((i) => !answers[i]);
                if (nextBlank !== undefined) selectOption(nextBlank, opt);
              }}
              disabled={submitted}
            >
              {opt}
            </button>
          {/each}
        </div>
      {/if}

    {:else if loading}
      <div class="loading"><span class="dot"></span></div>
    {/if}
  {/snippet}

  {#snippet controls()}
    {#if loading}
      <span class="menu-hint">loading…</span>
    {:else if submitted}
      <button class="btn btn-next" onclick={advance}>
        Next
      </button>
    {:else if gameplay === "TYPE" || gameplay === "LISTEN"}
      <button class="btn btn-submit" onclick={submit}>
        Check
      </button>
    {:else}
      <span class="menu-hint">fill the gap</span>
    {/if}
  {/snippet}
</Desk>

<style>
  .meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    align-items: baseline;
  }
  .meta-lang {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--signal-primary-ink);
  }
  .meta-hint {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    color: var(--boundary);
    font-style: italic;
  }

  .audio-block {
    margin-left: auto;
    display: flex;
    align-items: center;
  }

  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.4rem;
    line-height: 1.5;
    align-items: baseline;
    margin-bottom: 1.5rem;
  }

  .tok {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    line-height: 1.5;
    color: var(--text-strong);
  }
  .tok-hidden {
    color: var(--boundary);
    letter-spacing: 0.15em;
  }

  .gap {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    border-bottom: 2px solid var(--signal-primary-ink);
    padding: 0;
    line-height: 1.5;
  }

  .gap-input {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    line-height: 1.5;
    color: var(--text-strong);
    background: none;
    border: none;
    outline: none;
    text-align: center;
    padding: 0 0.25rem;
    field-sizing: content;
    min-width: 3rem;
  }

  .gap-gloss {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--boundary);
  }

  .gap-answer {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    line-height: 1.5;
    text-align: center;
    padding: 0 0.25rem;
  }
  .gap-ok { color: var(--signal-positive-ink); }
  .gap-wrong { color: var(--signal-negative-ink); }

  .gap-yours {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--signal-negative-ink);
    text-decoration: line-through;
    opacity: 0.7;
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .opt {
    min-height: 48px;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--boundary);
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--text-light);
    font-size: var(--font-size-lg);
    font-family: var(--font-family-serif-heading);
    cursor: pointer;
    transition: all 0.12s;
  }
  .opt:hover:not(:disabled) { border-color: var(--text-strong); }
  .opt-selected {
    background: color-mix(in srgb, var(--signal-primary-tint) 60%, transparent);
    border-color: var(--signal-primary-ink);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 2rem;
  }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--divider);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

  .menu-hint {
    display: block;
    width: 100%;
    text-align: center;
    padding: 1rem;
    color: var(--boundary);
    font-size: var(--font-size-sm);
    font-family: var(--font-family-code);
  }

  .btn {
    flex: 1;
    min-height: 48px;
    padding: 0.75rem 0.5rem;
    border-radius: 0.625rem;
    border: none;
    font-size: var(--font-size-base);
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family-sans-text);
  }
  .btn-submit {
    background: var(--signal-primary-tint);
    color: var(--signal-primary-ink);
  }
  .btn-next {
    background: transparent;
    border: 1px solid var(--boundary);
    color: var(--text-strong);
  }

  @media (max-width: 640px) {
    .tokens { gap: 0.3rem 0.35rem; margin-bottom: 1.25rem; }
    .tok, .gap-answer, .gap-input { font-size: var(--font-size-lg); font-family: var(--font-family-sans-text); }
    .gap-input { min-width: 2.5rem; }
    .opt { font-size: var(--font-size-base); font-family: var(--font-family-sans-text); padding: 0.75rem 1rem; min-height: 48px; }
  }
</style>
