import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{
	app: Application
	factory: PrivateKeyFactory
}>("PrivateKeyFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();
		context.factory = context.app.resolve(PrivateKeyFactory);
	});

	it("should derive from an mnemonic", async ({ factory }) => {
		assert.is(
			await factory.fromMnemonic(mnemonic),
			"814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
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
