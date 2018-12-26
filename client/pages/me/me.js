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
		var HTTP = app.HTTP
		wx.getUserInfo({
			success(res) {
				HTTP.post('/userinfo', {
					iv: res.iv,
					data: res.encryptedData,
				}).then((res)=> {
					console.log(res)
					_this.data.hasUserInfo = true
					_this.data.userInfo.avatarUrl = res.avatarUrl
					_this.data.userInfo.nickName = res.nickName
					_this.setData(_this.data)
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
