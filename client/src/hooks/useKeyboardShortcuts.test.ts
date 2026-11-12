import { describe, expect, it, vi } from "vitest";
import { createEditorShortcuts } from "./useKeyboardShortcuts";

describe("createEditorShortcuts", () => {
  it("only registers shortcuts that do something", () => {
    const actions = { onSave: vi.fn(), onExport: vi.fn(), onHelp: vi.fn() };
    const shortcuts = createEditorShortcuts(actions);

    expect(shortcuts.map((s) => s.key)).toEqual(["s", "e", "/"]);

    for (const shortcut of shortcuts) shortcut.action();
    expect(actions.onSave).toHaveBeenCalledTimes(1);
    expect(actions.onExport).toHaveBeenCalledTimes(1);
    expect(actions.onHelp).toHaveBeenCalledTimes(1);
  });

  it("does not claim the browser's and editor's own formatting keys", () => {
    const shortcuts = createEditorShortcuts({ onSave() {}, onExport() {}, onHelp() {} });
    const claimed = shortcuts.map((s) => s.key);
    for (const key of ["b", "i", "k", "p"]) expect(claimed).not.toContain(key);
  });
});
