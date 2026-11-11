// a key pressed while the learner writes is theirs, not the game's: an input, a text area or an
// editable element holds it
export const typing = (event) => {
  const target = event.composedPath()[0];
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
};
