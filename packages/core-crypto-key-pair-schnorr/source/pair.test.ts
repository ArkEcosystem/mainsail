import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/core-contracts";
import { Configuration } from "@mainsail/core-crypto-config";

import { describe } from "../../core-test-framework/source";
import { KeyPairFactory } from "./pair";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container.Container }>("KeyPairFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.equal(await context.container.resolve(KeyPairFactory).fromMnemonic(mnemonic), {
			compressed: true,
			privateKey: "814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
			publicKey: "e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
		});
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.equal(
			await context.container
				.resolve(KeyPairFactory)
				.fromPrivateKey(Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex")),
			{
				compressed: true,
				privateKey: "814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
				publicKey: "e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
			},
		);
	});
});
