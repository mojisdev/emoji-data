import * as v from "valibot";

const LOCKFILE_SCHEMA = v.object({
  latestVersion: v.optional(v.nullable(v.string())),
  versions: v.array(v.string()),
});

export type EmojiLockfile = v.InferInput<typeof LOCKFILE_SCHEMA>;

const DEFAULT_LOCKFILE = {
  versions: [],
  latestVersion: null,
} satisfies EmojiLockfile;

export async function readLockfile(): Promise<EmojiLockfile> {
  const file = Bun.file("emojis.lock");

  const json = await file.json().catch(() => DEFAULT_LOCKFILE);

  return v.parseAsync(LOCKFILE_SCHEMA, json);
}

export async function writeLockfile(lockfile: EmojiLockfile): Promise<void> {
  await Bun.write(Bun.file("emojis.lock"), JSON.stringify(lockfile, null, 2));
}

export async function hasLockfile(): Promise<boolean> {
  return Bun.file("emojis.lock").exists();
}
