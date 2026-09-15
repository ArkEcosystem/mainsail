import type { Contracts } from "@mainsail/contracts";

import { Enums, Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ProposerReporter } from "./proposer-reporter";

type Wallet = { address: string; blsPublicKey: string };
type Block = { number: number; round: number; hash: string; proposer: string };

const OURS: Wallet = { address: "ourValidatorAddress", blsPublicKey: "ourBlsPublicKey" };
const OUR_SECOND: Wallet = { address: "ourSecondValidatorAddress", blsPublicKey: "ourSecondBlsPublicKey" };
const THEIRS: Wallet = { address: "otherValidatorAddress", blsPublicKey: "otherBlsPublicKey" };

// False reports are the thing to guard against here: a node runner who sees a missed round that did not
// happen has no way to tell it apart from a real one.
describe<{
	app: Application;
	reporter: Contracts.Validator.ProposerReporter;
	events: { listenMany: () => void; forgetMany: () => void };
	logger: { notice: (message: string, context?: string) => void };
	validatorsRepository: { getValidator: (blsPublicKey: string) => unknown };
	validatorSet: { getRoundValidators: () => Wallet[] };
	proposerCalculator: { getValidatorIndex: (round: number) => number };
	proposerByRound: Record<number, Wallet>;
	block: Block;
}>("ProposerReporter", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		// The round validators are ours, theirs and our second one. Which of them proposes a round is set per
		// test through proposerByRound; a round not listed there is theirs.
		context.proposerByRound = { 0: OURS };
		context.validatorSet = { getRoundValidators: () => [OURS, THEIRS, OUR_SECOND] };
		context.proposerCalculator = {
			getValidatorIndex: (round: number) =>
				context.validatorSet.getRoundValidators().indexOf(context.proposerByRound[round] ?? THEIRS),
		};
		context.validatorsRepository = {
			getValidator: (blsPublicKey: string) =>
				[OURS, OUR_SECOND].some((wallet) => wallet.blsPublicKey === blsPublicKey) ? {} : undefined,
		};
		context.events = { forgetMany: () => {}, listenMany: () => {} };
		context.logger = { notice: () => {} };
		context.block = { hash: "blockHash", number: 1, proposer: OURS.address, round: 0 };

		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Validator.Repository).toConstantValue(context.validatorsRepository);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);

		context.reporter = context.app.resolve(ProposerReporter);
	});

	const roundStarted = (reporter: Contracts.Validator.ProposerReporter, blockNumber: number, round: number) =>
		reporter.handle({
			data: { blockNumber, round, step: Enums.Consensus.Step.Propose },
			name: Events.ConsensusEvent.RoundStarted,
		});

	const proposed = (
		reporter: Contracts.Validator.ProposerReporter,
		blockHeader: Block,
		round: number,
		validRound?: number,
	) => reporter.handle({ data: { blockHeader, round, validRound }, name: Events.ConsensusEvent.Proposed });

	const blockApplied = (reporter: Contracts.Validator.ProposerReporter, block: Block) =>
		reporter.handle({ data: block, name: Events.BlockEvent.Applied });

	it("#boot - should listen for round starts, own proposals and applied blocks", ({ reporter, events }) => {
		const listenMany = spy(events, "listenMany");

		reporter.boot();

		listenMany.calledOnce();
		listenMany.calledWith([
			[Events.ConsensusEvent.RoundStarted, reporter],
			[Events.ConsensusEvent.Proposed, reporter],
			[Events.BlockEvent.Applied, reporter],
		]);
	});

	it("#dispose - should forget the same events", ({ reporter, events }) => {
		const forgetMany = spy(events, "forgetMany");

		reporter.dispose();

		forgetMany.calledOnce();
		forgetMany.calledWith([
			[Events.ConsensusEvent.RoundStarted, reporter],
			[Events.ConsensusEvent.Proposed, reporter],
			[Events.BlockEvent.Applied, reporter],
		]);
	});

	it("#handle - should ignore events it did not subscribe to", async ({ reporter, logger }) => {
		const notice = spy(logger, "notice");

		await reporter.handle({ data: {}, name: Events.ConsensusEvent.PrevotedAny });

		notice.neverCalled();
	});

	it("#handle - should report the proposal this node submits", async ({ reporter, logger, block }) => {
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await proposed(reporter, block, 0);

		notice.calledOnce();
		notice.calledWith(`📦 Proposing block ${1}/${0}/${block.hash} as ${OURS.address}`);
	});

	it("#handle - should name the validator proposing, not the forger of a re-proposed block", async ({
		reporter,
		logger,
		block,
		proposerByRound,
	}) => {
		// A locked value is re-proposed as it stands, so its block keeps the round and proposer it was forged with.
		proposerByRound[1] = OURS;
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 1);
		await proposed(reporter, { ...block, proposer: THEIRS.address }, 1, 0);

		notice.calledWith(`📦 Proposing block ${1}/${1}(${0})/${block.hash} as ${OURS.address}`);
	});

	it("#handle - should fall back to the block proposer when the round was not seen starting", async ({
		reporter,
		logger,
		block,
	}) => {
		const notice = spy(logger, "notice");

		await proposed(reporter, block, 0);

		notice.calledWith(`📦 Proposing block ${1}/${0}/${block.hash} as ${block.proposer}`);
	});

	it("#handle - should report our own block being committed", async ({ reporter, logger, block }) => {
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, block);

		notice.calledOnce();
		notice.calledWith(`✅ Committed our block ${1}/${0} as ${OURS.address}`);
	});

	it("#handle - should still count our block as ours when it is committed after the round moved on", async ({
		reporter,
		logger,
		block,
	}) => {
		// Another validator re-proposed the value the network locked on; the block stays ours.
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await roundStarted(reporter, 1, 1);
		await blockApplied(reporter, block);

		notice.calledOnce();
		notice.calledWith(`✅ Committed our block ${1}/${0} as ${OURS.address}`);
	});

	it("#handle - should report a round we lost to another validator", async ({ reporter, logger, block }) => {
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address, round: 1 });

		notice.calledOnce();
		notice.calledWith(`❌ Missed our round ${1}/${0} as ${OURS.address}, committed by ${THEIRS.address}`);
	});

	it("#handle - should report nothing while a round of ours is still in play", async ({
		reporter,
		logger,
		proposerByRound,
	}) => {
		// A block is accepted on its block number alone, so the round we moved on from can still be the one
		// that commits. Reporting a lost round here would be a guess.
		proposerByRound[1] = OUR_SECOND;
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await roundStarted(reporter, 1, 1);

		notice.neverCalled();
	});

	it("#handle - should credit the round of ours that committed, not the latest one", async ({
		reporter,
		logger,
		block,
		proposerByRound,
	}) => {
		// Two of this node's validators hold consecutive rounds; the earlier round is the one that wins.
		proposerByRound[1] = OUR_SECOND;
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await roundStarted(reporter, 1, 1);
		await blockApplied(reporter, block);

		notice.calledOnce();
		notice.calledWith(`✅ Committed our block ${1}/${0} as ${OURS.address}`);
	});

	it("#handle - should report every round of ours when another validator wins the block number", async ({
		reporter,
		logger,
		block,
		proposerByRound,
	}) => {
		proposerByRound[1] = OUR_SECOND;
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await roundStarted(reporter, 1, 1);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address, round: 2 });

		notice.calledTimes(2);
		notice.calledWith(`❌ Missed our round ${1}/${0} as ${OURS.address}, committed by ${THEIRS.address}`);
		notice.calledWith(`❌ Missed our round ${1}/${1} as ${OUR_SECOND.address}, committed by ${THEIRS.address}`);
	});

	it("#handle - should report nothing when this node runs no validators", async ({
		reporter,
		logger,
		block,
		validatorsRepository,
	}) => {
		validatorsRepository.getValidator = () => undefined;
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address });

		notice.neverCalled();
	});

	it("#handle - should report nothing when the proposer belongs to another node", async ({
		reporter,
		logger,
		block,
		proposerByRound,
	}) => {
		proposerByRound[0] = THEIRS;
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address });

		notice.neverCalled();
	});

	it("#handle - should report nothing when the round has no proposer", async ({
		reporter,
		logger,
		block,
		validatorSet,
	}) => {
		validatorSet.getRoundValidators = () => [];
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address });

		notice.neverCalled();
	});

	it("#handle - should record a round of ours once, however often its start is announced", async ({
		reporter,
		logger,
		block,
	}) => {
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address });

		notice.calledOnce();
	});

	it("#handle - should report a round only once", async ({ reporter, logger, block }) => {
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address });
		// The next block number must not produce a second report for the same round.
		await blockApplied(reporter, { ...block, number: 2, proposer: THEIRS.address });

		notice.calledOnce();
	});

	it("#handle - should not resolve our round with a block from another block number", async ({
		reporter,
		logger,
		block,
	}) => {
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await blockApplied(reporter, { ...block, number: 2, proposer: THEIRS.address });

		notice.neverCalled();
	});

	it("#handle - should settle a block number even when the next one started first", async ({
		reporter,
		logger,
		block,
	}) => {
		// The commit and the first round of the next block number fan out as separate events, and the reporter
		// may well see the round start first.
		const notice = spy(logger, "notice");

		await roundStarted(reporter, 1, 0);
		await roundStarted(reporter, 2, 0);
		await blockApplied(reporter, { ...block, proposer: THEIRS.address, round: 1 });
		await blockApplied(reporter, { ...block, number: 2 });

		notice.calledTimes(2);
		notice.calledWith(`❌ Missed our round ${1}/${0} as ${OURS.address}, committed by ${THEIRS.address}`);
		notice.calledWith(`✅ Committed our block ${2}/${0} as ${OURS.address}`);
	});
});
