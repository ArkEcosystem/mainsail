import { describe } from "../../core-test-framework";

import { pluralize } from "./pluralize";

describe("pluralize", async ({ assert, it, nock, loader }) => {
	it("should plural words when the count is above 1", () => {
		assert.is(pluralize("block"), "block");
		assert.is(pluralize("block", 0), "blocks");
		assert.is(pluralize("block", 1), "block");
		assert.is(pluralize("block", 2), "blocks");
		assert.is(pluralize("block", 2, true), "2 blocks");

		assert.is(pluralize("transaction"), "transaction");
		assert.is(pluralize("transaction", 0), "transactions");
		assert.is(pluralize("transaction", 1), "transaction");
		assert.is(pluralize("transaction", 2), "transactions");
		assert.is(pluralize("transaction", 2, true), "2 transactions");

		assert.is(pluralize("wallet"), "wallet");
		assert.is(pluralize("wallet", 0), "wallets");
		assert.is(pluralize("wallet", 1), "wallet");
		assert.is(pluralize("wallet", 2), "wallets");
		assert.is(pluralize("wallet", 2, true), "2 wallets");

		assert.is(pluralize("delegate"), "delegate");
		assert.is(pluralize("delegate", 0), "delegates");
		assert.is(pluralize("delegate", 1), "delegate");
		assert.is(pluralize("delegate", 2), "delegates");
		assert.is(pluralize("delegate", 2, true), "2 delegates");

		assert.is(pluralize("peer"), "peer");
		assert.is(pluralize("peer", 0), "peers");
		assert.is(pluralize("peer", 1), "peer");
		assert.is(pluralize("peer", 2), "peers");
		assert.is(pluralize("peer", 2, true), "2 peers");

		assert.is(pluralize("distinct overheight block header"), "distinct overheight block header");
		assert.is(pluralize("distinct overheight block header", 0), "distinct overheight block headers");
		assert.is(pluralize("distinct overheight block header", 1), "distinct overheight block header");
		assert.is(pluralize("distinct overheight block header", 2), "distinct overheight block headers");
		assert.is(pluralize("distinct overheight block header", 2, true), "2 distinct overheight block headers");

		assert.is(pluralize("inactive delegate"), "inactive delegate");
		assert.is(pluralize("inactive delegate", 0), "inactive delegates");
		assert.is(pluralize("inactive delegate", 1), "inactive delegate");
		assert.is(pluralize("inactive delegate", 2), "inactive delegates");
		assert.is(pluralize("inactive delegate", 2, true), "2 inactive delegates");
	});
});
