import type { AddressInfo } from "net";

import { describe } from "@mainsail/test-runner";
import { http } from "@mainsail/utils";
import dns from "dns";
import { createServer, Server } from "http";

import { publicLookup } from "./public-lookup";

describe<{ server: Server; url: string }>("publicLookup", ({ it, assert, beforeAll, afterAll, stub }) => {
	const resolveTo = (result: unknown, family?: number) =>
		stub(dns, "lookup").callsFake((_: string, __: unknown, callback: Function) => callback(null, result, family));

	const call = (hostname: string, options = {}) =>
		new Promise<{ error: Error | null; result: unknown; family?: number }>((resolve) => {
			publicLookup(hostname, options, (error, result, family) => resolve({ error, family, result }));
		});

	beforeAll(async (context) => {
		context.server = createServer((_, response) => response.end("hi")).listen(0, "127.0.0.1");
		await new Promise((resolve) => context.server.once("listening", resolve));
		context.url = `http://localhost:${(context.server.address() as AddressInfo).port}/`;
	});

	afterAll(({ server }) => server.close());

	it("should pass through a single public address", async () => {
		resolveTo("1.2.3.4", 4);

		const { error, result, family } = await call("example.com");

		assert.null(error);
		assert.equal(result, "1.2.3.4");
		assert.equal(family, 4);
	});

	it("should pass through a list of public addresses", async () => {
		const addresses = [
			{ address: "1.2.3.4", family: 4 },
			{ address: "2606:4700::1111", family: 6 },
		];
		resolveTo(addresses);

		const { error, result } = await call("example.com", { all: true });

		assert.null(error);
		assert.equal(result, addresses);
	});

	it("should pass the lookup options through", async () => {
		const lookup = resolveTo("1.2.3.4", 4);

		await call("example.com", { all: true, hints: 32 });

		lookup.calledWith("example.com", { all: true, hints: 32 });
	});

	it("should refuse a single non-public address", async () => {
		resolveTo("127.0.0.1", 4);

		const { error } = await call("localtest.me");

		assert.equal(error?.message, "localtest.me resolves to the non-public address 127.0.0.1");
	});

	it("should refuse a list with one non-public address among public ones", async () => {
		resolveTo([
			{ address: "1.2.3.4", family: 4 },
			{ address: "10.0.0.5", family: 4 },
		]);

		const { error } = await call("rebind.example", { all: true });

		assert.equal(error?.message, "rebind.example resolves to the non-public address 10.0.0.5");
	});

	it("should refuse the typical non-public results", async () => {
		for (const address of ["::1", "169.254.169.254", "fd00::1", "::ffff:10.0.0.1", "0.0.0.0", "100.64.0.1"]) {
			const lookup = resolveTo(address);

			const { error } = await call("host");

			assert.defined(error, address);
			lookup.restore();
		}
	});

	it("should pass a lookup failure through", async () => {
		const failure = new Error("ENOTFOUND");
		stub(dns, "lookup").callsFake((_: string, __: unknown, callback: Function) => callback(failure));

		const { error } = await call("missing.example");

		assert.equal(error, failure);
	});

	// End to end through the http client with the real resolver: the loopback address is refused before
	// connecting, while the same url without the guard reaches the server.
	it("should keep the http client from connecting to a host name that resolves to loopback", async ({ url }) => {
		await assert.rejects(
			() => http.get(url, { agent: false, lookup: publicLookup }),
			"localhost resolves to the non-public address",
		);

		const response = await http.get(url, { agent: false });
		assert.equal(response.statusCode, 200);
	});
});
