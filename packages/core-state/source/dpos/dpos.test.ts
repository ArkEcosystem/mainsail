import { Contracts, Utils } from "@arkecosystem/core-kernel";
import { describe } from "@arkecosystem/core-test-framework";
import { Utils as CryptoUtils } from "@arkecosystem/crypto/source";
import { SATOSHI } from "@arkecosystem/crypto/source/constants";
import { SinonSpy } from "sinon";

import { buildDelegateAndVoteWallets } from "../../test/build-delegate-and-vote-balances";
import { setUp } from "../../test/setup";
import { WalletRepository } from "../wallets";
import { DposState } from "./dpos";

describe<{
	dposState: DposState;
	walletRepo: WalletRepository;
	logger: SinonSpy;
	round: Contracts.Shared.RoundInfo;
}>("dpos", ({ it, beforeAll, beforeEach, afterEach, assert }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.dposState = env.dPosState;
		context.walletRepo = env.walletRepo;
		context.logger = env.spies.logger.debug;
	});

	beforeEach((context) => {
		context.walletRepo.reset();

		buildDelegateAndVoteWallets(5, context.walletRepo);
	});

	afterEach((context) => {
		context.walletRepo.reset();
		context.logger.resetHistory();
	});

	it.skip("should update delegate votes of htlc locked balances", async (context) => {
		context.dposState.buildVoteBalances();

		const delegates = context.walletRepo.allByUsername();

		for (let i = 0; i < 5; i++) {
			const delegate = delegates[4 - i];
			const total = CryptoUtils.BigNumber.make(5 - i)
				.times(1000)
				.times(SATOSHI);

			assert.equal(delegate.getAttribute<CryptoUtils.BigNumber>("delegate.voteBalance"), total);
		}
	});

	it("buildDelegateRanking - should build ranking and sort delegates by vote balance", async (context) => {
		context.dposState.buildVoteBalances();
		context.dposState.buildDelegateRanking();

		const delegates = context.dposState.getActiveDelegates();

		for (let i = 0; i < 5; i++) {
			const delegate = delegates[i];
			const total = CryptoUtils.BigNumber.make((5 - i) * 1000 * SATOSHI);

			assert.equal(delegate.getAttribute<number>("delegate.rank"), i + 1);
			assert.equal(delegate.getAttribute<CryptoUtils.BigNumber>("delegate.voteBalance"), total);
		}
	});

	it("buildDelegateRanking - should throw if two wallets have the same public key", (context) => {
		const delegates = buildDelegateAndVoteWallets(5, context.walletRepo);
		delegates[0].setAttribute("delegate.resigned", true);

		delegates[1].setAttribute("delegate.voteBalance", Utils.BigNumber.make(5467));
		delegates[2].setAttribute("delegate.voteBalance", Utils.BigNumber.make(5467));
		delegates[1].setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		delegates[2].setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		context.walletRepo.index(delegates[2]);

		assert.throws(
			() => context.dposState.buildDelegateRanking(),
			'The balance and public key of both delegates are identical! Delegate "delegate2" appears twice in the list.',
		);
	});

	it("buildDelegateRanking - should not throw if public keys are different and balances are the same", (context) => {
		const delegates = buildDelegateAndVoteWallets(5, context.walletRepo);

		delegates[1].setAttribute("delegate.voteBalance", Utils.BigNumber.make(5467));
		delegates[2].setAttribute("delegate.voteBalance", Utils.BigNumber.make(5467));

		assert.not.throws(() => context.dposState.buildDelegateRanking());
		assert.equal(delegates[1].getAttribute("delegate.rank"), 1);
		assert.equal(delegates[2].getAttribute("delegate.rank"), 2);
		assert.equal(delegates[0].getAttribute("delegate.rank"), 3);
	});

	it("setDelegatesRound - should throw if there are not enough delegates", (context) => {
		context.dposState.buildVoteBalances();
		context.dposState.buildDelegateRanking();
		const round = Utils.roundCalculator.calculateRound(1);

		assert.throws(
			() => context.dposState.setDelegatesRound(round),
			`Expected to find 51 delegates but only found 5.This indicates an issue with the genesis block & delegates`,
		);
	});

	it("setDelegatesRound - should set the delegates of a round", (context) => {
		context.dposState.buildVoteBalances();
		context.dposState.buildDelegateRanking();
		const round = Utils.roundCalculator.calculateRound(1);
		round.maxDelegates = 4;
		context.dposState.setDelegatesRound(round);
		const delegates = context.dposState.getActiveDelegates();
		const roundDelegates = context.dposState.getRoundDelegates();

		assert.equal(context.dposState.getRoundInfo(), round);
		assert.equal(roundDelegates, delegates.slice(0, 4));

		for (let i = 0; i < round.maxDelegates; i++) {
			const delegate = context.walletRepo.findByPublicKey(roundDelegates[i].getPublicKey()!);

			assert.equal(delegate.getAttribute("delegate.round"), round.round);
		}

		// TODO: when we remove Assertion checks, this won't throw
		// instead it should not.toEqual(round)
		assert.throws(() => delegates[4].getAttribute("delegate.round"));
		assert.true(context.logger.calledWith("Loaded 4 active delegates"));
	});

	it("should run all getters", (context) => {
		context.dposState.buildVoteBalances();
		context.dposState.buildDelegateRanking();
		context.round = Utils.roundCalculator.calculateRound(1);
		context.round.maxDelegates = 5;
		context.dposState.setDelegatesRound(context.round);

		assert.equal(context.dposState.getRoundInfo(), context.round);
		assert.equal(context.dposState.getAllDelegates(), context.walletRepo.allByUsername());
		assert.containValues(context.dposState.getActiveDelegates(), context.walletRepo.allByUsername());
		assert.containValues(context.dposState.getRoundDelegates(), context.walletRepo.allByUsername());
	});
});
