local core = require "sys.core"
local json = require "sys.json"
local zproto = require "zproto"
local imap = require "imap"
local html = require "htmldom"
local server = require "http.server"
local db = require "db".get()
local dispatch = require "router"
local write = server.write

local proto, err = zproto:parse [[
mail {
	.openid:string 1
	.user:string 2
	.passwd:string 3
	.date:uinteger 4
}
]]

local dbk_mail = "account:mail"
assert(proto, err)

local function dbget(openid)
	assert(openid)
	local ok, mail = db:hget(dbk_mail, openid)
	if not mail then
		return
	end
	mail = proto:decode("mail", mail)
	core.log("dbgetmail", json.encode(mail))
	return mail
end

local function dbsave(mail)
	local dat = proto:encode("mail", mail)
	db:hset(dbk_mail, mail.openid, dat)
end

local function new(bank)
	return {
		bank = bank,
		num = false,
		limit = false,
		year = false,
		month = false,
		cost = false,
	}
end

local function tonum(str)
	return str:match("([%d,.]+)"):gsub(",", "")
end

--招行
local function cmbc(d, subject)
	local obj = new("招商银行")
	local root = html.parse(d)
	local item = root:select("table")[3]:select("tr")[2]:select("tr")[1]
	local table3 = item:selectn("table", 3)[1]
	local table4 = table3:select("table")[1]
	local date = table4:select("div")[2]:select("font")[1].child[1]
	local cost = table3:select("div")[1]:select("font")[1].child[1]
	obj.year, obj.month = subject:match("(%d+)年(%d+)月")
	obj.cost = tonum(cost)
	return obj
end

--建行
local function ccb(d)
	local obj = new("建设银行")
	local root = html.parse(d)
	local trs = root:select("tr")
	local info = trs[6]:selectn("table", 2)[1]:select("td")
	local limit_info = info[2]:select("tr")
	local bill_info = info[4]:select("tr")[4]:select("b")[1]
	local bill_date = limit_info[2]:select("font")[1]
	local card_limit = limit_info[3]:select("a")[1]
	obj.limit = tonum(card_limit.child[1])
	obj.year, obj.month = bill_date.child[1]:match("(%d+)-(%d+)")
	obj.cost = tonum(bill_info.child[1])
	return obj
end

--交行
local function bankcomm(d)
	local obj = new("交通银行")
	local root = html.parse(d)
	local root = root:select("TABLE")[2]:select("TABLE")[1]:select("TR")[2]
	root = root:select("TD")[1]:select("table")
	local node = root[1]:select("table")[1]:select("tr")
	local card_num = node[4]:select("td")[3].child[1]
	obj.num = card_num:match("%*(%d%d%d%d)")
	local bill_date = node[5]:select("font")[1].child[1]
	obj.year, obj.month = bill_date:match("%d+/%d+/%d+%-(%d+)/(%d+)/%d+")
	node = root[2]:select("table")[1]:select("tr")[2]
	local cost_info = node:select("td")[1]
	obj.cost = tonum(cost_info.child[1])
	return obj
end

--浦发
local function spdb(_, _, d)
	local day
	local rvs = string.reverse(d)
	local n = rvs:find("<", 1, true)
	d = d:sub(1, -n)
	d = ("<html>" .. d .. "</html>"):gsub("=>", ">")
	local obj = new("浦发银行")
	local root = html.parse(d):select("a")[1]:selectn("table", 3)[2]
	root = root:select("table")
	obj.cost = tonum(root[3]:select("span")[1].child[1])
	local date = root[5]:select("td")[2].child[1]
	obj.year, obj.month, day = date:match("(%d+)/(%d+)/(%d+)")
	day = tonumber(day)
	if day < 20 then
		obj.month = tonumber(obj.month)
		obj.month = obj.month - 1
		if obj.month < 1 then
			obj.month = 12
			obj.year = tonumber(obj.year)
			obj.year = obj.year - 1
		end
	end
	return obj
end


--广发
local function cgbc(d)
	local obj = new("广发银行")
	local root = html.parse(d):selectn("tr", 3)[3]:selectn("td", 4)
	local trs = root[2]:select("tr")[2]:selectn("tr", 2)
	local peroid = trs[2]:select("font")[1].child[1]
	obj.year, obj.month = peroid:match("%d+/%d+/%d+[^%d]*(%d+)/(%d+)/%d+")
	local cardinfo = trs[4]:selectn("tr", 6)[2]:select("font")
	obj.num = cardinfo[1].child[1]:match("%*(%d+)")
	obj.cost = tonum(cardinfo[2].child[1])
	obj.limit = tonum(cardinfo[6].child[1])
	return obj
end

local banks = {
	["招商"] = cmbc,
	["建设"] = ccb,
	["交通"] = bankcomm,
	["浦发"] = spdb,
	["广发"] = cgbc,
}

local function parsemail(m)
	for k, v in pairs(banks) do
		if m.subject:find(k) then
			return v(m.body, m.subject, m.raw)
		end
	end
end

local function pullmail(user, passwd, since)
	local username, server = user:match("([^@]+)@(%g+)")
	server = "imap." .. server
	local list = {}
	local mbox = imap:create {
		user = username,
		passwd = passwd,
		addr = server,
		port = 143,
	}
	mbox:login()
	mbox:select("inbox")
	local ids= mbox:search("账单", since)
	core.log("search", since, table.concat(ids, ","))
	for _, id in pairs(ids) do
		local m = mbox:fetch(id)
		local info = parsemail(m)
		if info then
			core.log("mail", id, json.encode(info))
			if info.num then
				info.num = tonumber(info.num)
			end
			if info.limit then
				info.limit = tonumber(info.limit)
			end
			info.year = tonumber(info.year)
			info.month = tonumber(info.month)
			info.cost = tonumber(info.cost)
			list[#list+1] = info
		end
	end
	mbox:close()
	return list
end

dispatch["/setmail"] = function(fd, req, body)
	local openid = req.openid
	local mail = dbget(openid)
	if not mail then
		mail = {
			openid = openid,
		}
	else
		mail.date = nil
	end
	local a, b = body.user:match("([^@]+)@(%g+)")
	if not a or not b then
		return write(fd, 400)
	end
	mail.user = body.user
	mail.passwd = body.passwd
	dbsave(mail)
	write(fd, 200)
end


dispatch["/getmail"] = function(fd, req, body)
	local openid = req.openid
	local mail = dbget(openid)
	if not mail then
		mail = {
			user = "",
			passwd = "",
		}
	else
		mail.openid = nil
		mail.date = nil
	end
	write(fd, 200, nil, json.encode(mail))
end


local function checkmail(openid)
	local since = false
	local mail = dbget(openid)
	if not mail then
		return false
	end
	local mailuser = mail.user
	local mailpasswd = mail.passwd
	if not mailuser or not mailpasswd then
		return false
	end
	local now = core.nowsec()
	local date = os.date("*t", now)
	if not mail.date then
		date.month = date.month - 1
		since = os.time(date)
	else
		local mdate = os.date("*t", mail.date)
		if mdate.day ~= date.day then
			since = mail.date
		end
	end
	if since then
		mail.date = now
		dbsave(mail)
	end
	return since, mailuser, mailpasswd
end

local M = {}
function M.pull(openid)
	local since, user, passwd = checkmail(openid)
	if not since then
		core.log("tryfetchmail check future", openid)
		return false
	end
	local ok, err = core.pcall(pullmail, user, passwd, since)
	if not ok then
		core.log(err)
		return nil
	end
	return err
end

return M

