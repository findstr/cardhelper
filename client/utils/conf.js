module.exports = {
        server: 'https://cardhelper.weixin.gotocoding.com',
	banks: [
		{ full: '中国银行', short: '中行' },
		{ full: '建设银行', short: '建行' },
		{ full: '工商银行', short: '工行' },
		{ full: '交通银行', short: '交行' },
		{ full: '招商银行', short: '招行' },
		{ full: '浦发银行', short: '浦发' },
		{ full: '广发银行', short: '广发' }
	],
	getshort(name) {
		var banks = this.banks
		for (var i = 0; i < banks.length; i++) {
			if (name == banks[i].short) {
				return i
			}
		}
		return -1
	},
	getfull(name) {
		var banks = this.banks
		for (var i = 0; i < banks.length; i++) {
			if (name == banks[i].full) {
				return i
			}
		}
		return -1
	}
}