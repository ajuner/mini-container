const tagOrCommentStartRE = /<\/?(?:[A-Za-z]+\w*)|<!--/;

const getId = (asset) => {
  let p = asset.parent;
  while (p && p.type === "wxml") {
    p = p.parent;
  }
  return p ? p.id : null;
};

const eventMap = {
  tap: "onClick",
  confirm: "onKeyDown",
};

export const lex = (input) => {
  input = input.replace(/[\r\n]/g, "");
  let state = {
    input,
    current: 0,
    tokens: [],
  };
  lexstate(state);
  return state.tokens;
};

const lexstate = (state) => {
  let input = state.input;
  let len = input.length;
  while (state.current < len) {
    if (input.charAt(state.current) !== "<") {
      lexText(state);
      continue;
    }
    if (input.substr(state.current, 4) === "<!--") {
      lexComment(state);
      continue;
    }
    lexTag(state);
  }
};

const lexText = (state) => {
  let current = state.current;
  let input = state.input;
  let len = input.length;
  let endOfText = input.substring(current).search(tagOrCommentStartRE);
  if (endOfText === -1) {
    state.tokens.push({
      type: "text",
      value: input.slice(current),
    });
    state.current = len;
    return;
  } else if (endOfText !== 0) {
    endOfText += current;
    let value = input.slice(current, endOfText).trim();
    if (value.length > 0) {
      state.tokens.push({
        type: "text",
        value,
      });
    }
    state.current = endOfText;
  }
};

const lexComment = (state) => {
  let current = state.current;
  let input = state.input;
  let len = input.length;
  current += 4;
  let endOfComment = input.indexOf("-->", current);
  if (endOfComment === -1) {
    state.tokens.push({
      type: "comment",
      value: input.slice(current),
    });
    state.current = len;
  } else {
    state.tokens.push({
      type: "comment",
      value: input.slice(current, endOfComment),
    });
    state.current = endOfComment + 3;
  }
};

const lexAttributes = (token, state) => {
  let input = state.input;
  let current = state.current;
  let len = input.length;
  let char = input.charAt(current);
  let nextChar = input.charAt(current + 1);

  function next() {
    current++;
    char = input.charAt(current);
    nextChar = input.charAt(current + 1);
  }

  let attributes = {};

  while (current < len) {
    if (char === ">" || (char === "/" && nextChar === ">")) {
      break;
    }
    if (char === " ") {
      next();
      continue;
    }
    let name = "";
    let noValue = false;
    while (current < len && char !== "=") {
      if (char === " " || char === ">" || (char === "/" && nextChar === ">")) {
        noValue = true;
        break;
      } else {
        name += char;
      }
      next();
    }

    let value = "";
    if (noValue) {
      attributes[name] = value;
      continue;
    }
    next();
    let quoteType = " ";
    if (char === "'" || char === '"') {
      quoteType = char;
      next();
    }
    while (current < len && char !== quoteType) {
      value += char;
      next();
    }
    next();
    attributes[name] = value;
  }
  state.current = current;
  token.attributes = attributes;
};

const lexTag = (state) => {
  let input = state.input;
  let isCloseStart = input.charAt(state.current + 1) === "/";
  state.current += isCloseStart ? 2 : 1;
  let tagToken: any = lexType(state);
  lexAttributes(tagToken, state);
  let isCloseEnd = input.charAt(state.current) === "/";
  state.current += isCloseEnd ? 2 : 1;

  if (isCloseEnd) {
    tagToken.closeEnd = true;
  }
  if (isCloseStart) {
    tagToken.closeStart = true;
  }
};

const lexType = (state) => {
  let input = state.input;
  let current = state.current;
  let len = input.length;
  let type = "";

  while (current < len) {
    let char = input.charAt(current);
    if (char === "/" || char === ">" || char === " ") {
      break;
    } else {
      type += char;
    }
    current++;
  }
  let token = {
    type: "tag",
    value: type,
  };
  state.tokens.push(token);
  state.current = current;
  return token;
};

export const parse = (tokens) => {
  let ast: any = {
    children: [],
  };

  let state = {
    current: 0,
    tokens,
  };

  while (state.current < tokens.length) {
    let child = parseWalk(state);
    if (child) {
      ast.children.push(child);
    }
  }
  return ast;
};

const parseWalk = (state) => {
  let token = state.tokens[state.current];
  let prevToken = state.tokens[state.current - 1];

  function move(num?: number) {
    state.current += num != null ? num : 1;
    token = state.tokens[state.current];
    prevToken = state.tokens[state.current - 1];
  }

  if (token.type === "text") {
    move();
    return prevToken.value;
  }

  if (token.type === "comment") {
    move();
    return null;
  }

  if (token.type === "tag") {
    let type = token.value;
    let closeStart = token.closeStart;
    let closeEnd = token.closeEnd;

    let node = parseNode(type, token.attributes, []);
    move();
    if (closeEnd === true) {
      return node;
    } else if (closeStart) {
      return null;
    } else if (token) {
      while (
        token.type !== "tag" ||
        (token.type === "tag" &&
          ((!token.closeStart && !token.closeEnd) || token.value !== type))
      ) {
        let child = parseWalk(state);
        if (child) {
          node.children.push(child);
        }
        move(0);
        if (!token) {
          break;
        }
      }
      move();
    }
    return node;
  }
  move();
  return;
};

const parseNode = (name, attributes, children) => {
  let type = "node";
  if (
    name.indexOf("-") > -1 ||
    (name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase())
  ) {
    type = "component";
  }

  return {
    type,
    name,
    attributes,
    children,
  };
};

let clock = 0;

export const generate = (asset) => {
  let tree = asset.ast;
  let children = tree.children;

  let state = {
    imports: [],
    methods: [],
    blocks: {},
  };

  for (let i = 0; i < children.length; i++) {
    const kid = children[i];
    const next = children[i + 1];
    const block = generateNode(kid, state, asset, next);
    if (block) {
      state.blocks[clock++] = block;
    }
  }

  return { imports: state.imports, blocks: state.blocks };
};

const generateNode = (node, state, asset, nextNode) => {
  if (typeof node === "string") {
    let compiled = compileExpression(node, "text");
    return `${compiled}`;
  } else {
    let code = `<${titleCase(node.name)} `;
    code += generateProps(node, state, asset);
    if (node.children) {
      code += `${node.children
        .map((item, index) =>
          generateNode(item, state, asset, node.children[index + 1])
        )
        .join("\n")}`;
    }

    code += `</${titleCase(node.name)}>`;

    if (node.name === "import") {
      return "";
    }
    if (node.directives) {
      code = generateDirect(node, code, nextNode);
    }
    return code;
  }
};

const compileExpression = (expression, type) => {
  const exp = /{{(.*?)}}/g;
  switch (type) {
    case "direct":
      return expression.replace(exp, "$1");
    case "text":
      return expression.replace(exp, "{String($1)}");
    case "component":
      return expression.replace(exp, "{$1}").replace(/([^{}\s]+)/g, '"$1"');
    case "node":
      return `{\`${expression.replace(exp, "${$1}")}\`}`;
    default:
      return expression;
  }
};

const titleCase = (str) =>
  "comp." +
  str.slice(0, 1).toUpperCase() +
  str.replace(/\-(\w)/g, (_, letter) => letter.toUpperCase()).slice(1);

const generateProps = (node, state, asset) => {
  let code = "";
  for (let name in node.attributes) {
    const value = node.attributes[name];
    if (name.startsWith("wx:")) {
      node.directives = node.directives || [];
      node.directives.push([name, value]);
    } else if (name.startsWith("bind")) {
      if (state.methods.indexOf(value) < 0) {
        state.methods.push(value);
      }
      const key = wriedName(name);
      code += ` ${key}={$handleEvent("${value}", "${getId(
        asset
      )}", "${name}")} `;
    } else if (node.name === "import") {
      state.imports.push(value);
    } else {
      let compiled = compileExpression(value, node.type);
      code += `${name}=${compiled || "true"}`;
    }
  }
  return code + ">";
};

const wriedName = (key) => {
  key = key.replace(/(bind|catch)\:?/g, "");
  return key in eventMap
    ? eventMap[key]
    : "on" + key[0].toUpperCase() + key.substr(1);
};

let ifcode = "";

function isElse(node) {
  if (node) {
    for (const name in node.attributes) {
      if (name.indexOf("else") > -1) return true;
    }
  }
  return false;
}

const generateDirect = (node, code, next) => {
  for (let i = 0; i < node.directives.length; i++) {
    const [name, value] = node.directives[i];
    const compiled = compileExpression(value, "direct");
    if (code[0] === "{") {
      code = `<div>${code}</div>`;
    }
    if (name === "wx:for") {
      const item = findItem(node);
      code = `{$for(${compiled},(${item}, index) => (${code}))}`;
    }
    if (name === "wx:if") {
      ifcode += `{${compiled}?${code}:`;
      if (isElse(next)) {
        continue;
      } else {
        code = ifcode + "null}";
        ifcode = "";
      }
    }
    if (name === "wx:elseif") {
      ifcode += `${compiled}?${code}:`;
      if (isElse(next)) {
        continue;
      } else {
        code = ifcode + "null}";
        ifcode = "";
      }
    }
    if (name === "wx:else") {
      if (ifcode === "") {
        ifcode += `{!${compiled}?${code}:null}`;
      } else {
        ifcode += `${code}}`;
      }
      code = ifcode;
      ifcode = "";
    }
    return code;
  }
};

function findItem(node) {
  const item = node.directives.find((item) => item[0] === "wx:for-item");
  return item ? item[1] : "item";
}
