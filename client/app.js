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
		console.log(_this.HTTP, _this.SESSION)
		_this.HTTP.config.baseURL = 'http://192.168.2.118:9001'
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
						reject(err)
					}
				})
			})
		}
		_this.HTTP.interceptors.response.use((response, promise) => {
			wx.hideLoading()
			var HTTP = _this.HTTP
			return promise.resolve(response.data)
		}, (err) => {
			var HTTP = _this.HTTP
			var SESSION = _this.SESSION
			if (err.status == 498) {
				HTTP.lock()
				wx_login().then((res)=>{
					wx.showToast({
						title: '登录中',
					})
					var code = res.code
					return SESSION.post('/login', { code: code })
						.then((res) => {
							HTTP.unlock()
							wx.setStorageSync('session', res.data.session)
							_this.globalData.session = res.data.session
							console.log(_this.globalData, err.request)
							return HTTP.request(err.request)
						}).catch(()=>{
							HTTP.unlock()
						})
				}).catch((err)=>{
					console.log("XXX", err)
				})
			}
		})
        },
        globalData: {
		session: 0
        }
})
