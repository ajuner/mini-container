import { test } from "./test.js";

Page({
  data: {
    arr: [
      {
        a: 0,
        b: 0,
      },
    ],
  },
  onLoad(options) {
    console.log(1, options);
  },
  add() {
    this.setData({
      arr: this.data.arr.concat([
        {
          a: this.data.arr.length,
          b: this.data.arr.length * 2,
        },
      ]),
    });
  },
  test() {
    test();
  },
});
