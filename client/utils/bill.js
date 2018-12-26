function someday(day) {
	var today = new Date();
	if (day != undefined && day != 0)
		today.setDate(day)
	today.setHours(0)
	today.setMinutes(0)
	today.setSeconds(0)
	today.setMilliseconds(0)
	return today
}

function typeof_peroid(card) {
	var list = []
	var today = someday()
	var month = today.getMonth()
	if (card.billingday < card.repaymentdate) { //same month
		var bill = someday(card.billingday)
		var repay = someday(card.repaymentdate)
		if (today >= bill && today < repay) {
			card.peroid = "repayment"
			card.peroidstart = bill
			card.peroidstop = repay
		} else {
			card.peroid = "billing"
			if (today > repay) {
				bill.setMonth(month+1)
			} else {
				repay.setMonth(month-1)
			}
			card.peroidstart = repay
			card.peroidstop = bill2
		}
	} else { //cross month, so bill day at this month, and repay day at next month
		var month = today.getMonth()
		var last_bill = someday(card.billingday)
		var repay = someday(card.repaymentdate)
		var bill = someday(card.billingday)
		var next_repay = someday(card.repaymentdate)
		last_bill.setMonth(month-1)
		next_repay.setMonth(month+1)
		if (today >= last_bill && today < repay) {
			card.peroid = "repayment"
			card.perodstart = last_bill
			card.peroidstop = repay
		} else if (today >= bill && today < next_repay) {
			card.peroid = "repayment"
			card.peroidstart = bill
			card.peroidstop = next_repay
		} else {
			var bill2 = someday(card.billingday)
			card.peroid = "billing"
			if (today < bill) {
				bill.setMonth(month-1)
			} else {
				bill2.setMonth(month+1)
			}
			card.peroidstart = bill
			card.peroidstop = bill2
		}
	}
}

module.exports = {
	typeof_peroid: typeof_peroid,
	someday: someday
}
