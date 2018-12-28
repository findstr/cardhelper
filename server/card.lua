local core = require "sys.core"
local dispatch = require "router"
local server = require "http.server"
local client = require "http.client"
local helper = require "http.helper"
local crypt = require "sys.crypt"
local zproto = require "zproto"
local json = require "sys.json"
local auth = require "auth"
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
	.bill_month:integer 8
	.bill_type:integer 9
	.bill_start:integer 10
	.bill_stop:integer 11
	.repay_date:integer 12
	.billing_date:integer 13
}
]]

assert(proto, err)

local M = {}
local dbk_card = "card:%s"

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
	local today = someday()
	local last = nextbilldate(card)
	if card.bill_month ~= today.month then
		card.bill_month = today.month
		typeof_bill(card)
	end
	local nxt = nextbilldate(card)
	local prev = os.time(prevmonth(os.date("*t", nxt)))
	local billing_date = card.billing_date
	card.billing_date = nxt
	if nxt ~= last then
		if billing_date and prev == billing_date then
			card.billed = card.billing
		else
			card.billed = 0
		end
		card.billing = 0
		return true
	end
	return false
end

dispatch["/addcard"] = function(fd, req, body)
	local dbk = format(dbk_card, req.openid)
	local ok, obj = db:hget(dbk, body.num)
	if obj then
		obj = proto:decode("card", obj)
		body.billing_date = obj.billing_date
		if obj.repayday ~= body.repayday or obj.billday ~= body.billday then
			body.bill_month = false
		else
			body.bill_type = obj.bill_type
			body.bill_month = obj.bill_month
			body.bill_start = obj.bill_start
			body.bill_stop = obj.bill_stop
		end
	end
	checkbill(body)
	assert(body.bill_type)
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



