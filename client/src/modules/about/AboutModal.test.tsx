// @vitest-environment jsdom
// The About modal shows the single developer attribution, identical across the
// showcase apps: "Erling Wulf Weinreich (0xWulf)" and a mailto link to
// dev@0xwulf.dev.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// getPersistenceState hits IndexedDB; stub it so the modal can render in jsdom.
vi.mock("@/lib/backup", () => ({
  getPersistenceState: () => Promise.resolve(true),
}));

import { AboutModal } from "./AboutModal";

afterEach(() => cleanup());

describe("AboutModal developer attribution", () => {
  it("names the developer and links the contact email", () => {
    render(<AboutModal open onClose={() => {}} />);

    expect(
      screen.getByText(/Erling Wulf Weinreich \(0xWulf\)/),
    ).toBeTruthy();

    const mail = screen.getByRole("link", { name: "dev@0xwulf.dev" });
    expect(mail.getAttribute("href")).toBe("mailto:dev@0xwulf.dev");
  });
});
