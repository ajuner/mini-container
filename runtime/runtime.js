import "./component";

const app = { graph: null };

function getIns() {
  return app.graph;
}

function $for(arr, fn, key) {
  arr = arr || [];
  return arr.map((item, index) => {
    const vdom = fn(item, index);
    vdom.key = key || index;
    return vdom;
  });
}

function $handleEvent(name, id, custom) {
  const ins = getIns(id);
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

var modules = {};
var Page = (option) => {
  const page = new _Page(option, p.id);
  app.graph = page;
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
    "app",
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
    app,
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

const c = global.modules[scripts[1]].default;

const tabBar = manifest.origin.tabBar;
const page = app.graph;

const wrapComp = () => {
  React.useEffect(() => {
    page.onLoad && page.onLoad();
    return () => {
      page.unLoad && page.unLoad();
    };
  }, []);
  return React.createElement(React.Fragment, null, [
    React.createElement(c, { data: page.data }),
    !manifest.origin.tabBar.custom &&
      React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            display: "flex",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px 0 20px",
            fontSize: "10px",
            backgroundColor: tabBar.backgroundColor,
            borderTop: `1px solid ${tabBar.borderStyle}`,
            color: tabBar.color,
          },
        },
        tabBar.list.map((item) => {
          const isSelect = "/" + item.pagePath === path;
          return React.createElement(
            "div",
            {
              key: item.pagePath,
              style: {
                display: "block",
                width: "100%",
                textAlign: "center",
              },
              onClick: () => {
                if (isSelect) return;
                location.href = "/" + item.pagePath;
              },
            },
            React.createElement("img", {
              src: isSelect ? item.selectedIconPath : item.iconPath,
              style: { width: "30px", height: "30px" },
            }),
            React.createElement(
              "div",
              {
                style: {
                  color: isSelect ? tabBar.selectedColor : tabBar.color,
                },
              },
              item.text
            )
          );
        })
      ),
  ]);
};

ReactDOM.render(React.createElement(wrapComp, {}), document.body);
