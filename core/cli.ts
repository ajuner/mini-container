import chokidar from "chokidar";
import { compile } from "./complire";
import { server } from "./server";
import { pack } from "./pack";
import commander from "./commander";
import { resolve } from "path";

let ser;

async function run(commander) {
  const options = {
    e: commander.entry,
    o: commander.output,
    w: commander.watch,
  };

  start(options);

  if (options.w) {
    chokidar
      .watch(resolve(options.e), {
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 500,
        },
      })
      .on("change", async () => {
        ser.reloadStart?.();
        await rebuild(options);
        ser.reloadEnd?.();
      });
  }

  ser = server(options);
}

async function rebuild(options) {
  await start(options);
}

async function start(options) {
  const allFileNode = await compile(options);

  await pack(allFileNode, options);
}

run(commander);
