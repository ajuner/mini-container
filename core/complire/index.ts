import { extname, resolve } from "path";
import { promises } from "fs";

export const compile = async (options) => {
  const { e } = options;

  const entry = resolve(e + "/app.json");

  const root = await resolveFile(entry);

  await loadFile(options, root);
  return root;
};

const loadFile = async (options, file) => {
  if (file.path) {
    const input = await promises.readFile(file.path);
    await file.transform(input.toString());
  }
  if (file.type === "json") {
    file.outputPath = resolve(options.o, String(file.id));
  }

  let siblings: Promise<void>[] = []

  if (file.type === "json" && file.parent) {
    siblings = [".wxml", ".js", ".wxss"].map(async (type) => {
      if (file.parent) {
        const filePath = file.path.replace(".json", type);
        const childFileNode = await resolveFile(filePath);
        file.siblingFileNode.set(type, childFileNode);
        childFileNode.parent = file;
        await loadFile(options, childFileNode);
      }
    });
  }

  if (file.type === "json" && !file.parent) {
    siblings = [".js"].map(async (type) => {
      const childFileNode = await resolveFile(file.path.replace(".json", type));
      file.siblingFileNode.set(type, childFileNode);
      childFileNode.parent = file;
      await loadFile(options, childFileNode);
    });
  }

  const dependencies = Array.from(file.dependencies);

  const childs = dependencies.map(async (dep: any) => {
    const childFileNode = await resolveFile(
      resolve(options.e + "/" + dep.path.replace(dep.ext, "") + dep.ext)
    );
    childFileNode.tag = dep.tag;
    file.childFileNode.set(dep.path, childFileNode);
    childFileNode.parent = file;
    await loadFile(options, childFileNode);
  });
  await Promise.all(siblings.concat(childs));
};

const resolveFile = async (path) => {
  let type = extname(path);

  const target = {
    ".js": require("./file").JsFileNode,
    ".json": require("./file").JsonFileNode,
    ".wxml": require("./file").WxmlFileNode,
    ".wxss": require("./file").WxssFileNode,
  };

  const fileNode = target[type];

  return new fileNode(path, type);
};
