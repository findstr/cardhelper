// pages/detail/detail.js
var app = getApp()
var conf = require("../../utils/conf")
Page({
	data: {},
	refresh() {
		var data = this.data
		data.bill_value = data.billday - 1
		data.repay_value = data.repayday - 1
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
		_this.data.billday = _this.data.billday || 1
		_this.data.repayday = _this.data.repayday || 1
		_this.data.days = days
		_this.data.banks = []
		for (var i = 0; i < conf.banks.length; i++)
			_this.data.banks.push(conf.banks[i].full)
		var idx = conf.getshort(_this.data.bankshort)
		var info = conf.banks[idx]
		_this.data.bank_value = idx
		_this.data.background = info.color
                _this.data.billing = _this.data.billing || 0
                _this.data.billed = _this.data.billed || 0
                _this.data.billing = _this.data.billing.toFixed(2)
                _this.data.billed = _this.data.billed.toFixed(2)
		_this.data.bill_start = new Date(_this.data.bill_start)
		_this.data.bill_stop = new Date(_this.data.bill_stop)
		_this.data.repaid = _this.data.repay_date != 0
		_this.setData(_this.data)
		_this.refresh()
	},
	bank_change(e) {
		var data = this.data
		var idx = e.detail.value[0]
		console.log(data.banks)
		data.bank_value = idx
		data.bank = conf.banks[idx].full
		data.background = conf.banks[idx].color
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
	billed_change(e) {
                this.data.billed = e.detail.value
                this.refresh()
	},
        billing_change(e) {
                this.data.billing = e.detail.value
                this.refresh()
        },
	billday_change(e) {
		this.data.billday = e.detail.value[0] + 1
		this.refresh()
	},
	repayday_change(e) {
		this.data.repayday = e.detail.value[0] + 1
		this.refresh()
	},
	cb_save() {
		var HTTP = app.HTTP
		console.log(this.data.bank, this.data.limit, this.data.billed, this.data.billday, this.data.repayday)
		var data = this.data
                if (data.billing == "")
                        data.billing = "0"
                if (data.billed == "")
                        data.billed = "0"
                console.log(parseFloat(data.billing))
		HTTP.post('/addcard', {
			bank: data.bank,
			num: parseInt(data.num),
			limit: parseFloat(data.limit),
			billed: parseFloat(data.billed),
                        billing: parseFloat(data.billing),
			billday: parseInt(data.billday),
			repayday: parseInt(data.repayday),
			repay_date: data.repay_date
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
		data.billed = 0
		data.repay_date = data.bill_stop.getTime() / 1000
		this.cb_save()
	},
	cb_bill() {
		this.data.repay_date = 0
		this.cb_save()
	},
})
