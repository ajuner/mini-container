import { resolve } from "path";
import { manifest } from ".";
import { transform } from "esbuild";

export const packJs = (fileNode) => {
  const defer = [];
  const cache = [];
  fileNode.out = fileNode.code;
  const walk = async (child) => {
    for (const dep of child.childFileNode.values()) {
      if (dep.tag) {
        defer.push(dep.code);
      } else {
        if (cache.indexOf(dep.path) < 0) {
          fileNode.out = dep.code + "\n" + fileNode.out;
          cache.push(dep.path);
        }
      }
      if (dep.childFileNode.size) {
        await walk(dep);
      }
    }

    for (const code of defer) {
      fileNode.out += "\n" + code;
    }
  };
  walk(fileNode);
  return fileNode.out + "\n";
};

export const packWxml = (fileNode) => {
  const walk = async (child) => {
    for (const dep of child.childFileNode.values()) {
      wiredBlock(dep.blocks, fileNode);
      if (dep.childAssets.size) {
        await walk(dep);
      }
    }
  };
  fileNode.out = "";
  wiredBlock(fileNode.blocks, fileNode);
  walk(fileNode);
  const code = `export default (props) => {
  const [state, setState] = React.useState(props.data)
  React.useEffect(()=>{
    setStates[${fileNode.parent.id}] = setState
  },[]);
  return <>${fileNode.out}</>
};\n`;
  return code;
};

const wiredBlock = (blocks, fileNode) => {
  for (let key in blocks) {
    let value = blocks[key];
    fileNode.out += value || "";
  }
};

export const packWxss = (fileNode) => {
  return fileNode.code;
};

export const packBerial = async (fileNode, options) => {
  const edir = resolve(options.e);

  try {
    var { code } = await transform(fileNode.output.jsx, {
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      loader: "jsx",
      format: "cjs",
    });
  } catch (e) {
    console.log(e);
  }
  fileNode.output.jsx = code;

  const path = fileNode.path
    .replace(edir, "")
    .replace(/\\/g, "/")
    .replace(".json", "");

  const prefix = options.p ? options.p : "/";
  const hash = prefix + String(fileNode.id);
  manifest.push({
    id: fileNode.id,
    info: fileNode.ast,
    scripts: [fileNode.output.js, fileNode.output.jsx],
    styles: [hash + ".css"],
    path,
  });
};
