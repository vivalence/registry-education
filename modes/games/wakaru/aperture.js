import { ValidationError, Vector, belt } from "@vivalence/typology";
import * as types from "./types.js";
import * as hal from "./hal/index.js";
import { place } from "./engine/atlas.js";
import { has } from "./engine/run.js";
import { shuffle } from "./engine/random.js";
import {
  CAP,
  atlas,
  draw,
  lexicon,
  memory,
  pilgrims,
  referenced,
  resolver,
  seat,
  spirits,
  vocabulary,
  word,
} from "./deal.js";

const OPTIONS = 4;

// a walk writes often: the run is kept without a broadcast, so the screen that wrote it is not
// handed it back
const keepQuietly = async (entities, buffer, data) => {
  const em = entities.em;
  const meta = em.getMetadata().get(entities.buffer.getEntityName());
  const column = (property) => meta.properties[property].fieldNames[0];
  await em
    .getConnection()
    .execute(`update ${meta.tableName} set ${column("data")} = ? where ${column("id")} = ?`, [
      JSON.stringify(data),
      buffer.id,
    ]);
  await em.refresh(buffer);
};

// the save a keeper's route is called for, with the thread it sits on
const seated = (ctx) =>
  ctx.entities.buffer.findOneOrFail({ id: ctx.input.buffer }, { populate: ["thread"] });

// one object from the cortex under the learner's own model choice: the tier, effort and rounds their
// thread wears (HARNESSED), picked as the runtime picks them for a chat turn
// (systems/runtime/subjects/mode/traits/harnessed.js, requesting) — the mode names none. no tools
// ride along: a keeper's line never reviews, plays or looks anything up
const render = async (ctx, thread, system, schema) => {
  const harnessed = thread.traits.includes("HARNESSED") ? thread.trait.HARNESSED : null;
  const activity = await ctx.entities.activity.control({
    user: ctx.user?.id ?? null,
    mode: ctx.mode.id,
    thread: thread.id,
  });
  const rendered = await ctx.cortex.hallucinate.object.render({
    controller: activity.controller,
    policy: {
      ...(harnessed !== null && belt.object.pick(harnessed, ["provider", "id", "tier", "tune"])),
      ...(harnessed !== null && harnessed.rounds && { rounds: harnessed.rounds }),
    },
    ...(harnessed !== null && harnessed.effort && { settings: { effort: harnessed.effort } }),
    system,
    turns: [],
    output: { schema },
  });
  return rendered.product.object;
};

// the keeper's prompt: who speaks, in what state the place stands, and the only words they may use
const keeper = async (ctx) => {
  const entry = place(ctx.input.place);
  const [buffer, words] = await Promise.all([seated(ctx), vocabulary(ctx, entry)]);
  const run = buffer.data.run;
  const system = {
    voice: hal.keeper.voice(ctx.statics.language, {
      entry,
      heard: has(run, `heard:${entry.id}`),
      restored: has(run, `restored:${entry.id}`),
    }),
    words: hal.keeper.words(ctx.statics.language, words),
  };
  return { system, target: words.target, thread: buffer.thread };
};

// the sentence the learner can almost read: the fewest tokens they never touched, ties by rank
const nearest = (sentences, known) => {
  const untouched = (sentence) =>
    sentence.tokens.filter((token) => token.literal && !known[token.literal]).length;
  return sentences
    .filter((sentence) => sentence.tokens)
    .sort((one, other) => untouched(one) - untouched(other) || one.rank - other.rank)[0];
};

// the calendar day before a day — a step of 24 hours would skip one across a clock change
const before = (day) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

// consecutive days with a review, counted back from a day; a streak counts from yesterday while
// today has none yet, so it only breaks once a whole day passes without one
const streak = (days, day) => (days.has(day) ? 1 + streak(days, before(day)) : 0);

export const aperture = new Vector()
  .open({ nature: "/begin", input: types.BEGIN_INPUT }, async (ctx) =>
    seat(ctx, await ctx.entities.buffer.findOneOrFail({ id: ctx.input.buffer })),
  )

  .open({ nature: "/keep", input: types.KEEP_INPUT }, async (ctx) => {
    const faults = types.run.faults(ctx.input.run);
    if (faults.length)
      throw new ValidationError(
        faults.map((fault) => ({ message: `${fault.at} ${fault.reason}` })),
        "/keep",
      );
    const buffer = await ctx.entities.buffer.findOneOrFail({ id: ctx.input.buffer });
    await keepQuietly(ctx.entities, buffer, { ...buffer.data, run: ctx.input.run });
    if (has(ctx.input.run, "crowned") && buffer.status !== "DONE") {
      buffer.status = "DONE";
      await ctx.entities.em.flush();
    }
    return { kept: true };
  })

  .open({ nature: "/atlas" }, (ctx) => atlas(ctx))

  .open({ nature: "/memory", input: types.MEMORY_INPUT }, (ctx) => memory(ctx, ctx.input.literals))

  .open({ nature: "/spirits", input: types.SPIRITS_INPUT }, async (ctx) => {
    const due =
      ctx.input.place === null ? await pilgrims(ctx) : await spirits(ctx, place(ctx.input.place));
    return due.map((literal) => literal.id);
  })

  .open({ nature: "/speak", input: types.SPEAK_INPUT }, async (ctx) => {
    const { system, target, thread } = await keeper(ctx);
    const spoken = await render(
      ctx,
      thread,
      { ...system, task: hal.speak.task(ctx.statics.language, { target }) },
      hal.speak.output,
    );
    return { line: spoken.line, gloss: spoken.gloss, target: target ? target.id : null };
  })

  .open({ nature: "/ask", input: types.ASK_INPUT }, async (ctx) => {
    const { system, target, thread } = await keeper(ctx);
    const asked = await render(
      ctx,
      thread,
      { ...system, task: hal.ask.task(ctx.statics.language, { target }) },
      hal.ask.output,
    );
    return { question: asked.question, gloss: asked.gloss, target: target ? target.id : null };
  })

  .open({ nature: "/listen", input: types.LISTEN_INPUT }, async (ctx) => {
    const { sentences } = await draw(ctx, place(ctx.input.place));
    const words = await referenced(ctx, sentences);
    const known = await memory(
      ctx,
      words.map((row) => row.id),
    );
    const idOf = resolver(words);
    const fed = sentences.length
      ? await ctx.entities.literal.feed(
          { ontology: "sentence", id: { $in: sentences.map((row) => row.id) } },
          { limit: CAP.sentences },
        )
      : [];
    const read = (rows) => nearest(rows.map((row) => word(row, idOf)), known);
    // which sentence is the domain's call first: one due, then one never heard — once each was heard
    // and none is due yet, any of the place's
    const sentence = read(fed) ?? read(sentences);
    if (!sentence) return { sentence: null, options: [] };
    const meanings = (rows) =>
      rows.map((row) => row.trait.TRANSLATED.known).filter((meaning) => meaning !== sentence.known);
    // decoys are the place's other sentences first, then any sentence when the place has too few
    const near = shuffle(meanings(sentences), Math.random);
    const elsewhere = { ontology: "sentence", id: { $nin: sentences.map((row) => row.id) } };
    const far =
      near.length < OPTIONS - 1
        ? meanings(await ctx.entities.literal.find(elsewhere, { limit: OPTIONS }))
        : [];
    const decoys = [...new Set([...near, ...far])].slice(0, OPTIONS - 1);
    return { sentence, options: shuffle([sentence.known, ...decoys], Math.random) };
  })

  .open({ nature: "/judge", input: types.JUDGE_INPUT }, async (ctx) => {
    const [buffer, words, target] = await Promise.all([
      seated(ctx),
      lexicon(ctx, place(ctx.input.place)),
      ctx.input.target === null
        ? null
        : ctx.entities.literal.findOneOrFail({ id: ctx.input.target }),
    ]);
    const taught = target ? target.id : null;
    const verdict = await render(
      ctx,
      buffer.thread,
      {
        rubric: hal.judge.rubric(ctx.statics.language, {
          question: ctx.input.question,
          reply: ctx.input.reply,
          target,
          words,
        }),
      },
      hal.judge.output,
    );
    // the taught word takes the grade; every other place word the reply used right is a success of
    // its own. one review at a time: each flushes the learner's note
    const used = [...new Set(verdict.used)]
      .filter((index) => index < words.length)
      .map((index) => words[index])
      .filter((row) => row.id !== taught);
    const reviews = [
      ...(target ? [[target, verdict.grade]] : []),
      ...used.map((row) => [row, "SUCCESS"]),
    ];
    const reviewed = {};
    for (const [row, signal] of reviews)
      reviewed[row.id] = (await ctx.entities.literal.review(row, signal)).trait.RETAINED.status;
    return {
      grade: verdict.grade,
      feedback: verdict.feedback,
      correction: verdict.correction,
      memory: reviewed,
    };
  })

  .open({ nature: "/daily", input: types.DAILY_INPUT }, async (ctx) => {
    const calendar = new Intl.DateTimeFormat("en-CA", {
      timeZone: ctx.input.zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const [traces, due] = await Promise.all([
      ctx.entities.note.find({ traits: "TRACED" }, { fields: ["createdAt"] }),
      ctx.entities.note.count({
        traits: "RETAINED",
        trait: { RETAINED: { due: { $lt: new Date().toISOString() } } },
      }),
    ]);
    const days = traces.map((trace) => calendar.format(trace.createdAt));
    const today = calendar.format(new Date());
    const reviewed = new Set(days);
    return {
      due,
      streak: streak(reviewed, reviewed.has(today) ? today : before(today)),
      today: days.filter((day) => day === today).length,
    };
  });
