import socket from "socket.io-client";

export const wrap = (props) => {
  const { app, manifest, tabBar, Comp, path } = props;

  const page = app.graph;

  const [show, setShow] = React.useState(false);

  React.useLayoutEffect(() => {
    page.onShow && page.onShow();
    return () => {
      page.onHide && page.onHide();
    };
  }, []);

  React.useEffect(() => {
    page.onLoad && page.onLoad();
    // 建立一个 socket.io 链接
    const socketUrl = window.location.origin.replace(/:\d+/, ":8109");
    const io = socket(socketUrl, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: false,
      forceNew: true,
      multiplex: false,
    });

    io.on("reload-start", () => {
      setShow(true);
    });

    io.on("reload-end", () => {
      setShow(false);
      window.location.reload();
    });

    io.connect();

    return () => {
      page.unLoad && page.unLoad();
      io.disconnect();
    };
  }, []);
  console.log(page.data);
  return (
    <>
      <Comp data={page.data} />
      {show && (
        <div
          style={{
            position: "fixed",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            top: 0,
            left: 0,
            right: 0,
            padding: "8px 0 20px",
            height: "100vh",
            width: "100vw",
            fontSize: "20px",
            background: "rgba(0, 0, 0, 0.5)",
            color: "#fff",
          }}
        >
          <span>编译中</span>
        </div>
      )}
      {!manifest.origin.tabBar.custom && (
        <div
          style={{
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
          }}
        >
          {tabBar.list.map((item) => {
            const isSelect = "/" + item.pagePath === path;
            return (
              <div
                key={item.pagePath}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                }}
                onClick={() => {
                  if (isSelect) return;
                  location.href = "/" + item.pagePath;
                }}
              >
                <img
                  src={isSelect ? item.selectedIconPath : item.iconPath}
                  style={{ width: "30px", height: "30px" }}
                />
                <div
                  style={{
                    color: isSelect ? tabBar.selectedColor : tabBar.color,
                  }}
                >
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
