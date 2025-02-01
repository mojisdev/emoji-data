import process from "node:process";
import { yellow } from "farver/fast";
import { JSDOM } from "jsdom";
import semver from "semver";
import { readLockfile, writeLockfile } from "./_utils";

const EMOJI_BASE_URL = "https://www.unicode.org/Public/emoji/";

async function run(): Promise<void> {
  const res = await fetch(EMOJI_BASE_URL);

  if (!res.ok) {
    throw new Error(`failed to fetch ${EMOJI_BASE_URL}`);
  }

  const html = await res.text();

  const versions = new Set<string>();

  const { document } = (new JSDOM(html)).window;

  const elements = document.querySelectorAll("td > a");

  for (const element of elements) {
    const href = element.getAttribute("href");

    if (href == null || href.includes("/Publ")) continue;

    const version = href.replace("/", "");
    if (semver.coerce(version) == null) continue;

    versions.add(version);
  }

  console.log("found versions:", Array.from(versions).map((version) => yellow(version)).join(", "));

  const lockfile = await readLockfile();

  lockfile.versions = Array.from(versions);

  await writeLockfile(lockfile);
  console.log(`updated ${yellow("emojis.lock")}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
