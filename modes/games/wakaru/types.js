import { v } from "@vivalence/typology";
import { HEARTS } from "./engine/run.js";
import { PLACES } from "./engine/atlas.js";

const tile = (description, example) => v.integer({ minimum: 0 }).desc(description).example(example);

export const run = v
  .object(
    {
      seed: v
        .integer({ minimum: 0 })
        .desc(
          "Charts the world. The same seed over the same atlas is the same rooms, stones, keepers and spawn points.",
        )
        .example(2933376779),
      flags: v
        .array(v.string())
        .desc(
          "Story facts, grow-only. met:<word> a stone was read · reached:<room> · heard:<place> the keeper spoke · " +
            "errand:<place> · asked:<place> · restored:<place> its warden fell · rewarded:<quest> · crowned the summit fell.",
        )
        .example([
          "met:01a1b1c0-dda9-711f-b01b-ef73acc951e7",
          "restored:market",
          "rewarded:market.stones",
        ]),
      counters: v
        .record(v.string(), v.integer({ minimum: 0 }))
        .desc(
          "Tallies, grow-only, an open record. steps · right · wrong · falls · rested:<place> · coins+ · coins- · " +
            "gained:<item> · used:<item> — coins and items held are what came in minus what went out.",
        )
        .example({
          steps: 212,
          right: 14,
          wrong: 3,
          falls: 0,
          "coins+": 120,
          "coins-": 40,
          "gained:lantern": 1,
          "rested:market": 4,
        }),
      pose: v
        .object(
          {
            room: v
              .string()
              .desc("The room the learner stands in: hub, or <place>.<n>.")
              .example("market.0"),
            x: tile("Column.", 1),
            y: tile("Row.", 4),
          },
          { additionalProperties: false },
        )
        .desc("Where the learner stands."),
      hearts: v
        .integer({ minimum: 0, maximum: HEARTS })
        .desc(
          `Hearts left, of ${HEARTS}. A miss costs one; none left wakes the learner at the place's entry, whole.`,
        )
        .example(5),
    },
    { additionalProperties: false },
  )
  .desc(
    "One game run, whole — the only thing a buffer keeps. The world is charted from seed + /atlas on every load; " +
      "what the learner knows is never here, it is their memory in the domain.",
  );

export const buffer = v
  .string()
  .desc("The save: a wakaru buffer — a blank seat until /begin puts a run on it.")
  .example("01a1b1c0-dd81-730d-bca1-0e610c32bca5");

export const place = v
  .enum(PLACES.map((entry) => entry.id))
  .desc("A district or a wing of the valley.")
  .example("market");

export const FEED_INPUT = v.object({
  thread: v.string().desc("The thread the save is bound to."),
});

export const BEGIN_INPUT = v.object({ buffer });

export const KEEP_INPUT = v.object({ buffer, run });

export const MEMORY_INPUT = v.object({
  literals: v
    .array(v.string())
    .desc("Literal ids — the atlas words the screen paints.")
    .example(["01a1b1c0-dda9-711f-b01b-ef73acc951e7"]),
});

export const SPIRITS_INPUT = v.object({
  place: v
    .union([place, v.null()])
    .desc("The place whose due words walk as spirits; null = due anywhere, the shrine's round."),
});

export const SPEAK_INPUT = v.object({ buffer, place });

export const LISTEN_INPUT = v.object({ place });

export const ASK_INPUT = v.object({ buffer, place });

export const JUDGE_INPUT = v.object({
  buffer,
  place,
  question: v
    .string()
    .desc("The keeper's question, as /ask returned it.")
    .example("¿Te gusta el pan?"),
  reply: v
    .string()
    .desc("What the learner typed, in the language being learned.")
    .example("Sí, me gusta el pan"),
  target: v
    .union([v.string(), v.null()])
    .desc(
      "The word the question taught, as /ask returned it — null when the place had no new word left.",
    ),
});

export const DAILY_INPUT = v.object({
  zone: v
    .string()
    .desc(
      "The learner's IANA time zone — the days a streak counts are theirs. Omit = the daemon's own.",
    )
    .example("Europe/Berlin")
    .optional(),
});

export const PLAY_INPUT = v.object({});
