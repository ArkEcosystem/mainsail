import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ app: Application, factory: PrivateKeyFactory }>("PrivateKeyFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();

		context.factory = context.app.resolve(PrivateKeyFactory);
	});

	it("should derive from an mnemonic", async ({ factory }) => {
		assert.is(
			await factory.fromMnemonic(mnemonic),
			"6a0f42158b2412bc038076a9006acca5fd28f5a495479cdbe4117da0c2e18faf",
		);
	});

	it("should derive from a WIF", async ({ factory }) => {
		assert.is(
			await factory
				.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn"),
			"0000000000000000000000000000000000000000000000000000000000000001",
		);
	});
});
