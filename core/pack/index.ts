import { basename, join, resolve } from "path";
import { packJs, packWxml, packWxss, packManifest } from "./pack";
import { transform, build } from "esbuild";
import { promises } from "fs";
import { lessLoader } from "esbuild-plugin-less";

export const pack = async (allFileNode, options) => {
  await packFileNode(allFileNode, options);
  await writeFileNode(allFileNode, options);

  await generateEntry(allFileNode, options);
};

const packFileNode = async (fileNode, options) => {
  await packageJson(fileNode);
  const page = getPage(fileNode);

  if (fileNode.type === "json" && page) {
    page.output.jsx = fileNode.output.jsx ?? "";
    page.output.js = fileNode?.output?.js ?? "";
    page.output.css = fileNode?.output?.css ?? "";
  }
  const all = Array.from(fileNode.childFileNode.values()).map(async (child) => {
    await packFileNode(child, options);
  });

  await Promise.all(all);
};

const getPage = (fileNode) => {
  let p = fileNode;
  while (p && (p = p.parent)) {
    if (p.type === "json") {
      return p;
    }
  }
};

async function packageJson(fileNode) {
  const siblings = fileNode.siblingFileNode;
  if (siblings) {
    const all = Array.from(siblings.keys()).map(async (key) => {
      const value = siblings.get(key);
      switch (key) {
        case ".js":
          fileNode.output.js = await packJs(value);
          break;
        case ".wxml":
          fileNode.output.jsx = await packWxml(value);
          break;
        case ".wxss":
          fileNode.output.css = await packWxss(value);
          break;
      }
    });
    await Promise.all(all);
  }
}

const writeFileNode = async (fileNode, options) => {
  fileNode.outputPath = resolve(options.o, String(fileNode.id));
  fileNode.output.js = fileNode.siblingFileNode.get(".js").code;
  await write(fileNode, options);

  const childs = Array.from(fileNode.childFileNode.values()).map(
    async (page) => {
      await packManifest(page, options);
      await write(page, options);
    }
  );

  await Promise.all(childs);
};

const write = async (fileNode, options) => {
  await promises.mkdir(resolve(options.o), { recursive: true });
  for (const key in fileNode.output) {
    let path = `${fileNode.outputPath}.${key}`;
    let code = fileNode.output[key];

    if (options.m) {
      code = await transform(code, {
        loader: key as any,
        minify: true,
      });
    }

    await promises.writeFile(path, code);
  }
};

export const manifest = [];

const generateEntry = async (fileNode, options) => {
  const o = resolve(options.o);
  await promises.mkdir(join(o, "public"), { recursive: true });

  const tabbars = fileNode.ast.tabBar.list;
  const all = tabbars.map(async (item) => {
    let { iconPath, selectedIconPath } = item;
    const $1 = join(o, "public", basename(iconPath));
    const $2 = join(o, "public", basename(selectedIconPath));
    await promises.copyFile(iconPath, $1);
    item.iconPath = "/public/" + basename(iconPath);
    await promises.copyFile(selectedIconPath, $2);
    item.selectedIconPath = "/public/" + basename(selectedIconPath);
  });
  await Promise.all(all);

  const pages = fileNode.ast.pages.map((path) =>
    manifest.find((i) => i.path === "/" + path)
  );
  const json = {
    origin: fileNode.ast,
    pages,
  };

  const out = JSON.stringify(json);
  const code = `window.manifest = ${out}`;
  await promises.writeFile(join(resolve(options.o), "app.js"), code);
  await promises.writeFile(
    join(resolve(options.o), "index.html"),
    await getIndexHtmlCode()
  );

  await build({
    entryPoints: [resolve("./runtime/runtime.js")],
    bundle: true,
    format: "cjs",
    sourcemap: false,
    write: true,
    plugins: [
      lessLoader({
        cssInjection: true,
      }),
    ],
    outdir: join(resolve(options.o)),
  });
};

export async function getIndexHtmlCode() {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>miniapp</title>
    <style>
    *{
        margin: 0;
        padding: 0;
    }
    </style>
    <link rel="stylesheet" href="/runtime.css">
</head>
<body>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="/app.js"></script>
    <script src="/runtime.js"></script>
</body>
<script>
var wx = {}
if (window.__TAURI_INTERNALS__) {
  const { invoke } = window.__TAURI_INTERNALS__;
  wx.getBatteryInfo = async () => {
    const res = await invoke('getBatteryInfo')
    return res;
  };
}
</script>
</html>`;
}
