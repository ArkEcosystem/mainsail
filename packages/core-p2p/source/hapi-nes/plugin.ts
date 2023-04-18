/* tslint:disable */
"use strict";

import Hoek from "@hapi/hoek";
import Joi from "joi";

import { Listener } from "./listener";

const internals: any = {
	defaults: {
		headers: null,
		heartbeat: {
			interval: 15_000, // 15 seconds
			timeout: 5000, // 5 seconds
		},
		maxConnections: false,
		payload: {
			maxChunkChars: false,
		},
	},
};

internals.schema = Joi.object({
	// async function (socket, message) { return data; }    // Or throw errors
	headers: Joi.array().items(Joi.string().lowercase()).min(1).allow("*", null),

	heartbeat: Joi.object({
		interval: Joi.number().integer().min(1).required(),
		timeout: Joi.number().integer().min(1).less(Joi.ref("interval")).required(),
	}).allow(false),

	maxConnections: Joi.number().integer().min(1).allow(false),

	maxPayload: Joi.number().integer().min(1),

	onConnection: Joi.function(),

	// async function (socket) {}
	onDisconnection: Joi.function(),
	// function (socket) {}
	onMessage: Joi.function(),
	origin: Joi.array().items(Joi.string()).single().min(1),
	payload: {
		maxChunkChars: Joi.number().integer().min(1).allow(false),
	},
});

const plugin = {
	pkg: require("../../package.json"),
	register: function (server, options) {
		const settings: any = Hoek.applyToDefaults(internals.defaults, options);

		if (Array.isArray(settings.headers)) {
			settings.headers = settings.headers.map((field) => field.toLowerCase());
		}

		Joi.assert(settings, internals.schema, "Invalid nes configuration");

		// Create a listener per connection

		const listener = new Listener(server, settings);

		server.ext("onPreStart", () => {
			// Start heartbeats

			listener._beat();

			// Clear stopped state if restarted

			listener._stopped = false;
		});

		// Stop connections when server stops

		server.ext("onPreStop", () => listener._close());

		// Decorate server and request

		server.decorate("request", "socket", internals.socket, { apply: true });
	},
	requirements: {
		hapi: ">=19.0.0",
	},
};

export { plugin };

internals.socket = function (request) {
	return request.plugins.nes ? request.plugins.nes.socket : null;
};
