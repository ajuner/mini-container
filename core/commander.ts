import { program } from "commander";

program
  .arguments("[buildType]")
  .option("-w, --watch", "watch", false)
  .option("-e, --entry <value>", "entry", "./example")
  .option("-o, --output <value>", "output", "./dist/")
  .action((buildType, command) => (command.t = buildType))
  .parse();

const options = program.opts();

export default options;
