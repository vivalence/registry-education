import { For, from, Show } from "solid-js";
import { _render, createComponent, RendererContext } from "@opentui/solid";
import * as hud from "../mando/hud.js";
import { face } from "../mando/lexicon.js";
import { next, progress, remaining, stepSaid } from "../world.js";

export function Cocina(props) {
  const { palette } = props;
  const data = from(props.buffer.$data);
  const cook = () => data().world.cook;
  return (
    <box style={{ flexDirection: "column", gap: 1 }}>
      <Show when={hud.opened(data())} fallback={<text fg={palette.textMuted}>{`cocina · closed · ${hud.empty("chef")}`}</text>}>
        <text fg={palette.textInk}>{hud.dialed("cocina", data())}</text>
        <box style={{ flexDirection: "column" }}>
          <For each={data().world.tickets} fallback={<text fg={palette.textMuted}>no ticket on the rail</text>}>
            {(ticket) => (
              <text>
                <span style={{ fg: palette.signalPrimary }}>{progress(ticket)}</span>
                <span style={{ fg: palette.textStrong }}>{` ${ticket.dish.name.padEnd(10)}`}</span>
                <span style={{ fg: palette.textInk }}>{` ${stepSaid(next(ticket))}`}</span>
                <span style={{ fg: remaining(data().world, ticket) <= 1 ? palette.signalCaution : palette.textMuted }}>{`  ⏱ ${remaining(data().world, ticket)}`}</span>
              </text>
            )}
          </For>
        </box>
        <text>
          <span style={{ fg: cook() === null ? palette.textMuted : cook().hit ? palette.signalPositive : palette.signalNegative }}>● </span>
          <span style={{ fg: palette.textMuted }}>{`cook · ${cook() === null ? "idle" : `${face(cook().prep)} ${face(cook().ingredient)}`} · beat ${data().world.beat} · served ${data().world.score} · lost ${data().world.lost}`}</span>
        </text>
        <text>
          <span style={{ fg: data().spoken === null ? palette.textMuted : palette.signalCaution }}>{data().phase === "OBEY" ? "chef" : "you"}</span>
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
          return createComponent(Cocina, { terminal, buffer, surface, renderer, palette, focused });
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
