// pages/me/me.js
var conf = require("../../utils/conf")
var app = getApp()
Page({
        data: {
                motto: 'Hello World',
                userInfo: {},
                hasUserInfo: false,
                canIUse: wx.canIUse('button.open-type.getUserInfo'),
		mailuser: "",
		mailpasswd: ""
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
		var HTTP = app.HTTP
		HTTP.post('/getmail')
		.then((res) => {
			_this.data.mailuser = res.user
			_this.data.mailpasswd = res.passwd
			_this.setData(_this.data)
			console.log(res)
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
			success() {
				_this.pullinfo()
			}
		})
        },
	cb_user(e) {
		this.data.mailuser = e.detail.value
		this.setData(this.data)
	},
	cb_passwd(e) {
		this.data.mailpasswd = e.detail.value
		this.setData(this.data)
	},
	cb_save(e) {
		console.log(e)
		var HTTP = app.HTTP
		HTTP.post('/setmail', {
			user: this.data.mailuser,
			passwd: this.data.mailpasswd
		}).then((res)=>{
			console.log(res)
		}).catch((err)=>{
			wx.showToast({
				title: "输入无效",
				icon: "none",
				duration: 1000
			})
			console.log(err)
		})
	}, 
	formSubmit(e) {
		var HTTP = app.HTTP
		HTTP.post('/monitor', {
			formid: e.detail.formId
		})
		console.log('form发生了submit事件，携带数据为：', e)
	},
})
