import { Container } from "@arkecosystem/core-container";
import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { describe } from "@arkecosystem/core-test-framework";

import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container.Container }>("PrivateKeyFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container.Container();
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
	});

	it("should derive from an mnemonic", async (context) => {
		assert.is(
			await context.container.resolve(PrivateKeyFactory).fromMnemonic(mnemonic),
			"814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
		);
	});

	it("should derive from a WIF", async (context) => {
		assert.is(
			await context.container
				.resolve(PrivateKeyFactory)
				.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			"0000000000000000000000000000000000000000000000000000000000000001",
		);
	});
});
