local core = require "sys.core"
local json = require "sys.json"
local dns = require "sys.dns"
local server = require "http.server"
local client = require "http.client"
local dispatch = require "router"
local db = require "db"
local write = server.write

core.start(function()
	print("Startup")
	db.start()
	local auth = require "auth"
	require "card"
	server.listen(assert(core.envget("listen")), function(fd, req, body)
		core.log(req.uri)
		core.log(req.version)
		req.openid = false
		body = json.decode(body)
		local sess = req.session
		print(body, json.encode(req))
		if sess then
			if #sess > 16 then
				req.openid = req.session
			else
				local ok
				ok, req.openid = auth.getopenid(sess)
				if not ok then
					return write(fd, 498)
				end
				auth.touch(sess)
			end
		end
		local c = dispatch[req.uri]
		if c then
			c(fd, req, body)
		else
			print("Unsupport uri", req.uri)
			write(fd, 404,
				{"Content-Type: text/plain"},
				"404 Page Not Found")
		end
	end)
end)

