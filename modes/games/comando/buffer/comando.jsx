import { For, from, Show } from "solid-js";
import { _render, createComponent, RendererContext } from "@opentui/solid";
import * as hud from "../mando/hud.js";
import { face } from "../mando/lexicon.js";
import { grid } from "../world.js";

export function Comando(props) {
  const { palette } = props;
  const data = from(props.buffer.$data);
  const INK = {
    unit: { fg: palette.surfaceSunk, bg: palette.textStrong },
    goal: { fg: palette.signalCaution },
    hazard: { fg: palette.signalNegative },
    empty: { fg: palette.textMuted },
  };
  return (
    <box style={{ flexDirection: "column", gap: 1 }}>
      <Show when={hud.opened(data())} fallback={<text fg={palette.textMuted}>{`comando · closed · ${hud.empty("commander")}`}</text>}>
        <text fg={palette.textInk}>{hud.dialed("comando", data())}</text>
        <box style={{ flexDirection: "column" }}>
          <For each={grid(data().world)}>
            {(cells) => (
              <text>
                <For each={cells}>{(cell) => <span style={INK[cell.kind]}>{`${cell.glyph} `}</span>}</For>
              </text>
            )}
          </For>
        </box>
        <text fg={palette.textMuted}>
          {data().world.units.map((unit) => `${face(unit.unit)} ${face(unit.color)} (${unit.x}, ${unit.y})`).join(" · ")}
          {` · beat ${data().world.beat} · score ${data().world.score} · lost ${data().world.lost}`}
        </text>
        <text>
          <span style={{ fg: data().spoken === null ? palette.textMuted : palette.signalCaution }}>{data().phase === "OBEY" ? "commander" : "you"}</span>
          <span style={{ fg: palette.textStrong }}>{`  ${hud.said(data())}`}</span>
        </text>
        <text>
          <For each={hud.chips(data().lexicon)}>{(chip) => <span style={{ fg: chip.on ? palette.textStrong : palette.textMuted }}>{`${chip.word}  `}</span>}</For>
        </text>
      </Show>
    </box>
  );
}

export default (element, { terminal, buffer, surface, renderer, palette, focused }) => {
  const dispose = _render(
    () =>
      createComponent(RendererContext.Provider, {
        value: renderer,
        get children() {
          return createComponent(Comando, { terminal, buffer, surface, renderer, palette, focused });
        },
      }),
    element,
  );
  return {
    destroy: () => {
      dispose();
      for (const child of element.getChildren()) child.destroyRecursively();
    },
  };
};
