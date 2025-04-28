const path = require("path");
const execa = require("execa");

const cli = path.join(__dirname, "../core/cli.ts");

const argv = process.argv.slice(2);

execa("ts-node", [cli, ...argv], {
  stdio: "inherit",
  cwd: path.join(__dirname, "../"),
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
