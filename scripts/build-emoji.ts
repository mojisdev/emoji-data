import process from "node:process";
import { hasLockfile, writeLockfile } from "./utils";

async function run(): Promise<void> {
  console.log("Hello, world!");

  console.log(process.argv);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
