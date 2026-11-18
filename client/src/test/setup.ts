// Vitest setup for jsdom component/store tests (MM step 0, F13).
// fake-indexeddb gives the zustand IndexedDB store a real in-memory IDB, and
// jest-dom adds the DOM matchers.
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
