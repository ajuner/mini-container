import { resolve } from "path";
import { getIndexHtmlCode } from "./pack";

const port = "8108";

export const server = (options) => {
  const express = require("express");

  const distdir = resolve(options.o);
  const appEntry = resolve(options.e, "app.json");
  const appJson = require(appEntry);

  const app = express()
    .use(express.static(distdir))
    .get("/", (_, res) => {
      getIndexHtmlCode().then((data) => {
        res.end(data);
      });
    });

  appJson.pages.forEach((page) => {
    app.get("/" + page, (_, res) => {
      getIndexHtmlCode().then((data) => {
        res.end(data);
      });
    });
  });

  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`start:http://localhost:${port}`);
  });

  // 建立一个8108 socket链接来实现热更新
  const http = require("http").createServer(app);
  const io = require("socket.io")(http);
  http.listen(8109, () => {
    console.log("socket.io listening on *:8109");
  });
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  app.reloadEnd = () => {
    io.emit("reload-end");
  };

  app.reloadStart = () => {
    io.emit("reload-start");
  };

  return app;
};
