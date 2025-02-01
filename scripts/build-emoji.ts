import type { Emoji, EmojiCategory, EmojiComponent } from "./_types";
import { mkdir } from "node:fs/promises";
import process from "node:process";
import { red, underline, yellow } from "farver/fast";
import semver from "semver";
import { hasLockfile, readLockfile, slugify, writeLockfile } from "./_utils";

const NOT_IMPLEMENTED = [
  "1.0",
  "2.0",
  "3.0",
  "4.0",
  "5.0",
];

const FILES_TO_DOWNLOAD: Record<string, string[]> = {
  "1.0": [
    "emoji-data.txt",
  ],
  "2.0": [
    "emoji-data.txt",
    "emoji-sequences.txt",
    "emoji-zwj-sequences.txt",
  ],
  "3.0": [
    "emoji-data.txt",
    "emoji-sequences.txt",
    "emoji-zwj-sequences.txt",
  ],
  "4.0": [
    "emoji-data.txt",
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
  "5.0": [
    "emoji-data.txt",
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-variation-sequences.txt",
    "emoji-zwj-sequences.txt",
  ],
  "11.0": [
    "emoji-data.txt",
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-variation-sequences.txt",
    "emoji-zwj-sequences.txt",
  ],
  "12.0": [
    "emoji-data.txt",
    "emoji-internal.txt",
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-variation-sequences.txt",
    "emoji-zwj-sequences.txt",
  ],
  "12.1": [
    "emoji-data.txt",
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-variation-sequences.txt",
    "emoji-zwj-sequences.txt",
  ],
  "13.0": [
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
  "13.1": [
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
  "14.0": [
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
  "15.0": [
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
  "15.1": [
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
  "16.0": [
    "emoji-sequences.txt",
    "emoji-test.txt",
    "emoji-zwj-sequences.txt",
  ],
};

const VARIATION_16 = String.fromCodePoint(0xFE0F);

const GROUP_REGEX = /^#\sgroup:\s(?<name>.+)/;
const EMOJI_REGEX_AFTER_12_0 = /^[^#]+;\s(?<type>[\w-]+)\s+#\s(?<emoji>\S+)\sE(?<emojiversion>\d+\.\d)\s(?<desc>.+)/;
const EMOJI_REGEX_BEFORE_12_0 = /^[^#]+;\s(?<type>[\w-]+)\s+#\s(?<emoji>\S+)\s(?<desc>.+)/;
const SKIN_TONE_VARIATION_DESC = /\sskin\stone(?:,|$)/;
// eslint-disable-next-line regexp/no-misleading-capturing-group
const ORDERED_EMOJI_REGEX = /.+\s;\s(?<version>[0-9.]+)\s#\s(?<emoji>\S+)\s(?<name>[^:]+)(?::\s)?(?<desc>.+)?/;

async function run(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("no arguments provided.");
    process.exit(1);
  }

  const versions = args.map((arg) => {
    return arg.replaceAll("\"", "");
  });

  // some versions needs to be handled differently
  for (const version of versions) {
    console.log(`building emoji dataset for version ${yellow(version)}...`);

    // create folders
    await mkdir(`./unicode/${version}`, { recursive: true });

    // TODO: remove at some point
    if (NOT_IMPLEMENTED.includes(version)) {
      console.log(`version ${yellow(version)} is not implemented.`);
      continue;
    }

    // fetch the readme.txt file
    const readmeResponse = await fetch(`https://unicode.org/Public/emoji/${version}/ReadMe.txt`);

    if (!readmeResponse.ok) {
      console.error(`failed to fetch ReadMe.txt for version ${yellow(version)}.`);
      process.exit(1);
    }

    // write the readme.txt file
    await Bun.write(`./unicode/${version}/README.md`, await readmeResponse.text());

    const files = FILES_TO_DOWNLOAD[version];

    if (files == null && !Array.isArray(files)) {
      console.error(`no files found for version ${yellow(version)}.`);
      process.exit(1);
    }

    const orderingResponse = await fetch(`https://unicode.org/emoji/charts-${version}/emoji-ordering.txt`);

    if (!orderingResponse.ok) {
      console.error(`failed to fetch emoji-ordering.txt for version ${yellow(version)}.`);
      process.exit(1);
    }

    const emojiOrdering = await orderingResponse.text();

    // write the ordering file
    await Bun.write(`./unicode/${version}/.tmp/emoji-ordering.txt`, emojiOrdering);

    // fetch the emoji files
    for (const file of files) {
      const fileResponse = await fetch(`https://unicode.org/Public/emoji/${version}/${file}`);

      if (!fileResponse.ok) {
        console.error(`failed to fetch ${file} for version ${yellow(version)}.`);
        process.exit(1);
      }

      // write the emoji file
      await Bun.write(`./unicode/${version}/.tmp/${file}`, await fileResponse.text());
    }

    const emojiDataFile = Bun.file(`./unicode/${version}/.tmp/emoji-test.txt`);
    const emojiData = await emojiDataFile.text();

    const categories: EmojiCategory[] = [];
    let currentCategory = null;

    const emojis: Emoji[] = [];
    let currentEmoji = null;

    const components: Record<string, EmojiComponent> = {};

    const emojiDataLines = emojiData.split("\n");
    const emojiOrderingLines = emojiOrdering.split("\n");

    for (const line of emojiDataLines) {
      const groupMatch = line.match(GROUP_REGEX);

      if (groupMatch != null && groupMatch.groups != null) {
        const groupName = groupMatch.groups.name;
        if (groupName == null) {
          throw new TypeError(`category name is ${underline(red("null"))}. Value: ${groupName}`);
        }

        categories.push({
          name: groupName,
          slug: slugify(groupName),
        });

        currentCategory = groupName;
      }

      const coercedVersion = semver.coerce(version);
      if (coercedVersion == null) {
        throw new TypeError(`version ${underline(red(version))} is not a valid semver version.`);
      }

      const isBeforeOr12 = semver.lte(coercedVersion, "12.0.0");

      const emojiMatch = line.match(isBeforeOr12 ? EMOJI_REGEX_BEFORE_12_0 : EMOJI_REGEX_AFTER_12_0);

      if (emojiMatch != null && emojiMatch.groups != null) {
        const { type, emoji, desc, ...rest } = emojiMatch.groups;

        if (type !== "fully-qualified" && type !== "component") {
          continue;
        }

        if (type === "component") {
          if (desc == null) {
            throw new TypeError(`component description is ${underline(red("null"))}. Value: ${desc}`);
          }

          const slug = slugify(desc);
          components[slug] = {
            name: desc,
            slug,
            emoji: emoji!,
          };

          continue;
        }

        if (line.match(SKIN_TONE_VARIATION_DESC)) {
          continue;
        }

        emojis.push({
          emoji: emoji!,
          name: null,
          slug: null,
          category: currentCategory!,
          emoji_version: isBeforeOr12 ? null : rest.emojiversion!,
          unicode_version: null,
          skin_tone_support: null,
        });
      }
    }

    const COMPONENT_EMOJIS = Object.values(components).map((component) => component.emoji);

    for (const line of emojiOrderingLines) {
      if (line.length === 0) continue;
      const match = line.match(ORDERED_EMOJI_REGEX);
      if (match == null || match.groups == null) continue;

      const { version, emoji, name, desc } = match.groups;

      const isSkinToneVariation = desc != null && desc.match(SKIN_TONE_VARIATION_DESC) != null;
      const fullName = desc != null && !isSkinToneVariation ? [name, desc].join(" ") : name;

      if (isSkinToneVariation) {
        currentEmoji!.skin_tone_support = true;
        currentEmoji!.skin_tone_support_unicode_version = version;
      } else {
        const optional = emojis.find((e) => e.emoji === emoji) != null ? emoji : `${emoji}${VARIATION_16}`;

        const entry = emojis.find((e) => e.emoji === optional);
        if (!entry) {
          if (COMPONENT_EMOJIS.includes(emoji!)) {
            continue;
          }

          console.log(`emoji ${yellow(optional)} not found.`);
          continue;
        }

        currentEmoji = entry;
        currentEmoji.emoji = optional!;
        currentEmoji.name = fullName!;
        currentEmoji.slug = slugify(fullName!);
        currentEmoji.unicode_version = version!;
        currentEmoji.skin_tone_support = false;
      }
    }

    // write emoji data
    await Bun.write(`./unicode/${version}/categories.json`, JSON.stringify(categories, null, 2));
    await Bun.write(`./unicode/${version}/emojis.json`, JSON.stringify(emojis, null, 2));
    await Bun.write(`./unicode/${version}/components.json`, JSON.stringify(components, null, 2));
  }

  // update lockfile
  if (!await hasLockfile()) {
    await writeLockfile({
      versions,
      latestVersion: null,
    });
  } else {
    const lockfile = await readLockfile();
    lockfile.latestVersion = versions.at(-1);

    await writeLockfile(lockfile);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
