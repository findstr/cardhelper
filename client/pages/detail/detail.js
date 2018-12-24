// pages/detail/detail.js
var app = getApp()
var conf = require("../../utils/conf")
Page({
	data: {},
	refresh() {
		this.data.bill_value = [this.data.billingday - 1]
		this.data.repay_value = [this.data.repaymentdate - 1]
		console.log("refresh", this.data)
		this.setData(this.data)
	},
	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		var _this = this
		_this.data = JSON.parse(options.param)
		var days = []
		for (var i = 0; i < 31; i++)
			days[i] = i + 1
		_this.data.billingday = _this.data.billingday || 1
		_this.data.repaymentdate = _this.data.repaymentdate || 1
		_this.data.days = days
		_this.setData(_this.data)
		_this.refresh()
	},
	bank_change(e) {
		this.data.bank = e.detail.value
		this.refresh()
	},
	num_change(e) {
		this.data.num = e.detail.value
		this.refresh()
	},
	limit_change(e) {
		this.data.limit = e.detail.value
		this.refresh()
	},
	cost_change(e) {
		this.data.cost = e.detail.value
		this.refresh()
	},
	billingday_change(e) {
		this.data.billingday = e.detail.value[0] + 1
		this.refresh()
	},
	repaymentdate_change(e) {
		this.data.repaymentdate = e.detail.value[0] + 1
		this.refresh()
	},
	cb_save() {
		var HTTP = app.HTTP
		console.log(this.data.bank, this.data.limit, this.data.cost, this.data.billingday, this.data.repaymentdate)
		var data = this.data
		HTTP.post('/addcard', {
			session: app.globalData.session,
			bank: data.bank,
			num: parseInt(data.num),
			limit: parseInt(data.limit),
			cost: parseInt(data.cost),
			billingday: parseInt(data.billingday),
			repaymentdate: parseInt(data.repaymentdate)
		}).then((res) => {
			wx.navigateBack({
				delta: 1,
			})
		})
	},
	cb_delete() {
		var data = this.data
		var HTTP = app.HTTP
		HTTP.post('/delcard', {
			num: parseInt(data.num)
		}).then((res)=>{
			wx.navigateBack({
				delta: 1,
			})
		})
	}
})
