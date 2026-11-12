// Remove the previous build so files from an older layout (client files and
// source maps directly in dist/) can never linger next to the server bundle.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

rmSync(fileURLToPath(new URL("../dist", import.meta.url)), { recursive: true, force: true });
