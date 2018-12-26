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
	.cost:float 4
	.billingday:integer 5
	.repaymentdate:integer 6
	.repay:integer 7
}
]]

assert(proto, err)

local M = {}
local dbk_card = "card:%s"

dispatch["/addcard"] = function(fd, req, body)
	print(body)
	local dat = proto:encode("card", body)
	db:hset(format(dbk_card, req.openid), body.num, dat)
	write(fd, 200)
end

dispatch["/delcard"] = function(fd, req, body)
	db:hdel(format(dbk_card, req.openid), body.num, dat)
	write(fd, 200)
end

dispatch["/listcard"] = function(fd, req, body)
	local ok, list = db:hgetall(format(dbk_card, req.openid))
	print(ok, list)
	local ack = {}
	for i = 1, #list, 2 do
		local v = list[i+1]
		ack[#ack + 1] = proto:decode("card", v)
	end
	write(fd, 200, nil, json.encode(ack))
end

