import "./component";
import { wrap } from "./component/wrap";

const pageGraph = {};

function $for(arr, fn, key) {
  arr = arr || [];
  return arr.map((item, index) => {
    const vdom = fn(item, index);
    vdom.key = key || index;
    return vdom;
  });
}

function $handleEvent(name, id, custom) {
  const ins = pageGraph[id];
  const method = ins[name] || (ins.methods || {})[name] || function () {};
  ins.eventMap[custom] = name;
  return (e) => {
    if (e.type === "keydown" && e.keyCode !== 13) {
      return;
    }
    if (e.target) {
      e.target.dataset = e.dataset;
    }
    method.call(ins, e);
  };
}

var Page = (option) => {
  pageGraph[p.id] = new _Page(option, p.id);
};

var global = {
  modules: {},
  Page,
  $for,
  $handleEvent,
  useEffect: React.useEffect,
  setStates: {},
};

function execStyles(styles) {
  styles.forEach((style) => {
    const link = document.createElement("link");
    link.setAttribute("href", style);
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    document.head.appendChild(link);
  });
}

function execScript(path, ref) {
  const {
    modules,
    Page: Page2,
    useEffect: useEffect2,
    $for: $for2,
    setStates,
  } = ref;
  const executeCode = new Function(
    "module",
    "Page",
    "useEffect",
    "$for",
    "$handleEvent",
    "setStates",
    path
  );
  var module = {
    exports: {},
  };
  executeCode.call(
    module.exports,
    module,
    Page2,
    useEffect2,
    $for2,
    $handleEvent,
    setStates
  );

  modules[path] = module.exports;
}
var _Page = class {
  constructor(option, id) {
    this.id = id;
    this.parent = null;
    this.eventMap = {};
    for (const key in option) {
      this[key] = option[key];
    }
  }
  setData(data) {
    this.data = { ...this.data, ...data };
    const setState = global.setStates[this.id];
    setState(this.data);
  }
};

let path = window.location.pathname;
let p = "";
const pages = manifest.pages;
if (path === "/") {
  window.location.href = window.location.origin + pages[0].path;
} else {
  p = pages.find((i) => i.path === path);
}
const { scripts, styles, id } = p;

execScript(scripts[1], global);
execScript(scripts[0], global);

execStyles(styles);

const Comp = global.modules[scripts[1]].default;

const tabBar = manifest.origin.tabBar;

ReactDOM.render(
  React.createElement(wrap, {
    page: pageGraph[id],
    tabBar,
    path,
    manifest,
    Comp,
  }),
  document.body
);
