import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-schnorr/source/pair";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { mnemonic, wif } from "../test/identity.json";
import { devnet } from "../test/networks.json";
import { WIFFactory } from "./wif.factory";

describe<{
	app: Application;
	factory: WIFFactory;
}>("Identities - WIFFactory", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			genesisBlock: {
				block: {
					height: 0,
				},
			},
			milestones: [],
			// @ts-ignore
			network: devnet,
		});

		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();

		context.factory = context.app.resolve(WIFFactory);
	});

	it("#fromMnemonic - should be OK", async ({ factory }) => {
		assert.equal(await factory.fromMnemonic(mnemonic), wif);
	});

	it("#fromKeys -  should be OK", async ({ factory, app }) => {
		assert.equal(
			await factory.fromKeys(
				await app.get<KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory).fromMnemonic(mnemonic),
			),
			wif,
		);
	});
});
