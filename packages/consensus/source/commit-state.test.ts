import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { CommitState } from "./commit-state";

describe<{
	app: Application;
	commitState: CommitState;
	commit: Contracts.Crypto.Commit;
	validatorSet: any;
}>("CommitState", ({ it, assert, beforeEach }) => {
	const validators = [0, 1, 2].map((index) => ({ address: `address-${index}`, blsPublicKey: `bls-${index}` }));

	const processorResult: Contracts.Processor.BlockProcessorResult = {
		feeUsed: 10n,
		gasUsed: 21_000,
		receipts: new Map(),
		success: true,
	};

	beforeEach((context) => {
		context.validatorSet = { getRoundValidators: () => validators };
		context.commit = {
			block: { hash: "block-hash", number: 7 },
			proof: { round: 2, signature: "aggregated", validators: [true, true, false] },
			serialized: "00",
		} as unknown as Contracts.Crypto.Commit;

		context.app = new Application();
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		context.commitState = context.app.resolve(CommitState).configure(context.commit);
	});

	it("#configure - should return the commit state itself for chaining", ({ app, commit }) => {
		// A fresh instance is needed here because the shared one is already configured in beforeEach.
		const instance = app.resolve(CommitState);

		assert.is(instance.configure(commit), instance);
	});

	it("#blockNumber - should be taken from the committed block", ({ commitState }) => {
		assert.equal(commitState.blockNumber, 7);
	});

	it("#round - should be taken from the commit proof", ({ commitState }) => {
		assert.equal(commitState.round, 2);
	});

	it("#validators - should list the round validators by consensus public key", ({ commitState }) => {
		assert.equal(commitState.validators, ["bls-0", "bls-1", "bls-2"]);
	});

	it("#validators - should be captured at configure time", ({ commitState, validatorSet }) => {
		// A later change of the active set must not leak into an already configured commit state.
		validatorSet.getRoundValidators = () => [];

		assert.equal(commitState.validators, ["bls-0", "bls-1", "bls-2"]);
	});

	it("#getBlock - should return the committed block", ({ commitState, commit }) => {
		assert.is(commitState.getBlock(), commit.block);
	});

	it("#getCommit - should resolve with the configured commit", async ({ commitState, commit }) => {
		assert.is(await commitState.getCommit(), commit);
	});

	it("#hasProcessorResult - should be false until a result is set", ({ commitState }) => {
		assert.false(commitState.hasProcessorResult());

		commitState.setProcessorResult(processorResult);

		assert.true(commitState.hasProcessorResult());
	});

	it("#getProcessorResult - should throw when no result is set", ({ commitState }) => {
		assert.throws(() => commitState.getProcessorResult(), "Processor result is undefined.");
	});

	it("#getProcessorResult - should return the stored result", ({ commitState }) => {
		commitState.setProcessorResult(processorResult);

		assert.is(commitState.getProcessorResult(), processorResult);
	});

	it("#setProcessorResult - should replace a previous result", ({ commitState }) => {
		const replacement = { ...processorResult, success: false };

		commitState.setProcessorResult(processorResult);
		commitState.setProcessorResult(replacement);

		assert.is(commitState.getProcessorResult(), replacement);
	});

	it("#getAccountUpdates - should be empty by default", ({ commitState }) => {
		assert.equal(commitState.getAccountUpdates(), []);
	});

	it("#setAccountUpdates - should store the account updates", ({ commitState }) => {
		const accountUpdates = [{ address: "address-0", nonce: 1n }] as unknown as Contracts.Evm.AccountUpdate[];

		commitState.setAccountUpdates(accountUpdates);

		assert.is(commitState.getAccountUpdates(), accountUpdates);
	});
});
