import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { KeyPairFactory } from "@arkecosystem/core-crypto-key-pair-schnorr/source/pair";

import { describe, Sandbox } from "../../core-test-framework";
import { mnemonic, wif } from "../test/identity.json";
import { devnet } from "../test/networks.json";
import { WIFFactory } from "./wif.factory";

describe<{
	sandbox: Sandbox;
	factory: WIFFactory;
}>("Identities - WIFFactory", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			// @ts-ignore
			genesisBlock: {},
			milestones: [],
			// @ts-ignore
			network: devnet,
		});

		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.KeyPairFactory)
			.to(KeyPairFactory)
			.inSingletonScope();

		context.factory = context.sandbox.app.resolve(WIFFactory);
	});

	it("#fromMnemonic - should be OK", async ({ factory }) => {
		assert.equal(await factory.fromMnemonic(mnemonic), wif);
	});

	it("#fromKeys -  should be OK", async ({ factory, sandbox }) => {
		assert.equal(
			await factory.fromKeys(
				await sandbox.app
					.get<KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPairFactory)
					.fromMnemonic(mnemonic),
			),
			wif,
		);
	});
});
