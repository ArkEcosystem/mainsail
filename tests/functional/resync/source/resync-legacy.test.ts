import type { Contracts } from "@mainsail/contracts";
import { describe } from "@mainsail/test-runner";
import { setupLegacySyncNode } from "./setup.js";
import { verifyLegacyNodeIntegrity } from "./integrity.js";
import { forgeTransactions, getWallets } from "./utilities.js";
import { dirSync } from "tmp";
import { parseEther } from "viem";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { Identifiers } from "@mainsail/constants";

describe<{
	syncNode: Contracts.Kernel.Application;
	dataDirectory: string;
}>("Resync Legacy", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		const dataDirectory = dirSync({ unsafeCleanup: true }).name;

		context.dataDirectory = dataDirectory;
		context.syncNode = await setupLegacySyncNode(dataDirectory);
	});

	afterEach(async ({ syncNode, dataDirectory }) => {
		await verifyLegacyNodeIntegrity(assert, syncNode, dataDirectory);
	});

	it.only("should be ok", async ({ syncNode }) => {
		await Utils.waitBlock({ app: syncNode }, 5);
	});

	it("should be ok with transfer from legacy cold wallet", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);

		const mnemonic = "this is a top secret passphrase";
		// base58: D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib
		// pub: 034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192
		// priv: 814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2

		const legacyWalletKeyPair = await syncNode
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				"wallet",
			)
			.fromMnemonic(mnemonic);

		// const legacyWalletAddress = await syncNode.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		//     .fromPublicKey(legacyWalletKeyPair.publicKey);

		// console.log(legacyWalletAddress, legacyWalletKeyPair);

		const context = { app: syncNode, wallets };
		const randomWallet = await Utils.getRandomColdWallet(context);
		const randomWallet2 = await Utils.getRandomColdWallet(context);

		// Send legacy funds to a new wallet
		const txFromLegacyWallet = await EvmCalls.makeEvmCall(context, {
			sender: legacyWalletKeyPair,
			recipient: randomWallet.address,
			value: parseEther("0.001"),
		});
		assert.true(await forgeTransactions(context, [txFromLegacyWallet]));

		// Spent funds
		const txFromReceivedLegacyFunds = await EvmCalls.makeEvmCall(context, {
			sender: randomWallet.keyPair,
			recipient: randomWallet2.address,
			value: parseEther("0.0005"),
		});
		assert.true(await forgeTransactions(context, [txFromReceivedLegacyFunds]));
	});
});
