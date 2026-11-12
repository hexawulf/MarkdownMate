import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver } from "./autosave";

describe("createAutosaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const save = vi.fn<(id: string, content: string) => Promise<void>>().mockResolvedValue();
    const onSaved = vi.fn();
    const onError = vi.fn();
    const autosaver = createAutosaver({ save, debounceMs: 500, onSaved, onError });
    return { save, onSaved, onError, autosaver };
  };

  it("does not write a document just because it was opened", async () => {
    const { save, autosaver } = setup();

    autosaver.open("a", "hello");
    autosaver.change("hello");
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).not.toHaveBeenCalled();
    expect(autosaver.hasPending()).toBe(false);
  });

  it("writes once after the debounce period, with the latest content", async () => {
    const { save, onSaved, autosaver } = setup();

    autosaver.open("a", "hello");
    autosaver.change("hello w");
    await vi.advanceTimersByTimeAsync(300);
    autosaver.change("hello world");
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("a", "hello world");
    expect(onSaved).toHaveBeenCalledWith("a");
  });

  it("cancels the write when the content returns to what is stored", async () => {
    const { save, autosaver } = setup();

    autosaver.open("a", "hello");
    autosaver.change("hello!");
    autosaver.change("hello");
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).not.toHaveBeenCalled();
  });

  it("saves a pending edit to its own document when another one is opened", async () => {
    const { save, autosaver } = setup();

    autosaver.open("a", "first");
    autosaver.change("first, edited");
    await vi.advanceTimersByTimeAsync(100); // still inside the debounce window

    autosaver.open("b", "second");
    autosaver.change("second");
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("a", "first, edited");
  });

  it("does not write the newly opened document after a switch", async () => {
    const { save, autosaver } = setup();

    autosaver.open("a", "first");
    autosaver.change("first");
    autosaver.open("b", "second");
    autosaver.change("second");
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).not.toHaveBeenCalled();
  });

  it("ignores a stale frame that still shows the previous document's text", async () => {
    const { save, autosaver } = setup();

    autosaver.open("a", "first");
    autosaver.change("first");
    // The store already points at document b, the editor still holds a's text...
    autosaver.open("b", "second");
    autosaver.change("first");
    // ...and catches up within the same tick.
    autosaver.change("second");
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).not.toHaveBeenCalled();
  });

  it("flush writes immediately and only once", async () => {
    const { save, autosaver } = setup();

    autosaver.open("a", "hello");
    autosaver.change("hello world");
    await autosaver.flush();
    expect(save).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    await autosaver.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("keeps the edit and reports the error when a write fails, then retries", async () => {
    const { save, onSaved, onError, autosaver } = setup();
    save.mockRejectedValueOnce(new Error("quota exceeded"));

    autosaver.open("a", "hello");
    autosaver.change("hello world");
    await vi.advanceTimersByTimeAsync(500);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(autosaver.hasPending()).toBe(true);

    await autosaver.flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledWith("a");
    expect(autosaver.hasPending()).toBe(false);
  });

  it("does nothing while no document is open", async () => {
    const { save, autosaver } = setup();

    autosaver.change("orphan text");
    await autosaver.flush();
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).not.toHaveBeenCalled();
  });
});
