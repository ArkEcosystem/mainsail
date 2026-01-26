import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ConsensusAbi", () => {
		assert.defined(index.ConsensusAbi);
	});

	it("should export ERC1967ProxyAbi", () => {
		assert.defined(index.ERC1967ProxyAbi);
	});

	it("should export MultiPaymentAbi", () => {
		assert.defined(index.MultiPaymentAbi);
	});

	it("should export UsernamesAbi", () => {
		assert.defined(index.UsernamesAbi);
	});

	it("should export FunctionSigs", () => {
		assert.defined(index.FunctionSigs);
	});

	it("should export parseTransactionError", () => {
		assert.defined(index.parseTransactionError);
	});
});
