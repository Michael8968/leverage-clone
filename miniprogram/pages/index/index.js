const API_BASE = 'http://localhost:3000';
const app = getApp();

Page({
  data: { prompt: '', response: '' },
  onLoad(){
    if (!app.globalData || !app.globalData.userId) {
      wx.login();
    }
  },
  onPromptInput(e){ this.setData({ prompt: e.detail.value }) },
  /**
   * 发送提示词到后端
   * @returns {void}
   */
  onPromptSend(){
    const userId = app.globalData?.userId || 'test1';
    wx.request({
      url: `${API_BASE}/api/executePrompt`,
      method: 'POST',
      data: { prompt: this.data.prompt, userId },
      header: { 'content-type': 'application/json' },
      success: (res) => {
        this.setData({ response: res.data?.output || '' });
      },
      fail: (err) => {
        console.error('request fail', err);
        wx.showToast({ title: '请求失败', icon: 'none' });
      }
    })
  }
})
