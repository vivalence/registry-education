import { raw } from "@mikro-orm/core";
import { traits } from "@vivalence/typology";
import { object, is } from "@vivalence/typology";
import { formula } from "../note/retained.js";
import { UNRANKED } from "./ranked.js";

const RANK = raw(`coalesce(json_extract(l0.trait, '$.RANKED.rank'), ${UNRANKED})`);
const STRENGTH = (owner) =>
  raw(
    `(select ${formula("n")} from Note n where n.literal_id = l0.id${owner ? ` and n.user_id = '${owner}'` : ""} and exists (select 1 from json_each(n.traits) where value = 'RETAINED'))`,
  );
const held = () => ({ $ne: null });

const retained = (literal) => {
  if (!literal.notes?.isInitialized?.())
    throw new Error(`[education] ${literal.slug}: RETAINED is read off literal.notes — populate: ["notes"] on the query that fetched it`);
  return literal.notes.getItems().find((note) => note.traits.includes("RETAINED"));
};

export const RETAINED = traits.define("RETAINED", {
  repository: {
    owner() {
      const params = this.getEntityManager().getContext().getFilterParams("user");
      return params?.user ? { user: params.user } : {};
    },

    constrain(where) {
      if (!where || !is.array(where.symbols)) return where;
      const { symbols, ...rest } = where;
      if (!symbols.length) return rest;
      const constraints = symbols.map((slug) => ({ symbols: { slug } }));
      return { ...rest, $and: [...(rest.$and || []), ...constraints] };
    },

    async feed(where = {}, opts = {}) {
      const { limit, blacklist, populate } = opts || {};
      const due = await this.due(where, { limit, blacklist, populate });
      if (due.length >= limit) return due.slice(0, limit);

      const novel = await this.novel(where, {
        limit: limit - due.length,
        blacklist: { literals: [...(blacklist?.literals || []), ...due.map((d) => d.id)] },
        populate,
      });
      return [...due, ...novel];
    },

    async novel(where = {}, opts = {}) {
      const { limit, blacklist, populate } = opts || {};
      const filter = object.merge(
        { notes: { $none: { ...this.owner(), trait: { RETAINED: held() } } } },
        { id: { $nin: blacklist?.literals || [] } },
        this.constrain(where),
      );
      return this.find(filter, { orderBy: { [RANK]: "ASC" }, limit, populate: populate ? [...populate, "notes"] : ["notes"] });
    },

    async due(where = {}, opts = {}) {
      const { limit, blacklist, populate } = opts || {};
      const filter = object.merge(
        { notes: { trait: { RETAINED: { due: { $lt: new Date().toISOString() } } }, ...this.owner() } },
        { id: { $nin: blacklist?.literals || [] } },
        this.constrain(where),
      );
      return this.find(filter, { populate: populate ? [...populate, "notes"] : ["notes"], limit });
    },

    async byStrength(where = {}, opts = {}) {
      const { limit, blacklist, populate } = opts || {};
      return this.find(
        object.merge({ notes: { ...this.owner(), trait: { RETAINED: held() } } }, { id: { $nin: blacklist?.literals || [] } }, this.constrain(where)),
        { populate: populate ? [...populate, "notes"] : ["notes"], orderBy: { [STRENGTH(this.owner().user)]: "ASC" }, limit },
      );
    },

    async byLastSignal(signals, where = {}, opts = {}) {
      const { limit, blacklist, populate } = opts || {};
      return this.find(
        object.merge(
          { notes: { trait: { RETAINED: { lastSignal: { $in: signals } } }, ...this.owner() } },
          { id: { $nin: blacklist?.literals || [] } },
          this.constrain(where),
        ),
        { populate: populate ? [...populate, "notes"] : ["notes"], limit },
      );
    },

    async sample(where = {}, opts = {}) {
      const { status, limit, blacklist, populate } = opts || {};
      return this.find(
        object.merge(
          status
            ? { notes: { trait: { RETAINED: { status: { $in: status } } }, ...this.owner() } }
            : { notes: { ...this.owner(), trait: { RETAINED: held() } } },
          { id: { $nin: blacklist?.literals || [] } },
          this.constrain(where),
        ),
        { populate: populate ? [...populate, "notes"] : ["notes"], orderBy: { [raw("random()")]: "asc" }, limit },
      );
    },

    async review(row, signal) {
      const notes = this.entities.note;
      const note = (await notes.retention(row)) ??
        notes.create({ ...this.owner(), literal: row, slug: `retention.${row.slug}`, traits: ["RETAINED"], trait: { RETAINED: {} } });
      notes.evolve(note, signal);
      const { status, due } = note.trait.RETAINED;
      notes.create({ ...this.owner(), literal: row, parent: note, slug: `trace.${crypto.randomUUID()}`, traits: ["TRACED"], trait: { TRACED: { signal, snapshot: { status, due } } } });
      await this.em.flush();
      return note;
    },
  },
  entity: {
    assess(now = Date.now()) {
      const note = retained(this);
      return note ? note.assess(now) : undefined;
    },
  },
});
