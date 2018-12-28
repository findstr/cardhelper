local core = require "sys.core"
local dispatch = require "router"
local server = require "http.server"
local client = require "http.client"
local helper = require "http.helper"
local crypt = require "sys.crypt"
local zproto = require "zproto"
local json = require "sys.json"
local db = require "db".get()
local write = server.write
local format = string.format
local tostring = tostring
local proto, err = zproto:parse [[
user {
	.session_key:string 1
	.openid:string 2
	.unionid:string 3
	.nickname:string 4
	.session:string 5
}
]]

assert(proto, err)
local M = {}
local dbk_user = "account:user"
local dbk_session = "session:%s"
local dbk_session_idx = "session:idx"

local req_url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' ..
	core.envget("appid") ..
	'&secret=' .. core.envget("secret") ..
	'&js_code=%s&grant_type=authorization_code'

dispatch["/login"] = function(fd, req, body)
	local code = body['code']
	local status, _, body = client.GET(format(req_url, code))
	local obj = json.decode(body)
	local _, session = db:incr(dbk_session_idx)
	session = tostring(session)
	local dbk = format(dbk_session, session)
	local user = {
		session_key = obj.session_key,
		openid = obj.openid,
		session = session,
	}
	db:pipeline {
		{"hset", dbk_user, obj.openid, proto:encode("user", user)},
		{"set", dbk, obj.openid},
		{"expire", dbk, 600},
	}
	local ack = {session = session}
	write(fd, 200, nil, json.encode(ack))
end

dispatch["/userinfo"] = function(fd, req, body)
	local iv = body['iv']
	local dat = body['data']
	local ok, user = db:hget(dbk_user, req.openid)
	user = proto:decode("user", user)
	iv = crypt.base64decode(iv)
	key = crypt.base64decode(user.session_key)
	dat = crypt.base64decode(dat)
	dat = crypt.aesdecode(key, dat, iv)
	print(dat)
	local obj = json.decode(dat)
	local ack = json.encode({
		nickName = obj.nickName,
		avatarUrl = obj.avatarUrl
	})
	print(ack)
	write(fd, 200, nil, ack)
end

function M.getopenid(session)
	local _, openid = db:get(format(dbk_session, session))
	if not openid then
		core.log("invalid session:", session)
		return false, "invalid session"
	end
	local _, user = db:hget(dbk_user, openid)
	if not user then
		core.log("user not exist:", openid)
		return false, "user not exist"
	end
	user = proto:decode("user", user)
	if user.session ~= session then
		return false, "user session expired"
	end
	return true, openid
end

function M.touch(session)
	local dbk = format(dbk_session, session)
	db:expire(dbk, 600)
end

return M

