const app = getApp()
var conf = require("../../utils/conf")
Page({
        data: {
		summary : {
			count: 0,
			limit: 0,
			cost: 0,
			day: 0
		},
                cards: []
        },
	judge(card, today, x, y, tx, ty) {
		var delta
		if (today < x) {
			card.type = tx
			card.tips_num = (x - today) / 86400000
			delta = (y.setMonth(y.getMonth() - 1) - x) / 86400000
		} else if (today >= x && today < y) {
			card.type = ty
			card.tips_num = (y - today) / 86400000
			delta = (y - x) / 86400000
		} else if (today >= y) {
			card.type = tx
			card.tips_num = (x.setMonth(x.getMonth() + 1) - today) / 86400000
			delta = (x - y) / 86400000
		} else {
			console.log("today", today)
		}
		return delta
	},
	refresh(cards) {
		console.log(cards)
		var _this = this
		_this.data.cards = cards
		var cards = _this.data.cards;
		var today = new Date();
		today.setDate(20)
		today.setHours(0)
		today.setMinutes(0)
		today.setSeconds(0)
		today.setMilliseconds(0)
		_this.data.summary.day = today.getDate()
		_this.data.summary.count = cards.length
		_this.data.summary.limit = 0
		_this.data.summary.cost = 0
		for (var i = 0; i < cards.length; i++) {
			var delta
			var card = cards[i]
			cards[i].tail = card.num.toString().slice(-4)
			var bill = new Date()
			bill.setDate(card.billingday)
			bill.setHours(0)
			bill.setMinutes(0)
			bill.setSeconds(0)
			bill.setMilliseconds(0)
			var repay = new Date()
			repay.setDate(card.repaymentdate)
			repay.setHours(0)
			repay.setMinutes(0)
			repay.setSeconds(0)
			repay.setMilliseconds(0)
			if (bill < repay) {
				delta = this.judge(card, today, bill, repay, "billing", "repaying")
			} else {
				delta = this.judge(card, today, repay, bill, "repaying", "billing")
			}
			if (card.type == "billing") {
				card.tips_str = "天后出帐"
				card.tips_color = '#07BB06FF'
			} else {
				card.tips_str = "天后还款"
				card.tips_color = '#BA9F07FF'
			}
			card.tips_progress = 100 - card.tips_num / 30 * 100
			_this.data.summary.limit += card.limit
			_this.data.summary.cost += card.cost
		}
		cards.sort(function(a, b) {
			if (a.type == b.type) {
				if (a.tips_num > b.tips_num)
					return 1
				else if (a.tips_num < b.tips_num)
					return -1
				else
					return 0
			} else {
				return a.type == "repaying" ? -1 : 1
			}
		})
		for (var i = 0; i < cards.length; i++)
			cards[i].id = i
		_this.setData(_this.data)
	},
	onShow() {
		var _this = this
		var HTTP = app.HTTP
		console.log(HTTP)
		HTTP.get('/listcard').then((res) => {
			console.log(res)
			_this.refresh(res)
		}).catch((err)=>{
			console.log(err)
		})
	},
	cb_detail(event) {
		var card = this.data.cards[event.currentTarget.dataset.id] || {}
		wx.navigateTo({
			url: '../detail/detail?param=' + JSON.stringify(card)
		})
	}
})
