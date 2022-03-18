import { describe } from "../../../core-test-framework";

import { Exceptions } from "@arkecosystem/core-contracts";

describe("WalletErrors", ({ it, assert }) => {
	it("should construct base wallet error", () => {
		const message = "I am an error";
		const error = new Error(message);

		assert.throws(() => {
			throw error;
		}, message);

		assert.defined(error.stack);
	});

	it("should construct WalletIndexAlreadyRegisteredError", () => {
		const message = "custom message";
		const error = new Exceptions.WalletIndexAlreadyRegisteredError(message);

		assert.throws(() => {
			throw error;
		}, `The wallet index is already registered: ${message}`);

		assert.defined(error.stack);
	});

	it("should construct WalletIndexNotFoundError", () => {
		const message = "custom message";
		const error = new Exceptions.WalletIndexNotFoundError(message);

		assert.throws(() => {
			throw error;
		}, `The wallet index does not exist: ${message}`);

		assert.defined(error.stack);
	});
});
