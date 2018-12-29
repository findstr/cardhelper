local core = require "sys.core"
local dispatch = require "router"
local server = require "http.server"
local client = require "http.client"
local helper = require "http.helper"
local crypto = require "sys.crypto"
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
	.accesstoken:string 6
	.accessexpire:uinteger 7
	.formid:string 8
	.formexpire:uinteger 9
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

local token_url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' ..
	core.envget("appid") .. '&secret=' .. core.envget("secret")

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
	iv = crypto.base64decode(iv)
	key = crypto.base64decode(user.session_key)
	dat = crypto.base64decode(dat)
	dat = crypto.aesdecode(key, dat, iv)
	print(dat)
	local obj = json.decode(dat)
	local ack = json.encode({
		nickName = obj.nickName,
		avatarUrl = obj.avatarUrl
	})
	print(ack)
	write(fd, 200, nil, ack)
end

local function getuser(openid)
	local ok, user = db:hget(dbk_user, openid)
	user = proto:decode("user", user)
	print(json.encode(user))
	return user
end

local function saveuser(user)
	local dat = proto:encode("user", user)
	db:hset(dbk_user, user.openid, dat)
end

local function checktoken(openid)
	local user = getuser(openid)
	local now = core.nowsec() // 1000
	if not user.accessexpire or user.accessexpire < now then
		local status, _, body = client.GET(token_url)
		local obj = json.decode(body)
		user.accessexpire = now + obj.expires_in // 2
		user.accesstoken = obj.access_token
		saveuser(user)
	end
	return user
end

dispatch["/monitor"] = function(fd, req, body)
	local openid = req.openid
	local now = core.nowsec()
	user = getuser(openid)
	user.formid = body.formid
	user.formexpire = now + 7 * 24 * 3600 - 10
	print(now, user.formexpire)
	core.log("monitor", user.openid, user.formid, user.formexpire)
	saveuser(user)
	write(fd, 200)
end

function M.formexpire(openid)
	local user = getuser(openid)
	return user.formexpire
end

function M.notify(openid, content)
	local now = core.nowsec()
	local user = checktoken(openid)
	print(now)
	if not user.formexpire or user.formexpire < now then
		core.log("failed to notify", openid, content, user.formexpire, user.formexpire < now)
		return
	end
	local url = 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' ..
		user.accesstoken
	local param = {
		touser = user.openid,
		template_id = '54cmnPhXE05tuDuWzFykXL1L1OjqxNJ_kba6Oq7YZ6g',
		page = "pages/index/index",
		form_id = user.formid,
		data = {
			keyword1 = {value = os.date("%Y-%m-%d")},
			keyword2 = {value = content}
		},
	}
	local body = json.encode(param)
	local status, _, body = client.POST(url, nil, body)
	user.formexpire = 0
	saveuser(user)
	core.log("notify", openid, body)
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

