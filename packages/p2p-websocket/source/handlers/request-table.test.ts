import { describe } from "@mainsail/test-runner";

import { constants } from "../constants.js";
import { CloseReason } from "../enums.js";
import { RequestTable } from "./request-table.js";

describe<{
	table: RequestTable;
}>("RequestTable", ({ it, assert, beforeEach, clock }) => {
	beforeEach((context) => {
		context.table = new RequestTable();
	});

	it("should settle a request with its response", async ({ table }) => {
		const { id, response } = table.open();

		assert.true(table.onResponse({ id, payload: Buffer.from("ok"), statusCode: 200, type: "response" }));
		assert.equal((await response).statusCode, 200);
		assert.equal(table.size, 0);
	});

	it("should ignore a response nobody waits for", ({ table }) => {
		assert.false(table.onResponse({ id: 42, payload: Buffer.alloc(0), statusCode: 200, type: "response" }));
	});

	it("should time out after the default timeout", async ({ table }) => {
		const fakeTimers = clock();
		const { response } = table.open();
		const settled = response.catch((error) => error);

		fakeTimers.tick(constants.REQUEST_TIMEOUT);

		const error = await settled;
		assert.equal(error.reason, CloseReason.RequestTimeout);
		assert.equal(table.size, 0);
	});

	it("should time out after the timeout given for the request", async ({ table }) => {
		const fakeTimers = clock();
		const { id, response } = table.open(constants.REQUEST_TIMEOUT * 3);
		const settled = response.catch((error) => error);

		fakeTimers.tick(constants.REQUEST_TIMEOUT * 3 - 1);
		assert.equal(table.size, 1);

		fakeTimers.tick(1);
		const error = await settled;
		assert.equal(error.message, `Request ${id} timed out after ${constants.REQUEST_TIMEOUT * 3} ms`);
	});

	it("should fail everything still open on abort", async ({ table }) => {
		const first = table.open().response.catch((error) => error);
		const second = table.open().response.catch((error) => error);

		table.abort(new Error("closed") as any);

		assert.equal((await first).message, "closed");
		assert.equal((await second).message, "closed");
		assert.equal(table.size, 0);
	});
});
