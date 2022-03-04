import { describe } from "../../core-test-framework/source";

import { ForgerError, HostNoResponseError, RelayCommunicationError } from "./errors";

describe("Errors", ({ assert, it }) => {
	it("should construct base ForgerError", async () => {
		const message = "I am an error";
		const error = new ForgerError(message);
		await assert.rejects(() => {
			throw error;
		}, message);
		assert.defined(error.stack);
	});

	it("should construct RelayCommunicationError", async () => {
		const message = "custom message";
		const endpoint = "test_endpoint";
		const error = new RelayCommunicationError(endpoint, message);
		await assert.rejects(() => {
			throw error;
		}, `Request to ${endpoint} failed, because of '${message}'.`);
		assert.defined(error.stack);
	});

	it("should construct HostNoResponseError", async () => {
		const host = "custom host";
		const error = new HostNoResponseError(host);
		await assert.rejects(() => {
			throw error;
		}, `${host} didn't respond. Trying again later.`);
		assert.defined(error.stack);
	});
});
