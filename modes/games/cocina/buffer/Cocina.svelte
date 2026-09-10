<script>
  import * as hud from "../mando/hud.js";
  import { face } from "../mando/lexicon.js";
  import { next, progress, remaining, stepSaid } from "../world.js";

  const { buffer } = $props();
  const data = buffer.$data;
  const opened = $derived(hud.opened($data));
</script>

<div class="cocina">
  <header class="dial">
    <span class="t">cocina</span>
    {#if opened}
      <span class="phase">{#each hud.PHASES as phase}<button class:cur={$data.phase === phase}>{phase}</button>{/each}</span>
      <span class="k">tier {$data.tier}</span>
      <span class="k">×{$data.tempo}</span>
      <span class="k">obeyed {hud.dial($data).obeyed}</span>
      <span class="k">commands {hud.dial($data).commands}</span>
    {:else}
      <span class="k">closed</span>
    {/if}
  </header>
  {#if opened}
    <div class="rail">
      {#each $data.world.tickets as ticket (ticket.id)}
        <div class="ticket" class:late={remaining($data.world, ticket) <= 1}>
          <span class="prog">{progress(ticket)}</span>
          <span class="dish">{ticket.dish.name}</span>
          <span class="step">{stepSaid(next(ticket))}</span>
          <span class="due">⏱ {remaining($data.world, ticket)}</span>
        </div>
      {/each}
      {#if $data.world.tickets.length === 0}<div class="ticket idle"><span class="dish">no ticket on the rail</span></div>{/if}
    </div>
    <div class="tally">
      <span class="chip cook" class:pos={$data.world.cook !== null && $data.world.cook.hit} class:neg={$data.world.cook !== null && !$data.world.cook.hit}>● cook · {$data.world.cook === null ? "idle" : `${face($data.world.cook.prep)} ${face($data.world.cook.ingredient)}`}</span>
      <span class="chip">beat {$data.world.beat}</span>
      <span class="chip pos">served {$data.world.score}</span>
      <span class="chip" class:neg={$data.world.lost > 0}>lost {$data.world.lost}</span>
    </div>
    <footer class="spoken" class:awaiting={$data.spoken !== null}>
      <span class="who">{hud.dial($data).phase === "OBEY" ? "chef" : "you"}</span>
      <span class="said">{hud.said($data)}</span>
    </footer>
    <div class="lexicon">{#each hud.chips($data.lexicon) as chip (chip.title)}<span class="chip" class:on={chip.on} title={chip.title}>{chip.word}</span>{/each}</div>
  {:else}
    <div class="empty">{hud.empty("chef")}</div>
  {/if}
</div>

<style>
  .cocina { height: 100%; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; box-sizing: border-box; background: var(--surface-sunk); color: var(--text-ink); font-family: var(--font-family-code), monospace; font-size: 12px; }
  .dial { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: var(--surface-lift); box-shadow: inset 0 0 0 1px var(--boundary); border-radius: var(--shape-radius-card); }
  .dial .t { color: var(--text-strong); font-weight: 600; }
  .dial .k { color: var(--text-muted); }
  .phase { display: inline-flex; gap: 2px; }
  .phase button { height: 22px; padding: 0 8px; border: 0; background: transparent; border-radius: var(--shape-radius-key); color: var(--text-muted); font-family: inherit; font-size: 12px; cursor: default; }
  .phase button.cur { background: var(--control-contrast-pressed); color: var(--control-on-pressed); }
  .rail { display: flex; flex-direction: column; gap: 4px; }
  .ticket { display: grid; grid-template-columns: 4ch 10ch 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; background: var(--surface-lift); box-shadow: inset 0 0 0 1px var(--boundary); border-left: 3px solid var(--signal-primary); border-radius: var(--shape-radius-card); }
  .ticket.late { border-left-color: var(--signal-caution); }
  .ticket.idle { border-left-color: transparent; color: var(--text-muted); }
  .ticket .prog { color: var(--signal-primary-ink); letter-spacing: 1px; }
  .ticket .dish { color: var(--text-strong); font-weight: 600; }
  .ticket .step { color: var(--text-ink); font-size: 14px; }
  .ticket .due { color: var(--text-muted); }
  .ticket.late .due { color: var(--signal-caution-ink); }
  .tally, .lexicon { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { height: 22px; padding: 0 9px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; color: var(--text-muted); box-shadow: inset 0 0 0 1px var(--boundary); }
  .chip.pos { color: var(--signal-positive-ink); }
  .chip.neg { color: var(--signal-negative-ink); }
  .chip.on { color: var(--text-strong); background: var(--control-selected); }
  .spoken { display: flex; align-items: baseline; gap: 12px; padding: 8px 12px; background: var(--surface-lift); box-shadow: inset 0 0 0 1px var(--boundary); border-radius: var(--shape-radius-card); }
  .spoken .who { color: var(--text-muted); }
  .spoken .said { color: var(--text-strong); font-size: 16px; }
  .spoken.awaiting .who { color: var(--signal-caution-ink); }
  .empty { padding: 12px; color: var(--text-muted); }
</style>
