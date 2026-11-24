<script>
  import { typing } from "./keys.js";
  import { said } from "./words.js";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { ViewportLock } from "@vivalence/drapes/svelte";
  import { DISTRICTS, WAKING, fold, place } from "../engine/atlas.js";
  import { beat } from "../engine/beat.js";
  import { PASSING } from "../engine/beats/talk.js";
  import { ITEMS } from "../engine/loot.js";
  import { level } from "../engine/level.js";
  import { markers, quests, tracker } from "../engine/quest.js";
  import { has, held } from "../engine/run.js";
  import { same } from "../engine/tiles.js";
  import { enter } from "../engine/world.js";
  import { route } from "../engine/path.js";
  import { survey } from "../engine/beats/walk.js";
  import { burst } from "./paint.js";
  import { sfx } from "./sfx.js";
  import * as live from "./live.js";
  import Stage from "./parts/Stage.svelte";
  import Hud from "./parts/Hud.svelte";
  import Pad from "./parts/Pad.svelte";
  import Arrival from "./parts/Arrival.svelte";
  import Scroll from "./parts/Scroll.svelte";
  import Duel from "./parts/Duel.svelte";
  import Dialogue from "./parts/Dialogue.svelte";
  import Trial from "./parts/Trial.svelte";
  import Fishing from "./parts/Fishing.svelte";
  import Swarm from "./parts/Swarm.svelte";
  import Atlas from "./parts/Atlas.svelte";
  import Journal from "./parts/Journal.svelte";
  import Codex from "./parts/Codex.svelte";

  const { terminal, buffer } = $props();
  const recorded = terminal.client.runtime.entities.file.$entities;
  const voice = live.voice();
  const sounds = sfx();

  // the world's clock beats every tenth of a second; a held way steps at the stride a step glides
  // in
  const TICK = 100;
  const STRIDE = 110;
  // a press steps at once, and walks on once held this long
  const HOLD = 170;
  // how far a finger travels before its touch is a swipe, in css pixels
  const SWIPE = 24;
  // no key or touch for this long, and the learner is away: the world holds its breath
  const IDLE = 45000;
  // the arrival card stays this long, and holds the learner's input only for its first moment
  const ARRIVAL = 1800;
  const CALM = 300;
  const KEEP = 1200;
  const RECOUNT = 2000;
  const SAY = 2600;
  const TOASTS = 3;

  const GAMES = { trial: Trial, fishing: Fishing, swarm: Swarm };

  const WAYS = {
    ArrowUp: "north",
    ArrowDown: "south",
    ArrowLeft: "west",
    ArrowRight: "east",
    w: "north",
    s: "south",
    a: "west",
    d: "east",
  };
  const OPENS = { m: "atlas", j: "journal", c: "codex" };

  const BUZZ = {
    bump: 6,
    item: 12,
    met: 12,
    chest: 16,
    spotted: [10, 40, 10],
    strike: 14,
    hurt: [30, 40, 30],
    rested: [12, 30, 24],
    catch: [12, 30, 24],
    fallen: [60, 40, 60],
    restored: [20, 40, 20, 40, 60],
    crowned: [30, 50, 30, 50, 90],
  };

  // what acting on a fixture does, for the act button's label
  const FIXTURES = {
    keeper: "talk",
    vendor: "talk",
    shrine: "visit",
    bed: "rest",
    sign: "read",
    warden: "face",
    summit: "face",
    haunt: "gather",
  };

  // a hold walks on through plain steps, a voiced word, an item picked up and a doorway; anything
  // else that answers a step ends it, and ends a tapped walk
  const ONWARD = ["step", "audio", "item", "entered"];

  let world = $state.raw(null);
  let memory = $state.raw({});
  let due = $state.raw([]);
  let language = $state.raw(null);
  let game = $state.raw(null);
  let daily = $state.raw(null);
  let scrolls = $state.raw([]);
  let toasts = $state.raw([]);
  let arrival = $state.raw(null);
  let panel = $state(null);
  let now = $state(Date.now());
  // when the world stopped for a learner away — the page hidden or no input for IDLE — else null
  let resting = $state(null);
  let loading = $state(false);
  let fault = $state(null);
  let sheet = $state(null);
  // what covers the stage's head and foot, measured: the hud's height, the pad's (none where a
  // keyboard walks), and the keyboard's legend, which stands off the foot (none on a touch screen)
  let headroom = $state(0);
  let footroom = $state(0);
  let worldTall = $state(0);
  let legendTall = $state(0);
  let legend = $state(null);
  // where a tap sent the learner: a cell, or a spirit followed as it roams
  let goal = $state.raw(null);

  // what the painter keeps between frames, none of it game state: the screen names a moment's
  // tone — strike · hurt · heal · coin · rest · restore — and the painter alone knows its colour
  const fx = { sparks: [], shake: 0, flash: { until: 0, tone: "strike" } };
  const asking = new Set();
  // the way the learner walks while a key, the pad or a finger holds it
  let hold = null;
  // the ways held down on the keyboard, the last pressed leading
  let keys = [];
  // the touch on the stage: where it began, and the way it swiped, null while it is a tap
  let gesture = null;
  let stirred = Date.now();
  let wandering = null;
  let keeping = null;
  let counting = null;
  let shown = null;
  let told = 0;

  const duel = $derived(game === null ? null : game.scene.duel);
  const dialogue = $derived(game === null ? null : game.scene.dialogue);
  const minigame = $derived(game === null ? null : game.scene.game);
  const walking = $derived(game !== null && !duel && !dialogue && !minigame);
  // the band the camera frames the learner in: under the hud, and above the pad or the legend
  // (from its top to the world's foot) while walking; a duel, a talk or a game lifts the foot
  const inset = $derived({
    top: headroom,
    bottom: !walking
      ? 0
      : Math.max(footroom, legend !== null && legendTall > 0 ? worldTall - legend.offsetTop : 0),
  });
  const scroll = $derived(scrolls.length > 0 ? scrolls[0] : null);
  // a sentence the keeper read out and not yet placed: 1 to 4 pick its meaning
  const meanings = $derived(
    dialogue !== null &&
      dialogue.page.kind === "listen" &&
      dialogue.page.awaits === null &&
      dialogue.page.picked === null
      ? dialogue.page.meanings
      : [],
  );
  // the run alone, so what reads it is not asked again on every tick that moves a spirit
  const run = $derived(game === null ? null : game.run);
  const reached = $derived(world === null ? null : level(world, memory));
  const next = $derived(run === null ? null : tracker(world, run, ctx()));
  const marks = $derived(run === null ? [] : markers(world, run, ctx(), run.pose.map));

  const ctx = () => ({ world, memory, due, now: Date.now(), random: Math.random });

  // the tile ahead, as the act button names it, in the order the walk meets it: a spirit, whoever
  // stands there or across a counter, a chest still shut, a pot still whole, a stone, water while a
  // rod is held; anything else an act only bumps
  const VERBS = [
    [(ahead) => ahead.spirit, () => "duel"],
    [(ahead) => ahead.fixture, (ahead) => FIXTURES[ahead.fixture.kind]],
    [(ahead) => ahead.chest && !has(game.run, `opened:${ahead.chest.id}`), () => "open"],
    [(ahead) => ahead.pot && !has(game.run, `broke:${ahead.pot.id}`), () => "smash"],
    [(ahead) => ahead.stone, () => "read"],
    [(ahead) => ahead.across, () => "talk"],
    [(ahead) => ahead.ground.fish && held(game.run, "rod") > 0, () => "fish"],
    [() => true, () => "act"],
  ];

  const verb = $derived.by(() => {
    if (!walking) return "act";
    const ahead = survey(game, ctx());
    const [, named] = VERBS.find(([answers]) => answers(ahead));
    return named(ahead);
  });

  // one toast for one thing said: said again, it is refreshed where it stands rather than stacked
  const toast = (text, tone) => {
    const kept = toasts.filter((shown) => shown.text !== text);
    toasts = [...kept, { id: (told += 1), text, tone, left: SAY }].slice(-TOASTS);
  };

  // coins paid beat after beat, as a round pays each answer, add up on one toast
  const pay = (amount) => {
    const last = toasts.at(-1);
    const adding = last !== undefined && last.tone === "coins";
    const paid = adding ? last.paid + amount : amount;
    const kept = adding ? toasts.slice(0, -1) : toasts;
    const added = { id: (told += 1), text: `+${paid} coins`, tone: "coins", paid, left: SAY };
    toasts = [...kept, added].slice(-TOASTS);
  };

  // a phone without a motor (every iPhone) has no vibrate at all
  const buzz = (type) => BUZZ[type] && navigator.vibrate?.(BUZZ[type]);

  const flash = (tone) => (fx.flash = { until: Date.now() + 260, tone });

  const sound = (word) => {
    const file = live.fileOf($recorded, buffer, world.words[word].audio);
    if (file) voice(file);
  };

  const learning = (word) => said(world, word).learning;

  const stands = (kind) =>
    world.maps[game.run.pose.map].fixtures.find((fixture) => fixture.kind === kind);

  // where the foe stands, for the sparks of a strike: a spirit stays in the scene until its rest,
  // every other foe is a fixture of the map
  const FOES = {
    spirit: (foe) => game.scene.spirits.find((spirit) => spirit.word === foe.word),
    warden: () => stands("warden"),
    summit: () => stands("summit"),
    pilgrim: () => stands("shrine"),
  };

  // a sealed way says why, and what opens it. a place's home map shares its id, so a fallow place,
  // absent from the world's places, still has its map's name
  const SEALS = {
    fallow: ({ place: id }) => `${world.maps[id].name} lies fallow — none of your words live there`,
    locked: ({ place: id }) => {
      const { name } = world.places[id];
      const { opens } = place(id);
      if (opens) return `${name} opens once ${opens} districts stand restored`;
      const districts = world.order.filter((other) => !place(other).opens);
      const before = districts[districts.indexOf(id) - 1];
      return `${name} opens once ${world.places[before].name} is restored`;
    },
    asleep: ({ place: id, share }) => {
      const { words } = world.places[id];
      const holding = Math.round(share * words.length);
      const waking = Math.ceil(words.length * WAKING);
      return `the warden sleeps · ${holding} of ${words.length} words held, it wakes at ${waking}`;
    },
    unrestored: ({ share }) => {
      const districts = DISTRICTS.filter((district) => world.order.includes(district.id));
      const restored = Math.round(share * districts.length);
      return `the summit sleeps · ${restored} of ${districts.length} districts restored`;
    },
  };

  // a quest's id is its place, a dot, its kind
  const journal = ({ quest }) => {
    const { title } = quests(world, quest.split(".")[0]).find((entry) => entry.id === quest);
    return `journal · ${title} — done`;
  };

  // the keeper's words come from the daemon: each route's reply lands as the action the dialogue's
  // page awaits
  const KEEPER = {
    speak: {
      awaits: "heard",
      request: (effect) => live.speak(buffer, effect.place),
      land: (said) => ({ type: "heard", line: said.line, gloss: said.gloss }),
    },
    listen: {
      awaits: "listened",
      request: (effect) => live.listen(buffer, effect.place),
      land: (heard) => ({ type: "listened", sentence: heard.sentence, options: heard.options }),
    },
    ask: {
      awaits: "asked",
      request: (effect) => live.ask(buffer, effect.place),
      land: (asked) => ({
        type: "asked",
        question: asked.question,
        gloss: asked.gloss,
        target: asked.target,
      }),
    },
    judge: {
      awaits: "judged",
      request: (effect) => live.judge(buffer, effect),
      // the daemon reviewed the reply's words itself: their standing comes back with the grade,
      // which names the reply it graded, so it lands on that reply's page alone
      land: (judged, effect) => {
        memory = fold(world.words, { ...memory, ...judged.memory });
        recount();
        return {
          type: "judged",
          reply: effect.reply,
          grade: judged.grade,
          feedback: judged.feedback,
          correction: judged.correction,
        };
      },
    },
  };

  // a reply that comes back after the view is gone lands nowhere: nothing is dispatched or
  // scheduled again on a screen no one sees
  let destroyed = false;
  const alive = (land) => (value) => (destroyed ? undefined : land(value));

  // one request per route and place in flight; a reply that fails still lands, as a failed one, so
  // no page is left waiting — a page that moved on meanwhile lets it pass
  function relay(effect) {
    const keeper = KEEPER[effect.type];
    const key = `${effect.type}:${effect.place}:${effect.reply ?? ""}`;
    if (asking.has(key)) return;
    asking.add(key);
    keeper
      .request(effect)
      .then(alive((reply) => dispatch(keeper.land(reply, effect))))
      .catch(
        alive((error) => {
          console.warn(`[wakaru] /${effect.type} failed`, effect.place, error);
          toast("the keeper is lost for words", "fallen");
          dispatch({ type: keeper.awaits, failed: true, reply: effect.reply });
        }),
      )
      .finally(() => asking.delete(key));
  }

  // a place's spirits are its due words, fetched as the learner arrives in it; the map they stand
  // on fills once the words come, unless the learner moved on or something is up
  function wander(place) {
    if (place === wandering) return;
    wandering = place;
    const entered = game.run.pose.map;
    live
      .spirits(buffer, place)
      .then(
        alive((fetched) => {
          due = live.gather(due, world, place, fetched);
          if (game.run.pose.map !== entered || !walking) return;
          game = { ...game, scene: enter(world, game.run, ctx()) };
        }),
      )
      .catch((error) => console.warn("[wakaru] /spirits failed", place, error));
  }

  // the daily count moves with every review: fetched again once the reviews settle
  function recount() {
    clearTimeout(counting);
    counting = setTimeout(() => {
      live
        .daily(buffer)
        .then(alive((counted) => (daily = counted)))
        .catch((error) => console.warn("[wakaru] /daily failed", error));
    }, RECOUNT);
  }

  // a map's arrival card: its name and, where a place's words live, the word the place is known by
  function announce(name, place) {
    const word = Object.hasOwn(world.places, place) ? world.places[place].signature : null;
    arrival = { name, word: word === null ? null : said(world, word), at: Date.now() };
    if (word !== null) sound(word);
    clearTimeout(shown);
    shown = setTimeout(() => (arrival = null), ARRIVAL);
  }

  // the arrival card's first moment holds the learner's input, so a held key does not walk them
  // straight back out of a door
  const calm = () => arrival !== null && Date.now() - arrival.at < CALM;

  // a thing found in a chest or handed as a reward: a tool is told on a card, the rest in a toast
  const gained = (item) => {
    if (ITEMS[item].kind === "tool") scrolls = [...scrolls, { kind: "found", item }];
    else toast(`found a ${item}`, "item");
  };

  // whatever opens over the walk stops it
  const halt = () => {
    goal = null;
    hold = null;
  };

  // an effect is the screen's half of a beat: the engine says what, this table says how
  const EFFECTS = {
    step: () => {},
    bump: () => (fx.shake = Date.now() + 120),
    // the walk picks up a word lying on the ground
    item: (effect) => {
      sounds.play("pick");
      toast(`picked up ${learning(effect.word)}`, "item");
    },
    // a chest or a reward hands over an item
    gained: (effect) => {
      sounds.play("pick");
      gained(effect.item);
    },
    sealed: (effect) => {
      sounds.play("deny");
      toast(SEALS[effect.reason](effect), "sealed");
    },
    duel: () => {
      halt();
      sounds.play("spotted");
    },
    // a word answered right is no longer due — at the shrine, in a duel, at an errand — it waits
    // its turn with the domain; its standing comes back with the review
    review: (effect) => {
      if (PASSING.includes(effect.signal)) due = due.filter((id) => id !== effect.literal);
      return live.review(buffer, effect).then(
        alive((status) => {
          if (status === null) return;
          memory = fold(world.words, { ...memory, [effect.literal]: status });
          recount();
        }),
      );
    },
    audio: ({ word }) => sound(word),
    strike: () => {
      sounds.play("strike");
      flash("strike");
      burst(fx, FOES[duel.foe.kind](duel.foe), "strike", Date.now());
    },
    hurt: () => {
      sounds.play("hurt");
      flash("hurt");
      fx.shake = Date.now() + 220;
    },
    rested: ({ word }) => {
      due = due.filter((id) => id !== word);
      burst(fx, game.run.pose, "rest", Date.now());
      toast(`${learning(word)} — laid to rest`, "rested");
    },
    restored: (effect) => {
      sounds.play("fanfare");
      scrolls = [...scrolls, { kind: "restored", place: effect.place }];
      burst(fx, game.run.pose, "restore", Date.now(), 24);
    },
    crowned: () => {
      sounds.play("fanfare");
      scrolls = [...scrolls, { kind: "crowned" }];
      burst(fx, game.run.pose, "restore", Date.now(), 32);
    },
    // the learner wakes whole where the world sends a fallen learner, maybe in another place
    fallen: () => {
      halt();
      toast("you wake at the entry, whole again", "fallen");
      wander(world.maps[game.run.pose.map].place);
    },
    speak: relay,
    listen: relay,
    ask: relay,
    judge: relay,
    coins: ({ amount }) => {
      sounds.play("coin");
      burst(fx, game.run.pose, "coin", Date.now(), 8);
      pay(amount);
    },
    quest: (effect) => toast(journal(effect), "quest"),
    heal: () => {
      sounds.play("heal");
      burst(fx, game.run.pose, "heal", Date.now());
    },
    // a way between maps: a door when either side is indoors, else the open road; a new kind of
    // place or a new place is announced. the stage fades the map in on its own
    entered: (effect) => {
      goal = null;
      const from = world.maps[effect.from];
      const to = world.maps[effect.map];
      sounds.play(from.kind === "outdoor" && to.kind === "outdoor" ? "area" : "door");
      if (from.kind !== to.kind || from.place !== to.place) announce(to.name, to.place);
      wander(to.place);
    },
    spotted: () => sounds.play("spotted"),
    dark: () => {
      sounds.play("deny");
      toast("too dark to walk on — a lantern would light the way", "sealed");
    },
    quiet: () => toast("the haunt is quiet — too few spirits gather here", "sealed"),
    atlas: () => (panel = "atlas"),
    // a district's sign at its entry reads its name, as its arrival did
    sign: ({ place }) => announce(world.maps[place].name, place),
    chest: () => {
      sounds.play("chest");
      burst(fx, game.run.pose, "coin", Date.now(), 12);
    },
    pot: ({ coins }) => {
      sounds.play("smash");
      burst(fx, game.run.pose, "coin", Date.now(), 6);
      pay(coins);
    },
    met: ({ word }) => {
      sounds.play("pick");
      burst(fx, game.run.pose, "rest", Date.now(), 10);
      toast(`${learning(word)} — its stone is lit`, "rested");
    },
    catch: ({ word }) => {
      sounds.play("chest");
      toast(`caught ${learning(word)}`, "rested");
    },
    game: () => {
      halt();
      arrival = null;
    },
    travelled: () => (panel = null),
  };

  // the one door into the game: an action through the beat, its effects played, the run kept
  function dispatch(action) {
    const before = game;
    const result = beat(before, action, ctx());
    game = result.state;
    for (const effect of result.effects) {
      EFFECTS[effect.type](effect);
      buzz(effect.type);
    }
    if (game.run !== before.run) keep(result.events.length > 0);
    return result;
  }

  // a walk writes often: the run is kept a beat after the last step, at once when a flag rose
  function keep(soon) {
    clearTimeout(keeping);
    const send = () => {
      keeping = null;
      live.keep(buffer, game.run).catch((error) => console.warn("[wakaru] /keep failed", error));
    };
    if (soon) send();
    else keeping = setTimeout(send, KEEP);
  }

  const failed = (error) => {
    console.warn("[wakaru] the valley could not be charted", error);
    loading = false;
    fault = error.message;
  };

  async function start(kept) {
    loading = true;
    const loaded = await live.load(buffer, kept).catch(failed);
    if (!loaded) return;
    world = loaded.world;
    memory = fold(world.words, loaded.memory);
    due = loaded.due;
    language = loaded.language;
    const map = world.maps[kept.pose.map];
    wandering = map.place;
    scrolls = [];
    game = { run: kept, scene: enter(world, kept, ctx()) };
    loading = false;
    stirred = Date.now();
    announce(map.name, map.place);
    recount();
  }

  // every run is played as the daemon reads it: /begin hands back the run a seat holds, and seats a
  // fresh one on a blank seat or on a save the game has outgrown
  async function begin() {
    loading = true;
    const begun = await live.begin(buffer).catch(failed);
    if (begun) await start(begun.run);
  }

  const retry = () => {
    fault = null;
    begin();
  };

  // the question waiting on an answer, and its clock: a duel's, a line's catch, a swarm's board
  const pending = () => {
    const { duel: fight, game: open } = game.scene;
    if (fight !== null && fight.verdict === null) return fight.question;
    if (open === null) return null;
    if (open.kind === "fishing" && open.phase === "asking") return open.question;
    if (open.kind === "swarm" && open.phase === "playing")
      return { asked: open.since, deadline: open.until };
    return null;
  };

  // the world runs again after the learner was away: whatever clock is up — a duel's, a game's —
  // shifts by the time away, so no answer is owed for it
  function wake() {
    const away = Date.now() - resting;
    resting = null;
    stirred = Date.now();
    if (game === null) return;
    dispatch({ type: "resume", away });
    recount();
  }

  // any key or touch is the learner, here. it wakes a world holding its breath, and the key that
  // woke it does nothing more (a touch lands on the veil); the first one also opens the sounds
  const stir = (event) => {
    stirred = Date.now();
    sounds.wake();
    if (resting === null || document.hidden) return;
    wake();
    if (event.type !== "keydown" || typing(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  // the learner's own way through the world is open: nothing up, no panel or card, the arrival
  // past its first moment, the world awake
  const free = () => walking && panel === null && scroll === null && resting === null && !calm();

  // a step walks on only while the learner is still free and met nothing but the way on: one that
  // opened a talk — which says nothing — a duel or a game ends a held or tapped walk, so leaving it
  // is not walked straight back into
  function step(direction) {
    const result = dispatch({ type: "step", direction });
    if (walking && result.effects.every((effect) => ONWARD.includes(effect.type))) return;
    halt();
  }

  // a way pressed steps at once and, held, walks on; a held way turned to another steps at once
  // too and walks on at the stride. a step of the learner's own ends a tapped walk
  function lead(direction, source) {
    const turning = hold !== null && hold.source === source;
    goal = null;
    hold = { direction, from: Date.now() + (turning ? STRIDE : HOLD), source };
    if (free()) step(direction);
  }

  const release = (source) => {
    if (hold !== null && hold.source === source) hold = null;
  };

  const meet = () => {
    goal = null;
    if (free()) dispatch({ type: "act" });
  };

  const aim = () => {
    if (goal === null) return null;
    if (goal.cell) return goal.cell;
    return game.scene.spirits.find((spirit) => spirit.word === goal.word) ?? null;
  };

  // a step along the way to what was tapped; the last one reaches it — moves onto it, or meets
  // whoever stands there — once, so a talk closed or a duel won is not walked into again
  function advance() {
    const target = aim();
    const [direction, ...rest] = target === null ? [] : route(world, game, target);
    if (rest.length === 0) goal = null;
    if (direction !== undefined) step(direction);
  }

  // a tapped tile walks the learner there, a tapped spirit is followed as it roams, a tap on the
  // learner meets the tile ahead. a touch that swiped was no tap
  function point(cell) {
    if (gesture !== null && gesture.direction !== null) return;
    if (!free()) return;
    if (same(cell, game.run.pose)) return meet();
    const spirit = game.scene.spirits.find((other) => same(other, cell));
    goal = spirit ? { word: spirit.word } : { cell };
    hold = null;
    advance();
  }

  // a finger drawn across the stage walks that way for as long as it stays down, turning as it
  // turns; a flick is one step
  function touch(event) {
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, direction: null };
  }

  function drag(event) {
    if (gesture === null || gesture.id !== event.pointerId || gesture.lifted) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.hypot(dx, dy) < SWIPE) return;
    const across = Math.abs(dx) > Math.abs(dy);
    const direction = across ? (dx > 0 ? "east" : "west") : dy > 0 ? "south" : "north";
    if (direction === gesture.direction) return;
    gesture = { ...gesture, direction };
    lead(direction, "swipe");
  }

  // the gesture is kept, lifted, until the next touch: a tap the stage reports after the finger
  // left still learns whether it swiped
  function lift(event) {
    if (gesture === null || gesture.id !== event.pointerId) return;
    gesture = { ...gesture, lifted: true };
    release("swipe");
  }

  const toggle = (name) => (panel = panel === name ? null : name);

  const travel = (map) => {
    panel = null;
    goal = null;
    dispatch({ type: "travel", map });
  };

  // Escape closes the nearest thing open: a panel, the talk, a card, the arrival
  function dismiss() {
    if (panel !== null) panel = null;
    else if (dialogue) dispatch({ type: "close" });
    else if (scroll !== null) scrolls = scrolls.slice(1);
    else arrival = null;
  }

  // a letter is one key whatever its case, so caps lock walks the same
  const named = (event) => (event.key.length === 1 ? event.key.toLowerCase() : event.key);

  // a duel and a game take their own keys, a focused button its own space and enter; a talk takes
  // 1 to 4 for a sentence's meaning. walking, the arrows and wasd walk, space and enter act, m j c
  // open the atlas, the journal and the codex. a card reads on until enter, and escape closes what
  // is open — a game's own escape quits it
  function press(event) {
    if (game === null || event.metaKey || event.ctrlKey || event.altKey || typing(event)) return;
    const key = named(event);
    const acts = key === "Enter" || key === " ";
    if (acts && event.composedPath()[0] instanceof HTMLButtonElement) return;
    const meaning = meanings[Number(key) - 1];
    if (key === "Escape" && minigame === null) dismiss();
    else if (scroll !== null && acts) scrolls = scrolls.slice(1);
    else if (meaning !== undefined) dispatch({ type: "choose", option: meaning });
    else if (!walking || event.repeat) return;
    else if (OPENS[key]) toggle(OPENS[key]);
    else if (panel !== null) return;
    else if (WAYS[key]) {
      keys = [...keys.filter((held) => held !== WAYS[key]), WAYS[key]];
      lead(WAYS[key], "key");
    } else if (acts) meet();
    else return;
    event.preventDefault();
  }

  // a key let go hands the walk to the way still held, if the one let go was leading it
  function unpress(event) {
    const direction = WAYS[named(event)];
    if (direction === undefined) return;
    keys = keys.filter((held) => held !== direction);
    if (hold === null || hold.source !== "key" || hold.direction !== direction) return;
    hold = keys.length > 0 ? { direction: keys.at(-1), from: Date.now(), source: "key" } : null;
  }

  onMount(() => {
    // a run kept on the buffer is loaded through /begin; a blank seat waits in the lobby until one
    // begins, here or by the companion's tool
    const watching = buffer.$data.subscribe((data) => {
      if (!data.run || game || loading || fault) return;
      begin();
    });

    // hidden is away: nothing ticks and the run is kept now. back within IDLE of the last input,
    // the learner is plainly here and the world runs on; later, it waits for them under the veil
    if (document.hidden) resting = Date.now();
    const visibility = () => {
      if (document.hidden) {
        if (resting === null) resting = Date.now();
        hold = null;
        keys = [];
        gesture = null;
        if (keeping !== null) keep(true);
        return;
      }
      if (resting !== null && Date.now() - stirred < IDLE) wake();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", stir, true);
    window.addEventListener("pointerdown", stir, true);

    // the world's one clock: a tick runs the open duel's or game's clock, else the spirits. it
    // waits while a panel, a card or a talk is open, and stops for a learner away — so a spirit can
    // only reach, and a question only run its clock on, a learner who stirred within IDLE: an
    // unattended game writes no review
    const clock = setInterval(() => {
      if (document.hidden || resting !== null) return;
      now = Date.now();
      if (game === null) return;
      if (toasts.length > 0 && panel === null)
        toasts = toasts
          .map((shown) => ({ ...shown, left: shown.left - TICK }))
          .filter((shown) => shown.left > 0);
      if (panel !== null || scroll !== null || dialogue) return;
      if (now - stirred >= IDLE) return (resting = now);
      // a question that runs out on a learner who never stirred while it was up was never
      // answered: the world holds its breath from the moment it was asked, and waking hands the
      // question its whole clock again — an absence writes no FAILURE
      const unanswered = pending();
      if (unanswered !== null && now >= unanswered.deadline && stirred < unanswered.asked)
        return (resting = unanswered.asked);
      dispatch({ type: "tick" });
    }, TICK);

    const stride = setInterval(() => {
      if (!free()) return;
      if (hold !== null && Date.now() >= hold.from) step(hold.direction);
      else if (goal !== null) advance();
    }, STRIDE);

    return () => {
      watching();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", stir, true);
      window.removeEventListener("pointerdown", stir, true);
      clearInterval(clock);
      clearInterval(stride);
      clearTimeout(counting);
      clearTimeout(shown);
      if (keeping !== null) keep(true);
      destroyed = true;
      sounds.close();
    };
  });

  $effect(() => {
    if (sheet) sheet.focus();
  });
</script>

<svelte:window
  onkeydown={press}
  onkeyup={unpress}
  onpointermove={drag}
  onpointerup={lift}
  onpointercancel={lift} />
<ViewportLock />

<div class="wakaru">
  {#if fault}
    <div class="lobby">
      <p class="trouble">the valley could not be charted — {fault}</p>
      <button type="button" class="start" onclick={retry}>try again</button>
    </div>
  {:else if game}
    <!-- under an open panel the valley is out of reach: no tab lands behind the modal sheet -->
    <div class="arena" inert={panel !== null}>
      <div class="world" bind:clientHeight={worldTall}>
        <div
          class="ground"
          role="application"
          aria-label="the valley: walk with the arrows, the pad or a swipe, or tap a tile"
          onpointerdown={touch}
          oncontextmenu={(event) => event.preventDefault()}>
          <Stage {world} state={game} {memory} markers={marks} {fx} {now} {inset} onpoint={point} />
        </div>

        <div class="over">
          <Hud
            bind:tall={headroom}
            {world}
            run={game.run}
            {daily}
            level={reached}
            step={walking ? next : null}
            busy={!walking}
            onatlas={() => toggle("atlas")}
            onjournal={() => toggle("journal")}
            oncodex={() => toggle("codex")}
            onaction={dispatch} />
          {#if toasts.length > 0}
            <ul class="toasts" aria-live="polite">
              {#each toasts as shown (shown.id)}
                <li class="toast {shown.tone}" in:fly={{ y: 6, duration: 160 }}>{shown.text}</li>
              {/each}
            </ul>
          {/if}
          {#if arrival}
            {#key arrival.at}
              <Arrival name={arrival.name} word={arrival.word} tongue={language.learning.slug} />
            {/key}
          {/if}
        </div>

        {#if walking}
          <Pad
            bind:tall={footroom}
            {verb}
            onhold={(direction) => lead(direction, "pad")}
            onlet={() => release("pad")}
            onact={meet} />
          <p class="legend" aria-hidden="true" bind:this={legend} bind:clientHeight={legendTall}>
            <kbd>←↑↓→</kbd><span>walk</span>
            <kbd>space</kbd><span>{verb}</span>
            <kbd>m</kbd><span>atlas</span>
            <kbd>j</kbd><span>journal</span>
            <kbd>c</kbd><span>codex</span>
          </p>
        {/if}

        <!-- a mini-game is its own sheet over the stage: a bottom sheet on a phone, a card on a
             wide pane -->
        {#if minigame}
          {@const View = GAMES[minigame.kind]}
          <View
            game={minigame}
            {world}
            {memory}
            {now}
            onplay={(move) => dispatch({ type: "play", move })}
            onquit={() => dispatch({ type: "quit" })} />
        {/if}
      </div>

      {#if duel || dialogue || scroll}
        <div class="berth" transition:fly={{ y: 48, duration: 200 }}>
          <div class="slot">
            {#if duel}
              <Duel
                {duel}
                {world}
                run={game.run}
                {memory}
                {now}
                {language}
                onaction={dispatch}
                play={sound} />
            {:else if dialogue}
              <Dialogue
                {dialogue}
                {world}
                run={game.run}
                {memory}
                {language}
                onaction={dispatch}
                play={sound} />
            {:else}
              <Scroll
                {scroll}
                {world}
                run={game.run}
                {memory}
                {language}
                onclose={() => (scrolls = scrolls.slice(1))} />
            {/if}
          </div>
        </div>
      {/if}

      {#if resting !== null}
        <div class="veil" role="status">
          <span>paused — tap or press a key</span>
        </div>
      {/if}
    </div>

    {#if panel}
      <section
        class="sheet"
        bind:this={sheet}
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-label="the {panel}"
        transition:fly={{ y: 64, duration: 220 }}>
        {#if panel === "atlas"}
          <Atlas {world} run={game.run} {memory} ontravel={travel} onclose={() => (panel = null)} />
        {:else if panel === "journal"}
          <Journal {world} run={game.run} {memory} ctx={ctx()} onclose={() => (panel = null)} />
        {:else}
          <Codex
            {world}
            {memory}
            {due}
            level={reached}
            onplay={sound}
            onclose={() => (panel = null)} />
        {/if}
      </section>
    {/if}
  {:else if loading}
    <p class="loading">charting the valley…</p>
  {:else}
    <div class="lobby">
      <h1>Wakaru</h1>
      <p>A valley charted from your own words.</p>
      <ol>
        <li>
          <b>Walk the valley.</b> Paths, doors and cave mouths lead on, and every place greets you with
          its word.
        </li>
        <li>
          <b>Read the stones.</b> Each holds a word: a short trial lights it, and it turns gold once
          the word is yours.
        </li>
        <li>
          <b>Rest the spirits.</b> They are your words falling due: they see you and give chase, and
          you answer before the clock runs out.
        </li>
        <li>
          <b>Wake the wardens.</b> Hold most of a district's words, beat its warden, and the next district
          opens.
        </li>
      </ol>
      <p class="how keyboard">arrows or wasd walk · space acts · m atlas · j journal · c codex</p>
      <p class="how touch">the pad walks, or swipe, or tap a tile · the round button acts</p>
      <button type="button" class="start" onclick={begin}>enter the valley</button>
    </div>
  {/if}
</div>

<style>
  /* the stage is the whole pane: the world full-bleed, the hud over its head, the pad over its
     foot, a mini-game's sheet over it, and a duel, a talk or a card docked below it, pushing the
     world up so the learner and the foe stay in sight */
  .wakaru {
    position: relative;
    flex: 1;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--plane);
  }
  .arena {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
  }
  /* the world canvas keeps its own palette, framed by a sunk well */
  .world {
    position: relative;
    flex: 1 1 auto;
    min-height: 30%;
    overflow: hidden;
    background: var(--plane-sunk);
  }
  .ground {
    position: absolute;
    inset: 0;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .over {
    position: absolute;
    inset: 0 0 auto 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }
  .berth {
    flex: 0 1 auto;
    max-height: 70%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem max(0.5rem, env(safe-area-inset-right)) max(0.5rem, env(safe-area-inset-bottom))
      max(0.5rem, env(safe-area-inset-left));
    background: var(--plane);
    box-shadow: var(--shape-lift);
  }
  .slot {
    max-width: 36rem;
    margin: 0 auto;
  }

  /* a toast floats: --surface-lift, ringed, casting --shape-lift; a toned toast lays its tint over
     that lift and inks in its tone */
  .toasts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    padding: 0 0.75rem;
    list-style: none;
  }
  .toast {
    max-width: 100%;
    padding: 0.35rem 0.8rem;
    border-radius: var(--shape-radius-pill);
    background: var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      var(--shape-lift);
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-strong);
    text-align: center;
  }
  .toast.coins {
    background: linear-gradient(var(--signal-caution-tint), var(--signal-caution-tint)),
      var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--signal-caution-ink),
      var(--shape-lift);
    color: var(--signal-caution-ink);
  }
  .toast.rested {
    background: linear-gradient(var(--signal-positive-tint), var(--signal-positive-tint)),
      var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--signal-positive-ink),
      var(--shape-lift);
    color: var(--signal-positive-ink);
  }
  .toast.quest {
    background: linear-gradient(var(--signal-primary-tint), var(--signal-primary-tint)),
      var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--signal-primary-ink),
      var(--shape-lift);
    color: var(--signal-primary-ink);
  }
  .toast.fallen {
    background: linear-gradient(var(--signal-negative-tint), var(--signal-negative-tint)),
      var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--signal-negative-ink),
      var(--shape-lift);
    color: var(--signal-negative-ink);
  }

  /* a keyboard's legend where a touch screen has its pad */
  .legend {
    position: absolute;
    left: 0.75rem;
    bottom: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.4rem;
    max-width: calc(100% - 1.5rem);
    margin: 0;
    padding: 0.35rem 0.7rem;
    border-radius: var(--shape-radius-key);
    background: var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      var(--shape-lift);
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
    pointer-events: none;
  }
  .legend kbd {
    font-family: var(--font-family-code);
    color: var(--text-strong);
  }
  .legend span + kbd {
    margin-left: 0.5rem;
  }
  @media (pointer: coarse) {
    .legend {
      display: none;
    }
  }

  /* away, the world holds its breath under a veil; a key or a touch anywhere wakes it */
  /* above a mini-game's own layer (3), under a panel */
  .veil {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: grid;
    place-items: center;
    /* the theme's own dim over a zone, never a mix of its own */
    background: var(--scrim);
  }
  .veil span {
    padding: 0.5rem 1rem;
    border-radius: var(--shape-radius-pill);
    background: var(--plane-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      var(--shape-lift);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-strong);
  }

  /* a panel — the atlas, the journal, the codex — is an overlay sheet: --surface, the whole pane,
     rising from the foot */
  .sheet {
    position: absolute;
    inset: 0;
    z-index: 5;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.75rem max(0.75rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-left));
    background: var(--plane);
  }
  .sheet:focus {
    outline: none;
  }

  .lobby {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    height: 100%;
    overflow-y: auto;
    padding: 2.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
    text-align: center;
  }
  .lobby h1 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    color: var(--text-strong);
  }
  .lobby p {
    margin: 0;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-md);
    color: var(--text-ink);
  }
  .lobby ol {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 30rem;
    margin: 0.5rem 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
    color: var(--text-ink);
  }
  .lobby b {
    color: var(--text-strong);
    font-weight: 600;
  }
  .lobby .how {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  .how.touch {
    display: none;
  }
  @media (pointer: coarse) {
    .how.keyboard {
      display: none;
    }
    .how.touch {
      display: block;
    }
  }
  /* the one call to act: the primary fill and the ink tested on it */
  .start {
    display: grid;
    place-items: center;
    min-height: 3rem;
    padding: 0.7rem 1.6rem;
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    cursor: pointer;
    touch-action: manipulation;
  }
  .start:active {
    transform: translateY(var(--size-depth));
  }
  .start:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .loading,
  .trouble {
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-light);
    text-align: center;
  }
  .loading {
    padding: 4rem 0;
  }
  .lobby .trouble {
    color: var(--signal-negative-ink);
  }
</style>
