import { Application, Enums, Utils } from "@arkecosystem/core-kernel";
import { Identifiers } from "@arkecosystem/core-contracts";
import { StateBuilder } from "./state-builder";
import { WalletRepository } from "./wallets";
import { describeSkip } from "../../core-test-framework";
import { setUp, setUpDefaults } from "../test/setup";
import { SinonSpy } from "sinon";
import { Configuration } from "../../core-crypto-config";

const getBlockRewardsDefault = setUpDefaults.getBlockRewards[0];
const getSentTransactionDefault = setUpDefaults.getSentTransaction[0];

const generatorKey = getBlockRewardsDefault.generatorPublicKey;
const senderKey = getSentTransactionDefault.senderPublicKey;

let restoreDefaultSentTransactions: () => void;

const saveDefaultTransactions = (): (() => void) => {
	const saveTransaction = setUpDefaults.getSentTransaction;
	return () => (setUpDefaults.getSentTransaction = saveTransaction);
};

describeSkip<{
	app: Application;
	configuration: Configuration;
	walletRepo: WalletRepository;
	stateBuilder: StateBuilder;
	getBlockRewardsSpy: SinonSpy;
	getSentTransactionSpy: SinonSpy;
	getRegisteredHandlersSpy: SinonSpy;
	dispatchSpy: SinonSpy;
	loggerWarningSpy: SinonSpy;
	loggerInfoSpy: SinonSpy;
}>("StateBuilder", ({ it, beforeAll, afterEach, beforeEach, assert }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.walletRepo = env.walletRepo;
		context.stateBuilder = env.stateBuilder;
		context.app = env.sandbox.app;

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.configuration = context.app.get(Identifiers.Cryptography.Configuration);
		context.getBlockRewardsSpy = env.spies.getBlockRewardsSpy;
		context.getSentTransactionSpy = env.spies.getSentTransactionSpy;
		context.getRegisteredHandlersSpy = env.spies.getRegisteredHandlersSpy;
		context.dispatchSpy = env.spies.dispatchSpy;
		context.loggerWarningSpy = env.spies.logger.warning;
		context.loggerInfoSpy = env.spies.logger.info;

		restoreDefaultSentTransactions = saveDefaultTransactions();
	});

	beforeEach(async (context) => {
		context.app.config("crypto.exceptions.negativeBalances", {});

		restoreDefaultSentTransactions();

		// sender wallet balance should always be enough for default transactions (unless it is overridden)
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setBalance(Utils.BigNumber.make(100000));
	});

	afterEach((context) => {
		context.walletRepo.reset();

		context.getBlockRewardsSpy.resetHistory();
		context.getSentTransactionSpy.resetHistory();
		context.getRegisteredHandlersSpy.resetHistory();
		context.dispatchSpy.resetHistory();
		context.loggerWarningSpy.resetHistory();
		context.loggerInfoSpy.resetHistory();
	});

	it("should call block repository to get initial block rewards", async (context) => {
		await context.stateBuilder.run();

		assert.true(context.getBlockRewardsSpy.called);
	});

	it("should get registered handlers", async (context) => {
		await context.stateBuilder.run();

		assert.true(context.getRegisteredHandlersSpy.called);
	});

	it("should get sent transactions", async (context) => {
		await context.stateBuilder.run();

		assert.true(context.getSentTransactionSpy.called);
	});

	it("should apply block rewards to generator wallet", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(generatorKey);
		wallet.setBalance(Utils.BigNumber.ZERO);
		context.walletRepo.index(wallet);
		const expectedBalance = wallet.getBalance().plus(getBlockRewardsDefault.rewards);

		await context.stateBuilder.run();

		assert.equal(wallet.getBalance(), expectedBalance);
	});

	it("should apply the transaction data to the sender", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setBalance(Utils.BigNumber.make(80000));
		context.walletRepo.index(wallet);

		const expectedBalance = wallet
			.getBalance()
			.minus(getSentTransactionDefault.amount)
			.minus(getSentTransactionDefault.fee);

		await context.stateBuilder.run();

		assert.equal(wallet.getNonce(), getSentTransactionDefault.nonce);
		assert.equal(wallet.getBalance(), expectedBalance);
	});

	it("should fail if any wallet balance is negative and not whitelisted", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setBalance(Utils.BigNumber.make(-80000));
		wallet.setPublicKey(senderKey);

		context.walletRepo.index(wallet);

		await context.stateBuilder.run();

		assert.true(
			context.loggerWarningSpy.calledWith(
				"Wallet ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp has a negative balance of '-135555'",
			),
		);
		assert.false(context.dispatchSpy.called);
	});

	it("should not fail for negative genesis wallet balances", async (context) => {
		const genesisPublicKeys: string[] = context.configuration
			.get("genesisBlock.transactions")
			.reduce((acc, curr) => [...acc, curr.senderPublicKey], []);

		const wallet = await context.walletRepo.findByPublicKey(genesisPublicKeys[0]);
		wallet.setBalance(Utils.BigNumber.make(-80000));
		wallet.setPublicKey(genesisPublicKeys[0]);

		context.walletRepo.index(wallet);

		await context.stateBuilder.run();

		assert.false(context.loggerWarningSpy.called);
		assert.true(context.dispatchSpy.calledWith(Enums.StateEvent.BuilderFinished));
	});

	it("should not fail if the publicKey is whitelisted", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setNonce(getSentTransactionDefault.nonce);
		const allowedWalletNegativeBalance = Utils.BigNumber.make(5555);
		wallet.setBalance(allowedWalletNegativeBalance);
		wallet.setPublicKey(senderKey);
		context.walletRepo.index(wallet);

		const balance: Record<string, Record<string, string>> = {
			[senderKey]: {
				[wallet.getNonce().toString()]: allowedWalletNegativeBalance.toString(),
			},
		};

		context.app.config("crypto.exceptions.negativeBalances", balance);

		setUpDefaults.getSentTransaction = [];

		await context.stateBuilder.run();

		assert.false(context.loggerWarningSpy.called);
		assert.true(context.dispatchSpy.calledWith(Enums.StateEvent.BuilderFinished));
	});

	it("should fail if the whitelisted key doesn't have the allowed negative balance", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setNonce(getSentTransactionDefault.nonce);
		wallet.setBalance(Utils.BigNumber.make(-90000));
		wallet.setPublicKey(senderKey);
		context.walletRepo.index(wallet);

		const balance: Record<string, Record<string, string>> = {
			[senderKey]: {
				[wallet.getNonce().toString()]: Utils.BigNumber.make(-80000).toString(),
			},
		};

		context.app.config("crypto.exceptions.negativeBalances", balance);

		setUpDefaults.getSentTransaction = [];

		await context.stateBuilder.run();

		assert.true(
			context.loggerWarningSpy.calledWith(
				"Wallet ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp has a negative balance of '-90000'",
			),
		);
		assert.false(context.dispatchSpy.called);
	});

	it("should not fail if the whitelisted key has the allowed negative balance", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setNonce(getSentTransactionDefault.nonce);
		wallet.setBalance(Utils.BigNumber.make(-90000));
		wallet.setPublicKey(senderKey);
		context.walletRepo.index(wallet);

		const balance: Record<string, Record<string, string>> = {
			[senderKey]: {
				[wallet.getNonce().toString()]: Utils.BigNumber.make(-90000).toString(),
			},
		};

		context.app.config("crypto.exceptions.negativeBalances", balance);

		setUpDefaults.getSentTransaction = [];

		await context.stateBuilder.run();

		assert.false(context.loggerWarningSpy.called);
		assert.true(context.dispatchSpy.called);
	});

	it("should not fail if delegates vote balance isn't below 0", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setBalance(Utils.BigNumber.ZERO);
		context.walletRepo.index(wallet);
		wallet.setAttribute("delegate.voteBalance", Utils.BigNumber.make(100));

		setUpDefaults.getSentTransaction = [];

		await context.stateBuilder.run();

		assert.false(context.loggerWarningSpy.called);
		assert.true(context.dispatchSpy.called);
	});

	it("should fail if the wallet has no public key", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setNonce(getSentTransactionDefault.nonce);
		wallet.setBalance(Utils.BigNumber.make(-90000));
		// @ts-ignore
		wallet.publicKey = undefined;
		context.walletRepo.index(wallet);

		const balance: Record<string, Record<string, string>> = {
			[senderKey]: {
				[wallet.getNonce().toString()]: Utils.BigNumber.make(-90000).toString(),
			},
		};

		context.app.config("crypto.exceptions.negativeBalances", balance);

		setUpDefaults.getSentTransaction = [];

		await context.stateBuilder.run();

		assert.true(
			context.loggerWarningSpy.calledWith(
				"Wallet ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp has a negative balance of '-90000'",
			),
		);
		assert.false(context.dispatchSpy.called);
	});

	it("should emit an event when the builder is finished", async (context) => {
		await context.stateBuilder.run();

		assert.true(context.dispatchSpy.calledWith(Enums.StateEvent.BuilderFinished));
	});

	it("should exit app if any vote balance is negative", async (context) => {
		const wallet = await context.walletRepo.findByPublicKey(senderKey);
		wallet.setBalance(Utils.BigNumber.ZERO);
		context.walletRepo.index(wallet);
		wallet.setAttribute("delegate.voteBalance", Utils.BigNumber.make(-100));

		setUpDefaults.getSentTransaction = [];

		await context.stateBuilder.run();

		assert.true(
			context.loggerWarningSpy.calledWith(
				"Wallet ATtEq2tqNumWgR9q9zF6FjGp34Mp5JpKGp has a negative vote balance of '-100'",
			),
		);
	});

	it("should capitalise registered handlers", async (context) => {
		setUpDefaults.getRegisteredHandlers = [
			{
				getConstructor: () => ({
					version: 1,
					key: "test",
				}),
			},
		];

		setUpDefaults.getSentTransaction = [];

		await assert.resolves(() => context.stateBuilder.run());

		assert.true(context.loggerInfoSpy.calledWith(`State Generation - Step 3 of 4: Test v1`));
	});
});
