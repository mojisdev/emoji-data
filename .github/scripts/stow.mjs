// import { readdir } from "node:fs/promises"

const API_URL = 'https://mojistow.mojis.dev';

export async function run() {
  console.log('running stow script');
  console.log(process.env.VERSIONS_NEEDING_UPDATE)
  console.log(process.env.VERSIONS_WITH_HASHES)

  // const versions = await readdir("./data");


}
