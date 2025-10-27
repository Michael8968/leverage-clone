const API_BASE = 'http://localhost:3000';
const app = getApp();

Page({
  data: { balance: 0 },
  onLoad(){
    const uid = app.globalData?.userId || 'test1';
    wx.request({
      url: `${API_BASE}/api/points-balance`,
      method: 'GET',
      data: { userId: uid },
      success: (res) => {
        this.setData({ balance: res.data?.balance ?? 0 });
      },
      fail: (err) => console.error('balance error', err)
    });
  },
  recharge(){
    const uid = app.globalData?.userId || 'test1';
    const doAfterPay = () => {
      wx.request({
        url: `${API_BASE}/api/recharge`,
        method: 'POST',
        header: { 'content-type': 'application/json' },
        data: { amount: 100, uid },
        success: () => {
          wx.showToast({ title: '充值成功', icon: 'success' });
          // 刷新余额
          this.onLoad();
        },
        fail: (err) => wx.showToast({ title: '上分失败', icon: 'none' })
      });
    };

    try {
      const cloud = require('@cloudbase/js-sdk');
      const payment = cloud.payment?.requestPayment;
      if (payment) {
        payment({
          timeStamp: String(Date.now()),
          nonceStr: 'nonce',
          package: 'prepay_id=xxx',
          signType: 'MD5',
          paySign: 'mocksign'
        }).then(doAfterPay).catch(() => wx.showToast({ title: '支付失败', icon: 'none' }));
        return;
      }
    } catch {}

    // 回退使用微信原生支付模拟
    if (wx.requestPayment) {
      wx.requestPayment({
        timeStamp: String(Date.now()),
        nonceStr: 'nonce',
        package: 'prepay_id=xxx',
        signType: 'MD5',
        paySign: 'mocksign',
        success: doAfterPay,
        fail: () => wx.showToast({ title: '支付失败', icon: 'none' })
      });
    } else {
      // 开发态：直接走后续上分
      doAfterPay();
    }
  }
});
