const app = getApp()
var conf = require("../../utils/conf")
var bill = require("../../utils/bill")
var color_mode_repay = '#07bb06'
var color_mode_pay = '#3879D9'
var tips_mode_repay = "还"
var tips_mode_pay = "刷"
Page({
        data: {
		summary : {
			count: 0,
			limit: 0,
			cost: 0,
			day: 0
		},
                cards: [],
		modecolor: color_mode_repay,
		modetips: tips_mode_repay
        },
	mode_repay() {
		var today = bill.someday()
		var cards = this.data.cards
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i]
			if (card.peroid == "repayment") {
				var repay = new Date(card.repay * 1000)
				if (repay.getTime() == card.peroidstop.getTime()) {
					var t = new Date(card.peroidstart.getTime())
					t.setMonth(t.getMonth() + 1)
					card.peroid = "billing"
					card.peroidstop = t
				} else {
					card.tips_str = "天后还款"
					card.tips_color = '#BA9F07'
				}
			}
			card.tips_num = (card.peroidstop - today) / 86400000
			if (card.peroid == "billing") {
				console.log(card)
				card.tips_str = "天后出帐"
				card.tips_color = '#07BB06'
			}
			var total = (card.peroidstop - card.peroidstart) / 86400000
			card.tips_progress = 100 - card.tips_num / total * 100
		}
		return function(a, b) {
			if (a.peroid == b.peroid) {
				if (a.tips_num > b.tips_num)
					return 1
				else if (a.tips_num < b.tips_num)
					return -1
				else
					return 0
			} else {
				return a.peroid == "repayment" ? -1 : 1
			}
		}
	},
	mode_pay() {
		var today = bill.someday()
		var cards = this.data.cards
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i]
			if (card.peroid == "billing") {
				card.proid = "repayment"
				card.peroidstop = new Date(card.peroidstart.getTime())
				card.peroidstop.setMonth(card.peroidstop.getMonth() + 1)
			} else {
				var t = new Date(card.peroidstop.getTime())
				t.setMonth(t.getMonth() + 1)
				card.peroidstop = t
			}
			var total = (card.peroidstop - card.peroidstart)/86400000
			card.tips_num = (card.peroidstop - today) / 86400000
			card.tips_str = "天后还款"
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
		var today = bill.someday()
		var summary = data.summary
		summary.day = today.getDate()
		summary.count = cards.length
		summary.limit = 0
		summary.cost = 0
		for (var i = 0; i < cards.length; i++) {
			var delta
			var card = cards[i]
			card.tail = card.num.toString().slice(-4)
			bill.typeof_peroid(card)
			data.summary.limit += card.limit
			data.summary.cost += card.cost
		}
		if (data.modecolor == color_mode_repay) {
			cmp = this.mode_repay()
		} else {
			cmp = this.mode_pay()
		}
		cards.sort(cmp)
		console.log("+++-", this.data.cards, data)
		for (var i = 0; i < cards.length; i++)
			cards[i].id = i
		this.setData(this.data)
		console.log("+++=", this.data.cards, data)
	},
	onShow() {
		console.log("show")
		var _this = this
		var HTTP = app.HTTP
		HTTP.get('/listcard').then((res) => {
			_this.data.cards = res
			for (var i = 0; i < res.length; i++) {
				var card = res[i]
				card.bank = conf.banks[conf.getfull(card.bank)].short
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
	}
})
