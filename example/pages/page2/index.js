// pages/page2/index.js
Page({
  data: {
    num: 0,
  },
  async getBatteryInfo() {
    const res = await wx.getBatteryInfo();
    console.log(res);
    this.setData({
      num: res,
    });
  },
  onLoad() {
    console.log("onload");
  },
  onShow() {
    console.log("onshow");
  }
});
