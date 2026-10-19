import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import esmock from "esmock";

import { TxPoolNodeVerifier } from "./tx-pool-node-verifier";

let httpGet: (url: string, options: unknown) => Promise<unknown>;

const { TxPoolNodeVerifier: TxPoolNodeVerifierProxy } = await esmock(
	"./tx-pool-node-verifier",
	import.meta.url,
	{ "@mainsail/utils": { http: { get: (url: string, options: unknown) => httpGet(url, options) } } },
	{},
);

describe<{
	verifier: TxPoolNodeVerifier;
	configuration: any;
	logger: { debugExtra: (message: string, tag: string) => void };
}>("TxPoolNodeVerifier", ({ it, assert, beforeEach, spy, match }) => {
	const helloWorld = { data: "Hello World from Transaction Pool API!" };
	const contentLength = String(JSON.stringify(helloWorld).length);
	const node = { url: "http://1.2.3.4:4007/" } as any;

	const respond = (statusCode: number, data: unknown, headers: string[]) => {
		httpGet = async () => ({ data, headers, method: "GET", statusCode, statusMessage: "" });
	};

	beforeEach((context) => {
		respond(200, helloWorld, ["content-length", contentLength]);
		context.configuration = { getRequired: () => false };
		context.logger = { debugExtra: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "p2p");

		context.verifier = app.resolve(TxPoolNodeVerifierProxy);
	});

	it("#verify - should accept the default tx pool response", async ({ verifier }) => {
		assert.true(await verifier.verify(node));
	});

	it("#verify - should match the content-length header regardless of its case", async ({ verifier }) => {
		respond(200, helloWorld, ["Content-Type", "application/json", "Content-Length", contentLength]);

		assert.true(await verifier.verify(node));
	});

	it("#verify - should only match header names, not values", async ({ verifier }) => {
		respond(200, helloWorld, ["x-echo", "content-length", "content-length", contentLength]);

		assert.true(await verifier.verify(node));
	});

	it("#verify - should reject a missing content length", async ({ verifier, logger }) => {
		const debugExtra = spy(logger, "debugExtra");
		respond(200, helloWorld, ["content-type", "application/json"]);

		assert.false(await verifier.verify(node));
		debugExtra.calledWith(match("missing content length"), "p2p");
	});

	it("#verify - should reject a wrong content length", async ({ verifier }) => {
		respond(200, helloWorld, ["content-length", "1"]);

		assert.false(await verifier.verify(node));
	});

	it("#verify - should reject an unreachable node", async ({ verifier }) => {
		httpGet = async () => {
			throw new Error("connection refused");
		};

		assert.false(await verifier.verify(node));
	});

	it("#verify - should skip verification when configured", async ({ verifier, configuration }) => {
		configuration.getRequired = () => true;
		httpGet = async () => {
			throw new Error("must not be called");
		};

		assert.true(await verifier.verify(node));
	});
});
