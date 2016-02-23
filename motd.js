function getMotd(req, res) {
	var response = {
		status: 'success',
		data: {
			lastModified: new Date().toISOString(),
			motd: ' -SSL (got error)\n -Account\n -Inventory'
		}
	}

	res.send(JSON.stringify(response));
}

module.exports.register = function(app, root) {
	app.get(root + 'get', getMotd);
}
