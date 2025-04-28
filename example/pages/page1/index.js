
Page({
  data: {
    arr: [0]
  },
  onLoad(options) {
    console.log(1, options);
  },
  add() {
    this.setData({
      arr: this.data.arr.concat([this.data.arr.length])
    })
  }
})