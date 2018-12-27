module.exports = {
       	server: 'https://cardhelper.weixin.gotocoding.com',
	//server: 'http://192.168.2.118:9001',
	banks: [
		{ full: '中国银行', short: '中行', color: "orange"},
		{ full: '建设银行', short: '建行', color: "blue"},
		{ full: '工商银行', short: '工行', color: "purple"},
		{ full: '交通银行', short: '交行', color: "mauve"},
		{ full: '招商银行', short: '招行', color: "pink"},
		{ full: '浦发银行', short: '浦发', color: "brown"},
		{ full: '广发银行', short: '广发', color: "red"}
	],
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
	}
}
