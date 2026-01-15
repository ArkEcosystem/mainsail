import type { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getWallets, waitBlock, getAddressByPublicKey } from "./utilities.js";
import { getCreateAddress, Hex, parseEther } from "viem";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
	legacyColdWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		mainsailAddress: string;
	}[];
}>("Tokens", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should ingest tokens", async (context) => {
		const deployTx = await EvmCalls.makeEvmCallDeployErc20Contract(context);

		let tokens = await getAllTokens(context);
		assert.empty(tokens);
		let tokenHolders = await getAllTokenHolders(context);
		assert.empty(tokenHolders);

		await addTransactionsToPool(context, [deployTx]);
		await waitBlock(context, 2);

		const erc20Address = getCreateAddress({
			from: deployTx.data.from as Hex,
			nonce: 2n,
		});

		// api-sync found token
		tokens = await getAllTokens(context);
		assert.length(tokens, 1);
		assert.equal(tokens[0].address, erc20Address.toLowerCase());
		assert.equal(tokens[0].deploymentHash, deployTx.hash);

		tokenHolders = await getAllTokenHolders(context);

		assert.length(tokenHolders, 1);
		assert.equal(
			tokenHolders[0].address,
			await getAddressByPublicKey(context.sandbox, context.wallets[0].publicKey),
		);
		assert.equal(tokenHolders[0].tokenAddress, erc20Address.toLowerCase());
		assert.equal(tokenHolders[0].balance, parseEther("100000000").toString());

		// api-sync updates balances
		const transferAmount = parseEther("1234");
		const randomWallet = await Utils.getRandomColdWallet(context);
		const transferTx = await EvmCalls.makeEvmCall(context, {
			recipient: erc20Address,
			payload: EvmCalls.encodeErc20Transfer(randomWallet.address, transferAmount),
		});

		await addTransactionsToPool(context, [transferTx]);
		await waitBlock(context, 2);

		const balanceAfter = await EvmCalls.getErc20BalanceOf(context, erc20Address, randomWallet.address);
		assert.equal(balanceAfter, transferAmount);

		tokens = await getAllTokens(context);
		assert.length(tokens, 1);

		tokenHolders = await getAllTokenHolders(context);
		assert.length(tokenHolders, 2);

		assert.equal(
			tokenHolders[0].address,
			await getAddressByPublicKey(context.sandbox, context.wallets[0].publicKey),
		);
		assert.equal(tokenHolders[0].tokenAddress, erc20Address.toLowerCase());
		assert.equal(tokenHolders[0].balance, (parseEther("100000000") - transferAmount).toString());

		assert.equal(tokenHolders[1].address, randomWallet.address);
		assert.equal(tokenHolders[1].tokenAddress, erc20Address.toLowerCase());
		assert.equal(tokenHolders[1].balance, transferAmount.toString());
	});

	const getAllTokens = async ({ sandbox }: { sandbox: Sandbox }): Promise<Models.Token[]> => {
		const tokenRepositoryFactory = sandbox.app.get<ApiDatabaseContracts.TokenRepositoryFactory>(
			ApiDatabaseIdentifiers.TokenRepositoryFactory,
		);

		return tokenRepositoryFactory().createQueryBuilder().getMany();
	};

	const getAllTokenHolders = async ({ sandbox }: { sandbox: Sandbox }): Promise<Models.TokenHolder[]> => {
		const tokenHolderRepositoryFactory = sandbox.app.get<ApiDatabaseContracts.TokenHolderRepositoryFactory>(
			ApiDatabaseIdentifiers.TokenHolderRepositoryFactory,
		);

		return tokenHolderRepositoryFactory().createQueryBuilder().getMany();
	};
});
