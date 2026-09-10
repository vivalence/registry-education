<script>
  import * as hud from "../mando/hud.js";
  import { face } from "../mando/lexicon.js";
  import { GLYPH, grid } from "../world.js";

  const { buffer } = $props();
  const data = buffer.$data;
  const opened = $derived(hud.opened($data));
</script>

<div class="comando">
  <header class="dial">
    <span class="t">comando</span>
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
    <div class="board" style="grid-template-columns: repeat({$data.world.w}, 1fr)">
      {#each grid($data.world).flat() as cell (`${cell.x}:${cell.y}`)}<span class="cell {cell.kind}" title={cell.title}>{cell.glyph}</span>{/each}
    </div>
    <div class="tally">
      {#each $data.world.units as unit (unit.id)}<span class="chip unit"><b>{GLYPH[unit.unit]}</b> {face(unit.unit)} {face(unit.color)} ({unit.x}, {unit.y})</span>{/each}
      {#each $data.world.goals as goal (goal.id)}<span class="chip goal">◆ ({goal.x}, {goal.y}) · due {goal.due}</span>{/each}
      <span class="chip">beat {$data.world.beat}</span>
      <span class="chip pos">score {$data.world.score}</span>
      <span class="chip" class:neg={$data.world.lost > 0}>lost {$data.world.lost}</span>
    </div>
    <footer class="spoken" class:awaiting={$data.spoken !== null}>
      <span class="who">{hud.dial($data).phase === "OBEY" ? "commander" : "you"}</span>
      <span class="said">{hud.said($data)}</span>
    </footer>
    <div class="lexicon">{#each hud.chips($data.lexicon) as chip (chip.title)}<span class="chip" class:on={chip.on} title={chip.title}>{chip.word}</span>{/each}</div>
  {:else}
    <div class="empty">{hud.empty("commander")}</div>
  {/if}
</div>

<style>
  .comando { height: 100%; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; box-sizing: border-box; background: var(--surface-sunk); color: var(--text-ink); font-family: var(--font-family-code), monospace; font-size: 12px; }
  .dial { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: var(--surface-lift); box-shadow: inset 0 0 0 1px var(--boundary); border-radius: var(--shape-radius-card); }
  .dial .t { color: var(--text-strong); font-weight: 600; }
  .dial .k { color: var(--text-muted); }
  .phase { display: inline-flex; gap: 2px; }
  .phase button { height: 22px; padding: 0 8px; border: 0; background: transparent; border-radius: var(--shape-radius-key); color: var(--text-muted); font-family: inherit; font-size: 12px; cursor: default; }
  .phase button.cur { background: var(--control-contrast-pressed); color: var(--control-on-pressed); }
  .board { display: grid; gap: 2px; padding: 8px; max-width: 480px; background: var(--surface-lift); box-shadow: inset 0 0 0 1px var(--boundary); border-radius: var(--shape-radius-card); }
  .cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; background: var(--surface-sunk); border-radius: var(--shape-radius-key); color: var(--text-muted); font-size: 14px; }
  .cell.unit { background: var(--control-contrast-pressed); color: var(--control-on-pressed); font-weight: 600; }
  .cell.goal { color: var(--signal-caution-ink); font-weight: 600; }
  .cell.hazard { color: var(--signal-negative-ink); }
  .tally, .lexicon { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { height: 22px; padding: 0 9px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; color: var(--text-muted); box-shadow: inset 0 0 0 1px var(--boundary); }
  .chip b { color: var(--text-strong); font-weight: 600; }
  .chip.unit { color: var(--text-strong); }
  .chip.goal { color: var(--signal-caution-ink); }
  .chip.pos { color: var(--signal-positive-ink); }
  .chip.neg { color: var(--signal-negative-ink); }
  .chip.on { color: var(--text-strong); background: var(--control-selected); }
  .spoken { display: flex; align-items: baseline; gap: 12px; padding: 8px 12px; background: var(--surface-lift); box-shadow: inset 0 0 0 1px var(--boundary); border-radius: var(--shape-radius-card); }
  .spoken .who { color: var(--text-muted); }
  .spoken .said { color: var(--text-strong); font-size: 16px; }
  .spoken.awaiting .who { color: var(--signal-caution-ink); }
  .empty { padding: 12px; color: var(--text-muted); }
</style>
