<script>
  import { onMount } from "svelte";
  import { Desk, ViewportLock } from "@vivalence/drapes";
  import { DISTRICTS, WAKING, fold, share } from "../engine/atlas.js";
  import { beat } from "../engine/beat.js";
  import { PASSING } from "../engine/beats/talk.js";
  import { quests } from "../engine/quest.js";
  import { has } from "../engine/run.js";
  import { HEIGHT, WIDTH, enter, restoration } from "../engine/world.js";
  import { route } from "../engine/path.js";
  import { SIZE, TINT, burst, hue, paint } from "./paint.js";
  import * as live from "./live.js";
  import Hud from "./parts/Hud.svelte";
  import Valley from "./parts/Map.svelte";
  import Scroll from "./parts/Scroll.svelte";
  import Pad from "./parts/Pad.svelte";
  import Duel from "./parts/Duel.svelte";
  import Dialogue from "./parts/Dialogue.svelte";
  import Journal from "./parts/Journal.svelte";

  const { terminal, buffer } = $props();
  const recorded = terminal.client.runtime.entities.file.$entities;
  const play = live.voice();

  const TICK = 100;
  const ROAM = 5;
  const KEEP = 1200;
  const RECOUNT = 2000;
  const SAY = 2600;
  const TOASTS = 3;
  const FADE = 320;
  const STRIDE = 140;
  const REPEAT = 230;
  const SWIPE = 28;
  // the valley's heart is no district; the world itself calls it the square
  const HUB = "The Square";
  const BUZZ = {
    bump: 6,
    card: 8,
    item: 12,
    strike: 14,
    hurt: [30, 40, 30],
    rested: [12, 30, 24],
    fallen: [60, 40, 60],
    restored: [20, 40, 20, 40, 60],
    crowned: [30, 50, 30, 50, 90],
  };
  const KEYS = {
    ArrowUp: "north",
    ArrowDown: "south",
    ArrowLeft: "west",
    ArrowRight: "east",
    w: "north",
    s: "south",
    a: "west",
    d: "east",
    k: "north",
    j: "south",
    h: "west",
    l: "east",
  };
  const PANELS = { m: "map", q: "journal" };

  let world = $state.raw(null);
  let memory = $state.raw({});
  let due = $state.raw([]);
  let language = $state.raw(null);
  let game = $state.raw(null);
  let daily = $state.raw(null);
  let scroll = $state.raw(null);
  let toasts = $state.raw([]);
  let panel = $state(null);
  let facing = $state("east");
  let now = $state(Date.now());
  let loading = $state(false);
  let fault = $state(null);
  let canvas = $state(null);
  let sheet = $state(null);
  let width = $state(0);
  // where a tap sent the learner: a tile, or a spirit followed as it roams
  let goal = $state.raw(null);

  // what the painter keeps between frames; none of it is game state
  const fx = { sparks: [], shake: 0, flash: { until: 0, tint: "" }, fade: 0 };
  const drawn = new Map();
  const asking = new Set();
  let pressed = null;
  let keeping = null;
  let counting = null;
  let wandering = null;
  let told = 0;

  const duel = $derived(game ? game.scene.duel : null);
  const dialogue = $derived(game ? game.scene.dialogue : null);
  const room = $derived(game ? world.rooms[game.run.pose.room] : null);
  const walking = $derived(game !== null && duel === null && dialogue === null);
  const audible = $derived(
    scroll?.kind === "card" &&
      live.fileOf($recorded, buffer, world.words[scroll.word].audio) !== undefined,
  );

  // 1–4 pick the meaning of a sentence the keeper read out; a duel's panel takes its own
  const meanings = $derived(
    dialogue?.page.kind === "listen" &&
      dialogue.page.awaits === null &&
      dialogue.page.picked === null
      ? dialogue.page.meanings
      : [],
  );

  const ctx = () => ({ world, memory, due, now: Date.now(), random: Math.random });

  const toast = (text, tone) =>
    (toasts = [...toasts, { id: (told += 1), text, tone, left: SAY }].slice(-TOASTS));

  // coins paid beat after beat, as a round pays each answer, add up on one toast
  const pay = (amount) => {
    const last = toasts.at(-1);
    const adding = last?.tone === "coins";
    const paid = adding ? last.paid + amount : amount;
    const kept = adding ? toasts.slice(0, -1) : toasts;
    const added = { id: (told += 1), text: `+${paid} coins`, tone: "coins", paid, left: SAY };
    toasts = [...kept, added].slice(-TOASTS);
  };

  const flash = (tint) => (fx.flash = { until: Date.now() + 260, tint });
  const buzz = (type) => BUZZ[type] && navigator.vibrate?.(BUZZ[type]);

  const sound = (word) => {
    const file = live.fileOf($recorded, buffer, world.words[word].audio);
    if (file) play(file);
  };

  // where the foe stands, for the sparks of a strike: a spirit stays in the scene until its rest
  const FOES = {
    spirit: (foe) => game.scene.spirits.find((spirit) => spirit.word === foe.word),
    warden: () => room.warden,
    summit: () => room.summit,
    pilgrim: () => room.shrine,
  };

  // the duel panel wears its foe's colour: a spirit its word's hue, every other foe its own
  const TINTS = {
    spirit: (foe) => hue(world, foe.word),
    warden: () => TINT.hurt,
    summit: () => TINT.restore,
    pilgrim: () => TINT.rest,
  };

  // the hub's summit sleeps until every district is restored; a lair's warden until most of its
  // words are held
  const sleeping = (held) => {
    if (room.place === null) {
      const districts = DISTRICTS.filter((district) => world.order.includes(district.id));
      const standing = Math.round(held * districts.length);
      return `the summit sleeps · ${standing} of ${districts.length} districts restored`;
    }
    const words = world.places[room.place].words;
    const holding = Math.round(held * words.length);
    const waking = Math.ceil(words.length * WAKING);
    return `the warden sleeps · ${holding} of ${words.length} words held, it wakes at ${waking}`;
  };

  // a quest's id is its place, a dot, its kind
  const journal = ({ quest, done }) => {
    const { title } = quests(world, quest.split(".")[0]).find((entry) => entry.id === quest);
    return `journal · ${title} — ${done ? "done" : "a step on"}`;
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
      land: (heard) => {
        if (heard.sentence === null) throw new Error("the place has no sentence to read out");
        return { type: "listened", sentence: heard.sentence, options: heard.options };
      },
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
      // the daemon reviewed the reply's words itself: their standing comes back with the grade
      land: (judged) => {
        memory = fold(world.words, { ...memory, ...judged.memory });
        recount();
        return {
          type: "judged",
          grade: judged.grade,
          feedback: judged.feedback,
          correction: judged.correction,
        };
      },
    },
  };

  // one request per route and place in flight; a reply that fails or brings nothing still lands,
  // as a failed one, on the page waiting for it, so no page is left on "…"
  function relay(effect) {
    const keeper = KEEPER[effect.type];
    const key = `${effect.type}:${effect.place}`;
    if (asking.has(key)) return;
    asking.add(key);
    keeper
      .request(effect)
      .then((reply) => act(keeper.land(reply)))
      .catch((error) => {
        console.warn(`[wakaru] /${effect.type} failed`, effect.place, error);
        toast("the keeper is lost for words", "fallen");
        if (game.scene.dialogue?.page.awaits !== keeper.awaits) return;
        act({ type: keeper.awaits, failed: true });
      })
      .finally(() => asking.delete(key));
  }

  // a place's spirits are its due words, fetched as the learner steps into it; the room they
  // entered fills once the words arrive, unless the learner has moved on or is held
  function haunt(id) {
    const entered = game.run.pose.room;
    live
      .spirits(buffer, id)
      .then((fetched) => {
        due = live.gather(due, world, id, fetched);
        if (game.run.pose.room !== entered || game.scene.duel || game.scene.dialogue) return;
        game = { ...game, scene: enter(world, game.run, ctx()) };
      })
      .catch((error) => console.warn("[wakaru] /spirits failed", id, error));
  }

  // the daily count moves with every review: fetched again once the reviews settle
  function recount() {
    clearTimeout(counting);
    counting = setTimeout(() => {
      live
        .daily(buffer)
        .then((counted) => (daily = counted))
        .catch((error) => console.warn("[wakaru] /daily failed", error));
    }, RECOUNT);
  }

  // an effect is the screen's half of a beat: the engine says what, this table says how
  const EFFECTS = {
    step: () => {},
    bump: () => (fx.shake = Date.now() + 120),
    card: ({ word, fresh }) => (scroll = { kind: "card", word, fresh }),
    item: ({ word }) => toast(`picked up ${world.words[word].learning}`, "item"),
    entered: (effect) => {
      fx.fade = Date.now() + FADE;
      drawn.clear();
      if (effect.place === wandering) return;
      wandering = effect.place;
      haunt(effect.place);
    },
    sealed: (effect) => toast(sleeping(effect.share), "sealed"),
    map: () => (panel = "map"),
    duel: () => {
      scroll = null;
      goal = null;
      pressed = null;
    },
    // a word answered right is no longer due — at the shrine, in a duel, at an errand — it waits its
    // turn with the domain; its standing comes back with the review
    review: (effect) => {
      if (PASSING.includes(effect.signal)) due = due.filter((id) => id !== effect.literal);
      return live.review(buffer, effect).then((status) => {
        if (status === null) return;
        memory = fold(world.words, { ...memory, [effect.literal]: status });
        recount();
      });
    },
    audio: ({ word }) => sound(word),
    strike: () => {
      flash(TINT.strike);
      burst(fx, FOES[duel.foe.kind](duel.foe), TINT.strike, Date.now());
    },
    hurt: () => {
      flash(TINT.hurt);
      fx.shake = Date.now() + 220;
    },
    rested: ({ word }) => {
      due = due.filter((id) => id !== word);
      burst(fx, game.run.pose, TINT.rest, Date.now());
      toast(`${world.words[word].learning} — laid to rest`, "rested");
    },
    restored: (effect) => {
      scroll = { kind: "restored", place: effect.place };
      burst(fx, game.run.pose, TINT.restore, Date.now(), 24);
    },
    crowned: () => {
      scroll = { kind: "crowned" };
      burst(fx, game.run.pose, TINT.restore, Date.now(), 32);
    },
    fallen: () => {
      fx.fade = Date.now() + FADE;
      drawn.clear();
      toast("you wake at the entry, whole again", "fallen");
    },
    speak: relay,
    listen: relay,
    ask: relay,
    judge: relay,
    coins: ({ amount }) => {
      burst(fx, game.run.pose, TINT.coin, Date.now(), 8);
      pay(amount);
    },
    quest: (effect) => toast(journal(effect), "quest"),
    heal: () => burst(fx, game.run.pose, TINT.heal, Date.now()),
  };

  function act(action) {
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
    wandering = world.rooms[loaded.run.pose.room].place;
    drawn.clear();
    scroll = null;
    game = { run: loaded.run, scene: enter(world, loaded.run, ctx()) };
    loading = false;
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

  onMount(() => {
    // a run kept on the buffer is loaded through /begin; a blank seat waits in the lobby until one
    // begins, here or by the companion's tool
    const watching = buffer.$data.subscribe((data) => {
      if (!data.run || game || loading || fault) return;
      begin();
    });

    // hidden = away: nothing ticks and the run is kept now; on return the duel's clock is shifted
    // by the time away
    let hidden = document.hidden ? Date.now() : null;
    const visibility = () => {
      if (document.hidden) {
        hidden = Date.now();
        pressed = null;
        if (keeping !== null) keep(true);
        return;
      }
      if (hidden !== null && game) {
        act({ type: "resume", away: Date.now() - hidden });
        recount();
      }
      hidden = null;
    };
    document.addEventListener("visibilitychange", visibility);

    // a duel ticks its clock every beat; outside one the spirits roam, still while a scroll is read
    let beats = 0;
    const clock = setInterval(() => {
      if (hidden !== null) return;
      now = Date.now();
      beats += 1;
      if (!game) return;
      if (duel) act({ type: "tick" });
      else if (beats % ROAM === 0 && !scroll && !panel) act({ type: "tick" });
      // a toast's time runs only while it is on screen
      if (toasts.length === 0 || !walking || panel) return;
      toasts = toasts
        .map((toast) => ({ ...toast, left: toast.left - TICK }))
        .filter((toast) => toast.left > 0);
    }, TICK);

    const stride = setInterval(() => {
      if (hidden !== null) return;
      if (!walking || panel) return (goal = null);
      if (pressed && Date.now() >= pressed.from) return step(pressed.direction);
      if (goal) advance();
    }, STRIDE);

    // the canvas backs every css pixel with a device pixel, so the room stays crisp at any width
    let frame = requestAnimationFrame(function draw() {
      frame = requestAnimationFrame(draw);
      if (!canvas || !game || panel || width === 0) return;
      const backing = Math.round(width * Math.min(window.devicePixelRatio, 3));
      const scale = backing / SIZE.width;
      if (canvas.width !== backing) {
        canvas.width = backing;
        canvas.height = Math.round(SIZE.height * scale);
      }
      const pen = canvas.getContext("2d");
      pen.setTransform(scale, 0, 0, scale, 0, 0);
      paint(pen, {
        world,
        run: game.run,
        scene: game.scene,
        memory,
        facing,
        time: Date.now(),
        fx,
        drawn,
        goal: aim(),
      });
    });

    return () => {
      watching();
      document.removeEventListener("visibilitychange", visibility);
      clearInterval(clock);
      clearInterval(stride);
      clearTimeout(counting);
      cancelAnimationFrame(frame);
      if (keeping !== null) keep(true);
    };
  });

  $effect(() => {
    if (sheet) sheet.focus();
  });

  const typing = (event) => {
    const target = event.composedPath()[0];
    return (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    );
  };

  // a travel goes on through plain steps, a voiced word and a stone read before; anything else
  // ends it
  const passing = (effect) =>
    effect.type === "step" || effect.type === "audio" || (effect.type === "card" && !effect.fresh);

  function step(direction) {
    facing = direction;
    if (scroll?.kind === "card") scroll = null;
    const result = act({ type: "step", direction });
    if (result.effects.every(passing)) return;
    goal = null;
    pressed = null;
  }

  // a step of the learner's own ends any travel
  const walk = (direction) => {
    goal = null;
    step(direction);
  };

  const aim = () => {
    if (!goal) return null;
    if (goal.tile) return goal.tile;
    return game.scene.spirits.find((spirit) => spirit.word === goal.word) ?? null;
  };

  function advance() {
    const target = aim();
    const [direction] = target ? route(world, game, target) : [];
    if (!direction) return (goal = null);
    step(direction);
  }

  // the map's road: the learner walks out at the place's entry
  const travel = (id) => {
    panel = null;
    goal = null;
    act({ type: "travel", place: id });
  };

  const toggle = (name) => (panel = panel === name ? null : name);

  // Escape closes the nearest thing open: a panel, the talk, a scroll
  function dismiss() {
    if (panel) panel = null;
    else if (dialogue) act({ type: "close" });
    else scroll = null;
  }

  // a duel's panel owns its keys; here 1–4 pick a meaning the keeper read out, and walking, the
  // arrows, wasd and hjkl step while m and q open the map and the journal
  function onKey(event) {
    if (!game || event.metaKey || event.ctrlKey || event.altKey || typing(event)) return;
    const meaning = meanings[Number(event.key) - 1];
    if (event.key === "Escape") dismiss();
    else if (meaning !== undefined) act({ type: "choose", option: meaning });
    else if (!walking) return;
    else if (PANELS[event.key]) toggle(PANELS[event.key]);
    else if (KEYS[event.key] && !panel) walk(KEYS[event.key]);
    else return;
    event.preventDefault();
  }

  // the pad: a press steps at once, a hold keeps walking after a beat
  const hold = (direction) => {
    if (!walking || panel) return;
    pressed = { direction, from: Date.now() + REPEAT };
    walk(direction);
  };
  const unhold = () => (pressed = null);

  // the canvas: a swipe is one step, a tap walks the learner to the tile, a spirit tapped is
  // followed as it roams
  let touched = null;
  const down = (event) => {
    if (!walking) return;
    event.preventDefault();
    touched = { x: event.clientX, y: event.clientY };
  };
  function up(event) {
    if (!touched || !walking) return;
    const dx = event.clientX - touched.x;
    const dy = event.clientY - touched.y;
    touched = null;
    if (Math.hypot(dx, dy) >= SWIPE) {
      const across = Math.abs(dx) >= Math.abs(dy);
      return walk(across ? (dx > 0 ? "east" : "west") : dy > 0 ? "south" : "north");
    }
    const box = canvas.getBoundingClientRect();
    const tile = {
      x: Math.floor(((event.clientX - box.left) / box.width) * WIDTH),
      y: Math.floor(((event.clientY - box.top) / box.height) * HEIGHT),
    };
    if (scroll?.kind === "card") scroll = null;
    const spirit = game.scene.spirits.find((other) => other.x === tile.x && other.y === tile.y);
    goal = spirit ? { word: spirit.word } : { tile };
    advance();
  }

  // one line of what this room asks of the learner
  const hint = $derived.by(() => {
    if (!walking) return "";
    if (room.place === null)
      return restoration(world, game.run) === 1
        ? "the summit is awake — walk into it when you are ready"
        : "the sign shows the valley · the shrine holds today's round · the vendor sells";
    const words = world.places[room.place].words;
    const waking = Math.ceil(words.length * WAKING);
    if (room.warden && !has(game.run, `restored:${room.place}`))
      return share(memory, words) >= WAKING
        ? "the warden is awake — walk into it when you are ready"
        : `the warden sleeps until ${waking} of its ${words.length} words are held`;
    const haunting = game.scene.spirits.length;
    if (haunting === 1) return "a spirit haunts this room — walk into it to duel it";
    if (haunting > 1) return `${haunting} spirits haunt this room — walk into one to duel it`;
    if (room.keeper) return "read the stones · the keeper talks, and has an errand";
    return "read the stones · the openings lead on";
  });
</script>

<svelte:window onkeydown={onKey} />
<ViewportLock />

<div class="wakaru">
  <Desk maxWidth="720px" class="wakaru-desk">
    {#snippet surface()}
      {#if fault}
        <div class="fault">
          <p>the valley could not be charted — {fault}</p>
          <button type="button" class="start" onclick={retry}>try again</button>
        </div>
      {:else if game}
        <Hud {world} run={game.run} duel={game.scene.duel} {daily} hub={HUB} onaction={act} />

        <div class="stage" bind:clientWidth={width}>
          <canvas
            bind:this={canvas}
            width={SIZE.width}
            height={SIZE.height}
            onpointerdown={down}
            onpointerup={up}
            onpointercancel={() => (touched = null)}
            aria-label="the valley — tap a tile to walk there, swipe to step"
          ></canvas>
        </div>

        <div class="ledge" class:walking>
          {#if duel}
            <Duel
              {duel}
              {world}
              run={game.run}
              {memory}
              {now}
              {language}
              tint={TINTS[duel.foe.kind](duel.foe)}
              onaction={act}
              play={sound}
            />
          {:else if dialogue}
            <Dialogue
              {dialogue}
              {world}
              run={game.run}
              {memory}
              {language}
              onaction={act}
              play={sound}
            />
          {:else}
            <div class="say">
              {#if scroll || toasts.length}
                <Scroll
                  {scroll}
                  {toasts}
                  {world}
                  run={game.run}
                  {memory}
                  {language}
                  {audible}
                  onplay={sound}
                  onclose={() => (scroll = null)}
                />
              {:else}
                <p class="hint">{hint}</p>
                <p class="keys fine">
                  <kbd>←↑↓→</kbd> or <kbd>wasd</kbd> walk · <kbd>1</kbd>–<kbd>4</kbd> answer
                  · or click a tile
                </p>
                <p class="keys coarse">tap a tile to walk there · swipe to step</p>
              {/if}
              <div class="tools">
                <button type="button" class="tool" onclick={() => toggle("map")}>
                  map <kbd>m</kbd>
                </button>
                <button type="button" class="tool" onclick={() => toggle("journal")}>
                  journal <kbd>q</kbd>
                </button>
              </div>
            </div>
            <div class="thumb"><Pad onhold={hold} onlet={unhold} /></div>
          {/if}
        </div>
      {:else if loading}
        <p class="loading">charting the valley…</p>
      {:else}
        <div class="lobby">
          <h1>Wakaru</h1>
          <p>A valley charted from your own words.</p>
          <ol>
            <li><b>Read the stones.</b> Each holds a word, and glows once the word is yours.</li>
            <li>
              <b>Rest the spirits.</b> They are your words falling due: walk into one and answer
              before its clock runs out.
            </li>
            <li>
              <b>Wake the wardens.</b> Hold most of a district's words, beat its warden, and the
              next district opens.
            </li>
          </ol>
          <button type="button" class="start" onclick={begin}>enter the valley</button>
        </div>
      {/if}
    {/snippet}
  </Desk>

  {#if panel && game}
    <div
      class="sheet"
      bind:this={sheet}
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-label={panel === "map" ? "the valley map" : "the journal"}
    >
      {#if panel === "map"}
        <Valley
          {world}
          run={game.run}
          {memory}
          hub={HUB}
          ontravel={travel}
          onclose={() => (panel = null)}
        />
      {:else}
        <Journal {world} run={game.run} {memory} onclose={() => (panel = null)} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .wakaru { position: relative; height: 100%; min-height: 0; }
  .wakaru :global(.wakaru-desk .desk-stage) {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding-top: 1.25rem;
  }
  .stage {
    position: relative;
    border: 1px solid var(--boundary);
    border-radius: 8px;
    overflow: hidden;
    background: var(--surface-sunk);
  }
  canvas {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 13 / 9;
    touch-action: none;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .ledge { min-height: 11.5rem; display: flex; flex-direction: column; justify-content: center; }
  .ledge.walking {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
  }
  .say {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .thumb { display: none; }
  .keys.coarse { display: none; }
  .hint {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    color: var(--text-light);
  }
  .keys {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
    opacity: 0.75;
  }
  kbd { font-family: var(--font-family-code); color: var(--text-strong); }

  .tools { display: flex; justify-content: center; gap: 0.5rem; }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.75rem;
    padding: 0.4rem 1rem;
    border: 1px solid var(--boundary);
    border-radius: 999px;
    background: var(--surface-lift);
    color: var(--text-strong);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .tool:active { transform: scale(0.97); border-color: var(--signal-primary-ink); }
  .tool kbd { font-size: var(--font-size-xs); color: var(--text-light); }

  @media (pointer: coarse) {
    .ledge.walking { grid-template-columns: minmax(0, 1fr) auto; }
    .thumb { display: block; }
    .keys.fine, .tool kbd { display: none; }
    .keys.coarse { display: block; }
    .hint, .keys { text-align: left; }
    .tools { justify-content: flex-start; }
  }
  @media (max-width: 560px) {
    .wakaru :global(.wakaru-desk .desk-stage) {
      gap: 0.6rem;
      padding: 0.6rem 0.6rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    }
    .stage { border-radius: 6px; }
    .ledge { min-height: 10rem; }
    .lobby { padding: 1.25rem 0.25rem; }
  }

  .sheet {
    position: absolute;
    inset: 0;
    z-index: 3;
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1rem 0.75rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: var(--surface);
    container-type: size;
  }
  .sheet:focus { outline: none; }

  .lobby {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2.5rem 0;
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
    font-size: var(--font-size-base);
    color: var(--text-light);
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
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  .lobby b { color: var(--text-strong); font-weight: 600; }
  .start {
    min-height: 3rem;
    padding: 0.7rem 1.6rem;
    border: 1px solid var(--signal-primary-ink);
    border-radius: 6px;
    background: color-mix(in srgb, var(--signal-primary-tint) 50%, transparent);
    color: var(--signal-primary-ink);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    cursor: pointer;
    touch-action: manipulation;
  }
  .loading, .fault p {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  .loading { padding: 4rem 0; }
  .fault { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; }
  .fault p { color: var(--signal-negative-ink); }
</style>
