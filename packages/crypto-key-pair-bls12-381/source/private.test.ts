import { describe } from "@arkecosystem/core-test-framework";

import { PrivateKeyFactory } from "./private";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("PrivateKeyFactory", ({ assert, it }) => {
	it("should derive from an mnemonic", async () => {
		assert.is(
			await new PrivateKeyFactory().fromMnemonic(mnemonic),
			"6a0f42158b2412bc038076a9006acca5fd28f5a495479cdbe4117da0c2e18faf",
		);
	});

	it("should derive from a WIF", async () => {
		assert.is(
			await new PrivateKeyFactory().fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			"0000000000000000000000000000000000000000000000000000000000000001",
		);
	});
});
