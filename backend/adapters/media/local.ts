// Local private media adapter: files live on disk OUTSIDE any static/public directory and are only ever served by an
// authorised API handler. Keys are server-generated UUIDs, so user input never reaches a filesystem path.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = () => process.env.MEDIA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "../../storage/private");
const fileFor = (key: string) => {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("invalid storage key");
  return path.join(root(), key);
};

export const localMedia = {
  name: "local",
  async put(key: string, buffer: Buffer) {
    await fs.mkdir(root(), { recursive: true });
    await fs.writeFile(fileFor(key), buffer, { flag: "wx" });
  },
  async get(key: string) {
    return fs.readFile(fileFor(key));
  },
  async remove(key: string) {
    await fs.rm(fileFor(key), { force: true });
  },
};
