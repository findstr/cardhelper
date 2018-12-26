//app.js
var conf = require ("utils/conf")
var Fly = require("utils/fly")
App({
	HTTP: null,
	SESSION: null,
        onLaunch: function () {
		var _this = this
		_this.globalData.session = wx.getStorageSync('session') || 0
		_this.HTTP = new Fly()
		_this.SESSION = new Fly()
		_this.HTTP.config.baseURL = conf.server
		_this.HTTP.config.headers = {
			'content-type': 'application/json',
			'parseJson': true
		}
		_this.SESSION.config.baseURL = _this.HTTP.config.baseURL
		_this.SESSION.config.headers = _this.HTTP.config.headers
		_this.HTTP.interceptors.request.use((request) => {
			wx.showLoading({
				title: '加载中',
			})
			console.log(_this.globalData)
			request.headers['session'] = _this.globalData.session
			return request
		})
		const wx_login = () => {
			return new Promise((resolve, reject) => {
				wx.login({
					success(res) {
						resolve(res)
					},
					fail(res) {
						reject(res)
					}
				})
			})
		}
		_this.HTTP.interceptors.response.use((response, promise) => {
			console.log(response)
			wx.hideLoading()
			var HTTP = _this.HTTP
			return response.data
		}, ((err, promise) => {
			var HTTP = _this.HTTP
			var SESSION = _this.SESSION
			if (err.status == 498) {
				HTTP.lock()
				wx.showToast({
					title: '登录中',
				})
				return wx_login().then((res) => {
					var code = res.code
					return SESSION.post('/login', { code: code })
						.then((res) => {
							wx.setStorageSync('session', res.data.session)
							_this.globalData.session = res.data.session
							console.log(_this.globalData, err.request)
							console.log("+++", err.request)
							var ret = HTTP.request(err.request)
							HTTP.unlock()
							return ret
						})
				})
			}
		}))
        },
        globalData: {
		session: 0
        }
})
