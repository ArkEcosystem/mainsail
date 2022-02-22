import { describe } from "@arkecosystem/core-test-framework";

import { PrivateKeyFactory } from "./private";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("PrivateKeyFactory", ({ assert, it }) => {
	it("should derive from an mnemonic", async () => {
		assert.is(
			await new PrivateKeyFactory().fromMnemonic(mnemonic),
			"4ebec3c261b3edf63769f2de1b8a0474c149ca043d7535acf9880673c27e2c62",
		);
	});

	it("should derive from a WIF", async () => {
		assert.is(
			await new PrivateKeyFactory().fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			"0000000000000000000000000000000000000000000000000000000000000001",
		);
	});
});
