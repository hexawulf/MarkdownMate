// MM-04: export-all / import round trip.
import { describe, expect, it } from "vitest";
import { buildBackupZip, parseBackupZip, type ManifestEntry } from "./backup";
import type { Document } from "@/stores/useDocumentsStore";

function doc(partial: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: now,
    updatedAt: now,
    tags: [],
    isDeleted: false,
    ...partial,
  };
}

describe("MM-04: backup round trip", () => {
  it("export all then parse gives back the same titles and contents", async () => {
    const docs = [
      doc({ title: "First", content: "# First\n\nhello" }),
      doc({ title: "Second", content: "second body" }),
      doc({ title: "Second", content: "duplicate-title body" }), // same title → unique file names
    ];

    const zip = await buildBackupZip(docs);
    const parsed = await parseBackupZip(await zip.arrayBuffer());

    expect(parsed).toHaveLength(3);
    // Titles and contents survive, matched by content since titles can repeat.
    for (const d of docs) {
      expect(parsed.some((p) => p.title === d.title && p.content === d.content)).toBe(true);
    }
  });

  it("the zip contains a manifest.json and one .md per document", async () => {
    const docs = [doc({ title: "Doc A", content: "a" }), doc({ title: "Doc B", content: "b" })];
    const zip = await buildBackupZip(docs);
    const JSZip = (await import("jszip")).default;
    const loaded = await JSZip.loadAsync(await zip.arrayBuffer());

    expect(loaded.file("manifest.json")).toBeTruthy();
    const manifest = JSON.parse(await loaded.file("manifest.json")!.async("string"));
    expect(manifest.documents).toHaveLength(2);
    for (const entry of manifest.documents as ManifestEntry[]) {
      expect(loaded.file(entry.file)).toBeTruthy();
    }
  });

  it("falls back to loose .md files when there is no manifest", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("notes.md", "# Notes\n\nbody");
    const blob = await zip.generateAsync({ type: "arraybuffer" });

    const parsed = await parseBackupZip(blob);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("notes");
    expect(parsed[0].content).toContain("# Notes");
  });
});
