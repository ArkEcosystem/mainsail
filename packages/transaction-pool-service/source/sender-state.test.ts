import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import {
	InsufficientBalanceError,
	TransactionExceedsMaximumByteSizeError,
	TransactionFailedToPreverifyError,
	TransactionFromWrongNetworkError,
	UnexpectedLegacySecondSignatureError,
	UnexpectedNonceError,
} from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { SenderState } from "./sender-state";

const address = "0x75545540230d5c3BEf023202d23CB74cFA723376";
const legacyAddress = "DH8WhBj6ron2tQhdFPQzjDcrk2CCY997MP";
const legacySecondPublicKey = "02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e4";
const legacySecondSignature =
	"8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce01";
const chainId = 10_000;
const maxTransactionBytes = 1024;
const maxGasLimit = 30_000_000;

const gasLimit = 21_000;
const gasPrice = 5;
const value = 1_000n;
const cost = value + BigInt(gasPrice * gasLimit);

const makeTransaction = (overrides: Record<string, unknown> = {}): Contracts.Crypto.Transaction =>
	({
		data: "0xabcd",
		from: address,
		gasLimit,
		gasPrice,
		hash: "hash",
		network: chainId,
		nonce: 5n,
		senderLegacyAddress: legacyAddress,
		serialized: Buffer.alloc(100),
		to: "0x0000000000000000000000000000000000000001",
		value,
		...overrides,
	}) as unknown as Contracts.Crypto.Transaction;

describe<{
	app: Application;
	senderState: SenderState;
	account: { balance: bigint; nonce: bigint; legacyAttributes: Contracts.Evm.LegacyAttributes };
	evm: any;
	verifier: any;
}>("SenderState", ({ it, assert, beforeEach, spy, stub }) => {
	const assertZeroBalance = async (senderState: SenderState) => {
		const nonce = senderState.getNonce();

		await senderState.apply(makeTransaction({ gasPrice: 0, nonce, value: 0n }));
		await assert.rejects(
			() => senderState.apply(makeTransaction({ gasPrice: 0, nonce: nonce + 1n, value: 1n })),
			InsufficientBalanceError,
		);
	};

	beforeEach(async (context) => {
		context.account = { balance: cost, legacyAttributes: {}, nonce: 5n };

		context.evm = {
			getAccountInfoExtended: async () => ({ ...context.account }),
			preverifyTransaction: async () => ({ success: true }),
		};

		context.verifier = {
			verifyLegacySecondSignature: async () => true,
		};

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => ({ maxTransactionBytes })[key] })
			.whenTagged("plugin", "transaction-pool-service");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getMilestone: () => ({ block: { maxGasLimit }, evmSpec: "Osaka" }),
			getNetwork: () => ({ chainId }),
		});
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);
		context.app.bind(Identifiers.BlockchainUtils.FeeCalculator).toConstantValue({
			calculate: (transaction: Contracts.Crypto.Transaction) =>
				BigInt(transaction.gasPrice) * BigInt(transaction.gasLimit),
		});
		context.app.bind(Identifiers.Cryptography.Transaction.Verifier).toConstantValue(context.verifier);

		context.senderState = await context.app.resolve(SenderState).configure(address, legacyAddress);
	});

	it("configure - should load the sender wallet from the evm", async ({ senderState, account, evm }) => {
		account.nonce = 7n;
		const getAccountInfo = spy(evm, "getAccountInfoExtended");
		assert.equal(senderState.getNonce(), 5n);

		assert.equal(await senderState.configure(address, legacyAddress), senderState);

		getAccountInfo.calledOnce();
		getAccountInfo.calledWith(address, legacyAddress);
		assert.equal(senderState.getNonce(), 7n);
	});

	it("apply - should increase the nonce", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await senderState.apply(makeTransaction());

		assert.equal(senderState.getNonce(), 6n);
	});

	it("apply - should deduct value and fee from the balance", async ({ senderState, account }) => {
		account.balance = 2n * cost;
		await senderState.configure(address, legacyAddress);

		await senderState.apply(makeTransaction({ nonce: 5n }));
		await senderState.apply(makeTransaction({ nonce: 6n }));

		await assertZeroBalance(senderState);
	});

	it("apply - should accept a transaction of exactly the maximum byte size", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await senderState.apply(makeTransaction({ serialized: Buffer.alloc(maxTransactionBytes) }));

		assert.equal(senderState.getNonce(), 6n);
	});

	it("apply - should throw when the transaction exceeds the maximum byte size", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(
			() => senderState.apply(makeTransaction({ serialized: Buffer.alloc(maxTransactionBytes + 1) })),
			TransactionExceedsMaximumByteSizeError,
		);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should throw when the transaction is from another network", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(
			() => senderState.apply(makeTransaction({ network: chainId + 1 })),
			TransactionFromWrongNetworkError,
		);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should accept a transaction that does not specify a network", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await senderState.apply(makeTransaction({ network: undefined }));

		assert.equal(senderState.getNonce(), 6n);
	});

	it("apply - should throw when the nonce is lower than the sender nonce", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(() => senderState.apply(makeTransaction({ nonce: 4n })), UnexpectedNonceError);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should throw when the nonce is higher than the sender nonce", async ({ senderState }) => {
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(() => senderState.apply(makeTransaction({ nonce: 6n })), UnexpectedNonceError);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should throw when the balance does not cover value and fee", async ({ senderState, account }) => {
		account.balance = cost - 1n;
		await senderState.configure(address, legacyAddress);
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(() => senderState.apply(makeTransaction()), InsufficientBalanceError);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should verify the legacy second signature when the sender has a second public key", async ({
		senderState,
		account,
		verifier,
	}) => {
		account.legacyAttributes = { secondPublicKey: legacySecondPublicKey };
		await senderState.configure(address, legacyAddress);
		const verify = spy(verifier, "verifyLegacySecondSignature");
		const transaction = makeTransaction({ legacySecondSignature });
		assert.equal(senderState.getNonce(), 5n);

		await senderState.apply(transaction);

		verify.calledOnce();
		verify.calledWith(transaction, legacySecondPublicKey);
		assert.equal(senderState.getNonce(), 6n);
	});

	it("apply - should throw when the legacy second signature fails to verify", async ({
		senderState,
		account,
		verifier,
	}) => {
		account.legacyAttributes = { secondPublicKey: legacySecondPublicKey };
		await senderState.configure(address, legacyAddress);
		stub(verifier, "verifyLegacySecondSignature").rejectedValue(new Error("invalid second signature"));
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(
			() => senderState.apply(makeTransaction({ legacySecondSignature })),
			"invalid second signature",
		);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should throw when a legacy second signature is given but the sender has no second public key", async ({
		senderState,
		verifier,
	}) => {
		const verify = spy(verifier, "verifyLegacySecondSignature");
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(
			() => senderState.apply(makeTransaction({ legacySecondSignature })),
			UnexpectedLegacySecondSignatureError,
		);

		verify.neverCalled();
		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should preverify the transaction against the current milestone", async ({ senderState, evm }) => {
		const preverify = spy(evm, "preverifyTransaction");
		const transaction = makeTransaction();

		await senderState.apply(transaction);

		preverify.calledOnce();
		preverify.calledWith({
			blockGasLimit: BigInt(maxGasLimit),
			data: Buffer.from("abcd", "hex"),
			from: address,
			gasLimit: BigInt(gasLimit),
			gasPrice: BigInt(gasPrice),
			legacyAddress,
			nonce: 5n,
			specId: "Osaka",
			to: transaction.to,
			txHash: transaction.hash,
			value,
		});
	});

	it("apply - should throw with the evm reason when preverification fails", async ({ senderState, evm }) => {
		stub(evm, "preverifyTransaction").resolvedValue({ error: "insufficient gas", success: false });
		assert.equal(senderState.getNonce(), 5n);

		await assert.rejects(
			() => senderState.apply(makeTransaction()),
			TransactionFailedToPreverifyError,
			"insufficient gas",
		);

		assert.equal(senderState.getNonce(), 5n);
	});

	it("apply - should throw a generic reason when preverification fails without one", async ({ senderState, evm }) => {
		stub(evm, "preverifyTransaction").resolvedValue({ success: false });

		await assert.rejects(
			() => senderState.apply(makeTransaction()),
			TransactionFailedToPreverifyError,
			"Preverify failed for unknown reason",
		);
	});

	it("apply - should not preverify a transaction that fails the cheaper checks", async ({ senderState, evm }) => {
		const preverify = spy(evm, "preverifyTransaction");

		await assert.rejects(() => senderState.apply(makeTransaction({ nonce: 6n })), UnexpectedNonceError);

		preverify.neverCalled();
	});

	it("revert - should decrease the nonce and refund value and fee", async ({ senderState }) => {
		const transaction = makeTransaction();
		await senderState.apply(transaction);
		assert.equal(senderState.getNonce(), 6n);

		senderState.revert(transaction);

		assert.equal(senderState.getNonce(), 5n);
		// The full cost is available again.
		await senderState.apply(transaction);
	});

	it("reset - should reload the wallet from the evm", async ({ senderState, account, evm }) => {
		await senderState.apply(makeTransaction());
		account.nonce = 9n;
		const getAccountInfo = spy(evm, "getAccountInfoExtended");
		assert.equal(senderState.getNonce(), 6n);

		await senderState.reset();

		getAccountInfo.calledOnce();
		getAccountInfo.calledWith(address, legacyAddress);
		assert.equal(senderState.getNonce(), 9n);
	});

	it("replace - should throw when the nonces do not match", async ({ senderState }) => {
		await assert.rejects(
			() => senderState.replace(makeTransaction({ nonce: 5n }), makeTransaction({ nonce: 6n }), 6n),
			"cannot replace transaction with mismatching nonce",
		);
	});

	it("replace - should swap the cost of the old transaction for the new one", async ({ senderState, account }) => {
		account.balance = cost + 500n;
		await senderState.configure(address, legacyAddress);
		const oldTransaction = makeTransaction();
		await senderState.apply(oldTransaction);

		// Costs more than the remaining 500, but not more than 500 plus the refunded old cost.
		const newTransaction = makeTransaction({ value: value + 500n });
		assert.equal(senderState.getNonce(), 6n);

		assert.true(await senderState.replace(oldTransaction, newTransaction, 6n));

		assert.equal(senderState.getNonce(), 6n);
		await assertZeroBalance(senderState);
	});

	it("replace - should validate the new transaction at the nonce it replaces", async ({ senderState, account }) => {
		account.balance = 2n * cost;
		await senderState.configure(address, legacyAddress);
		const first = makeTransaction({ nonce: 5n });
		await senderState.apply(first);
		await senderState.apply(makeTransaction({ nonce: 6n }));
		assert.equal(senderState.getNonce(), 7n);

		assert.true(await senderState.replace(first, makeTransaction({ nonce: 5n }), 7n));

		assert.equal(senderState.getNonce(), 7n);
	});

	it("replace - should return false and keep the state when the new cost is not affordable", async ({
		senderState,
		evm,
	}) => {
		const oldTransaction = makeTransaction();
		await senderState.apply(oldTransaction);
		const preverify = spy(evm, "preverifyTransaction");
		assert.equal(senderState.getNonce(), 6n);

		assert.false(await senderState.replace(oldTransaction, makeTransaction({ value: value + 1n }), 6n));

		preverify.neverCalled();
		assert.equal(senderState.getNonce(), 6n);
		await assertZeroBalance(senderState);
	});

	it("replace - should throw and keep the state when the new transaction is invalid", async ({ senderState }) => {
		const oldTransaction = makeTransaction();
		await senderState.apply(oldTransaction);
		assert.equal(senderState.getNonce(), 6n);

		await assert.rejects(
			() => senderState.replace(oldTransaction, makeTransaction({ network: chainId + 1 }), 6n),
			TransactionFromWrongNetworkError,
		);

		assert.equal(senderState.getNonce(), 6n);
		await assertZeroBalance(senderState);
	});
});
