// miniprogram/app.js
// 集成 CloudBase Auth，通过 wx.login 进行微信登录，并设置全局用户信息。
import cloud from '@cloudbase/js-sdk'

App({
  onLaunch() {
    if (typeof wx === 'undefined') {
      console.log('wx is not defined in this environment — this file is for miniprogram runtime.');
      return;
    }

    const app = this;
    cloud.init({ env: process.env.CLOUDBASE_ENV_ID });
    /**
     * 触发微信登录并使用 CloudBase 进行鉴权。
     * 成功后跳转 AI 助手页面。
     */
    wx.login({
      success: (res) => {
        const auth = cloud.auth();
        auth.signInWechat({ code: res.code })
          .then((user) => {
            app.globalData = { ...(app.globalData || {}), userId: user?.uid };
            wx.navigateTo({ url: '/pages/ai-assistant/index' });
          })
          .catch(err => console.error('Auth error:', err));
      }
    });
  }
});
