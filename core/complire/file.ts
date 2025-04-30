import { dirname, resolve } from "path";
import { build } from "esbuild";
import { generate, lex, parse } from "./utils";
import postcss from "postcss";

export const nodeNum = {
  num: 0,
};

const exts = {
  ".js": ".js",
  ".wxml": ".jsx",
  ".wxss": ".css",
};

export class FileNode {
  ast: any;
  path: string;
  tag: string;
  id: number;
  code?: string;
  blocks?: any;
  name: string;
  ext: string;
  type: string;
  dependencies: Set<any>;
  childFileNode: Map<string, File>;
  siblingFileNode: Map<string, File>;
  output: object;

  constructor(path, type, name, tag) {
    this.ast = {};
    this.path = path;
    this.tag = tag;
    this.id = nodeNum.num++;
    this.name = name;
    this.ext = exts[type];
    this.type = type.slice(1);
    this.dependencies = new Set();
    this.childFileNode = new Map();
    this.siblingFileNode = new Map();
    this.output = {};
  }
}

export class JsonFileNode extends FileNode {
  constructor(path, type, name, tag) {
    super(path, type, name, tag);
    this.type = "json";
    this.output = {
      jsx: "",
      js: "",
      css: "",
    };
  }

  async transform(input) {
    this.ast = JSON.parse(input);
    for (const key in this.ast) {
      const value = this.ast[key];
      if (key === "pages") {
        for (let i = 0; i < value.length; i++) {
          const path = value[i];
          this.dependencies.add({ path, ext: ".json" });
        }
      }

      if (key === "tabBar") {
        value.list.forEach((item) => {
          item.iconPath = resolve(dirname(this.path), item.iconPath);
          item.selectedIconPath = resolve(
            dirname(this.path),
            item.selectedIconPath
          );
        });
      }
    }
  }
}

export class WxssFileNode extends FileNode {
  constructor(path, type, name, tag) {
    super(path, type, name, tag);
    this.type = "wxss";
  }
  async transform(input) {
    this.ast = input;
    const that = this;
    const res = await postcss([
      require("postcss-import")({
        resolve(id) {
          const url = resolve(that.path, "../", id);
          return url;
        },
      }),
    ]).process(input, {
      from: that.path,
      to: that.path,
    });
    this.code = res.css;
  }
}

export class WxmlFileNode extends FileNode {
  constructor(path, type, name, tag) {
    super(path, type, name, tag);
    this.type = "wxml";
  }
  async transform(input) {
    const tokens = lex(this.addStateToWxmlVariable(input));
    const ast = parse(tokens);
    this.ast = ast;
    let { imports, blocks } = generate(this);
    this.blocks = blocks;
    imports.forEach((i) => this.dependencies.add({ path: i, ext: ".wxml" }));
  }

  addStateToWxmlVariable(wxmlString) {
    let result = wxmlString.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      if (variable.includes("item") || variable.includes("index")) {
        return match;
      }
      if (variable.trim().startsWith("state.")) {
        return match;
      }
      return `{{state.${variable.trim()}}}`;
    });

    result = result.replace(
      /(wx:if|wx:elseif)="\{\{([^}]+)\}\}"/g,
      (match, directive, condition) => {
        if (condition.trim().startsWith("state.")) {
          return match;
        }
        return `${directive}="{{state.${condition.trim()}}}"`;
      }
    );

    return result;
  }
}

export class JsFileNode extends FileNode {
  constructor(path, type, name, tag) {
    super(path, type, name, tag);
    this.type = "js";
  }

  async transform() {
    const out = await build({
      entryPoints: [this.path],
      bundle: true,
      format: "esm",
      sourcemap: false,
      write: false,
      outdir: "out",
    });

    this.code = String.fromCharCode.apply(null, out.outputFiles[0].contents);
  }
}
