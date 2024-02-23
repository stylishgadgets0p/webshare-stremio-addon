const { addonBuilder } = require("stremio-addon-sdk")
const needle = require('needle')
const webshare = require('./webshare')

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.coffei.webshare",
	"version": "0.1.0",
	"catalogs": [],
	"resources": ["stream"],
	"types": [
		"movie",
		"series"
	],
	"name": "Webshare.cz",
	"description": "Simple webshare.cz search and streaming.",
	"idPrefixes": [
		"tt"
	],
	"behaviorHints": { "configurable": true, "configurationRequired": true },
	"config": [
		{
			"key": "login",
			"type": "text",
			"title": "Webshare.cz login - username or email",
			"required": true
		},
		{
			"key": "password",
			"type": "password",
			"title": "Webshare.cz password",
			"required": true
		}
	]
}
const builder = new addonBuilder(manifest)

const findMovie = async (args) => {
	const resp = await needle('get', 'https://v3-cinemeta.strem.io/meta/' + args.type + '/' + args.id + '.json')
	return resp.body && { ...resp.body.meta, type: 'movie' }
}

const findSeries = async (args) => {
	const segments = args.id.split(':')
	if (segments.length == 3) {
		const [id, series, episode] = segments
		const resp = await needle('get', 'https://v3-cinemeta.strem.io/meta/' + args.type + '/' + id + '.json')
		return resp.body && { ...resp.body.meta, type: 'series', series, episode }
	}
}

const findShow = (args) => {
	if (args.type == 'movie') {
		return findMovie(args)
	} else if (args.type == 'series') {
		return findSeries(args)
	}
}

builder.defineStreamHandler(async function (args) {
	const info = await findShow(args)
	if (info) {
		const config = args.config || {}
		const wsToken = await webshare.login(config.login, config.password)
		const streams = await webshare.search(info, wsToken)
		const streamsWithUrl = await webshare.addUrlToStreams(streams, wsToken)

		return { streams: streamsWithUrl }
	}
	return { streams: [] }
})

module.exports = builder.getInterface()