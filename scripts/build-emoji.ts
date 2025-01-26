import { mkdir } from "node:fs/promises";
import process from "node:process";
import { yellow } from "farver/fast";
import { hasLockfile, writeLockfile } from "./utils";

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

    // fetch the readme.txt file
    const readmeResponse = await fetch(`https://unicode.org/Public/emoji/${version}/ReadMe.txt`);

    if (!readmeResponse.ok) {
      console.error(`failed to fetch ReadMe.txt for version ${yellow(version)}.`);
      process.exit(1);
    }

    // write the readme.txt file
    await Bun.write(`./unicode/${version}/README.md`, await readmeResponse.text());
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
