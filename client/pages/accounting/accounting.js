// pages/accounting/accounting.js
var app = getApp()
Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		card_index: [0],
		cards: [],
		accounting_cards: [],
		money: 333
	},
	save_card() {
		var nums = []
		var cards = this.data.accounting_cards
		for (var i = 0; i < cards.length; i++)
			nums.push(cards[i].num)
		wx.setStorageSync("accounting_cards", nums)
	},
	save_money() {
		console.log(this.data.money)
		wx.setStorageSync("money", this.data.money)
	},
	restore_card() {
		var nums = wx.getStorageSync('accounting_cards')
		if (nums == "")
			nums = []
		var pool = this.data.cards
		var cards = []
		for (var i = 0; i < nums.length; i++) {
			var num = nums[i]
			for (var j = 0; j < pool.length; j++) {
				if (pool[j].num == num) {
					cards.push(pool[j])
					break
				}
			}
		}
		this.data.accounting_cards = cards
	},
	restore_money() {
		this.data.money = wx.getStorageSync("money")
	},
	onLoad: function (options) {
		var dat = options.param
		var cards = JSON.parse(dat)
		this.data.cards = cards
		for (var i = 0; i < cards.length; i++) {
                        var card = cards[i]
			card.billed = card.billed.toFixed(2)
                        card.billing = card.billing.toFixed(2)
                }
		this.restore_card()
		this.restore_money()
		this.setData(this.data)
	},
	cb_add(e) {
		var data = this.data
		var idx = this.data.card_index[0]
		var card = this.data.cards[idx]
		var accounting_cards = data.accounting_cards
		for (var i = 0; i < accounting_cards.length; i++) {
			if (card == accounting_cards[i])
				return
		}
		accounting_cards.push(card)
		console.log(accounting_cards)
		this.save_card()
		this.setData(data)
	},
	cb_del(e) {
		var cards = this.data.accounting_cards
		cards.splice(e.currentTarget.dataset.index, 1)
		this.save_card()
		this.setData(this.data)
	},
	cb_money(e) {
		this.data.money = e.detail.value
		console.log(e, this.data.money)
	},
	cb_card(e) {
		this.data.card_index = e.detail.value
		console.log(this.data.card_index)
	},
	cb_accounting(e) {
		console.log(this.data.money)
		var cards = this.data.accounting_cards
		this.save_money()
		var pending = cards.length
		wx.showToast({
			title: '记账中',
		})
		var HTTP = app.HTTP
		var money = parseFloat(this.data.money)
		for (var i = 0; i < cards.length; i++) {
                        var data = cards[i]
			data.billing = parseFloat(data.billing) + money
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
				if (--pending <= 0) {
					wx.hideToast()
					wx.navigateBack({
						delta: 1,
					})
				}
			})
		}
	},
})