import { traits } from "@vivalence/typology";
import { v } from "@vivalence/typology";

const open = () => v.object({}, { additionalProperties: true });

export const TRANSLATED = traits.define("TRANSLATED", {
  schematic: v.object({ known: v.string(), learning: v.string() }, { additionalProperties: true }),
  repository: {
    get card() {
      const repository = this;
      return {
        fields: ["slug", "known", "learning", "ontology", "status"],
        populate: ["notes"],
        project: (literal) => ({
          slug: literal.slug,
          known: literal.trait?.TRANSLATED?.known ?? "",
          learning: literal.trait?.TRANSLATED?.learning ?? "",
          ontology: literal.ontology,
          status: literal.assess()?.status ?? "UNTOUCHED",
        }),
      };
    },
    search(query) {
      const like = `%${query.search}%`;
      return [
        { slug: { $like: like } },
        { trait: { TRANSLATED: { known: { $like: like } } } },
        { trait: { TRANSLATED: { learning: { $like: like } } } },
      ];
    },
  },
});

export const EXEMPLIFIED = traits.define("EXEMPLIFIED", { schematic: open() });

export const VOCALIZED = traits.define("VOCALIZED", { schematic: open() });

export const CONJUGATED = traits.define("CONJUGATED", {
  schematic: open(),
  repository: {
    async family(rows) {
      const words = rows.filter((row) => row.ontology === "word");
      if (!words.length) return [];
      const seen = new Set(rows.map((row) => row.slug));
      const paradigms = (await this.find({ uses: { $in: words.map((row) => row.id) }, ontology: "conjugation" }, { limit: 10, populate: ["notes"] })).filter(
        (paradigm) => !seen.has(paradigm.slug),
      );
      if (!paradigms.length) return [];
      const wanted = [...new Set(paradigms.map((paradigm) => paradigm.trait?.CONJUGATED?.infinitive).filter(Boolean))].filter((slug) => !seen.has(slug));
      const infinitives = wanted.length ? await this.find({ slug: { $in: wanted } }, { populate: ["notes"] }) : [];
      return paradigms.map((paradigm) => ({
        paradigm,
        infinitive: infinitives.find((row) => row.slug === paradigm.trait?.CONJUGATED?.infinitive) ?? null,
      }));
    },
  },
});
