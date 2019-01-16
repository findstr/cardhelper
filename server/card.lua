local core = require "sys.core"
local dispatch = require "router"
local server = require "http.server"
local client = require "http.client"
local helper = require "http.helper"
local zproto = require "zproto"
local json = require "sys.json"
local auth = require "auth"
local mail = require "mail"
local db = require "db".get()
local write = server.write
local format = string.format
local tostring = tostring
local proto, err = zproto:parse [[
card {
	.bank:string 1
	.num:integer 2
	.limit:float 3
	.billday:integer 4
	.repayday:integer 5
	.billed:float 6
	.billing:float 7
	.bill_type:integer 9
	.bill_start:integer 10
	.bill_stop:integer 11
	.repay_date:integer 12
	.billing_date:integer 13
	.notify:integer 14
}
]]

assert(proto, err)

local M = {}
local dbk_card = "card:%s"
local dbk_expire = "card:expire"

local function nextmonth(t)
	t.month = t.month + 1
	if t.month > 12 then
		t.year = t.year + t.month // 12
		t.month = t.month % 12
	end
	return t
end

local function prevmonth(t)
	if t.month <= 1 then
		t.month = 12
		t.year = t.year - 1
	else
		t.month = t.month - 1
	end
	return t
end

local function someday(day)
	local t = os.date("*t")
	if day then
		t.day = day
	end
	t.wday = nil
	t.hour = 0
	t.min = 0
	t.sec = 0
	return t
end

local function diff(t2, t1)
	t1 = os.time(t1)
	t2 = os.time(t2)
	return t2 - t1
end

local TYPE_BILL = 1
local TYPE_REPAY = 2

local function typeof_bill(card)
	local today = someday()
	if card.billday < card.repayday then --same month
		local bill_date = someday(card.billday)
		local repay_date = someday(card.repayday)
		if (diff(today, bill_date) >= 0 and diff(today, repay_date) < 0) then
			card.bill_type = TYPE_REPAY
			card.bill_start = os.time(bill_date)
			card.bill_stop = os.time(repay_date)
		else
			card.bill_type = TYPE_BILL
			if diff(today, repay_date) > 0 then
				bill_date = nextmonth(bill_date)
			else
				repay_date = prevmonth(repay_date)
			end
			card.bill_start = os.time(repay_date)
			card.bill_stop = os.time(bill_date)
		end
	else
		--cross month, so bill day at this month,
		--and repay dat at next month
		local month = today.month
		local last_bill_date = someday(card.billday)
		local repay_date = someday(card.repayday)
		local bill_date = someday(card.billday)
		local next_repay_date = someday(card.repayday)
		last_bill_date = prevmonth(last_bill_date)
		next_repay_date = nextmonth(next_repay_date)
		if diff(today, last_bill_date) >= 0 and diff(today, repay_date) < 0 then
			card.bill_type = TYPE_REPAY
			card.bill_start = os.time(last_bill_date)
			card.bill_stop = os.time(repay_date)
		elseif diff(toady, bill_date) >= 0 and diff(today, next_repay_date) < 0 then
			card.bill_type = TYPE_REPAY
			card.bill_start = os.time(bill_date)
			card.bill_stop = os.time(next_repay_date)
		else
			card.bill_type = TYPE_BILL
			card.bill_start = os.time(prevmonth(repay_date))
			card.bill_stop = os.time(bill_date)
		end
	end
end

local function nextbilldate(card)
	local date
	if card.bill_type == TYPE_BILL then
		date = card.bill_stop
	elseif card.bill_type == TYPE_REPAY then
		date = os.date("*t", card.bill_start)
		date = nextmonth(date)
		date = os.time(date)
	else
		date = 0
	end
	return date
end

local function checkbill(card)
	local today = os.time(someday())
	local last = nextbilldate(card)
	if not card.bill_stop or today > card.bill_stop  then
		typeof_bill(card)
		if card.repay_date ~= card.bill_stop then
			card.repay_date = 0 --reset repay status
		end
	end
	local nxt = nextbilldate(card)
	local prev = os.time(prevmonth(os.date("*t", nxt)))
	local billing_date = card.billing_date or 0
	card.billing_date = nxt
	if nxt ~= last then
		if today > billing_date then
			card.billed = card.billing
			card.billing = 0
		end
		card.notify = nil
		return true
	end
	return false
end

dispatch["/addcard"] = function(fd, req, body)
	local openid = req.openid
	local dbk = format(dbk_card, req.openid)
	local ok, obj = db:hget(dbk, body.num)
	if obj then
		obj = proto:decode("card", obj)
		if obj.repayday == body.repayday and obj.billday == body.billday then
			body.bill_type = obj.bill_type
			body.bill_start = obj.bill_start
			body.bill_stop = obj.bill_stop
		end
	end
	checkbill(body)
	assert(body.bill_type)
	local _, score = db:zscore(dbk_expire, openid)
	if not score or tonumber(score) > body.bill_stop then
		db:zadd(dbk_expire, body.bill_stop, openid)
	end
	local dat = proto:encode("card", body)
	db:hset(dbk, body.num, dat)
	write(fd, 200)
end

dispatch["/delcard"] = function(fd, req, body)
	db:hdel(format(dbk_card, req.openid), body.num, dat)
	write(fd, 200)
end

dispatch["/listcard"] = function(fd, req, body)
	local dbk = format(dbk_card, req.openid)
	local ok, list = db:hgetall(dbk)
	local ack = {}
	for i = 1, #list, 2 do
		local v = list[i+1]
		local obj = proto:decode("card", v)
		if checkbill(obj, dbk) then
			local dat = proto:encode("card", obj)
			db:hset(dbk, obj.num, dat)
		end
		ack[#ack + 1] = obj
	end
	write(fd, 200, nil, json.encode(ack))
end

local function tryfetchmail(openid, cardlist, strbuf)
	local mlist = mail.pull(openid)
	if not mlist or #mlist == 0 then
		core.log("tryfetchmail check empty", openid)
		return false
	end
	core.log("tryfetchmail process", openid, #mlist)
	local effect = 0
	local num_to_card = {}
	local bank_to_card = {}
	for _, card in pairs(cardlist) do
		core.log("card", json.encode(card))
		card._start_date = os.date("*t", card.bill_start)
		num_to_card[card.num] = card
		bank_to_card[card.bank] = card
	end
	for _, mail in pairs(mlist) do
		local card
		local num = mail.num
		if num then
			card = num_to_card[num]
		else
			card = bank_to_card[mail.bank]
		end
		local n = effect
		if card then
			local date = card._start_date
			if date.year == mail.year and date.month == mail.month then
				card.billed = mail.cost
				if mail.limit then
					card.limit = mail.limit
				end
				card._dirty = true
				effect = effect + 1
				core.log("mail effect:", openid, json.encode(mail))
			end
		end
		if n == effect then
			core.log("mail skip:", openid, json.encode(mail))
		end
	end
	if effect > 0 then
		strbuf[#strbuf + 1] = format("从邮箱更新了%s个帐单", effect)
	end
end

local function timer_user(openid)
	local today = someday()
	local now = os.time(today)
	local dbk = format(dbk_card, openid)
	local _, list = db:hgetall(dbk)
	local j = 1
	local cards = {}
	for i = 1, #list, 2 do
		local v = list[i+1]
		local card = proto:decode("card", v)
		card._dirty = checkbill(card)
		cards[j] = card
		j = j + 1
	end
	local bill_count = 0
	local repay_count = 0
	local future8 = now + 8 * 24 * 3600
	table.sort(cards, function(a, b)
		return a.bill_stop < b.bill_stop
	end)
	db:zadd(dbk_expire, openid, future8)
	for _, card in pairs(cards) do
		if card.bill_stop > future8 then
			break
		end
		local bill_type = card.bill_type
		if bill_type ~= card.notify then
			card.notify = bill_type
			if bill_type == TYPE_BILL then
				bill_count = bill_count + 1
			elseif card.repay_date == 0 then
				repay_count = repay_count + 1
			end
			card._dirty = true
		end
	end
	local strbuf = {}
	if repay_count > 0 or bill_count > 0 then
		strbuf[1] = "未来8天内"
	end
	if repay_count ~= 0 then
		strbuf[#strbuf + 1] = format("%s个信用卡待还清", repay_count)
	end
	if bill_count ~= 0 then
		strbuf[#strbuf + 1] = format("%s个信用卡待出账", bill_count)
	end
	tryfetchmail(openid, cards, strbuf)
	core.log("timer", os.date("%Y-%m-%d", now), openid, bill_count, repay_count, #strbuf)
	for _, card in pairs(cards) do
		if card._dirty then
			local dat = proto:encode("card", card)
			db:hset(dbk, card.num, dat)
		end
	end
	if #strbuf > 0 then
		auth.notify(openid, table.concat(strbuf, ","))
	end
end

local function timer_logic()
	local now = core.now() - 8 * 24 *3600
	local now = "+inf"
	local ok, list = db:zrangebyscore(dbk_expire, 0, now)
	core.log("timer_logic", ok, list, dbk_expire)
	for _, openid in pairs(list) do
		timer_user(openid)
	end
end

local function timer()
	local ok, err = core.pcall(timer_logic)
	if not ok then
		core.log(err)
	end
	core.timeout(60000, timer)
end

core.start(timer)


