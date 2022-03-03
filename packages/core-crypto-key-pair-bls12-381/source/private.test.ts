import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";

import { describe } from "../../core-test-framework/source";
import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container.Container }>("PrivateKeyFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
	});

	it("should derive from an mnemonic", async (context) => {
		assert.is(
			await context.container.resolve(PrivateKeyFactory).fromMnemonic(mnemonic),
			"6a0f42158b2412bc038076a9006acca5fd28f5a495479cdbe4117da0c2e18faf",
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
