import { mime } from "@vivalence/typology";

// VIEWABLE's buffer mint over the scenario's own entities — what mode/traits/viewable.js seats on a booted mode
export const viewable = ({ daemon, mode }, viva) => {
  mode.module.buffer = viva.buffer;
  mode.buffer = Object.assign(
    async (desc = {}) => {
      const buffer = daemon.entities.em.create(daemon.entities.buffer.getEntityName(), { mode: mode.entity.id, mime: mode.buffer.mime, index: desc.index ?? 0, data: viva.buffer.fill({ data: {}, ...desc }).data });
      if (desc.thread) {
        const thread = await daemon.entities.thread.findOne(desc.thread);
        buffer.thread = thread;
        buffer.index = thread.counter++;
      }
      if (desc.literals) buffer.literals.add(await daemon.entities.literal.findByIdentifiers(desc.literals));
      if (desc.symbols) buffer.symbols.add(await daemon.entities.symbol.findByIdentifiers(desc.symbols));
      return buffer;
    },
    { mime: mime.viva(mode.reference) },
  );
  return mode;
};
