const app = getApp()
var conf = require("../../utils/conf")
var color_mode_repay = 'red'
var color_mode_pay = 'green'
var tips_mode_repay = "还"
var tips_mode_pay = "刷"
Page({
    data: {
        summary : {
          count: 0,
          limit: 0,
          billed: 0,
          billing: 0,
          day: 0
        },
        cards: [],
		modecolor: color_mode_repay,
		modetips: tips_mode_repay
        },
	mode_repay() {
		var today = conf.someday()
		var cards = this.data.cards
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i]
			if (card.bill_type == conf.TYPE_REPAY) {
				var repay = new Date(card.repay_date * 1000)
				if (repay.getTime() == card.bill_stop.getTime()) {
					var t = new Date(card.bill_start.getTime())
					t.setMonth(t.getMonth() + 1)
					card.bill_type = conf.TYPE_BILL
					card.bill_stop = t
				} else {
					card.tips_str = "天后还款"
					card.tips_color = 'bg-yellow'
				}
			}
			card.tips_num = (card.bill_stop - today) / 86400000
			if (card.bill_type == conf.TYPE_BILL) {
				console.log(card)
				card.tips_str = "天后出帐"
				card.tips_color = 'bg-green'
			}
			var total = 31
			card.tips_progress = 100 - card.tips_num / total * 100
		}
		return function(a, b) {
			if (a.bill_type == b.bill_type) {
				if (a.tips_num > b.tips_num)
					return 1
				else if (a.tips_num < b.tips_num)
					return -1
				else
					return 0
			} else {
				return a.bill_type == conf.TYPE_REPAY ? -1 : 1
			}
		}
	},
	mode_pay() {
		var today = conf.someday()
		var cards = this.data.cards
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i]
			var bill_start = card.bill_start
			var bill_stop = card.bill_stop
			if (card.bill_type == conf.TYPE_REPAY) {
				bill_stop = new Date(bill_start.getTime())
				bill_stop.setMonth(bill_stop.getMonth() + 1)
			}
			var total = 31
			card.tips_num = (bill_stop - today) / 86400000
			card.tips_str = "天后出帐"
			card.tips_color = this.data.modecolor
			card.tips_progress = 100 - card.tips_num / total * 100
		}
		return function (a, b) {
			if (a.tips_num < b.tips_num)
				return 1
			else if (a.tips_num > b.tips_num)
				return -1
			else
				return 0
		}
	},
	refresh() {
		var cmp
		var data = this.data
		var cards = data.cards;
		var today = conf.someday()
		var summary = data.summary
		summary.day = today.getDate()
		summary.count = cards.length
		summary.limit = 0
		summary.billed = 0
                summary.billing = 0
		for (var i = 0; i < cards.length; i++) {
			var delta
			var card = cards[i]
			card.tail = ("0000" + card.num.toString()).slice(-4)
			console.log(card.bill_start, card.bill_stop)
                        card.billing = card.billing || 0
			card.billed_str = card.billed.toFixed(2)
                        card.billing_str = card.billing.toFixed(2)
			data.summary.limit += card.limit
			data.summary.billed += card.billed
                        data.summary.billing += card.billing
		}
		data.summary.billed = data.summary.billed.toFixed(2)
                data.summary.billing = data.summary.billing.toFixed(2)
		if (data.modecolor == color_mode_repay) {
			cmp = this.mode_repay()
		} else {
			cmp = this.mode_pay()
		}
		cards.sort(cmp)
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i]
			var t = card.bill_stop
			card.id = i
			card.tips_date = t.getFullYear() + "-" + (t.getMonth() + 1) + '-' + t.getDate()
		}
		this.setData(this.data)
	},
	onShow() {
		console.log("show")
		var _this = this
		var HTTP = app.HTTP
		HTTP.get('/listcard').then((res) => {
			_this.data.cards = res
			for (var i = 0; i < res.length; i++) {
				var card = res[i]
				console.log(card.bank)
				var idx = conf.getfull(card.bank)
				var info = conf.banks[idx]
				card.bankshort = info.short
				card.background = info.color
				console.log(card)
				card.bill_start = new Date(card.bill_start * 1000)
				card.bill_stop = new Date(card.bill_stop * 1000)
				console.log(card.bill_start, card.bill_stop)
			}
			_this.refresh()
		}).catch((err)=>{
			console.log(err)
		})
	},
	cb_detail(event) {
		var card = this.data.cards[event.currentTarget.dataset.id] || {}
		wx.navigateTo({
			url: '../detail/detail?param=' + JSON.stringify(card)
		})
	},
	cb_mode(event) {
		console.log("____", this.data.cards)
		if (this.data.modecolor == color_mode_pay) {
			this.data.modecolor = color_mode_repay
			this.data.modetips = tips_mode_repay
		} else {
			this.data.modecolor = color_mode_pay
			this.data.modetips = tips_mode_pay
		}
		this.refresh()
	},
	cb_accounting() {
		wx.navigateTo({
			url: '../accounting/accounting?param=' + JSON.stringify(this.data.cards)
		})
	},
	formSubmit(e) {
		var HTTP = app.HTTP
		HTTP.post('/monitor', {
			formid:e.detail.formId
		})
		console.log('form发生了submit事件，携带数据为：', e)
	},
})
