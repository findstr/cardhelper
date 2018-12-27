// pages/detail/detail.js
var app = getApp()
var conf = require("../../utils/conf")
Page({
	data: {},
	refresh() {
		var data = this.data
		data.bill_value = [data.billingday - 1]
		data.repay_value = [data.repaymentdate - 1]
		console.log("refresh", data)
		this.setData(data)
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
		_this.data.banks = conf.banks
		var idx = conf.getshort(_this.data.bankshort)
		var info = conf.banks[idx]
		_this.data.bank_value = [idx]
		_this.data.background = info.color
		_this.data.repaid = _this.data.repay != 0
		_this.data.peroidstart = new Date(_this.data.peroidstart)
		_this.data.peroidstop = new Date(_this.data.peroidstop)
		console.log("OnLoad", _this.data.bank_value, _this.data.peroidstart.getDate())
		_this.setData(_this.data)
		_this.refresh()
	},
	bank_change(e) {
		var data = this.data
		var idx = e.detail.value[0]
		console.log(data.banks)
		data.bank_value = [idx]
		data.bank = data.banks[idx].full
		data.background = data.banks[idx].color
		console.log("change", this.data.bank_value, this.data.bank)
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
			bank: data.bank,
			num: parseInt(data.num),
			limit: parseFloat(data.limit),
			cost: parseFloat(data.cost),
			billingday: parseInt(data.billingday),
			repaymentdate: parseInt(data.repaymentdate),
			repay: data.repay
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
	},
	cb_repay() {
		var data = this.data
		data.cost = 0
		data.repay = data.peroidstop.getTime() / 1000
		this.cb_save()
	},
	cb_bill() {
		this.data.repay = 0
		this.cb_save()
	},
})
