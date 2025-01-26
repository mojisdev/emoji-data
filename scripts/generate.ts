import process from "node:process";
import { hasLockfile, writeLockfile } from "./utils";

async function run(): Promise<void> {
  console.log("Hello, world!");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
