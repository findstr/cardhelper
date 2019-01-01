module.exports = {
       	server: 'https://cardhelper.weixin.gotocoding.com',
	//server: 'http://192.168.2.118:9001',
	banks: [
		{ full: '中国银行', short: '中行', color: "white"},
		{ full: '建设银行', short: '建行', color: "white"},
		{ full: '工商银行', short: '工行', color: "white"},
		{ full: '交通银行', short: '交行', color: "white"},
		{ full: '招商银行', short: '招行', color: "white"},
		{ full: '浦发银行', short: '浦发', color: "white"},
		{ full: '广发银行', short: '广发', color: "white"}
	],
	TYPE_BILL: 1,
	TYPE_REPAY: 2,
	getshort(name) {
		var banks = this.banks
		for (var i = 0; i < banks.length; i++) {
			if (name == banks[i].short) {
				return i
			}
		}
		return 0
	},
	getfull(name) {
		var banks = this.banks
		for (var i = 0; i < banks.length; i++) {
			if (name == banks[i].full) {
				return i
			}
		}
		return 0
	},
	someday(day) {
		var today = new Date();
		if (day != undefined && day != 0)
			today.setDate(day)
		today.setHours(0)
		today.setMinutes(0)
		today.setSeconds(0)
		today.setMilliseconds(0)
		return today
	}
}
