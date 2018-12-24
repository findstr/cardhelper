local core = require "sys.core"
local dns = require "sys.dns"
local redis = require "sys.db.redis"
local M = {}
local db

function M.start()
	local err
	local name = core.envget("dbaddr")
	local port = core.envget("dbport")
	local idx = core.envget("dbindex")
	local addr = dns.resolve(name)
	print("db start", name, port, addr, idx)
	db, err= redis:connect {
		addr = string.format("%s:%s", addr, port),
		db = idx,
	}
	assert(db, err)
end

function M.get()
	return db
end

return M

