const API_BASE = 'http://localhost:3000';
const app = getApp();

Page({
  data: { demands: [] },
  onLoad(){
    wx.request({
      url: `${API_BASE}/api/demands`,
      method: 'GET',
      data: { type: 'public' },
      success: (res) => {
        this.setData({ demands: res.data });
      },
      fail: (err) => {
        console.error('加载失败', err);
      }
    });
  },
  publishDemand(){
    const requesterId = app.globalData?.userId || 'test1';
    wx.request({
      url: `${API_BASE}/api/createDemand`,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { title: '测试', requesterId },
      success: (res) => {
        wx.showToast({ title: '发布成功', icon: 'success' });
        // 重新加载
        this.onLoad();
      },
      fail: (err) => {
        console.error('发布失败', err);
        wx.showToast({ title: '发布失败', icon: 'none' });
      }
    });
  }
})
