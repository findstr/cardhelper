// pages/me/me.js
var conf = require("../../utils/conf")
var app = getApp()
Page({
        data: {
                motto: 'Hello World',
                userInfo: {},
                hasUserInfo: false,
                canIUse: wx.canIUse('button.open-type.getUserInfo')
        },
	pullinfo() {
		var _this = this
		wx.getUserInfo({
			success(res) {
				wx.request({
					url: conf.server + "/userinfo",
					data: {
						iv: res.iv,
						data: res.encryptedData,
						session: app.globalData.session
					},
					method: 'POST',
					success(res) {
						console.log(res)
						_this.data.hasUserInfo = true
						_this.data.userInfo.avatarUrl = res.data.avatarUrl
						_this.data.userInfo.nickName = res.data.nickName
						_this.setData(_this.data)
					}
				})
			}
		})
	},
	onLoad: function () {
		var _this = this
		wx.getSetting({
			success(res) {
				if (res.authSetting['scope.userInfo']) {
					_this.getUserInfo()	
				}
			}
		})
	},
        getUserInfo() {
		var _this = this
		wx.checkSession({
			fail() {
				app.login(function (){
					_this.pullinfo()
				 })
			},
			success() {
				_this.pullinfo()
			}
		})
        }
})