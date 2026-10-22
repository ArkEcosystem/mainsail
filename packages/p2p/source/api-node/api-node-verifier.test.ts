import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import esmock from "esmock";

import { ApiNodeVerifier } from "./api-node-verifier";

let httpGet: (url: string, options: any) => Promise<unknown>;

const { ApiNodeVerifier: ApiNodeVerifierProxy } = await esmock(
	"./api-node-verifier",
	import.meta.url,
	{ "@mainsail/utils": { http: { get: (url: string, options: unknown) => httpGet(url, options) } } },
	{},
);

describe<{
	verifier: ApiNodeVerifier;
	logger: { debugExtra: (message: string, tag: string) => void };
}>("ApiNodeVerifier", ({ it, assert, beforeEach, spy, match }) => {
	const helloWorld = { data: "Hello World from Public API!" };
	const contentLength = String(JSON.stringify(helloWorld).length);
	const apiNode = () => ({ url: "http://1.2.3.4:4003/" }) as any;

	const respond = (statusCode: number, data: unknown, headers: string[]) => {
		httpGet = async () => ({
			data,
			headers,
			method: "GET",
			remoteAddress: "1.2.3.4",
			statusCode,
			statusMessage: "",
		});
	};

	beforeEach((context) => {
		respond(200, helloWorld, ["content-length", contentLength]);

		context.logger = { debugExtra: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 1024 })
			.whenTagged("plugin", "p2p");

		context.verifier = app.resolve(ApiNodeVerifierProxy);
	});

	it("#verify - should accept the default api response", async ({ verifier }) => {
		const node = apiNode();

		assert.true(await verifier.verify(node));
		assert.equal(node.statusCode, 200);
		assert.defined(node.lastPinged);
	});

	it("#verify - should record the address the check connected to", async ({ verifier }) => {
		const node = apiNode();

		await verifier.verify(node);

		assert.equal(node.remoteAddress, "1.2.3.4");
	});

	it("#verify - should resolve a peer-sourced host name through the public-address guard on a fresh connection", async ({
		verifier,
	}) => {
		let options: any;
		const respondWith = httpGet;
		httpGet = async (url, options_) => {
			options = options_;
			return respondWith(url, options_);
		};

		assert.true(await verifier.verify(apiNode()));
		assert.function(options.lookup);
		assert.false(options.agent);
	});

	it("#verify - should not guard the resolved address of a configured node", async ({ verifier }) => {
		let options: any;
		const respondWith = httpGet;
		httpGet = async (url, options_) => {
			options = options_;
			return respondWith(url, options_);
		};

		assert.true(await verifier.verify(apiNode(), { seed: true }));
		assert.undefined(options.lookup);
	});

	it("#verify - should reject a node whose host name resolves to a non-public address", async ({
		verifier,
		logger,
	}) => {
		const debugExtra = spy(logger, "debugExtra");
		httpGet = async () => {
			throw new Error("localtest.me resolves to the non-public address 127.0.0.1");
		};

		assert.false(await verifier.verify({ url: "http://localtest.me:4003/" } as any));
		debugExtra.calledWith(match("resolves to the non-public address 127.0.0.1"), "p2p");
	});

	it("#verify - should match the content-length header regardless of its case", async ({ verifier }) => {
		respond(200, helloWorld, ["Content-Type", "application/json", "Content-Length", contentLength]);

		assert.true(await verifier.verify(apiNode()));
	});

	it("#verify - should only match header names, not values", async ({ verifier }) => {
		respond(200, helloWorld, ["x-echo", "content-length", "content-length", contentLength]);

		assert.true(await verifier.verify(apiNode()));
	});

	it("#verify - should reject a missing content length", async ({ verifier, logger }) => {
		const debugExtra = spy(logger, "debugExtra");
		respond(200, helloWorld, ["content-type", "application/json"]);

		assert.false(await verifier.verify(apiNode()));
		debugExtra.calledWith(match("missing content length"), "p2p");
	});

	it("#verify - should reject a wrong content length", async ({ verifier }) => {
		respond(200, helloWorld, ["content-length", "1"]);

		assert.false(await verifier.verify(apiNode()));
	});

	it("#verify - should reject a wrong body", async ({ verifier }) => {
		const body = { data: "Hello World from Nowhere!!!!" };
		respond(200, body, ["content-length", String(JSON.stringify(body).length)]);

		assert.false(await verifier.verify(apiNode()));
	});

	it("#verify - should reject a non-200 status", async ({ verifier }) => {
		respond(201, helloWorld, ["content-length", contentLength]);

		assert.false(await verifier.verify(apiNode()));
	});

	it("#verify - should reject an unreachable node", async ({ verifier }) => {
		httpGet = async () => {
			throw new Error("connection refused");
		};

		assert.false(await verifier.verify(apiNode()));
	});
});
