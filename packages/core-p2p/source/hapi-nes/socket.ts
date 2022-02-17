"use strict";

import Boom from "@hapi/boom";
import Bounce from "@hapi/bounce";
import Hoek from "@hapi/hoek";
import Teamwork from "@hapi/teamwork";

import { parseNesMessage, protocol, stringifyNesMessage } from "./utils";

const internals = {
	version: "2",
};

export class Socket {
	public server;
	public id;
	public app;
	public info;

	public _removed;
	public _pinged;

	private _ws;
	private _listener;
	private _helloed;
	private _processingCount;
	private _packets;
	private _sending;
	private _lastPinged;

	public constructor(ws, req, listener) {
		this._ws = ws;
		this._listener = listener;
		this._helloed = false;
		this._pinged = true;
		this._processingCount = 0;
		this._packets = [];
		this._sending = false;
		this._removed = new Teamwork.Team();

		this.server = this._listener._server;
		this.id = this._listener._generateId();
		this.app = {};

		this.info = {
			remoteAddress: req.socket.remoteAddress,
			remotePort: req.socket.remotePort,
			"x-forwarded-for": req.headers["x-forwarded-for"],
		};

		this._ws.on("message", (message) => this._onMessage(message));
		this._ws.on("ping", () => this.terminate());
		this._ws.on("pong", () => this.terminate());
	}

	public disconnect() {
		this._ws.close();
		return this._removed;
	}

	public terminate() {
		this._ws.terminate();
		return this._removed;
	}

	public isOpen() {
		return this._ws.readyState === 1;
	}

	// public even though it starts with _ ; this is to match the original code
	public _active() {
		return this._pinged || this._sending || this._processingCount;
	}

	// public because used in listener ; from original code
	public _send(message, options?) {
		options = options || {};

		if (!this.isOpen()) {
			// Open
			return Promise.reject(Boom.internal("Socket not open"));
		}

		let string;
		try {
			string = stringifyNesMessage(message);
			if (options.replace) {
				Object.keys(options.replace).forEach((token) => {
					string = string.replace(`"${token}"`, options.replace[token]);
				});
			}
		} catch (error) {
			this.server.log(["nes", "serialization", "error"], message.type);

			/* istanbul ignore else */
			if (message.id) {
				return this._error(Boom.internal("Failed serializing message"), message);
			}

			/* istanbul ignore next */
			return Promise.reject(error);
		}

		const team = new Teamwork.Team();
		this._packets.push({ message: string, team, type: message.type });
		this._flush();
		return team.work;
	}

	// private even though it does not start with _ ; adapted from the original code
	private caseInsensitiveKey(object, key) {
		const keys = Object.keys(object);
		for (const current of keys) {
			if (key === current.toLowerCase()) {
				return object[current];
			}
		}

		return undefined;
	}

	private async _flush() {
		if (this._sending || !this._packets.length) {
			return;
		}

		this._sending = true;

		const packet = this._packets.shift();
		let messages = [packet.message];

		// Break message into smaller chunks

		const maxChunkChars = this._listener._settings.payload.maxChunkChars;
		if (maxChunkChars && packet.message.length > maxChunkChars) {
			messages = [];
			const parts = Math.ceil(packet.message.length / maxChunkChars);
			for (let i = 0; i < parts; ++i) {
				const last = i === parts - 1;
				const prefix = last ? "!" : "+";
				messages.push(prefix + packet.message.slice(i * maxChunkChars, (i + 1) * maxChunkChars));
			}
		}

		let error;
		for (const message of messages) {
			const team = new Teamwork.Team();
			this._ws.send(message, (err) => team.attend(err));
			try {
				await team.work;
			} catch (error_) {
				error = error_;
				break;
			}

			if (packet.type !== "ping") {
				this._pinged = true; // Consider the connection valid if send() was successful
			}
		}

		this._sending = false;
		packet.team.attend(error);

		setImmediate(() => this._flush());
	}

	//@ts-ignore
	private _error(err, request?) {
		if (err.output?.statusCode === protocol.gracefulErrorStatusCode) {
			err = Boom.boomify(err);

			const message = Hoek.clone(err.output);
			delete message.payload.statusCode;
			message.headers = this._filterHeaders(message.headers);

			message.payload = Buffer.from(JSON.stringify(message.payload));
			if (request) {
				message.type = request.type;
				message.id = request.id;
			}

			return this._send(message);
		} else {
			this.terminate();
			return Promise.resolve();
		}
	}

	private async _onMessage(message) {
		let request;
		try {
			if (!(message instanceof Buffer)) {
				return this.terminate();
			}
			request = parseNesMessage(message);
		} catch {
			return this.terminate();
		}

		this._pinged = true;
		++this._processingCount;

		let response, options, error;
		try {
			const lifecycleResponse = await this._lifecycle(request);
			response = lifecycleResponse.response;
			options = lifecycleResponse.options;
		} catch (error_) {
			Bounce.rethrow(error_, "system");
			error = error_;
		}

		try {
			if (error) {
				await this._error(error, request);
			} else if (response) {
				await this._send(response, options);
			}
		} catch (error_) {
			Bounce.rethrow(error_, "system");
			this.terminate();
		}

		--this._processingCount;
	}

	private async _lifecycle(request): Promise<any> {
		if (!request.type) {
			throw Boom.badRequest("Cannot parse message");
		}

		if (!request.id) {
			throw Boom.badRequest("Message missing id");
		}

		// Initialization and Authentication

		if (request.type === "ping") {
			if (this._lastPinged && Date.now() < this._lastPinged + 1000) {
				this._lastPinged = Date.now();
				throw Boom.badRequest("Exceeded ping limit");
			}
			this._lastPinged = Date.now();
			return {};
		}

		if (request.type === "hello") {
			return this._processHello(request);
		}

		if (!this._helloed) {
			throw Boom.badRequest("Connection is not initialized");
		}

		// Endpoint request

		if (request.type === "request") {
			request.method = "POST";
			return this._processRequest(request);
		}

		// Unknown

		throw Boom.badRequest("Unknown message type");
	}

	private async _processHello(request) {
		/* istanbul ignore next */
		if (this._helloed) {
			throw Boom.badRequest("Connection already initialized");
		}

		if (request.version !== internals.version) {
			throw Boom.badRequest(
				"Incorrect protocol version (expected " +
					internals.version +
					" but received " +
					(request.version || "none") +
					")",
			);
		}

		this._helloed = true; // Prevents the client from reusing the socket if erred (leaves socket open to ensure client gets the error response)

		if (this._listener._settings.onConnection) {
			await this._listener._settings.onConnection(this);
		}

		const response = {
			heartbeat: this._listener._settings.heartbeat,
			id: request.id,
			socket: this.id,
			type: "hello",
		};

		return { response };
	}

	private async _processRequest(request) {
		let method = request.method;
		if (!method) {
			throw Boom.badRequest("Message missing method");
		}

		let path = request.path;
		if (!path) {
			throw Boom.badRequest("Message missing path");
		}

		if (request.headers && this.caseInsensitiveKey(request.headers, "authorization")) {
			throw Boom.badRequest("Cannot include an Authorization header");
		}

		if (path[0] !== "/") {
			// Route id
			const route = this.server.lookup(path);
			if (!route) {
				throw Boom.notFound();
			}

			path = route.path;
			method = route.method;

			if (method === "*") {
				throw Boom.badRequest("Cannot use route id with wildcard method route config");
			}
		}

		const shot = {
			allowInternals: true,
			auth: null,
			headers: { ...request.headers, "content-type": "application/octet-stream" },
			method,
			payload: request.payload,
			plugins: {
				nes: {
					socket: this,
				},
			},
			remoteAddress: this.info.remoteAddress,
			url: path,
			validate: false,
		};

		const res = await this.server.inject(shot);
		if (res.statusCode >= 400) {
			throw Boom.boomify(new Error(res.result), { statusCode: res.statusCode });
		}

		const response = {
			headers: this._filterHeaders(res.headers),
			id: request.id,
			payload: res.result,
			statusCode: res.statusCode,
			type: "request",
		};

		return { options: {}, response };
	}

	private _filterHeaders(headers) {
		const filter = this._listener._settings.headers;
		if (!filter) {
			return undefined;
		}

		if (filter === "*") {
			return headers;
		}

		const filtered = {};
		const fields = Object.keys(headers);
		for (const field of fields) {
			if (filter.includes(field.toLowerCase())) {
				filtered[field] = headers[field];
			}
		}

		return filtered;
	}
}
