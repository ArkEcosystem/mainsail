import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { runDatabaseQuery, setupSyncNode } from "./setup.js";
import { verifyNodeIntegrity } from "./integrity.js";
import { forgeTransactions, getRandomConsensusKeyPair, getWallets, waitForApiSync } from "./utilities.js";
import { dirSync } from "tmp";
import { getCreateAddress, Hex, parseEther } from "viem";

describe<{
	syncNode: Contracts.Kernel.Application;
	dataDirectory: string;
}>("Resync", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		const dataDirectory = dirSync({ unsafeCleanup: true }).name;

		context.dataDirectory = dataDirectory;
		context.syncNode = await setupSyncNode(dataDirectory);
	});

	afterEach(async ({ syncNode, dataDirectory }) => {
		await verifyNodeIntegrity(assert, syncNode, dataDirectory);
	});

	it("should be ok", async ({ syncNode }) => {
		await Utils.waitBlock({ app: syncNode }, 54);
	});

	it("should be ok with votes", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);

		const context = { app: syncNode, wallets };
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		assert.true(await forgeTransactions(context, [fundTx]));

		const voteTx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: await Utils.getAddressByPublicKey(context, wallets[0].publicKey),
		});

		assert.true(await forgeTransactions(context, [voteTx]));

		const unvoteTx = await EvmCalls.makeValidatorUnvote(context, {
			sender: randomWallet.keyPair,
		});

		assert.true(await forgeTransactions(context, [unvoteTx]));
	});

	it("should be ok with usernames", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);

		const context = { app: syncNode, wallets };
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		assert.true(await forgeTransactions(context, [fundTx]));

		const usernameTx = await EvmCalls.makeUsernameRegistration(context, {
			sender: randomWallet.keyPair,
			username: "bob",
		});
		assert.true(await forgeTransactions(context, [usernameTx]));

		const usernameResignationTx = await EvmCalls.makeUsernameResignation(context, {
			sender: randomWallet.keyPair,
		});

		assert.true(await forgeTransactions(context, [usernameResignationTx]));

		const reregisterUsernameTx = await EvmCalls.makeUsernameRegistration(context, {
			sender: wallets[0],
			username: "bob",
		});

		assert.true(await forgeTransactions(context, [reregisterUsernameTx]));
	});

	it("should be ok with validators", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);

		const context = { app: syncNode, wallets };
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		assert.true(await forgeTransactions(context, [fundTx]));

		const validatorKeyPair = await getRandomConsensusKeyPair(context);
		const validatorRegistrationTx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet.keyPair,
			validatorKeyPair,
		});

		assert.true(await forgeTransactions(context, [validatorRegistrationTx]));

		const validatorResignationTx = await EvmCalls.makeValidatorResignation(context, {
			sender: randomWallet.keyPair,
		});

		assert.true(await forgeTransactions(context, [validatorResignationTx]));
	});

	it("should be ok with tokens", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);

		const context = { app: syncNode, wallets };
		const deployTx = await EvmCalls.makeEvmCallDeployErc20Contract(context);
		const erc20Address = getCreateAddress({
			from: deployTx.from as Hex,
			nonce: 2n,
		});

		assert.true(await forgeTransactions(context, [deployTx]));

		const randomWallet = await Utils.getRandomColdWallet(context);

		const transferTx = await EvmCalls.makeEvmCall(context, {
			recipient: erc20Address,
			payload: EvmCalls.encodeErc20Transfer(randomWallet.address, parseEther("1000")),
		});

		assert.true(await forgeTransactions(context, [transferTx]));
	});

	it("should number the token actions of a block across tokens", async ({ syncNode }) => {
		const wallets = await getWallets(syncNode);
		const context = { app: syncNode, wallets };

		const deployments = [
			await EvmCalls.makeEvmCallDeployErc20Contract(context),
			await EvmCalls.makeEvmCallDeployErc20Contract(context, { nonceOffset: 1 }),
		];
		assert.true(await forgeTransactions(context, deployments));
		const [first, second] = deployments.map(({ from, nonce }) => getCreateAddress({ from: from as Hex, nonce }));

		const recipient = await Utils.getRandomColdWallet(context);
		const payload = EvmCalls.encodeErc20Transfer(recipient.address, parseEther("1"));
		const transfers = [
			await EvmCalls.makeEvmCall(context, { payload, recipient: second }),
			await EvmCalls.makeEvmCall(context, { nonceOffset: 1, payload, recipient: first }),
		];
		assert.true(await forgeTransactions(context, transfers));
		await waitForApiSync(syncNode);

		const actions = await runDatabaseQuery(syncNode.get<string>(Identifiers.Application.Name), (dataSource) =>
			dataSource.query(
				"SELECT address, block_number, index FROM token_actions WHERE transaction_hash = ANY($1) ORDER BY index",
				[transfers.map(({ hash }) => hash)],
			),
		);
		assert.equal(actions[0].block_number, actions[1].block_number);
		assert.equal(
			actions.map(({ address, index }) => [address.toLowerCase(), index]),
			[
				[second.toLowerCase(), 0],
				[first.toLowerCase(), 1],
			],
		);
	});

	it.skip("should be ok with legacy wallets", async ({ syncNode }) => {
		// TODO
	});
});
