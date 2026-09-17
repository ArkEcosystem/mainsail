import type { Contracts } from "@mainsail/contracts";
import { Identifiers, Events, Enums } from "@mainsail/constants";
import { Lock } from "@mainsail/utils";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Consensus } from "./consensus";

type Context = {
	app: Application;
	consensus: Consensus;
	blockProcessor: any;
	fakeTimers: any;
	messageProcessor: any;
	proposalProcessor: any;
	scheduler: any;
	validatorsRepository: any;
	validatorSet: any;
	proposerCalculator: any;
	logger: any;
	block: any;
	proposal: any;
	proposer: any;
	eventDispatcher: any;
	roundState: Contracts.Consensus.RoundState;
	roundStateRepository: any;
	peerStatistic: any;
	pendingCommits: any;
	forger: any;
	storage: any;
};

describe<Context>("Consensus", ({ it, beforeEach, assert, stub, spy, clock, each }) => {
	beforeEach((context) => {
		context.blockProcessor = {
			commit: () => {},
			process: () => {},
		};

		context.proposalProcessor = {
			process: () => {},
		};

		context.messageProcessor = {
			process: () => {},
		};

		context.scheduler = {
			clear: () => {},
			getNextBlockTimestamp: (value) => value + 4000,
			scheduleTimeoutBlockPrepare: () => true,
			scheduleTimeoutPrecommit: () => true,
			scheduleTimeoutPrevote: () => true,
			scheduleTimeoutPropose: () => true,
		};

		context.validatorsRepository = {
			getValidator: () => {},
			getValidators: () => {},
		};

		context.roundStateRepository = {
			clear: () => {},
			getRoundState: () => context.roundState,
		};

		context.validatorSet = {
			getRoundValidators: () => {},
			getValidatorIndexByWalletAddress: () => "",
		};

		context.proposerCalculator = {
			getValidatorIndex: () => {},
		};

		context.logger = {
			error: () => {},
			info: () => {},
			notice: () => {},
			warn: () => {},
		};

		context.eventDispatcher = {
			dispatch: () => {},
		};

		context.block = {
			number: 1,
			round: 0,
			hash: "blockHash",
			proposer: "proposerAddress",
		};

		context.proposal = {
			getData: () => ({
				block: context.block,
			}),
			blockHeader: context.block,
			round: 0,
			serialized: Buffer.from(""),
			validRound: undefined,
			validatorPublicKey: "validatorPublicKey",
		};

		context.proposer = {};

		context.roundState = {
			aggregatePrevotes: () => {},
			getBlock: () => {},
			getProcessorResult: () => false,
			getProposal: () => context.proposal,
			hasPrecommit: () => false,
			hasPrevote: () => false,
			hasProcessorResult: () => false,
			hasProposal: () => false,
			blockNumber: 1,
			logPrecommits: () => {},
			logPrevotes: () => {},
			proposer: context.proposer,
			round: 0,
			setProcessorResult: () => {},
		} as unknown as Contracts.Consensus.RoundState;

		context.peerStatistic = {
			newRound: () => {},
		};

		context.pendingCommits = {
			has: () => false,
		};

		context.forger = {
			forgeBlock: () => {},
		};

		context.storage = {
			saveMessage: async () => {},
			saveProposal: async () => {},
			saveState: async () => {},
		};

		context.app = new Application();

		context.app.bind(Identifiers.Processor.BlockProcessor).toConstantValue(context.blockProcessor);
		context.app.bind(Identifiers.Consensus.Processor.Message).toConstantValue(context.messageProcessor);
		context.app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue(context.proposalProcessor);
		context.app.bind(Identifiers.Consensus.Scheduler).toConstantValue(context.scheduler);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(new Lock());
		context.app.bind(Identifiers.Validator.Repository).toConstantValue(context.validatorsRepository);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue(context.roundStateRepository);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.P2P.Statistic.Service).toConstantValue(context.peerStatistic);
		context.app.bind(Identifiers.P2P.PendingCommits).toConstantValue(context.pendingCommits);
		context.app.bind(Identifiers.Forger.Block).toConstantValue(context.forger);
		context.app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(context.storage);

		context.consensus = context.app.resolve(Consensus);
	});

	// Puts the state machine at a position without replaying the rounds leading there. run() takes the position
	// over as stored and arms the round; the rules and the proposal are held off, the mocked round state is not
	// meant to be evaluated here.
	const startAt = async (consensus: Consensus, state: Partial<Contracts.Consensus.State> = {}): Promise<void> => {
		const applyRules = stub(consensus, "applyRules").callsFake(async () => {});
		const prepareProposal = stub(consensus, "prepareProposal").callsFake(async () => {});

		await consensus.run({ blockNumber: 1, round: 0, step: Enums.Consensus.Step.Propose, ...state });

		applyRules.restore();
		prepareProposal.restore();
	};

	// Moves on to a later round the way the state machine does, keeping lock and valid value, without building a
	// proposal for it.
	const moveToRound = async (consensus: Consensus, round: number): Promise<void> => {
		const prepareProposal = stub(consensus, "prepareProposal").callsFake(async () => {});

		await consensus.startRound(round);

		prepareProposal.restore();
	};

	it("#getBlockNumber - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getBlockNumber(), 1);
	});

	it("#getRound - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getRound(), 0);
	});

	it("#getStep - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#getLockedRound - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getLockedRound());
	});

	it("#getValidRound - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getValidRound());
	});

	it("#getState - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getState(), {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
	});

	it("#isDisposed - should be false until disposed", async ({ consensus }) => {
		assert.false(consensus.isDisposed());

		await consensus.dispose();

		assert.true(consensus.isDisposed());
	});

	it("#startRound - should clear scheduler, scheduleTimeout and should not propose is not local validator", async ({
		consensus,
		scheduler,
		validatorsRepository,
		roundStateRepository,
		eventDispatcher,
		proposer,
		logger,
		peerStatistic,
	}) => {
		const spyScheduleClear = spy(scheduler, "clear");
		const spyScheduleTimeoutBlockPrepare = spy(scheduler, "scheduleTimeoutBlockPrepare");
		const spyLoggerInfo = spy(logger, "info");
		const spyStatisticNewRound = spy(peerStatistic, "newRound");
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue();
		const spyGetRoundState = stub(roundStateRepository, "getRoundState").returnValue({
			hasProposal: () => false,
			proposer: proposer,
		});
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.startRound(0);

		spyStatisticNewRound.calledOnce();
		spyStatisticNewRound.calledWith(1, 0);
		spyScheduleClear.calledOnce();
		spyScheduleTimeoutBlockPrepare.calledOnce();

		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		spyGetRoundState.calledOnce();
		spyGetRoundState.calledWith(1, 0);
		spyLoggerInfo.calledWith(`>> Starting new round: ${1}/${0} with proposer: ${proposer.address}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.RoundStarted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
	});

	it("#start round - should clear scheduler, scheduleTimeout and should propose", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		logger,
		block,
		proposal,
		proposer,
		validatorSet,
		eventDispatcher,
		scheduler,
		forger,
	}) => {
		const validator = {
			getRandaoReveal: async () => "aa".repeat(96),
			propose: () => {},
		};

		const spyScheduleClear = spy(scheduler, "clear");
		const spyScheduleTimeoutBlockPrepare = spy(scheduler, "scheduleTimeoutBlockPrepare");
		const spyForgerForgeBlock = stub(forger, "forgeBlock").resolvedValue(block);
		const spyValidatorPropose = stub(validator, "propose").resolvedValue(proposal);

		const spyLoggerInfo = spy(logger, "info");
		const spyGetRoundState = stub(roundStateRepository, "getRoundState").returnValue({
			hasProposal: () => false,
			proposer,
		});
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.startRound(0);

		spyScheduleClear.calledOnce();
		spyScheduleTimeoutBlockPrepare.calledOnce();

		spyGetRoundState.calledTimes(1);
		spyGetRoundState.calledWith(1, 0);
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		spyForgerForgeBlock.calledOnce();
		spyForgerForgeBlock.calledWith(proposer.address, 0);
		getValidatorIndexByWalletAddress.calledOnce();
		getValidatorIndexByWalletAddress.calledWith(proposer.address);
		spyValidatorPropose.calledOnce();
		spyValidatorPropose.calledWith(1, 0, undefined, block);
		spyLoggerInfo.calledWith(`>> Starting new round: ${1}/${0} with proposer: ${proposer.address}`);
		spyDispatch.called();
		spyDispatch.calledWith(Events.ConsensusEvent.RoundStarted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#startRound - should not prepare a proposal while the block downloader holds a commit for the block number", async ({
		consensus,
		scheduler,
		validatorsRepository,
		roundStateRepository,
		proposer,
		pendingCommits,
		eventDispatcher,
	}) => {
		const spyScheduleTimeoutBlockPrepare = spy(scheduler, "scheduleTimeoutBlockPrepare");
		const spyHas = stub(pendingCommits, "has").returnValue(true);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue({});
		const spyPrepareProposal = spy(consensus, "prepareProposal");
		stub(roundStateRepository, "getRoundState").returnValue({
			hasProposal: () => false,
			proposer,
		});
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.startRound(0);

		// The round is announced and the block-prepare timeout armed as usual; only the proposal is held off,
		// because the downloader is about to commit the block for this very block number.
		spyDispatch.calledWith(Events.ConsensusEvent.RoundStarted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
		spyScheduleTimeoutBlockPrepare.calledOnce();
		spyHas.calledOnce();
		spyHas.calledWith(1);
		spyPrepareProposal.neverCalled();
		spyGetValidator.neverCalled();
	});

	it("#startRound - local validator should propose validRound", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		logger,
		block,
		proposal,
		proposer,
		roundState,
		validatorSet,
		eventDispatcher,
		scheduler,
		forger,
	}) => {
		await startAt(consensus, { validValue: roundState });

		const validator = {
			getRandaoReveal: async () => "aa".repeat(96),
			propose: () => {},
		};

		const spyScheduleClear = spy(scheduler, "clear");
		const spyScheduleTimeoutBlockPrepare = spy(scheduler, "scheduleTimeoutBlockPrepare");

		const spyForgerForgeBlock = stub(forger, "forgeBlock").resolvedValue(block);
		const spyValidatorPropose = stub(validator, "propose").resolvedValue(proposal);

		const spyLoggerInfo = spy(logger, "info");
		const spyGetRoundState = stub(roundStateRepository, "getRoundState").returnValue({
			hasProposal: () => false,
			proposer,
		});

		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);

		const lockProof = {
			signature: "signature",
			validators: [],
		};

		const spyRoundStateAggregatePrevotes = stub(roundState, "aggregatePrevotes").returnValue(lockProof);
		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(block);
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.startRound(1);

		spyScheduleClear.calledOnce();
		spyScheduleTimeoutBlockPrepare.calledOnce();

		spyGetRoundState.calledTimes(1);
		spyGetRoundState.calledWith(1, 1);
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		spyForgerForgeBlock.neverCalled();
		spyRoundStateAggregatePrevotes.calledOnce();
		spyRoundStateGetBlock.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();
		getValidatorIndexByWalletAddress.calledWith(proposer.address);
		spyValidatorPropose.calledOnce();
		spyValidatorPropose.calledWith(1, 1, 0, block, lockProof); // validator set, round, validRound, block, lockProof
		spyLoggerInfo.calledWith(`>> Starting new round: ${1}/${1} with proposer: ${proposer.address}`);
		spyLoggerInfo.calledWith(`Created proposal with existing block ${1}/${1}(${0})/${block.hash}`);
		// spyLoggerInfo.calledWith(`Proposing block ${1}/${1}(${0})/${block.hash}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.RoundStarted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 1,
			step: Enums.Consensus.Step.Propose,
			validRound: 0,
		});
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutBlockPrepare - should propose if proposal is ready", async ({
		consensus,
		proposalProcessor,
		proposal,
		eventDispatcher,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposer,
		forger,
		block,
	}) => {
		stub(forger, "forgeBlock").resolvedValue(block);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue({
			getRandaoReveal: async () => "aa".repeat(96),
			propose: async () => proposal,
		});
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyProposalProcess = spy(proposalProcessor, "process");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.startRound(0);
		await consensus.onTimeoutBlockPrepare();

		spyProposalProcess.calledOnce();
		spyProposalProcess.calledWith(proposal);
		spyDispatch.calledWith(Events.ConsensusEvent.Proposed, proposal);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutBlockPrepare - should skip propose if already proposed", async ({
		consensus,
		proposalProcessor,
		proposal,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposer,
		forger,
		block,
	}) => {
		stub(forger, "forgeBlock").resolvedValue(block);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue({
			getRandaoReveal: async () => "aa".repeat(96),
			propose: async () => proposal,
		});
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyProposalProcess = spy(proposalProcessor, "process");

		await consensus.startRound(0);
		await consensus.onTimeoutBlockPrepare();
		await consensus.onTimeoutBlockPrepare();

		spyProposalProcess.calledOnce();
		spyProposalProcess.calledWith(proposal);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#prepareProposal - should catch a forging failure instead of leaving an unhandled rejection", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposalProcessor,
		proposer,
		logger,
		forger,
	}) => {
		stub(forger, "forgeBlock").rejectedValue(new Error("evm is gone"));
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue({ propose: () => {} });
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const spyProposalProcess = spy(proposalProcessor, "process");
		const spyLoggerError = spy(logger, "error");

		const unhandled: unknown[] = [];
		const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
		process.on("unhandledRejection", onUnhandledRejection);

		try {
			await consensus.startRound(0);
			await new Promise((resolve) => setImmediate(resolve));
			await new Promise((resolve) => setImmediate(resolve));

			assert.equal(unhandled, []);
		} finally {
			process.off("unhandledRejection", onUnhandledRejection);
		}

		spyLoggerError.calledOnce();

		// Nothing is proposed and the step is untouched, so the propose timeout moves the round on.
		await consensus.onTimeoutBlockPrepare();

		spyProposalProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	// Building a block takes time, and the round can move on before it is done (a timeout, or f+1 messages
	// for a higher round). The proposal that comes out of it belongs to the round that ended.
	it("#startRound - should drop a proposal that is still being built when the round moves on", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposalProcessor,
		proposer,
		eventDispatcher,
		forger,
		block,
		proposal,
	}) => {
		let finishForging: (block: unknown) => void = () => {};
		const validator = { getRandaoReveal: async () => "aa".repeat(96), propose: async () => proposal };

		stub(forger, "forgeBlock").returnValue(new Promise((resolve) => (finishForging = resolve)));
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		// Ours in round 0 only.
		stub(validatorsRepository, "getValidator").callsFake(() =>
			consensus.getRound() === 0 ? validator : undefined,
		);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const spyProposalProcess = spy(proposalProcessor, "process");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.startRound(0);
		await consensus.startRound(1);

		finishForging(block);
		await new Promise((resolve) => setImmediate(resolve));
		await consensus.onTimeoutBlockPrepare();

		spyProposalProcess.neverCalled();
		spyDispatch.notCalledWith(Events.ConsensusEvent.Proposed, proposal);
	});

	it("#onTimeoutBlockPrepare - should ignore a stale proposal without dropping the one of the new round", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposalProcessor,
		proposer,
		forger,
		block,
		proposal,
	}) => {
		// This node holds both rounds. Round 0 is slow to forge; round 1 starts before it is done and forges
		// at once. The round 0 handler is still waiting when round 1 replaces its promise.
		let finishForgingRound0: (block: unknown) => void = () => {};
		const validator = {
			getRandaoReveal: async () => "aa".repeat(96),
			propose: async (_: number, round: number) => ({ ...proposal, round }),
		};

		stub(forger, "forgeBlock").callsFake((_: string, round: number) =>
			round === 0
				? new Promise((resolve) => (finishForgingRound0 = resolve))
				: Promise.resolve({ ...block, round }),
		);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const spyProposalProcess = spy(proposalProcessor, "process");

		await consensus.startRound(0);
		const staleTimeout = consensus.onTimeoutBlockPrepare();

		await consensus.startRound(1);
		finishForgingRound0(block);
		await staleTimeout;

		spyProposalProcess.neverCalled();

		await consensus.onTimeoutBlockPrepare();

		spyProposalProcess.calledOnce();
		assert.equal((spyProposalProcess.getCallArgs(0)[0] as { round: number }).round, 1);
	});

	it("#prepareProposal - should sign for the round the proposal was requested in when the round moves on while forging", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposer,
		forger,
		block,
		proposal,
	}) => {
		let finishForging: (block: unknown) => void = () => {};
		const validator = { getRandaoReveal: async () => "aa".repeat(96), propose: () => {} };

		const spyForgerForgeBlock = stub(forger, "forgeBlock").returnValue(
			new Promise((resolve) => (finishForging = resolve)),
		);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyValidatorPropose = stub(validator, "propose").resolvedValue(proposal);

		await consensus.startRound(0);
		await moveToRound(consensus, 1); // The round moves on while the block is still being forged.

		finishForging(block);
		await new Promise((resolve) => setImmediate(resolve));

		spyForgerForgeBlock.calledOnce();
		spyForgerForgeBlock.calledWith(proposer.address, 0);
		spyValidatorPropose.calledOnce();
		spyValidatorPropose.calledWith(1, 0, undefined, block);
	});

	it("#prepareProposal - should re-propose the valid value for the round it was requested in when the round moves on", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposer,
		roundState,
		forger,
		block,
		proposal,
	}) => {
		let finishAggregating: (lockProof: unknown) => void = () => {};
		const lockProof = { signature: "signature", validators: [] };
		const validator = { getRandaoReveal: async () => "aa".repeat(96), propose: () => {} };

		const spyForgerForgeBlock = spy(forger, "forgeBlock");
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		stub(roundState, "aggregatePrevotes").returnValue(new Promise((resolve) => (finishAggregating = resolve)));
		stub(roundState, "getBlock").returnValue(block);
		const spyValidatorPropose = stub(validator, "propose").resolvedValue(proposal);

		await startAt(consensus, { validValue: roundState });
		await consensus.startRound(1);
		await moveToRound(consensus, 2); // The round moves on while the lock proof is still being aggregated.

		finishAggregating(lockProof);
		await new Promise((resolve) => setImmediate(resolve));

		spyForgerForgeBlock.neverCalled();
		spyValidatorPropose.calledOnce();
		spyValidatorPropose.calledWith(1, 1, 0, block, lockProof); // validator index, round, validRound, block, lockProof
	});

	// Own votes and events are fire-and-forget. A rejection there must be reported, not left unhandled: Node
	// takes the process down on an unhandled rejection, and a node that dies is worse than one that skips a vote.
	const collectUnhandledRejections = async (run: () => Promise<void>): Promise<unknown[]> => {
		const unhandled: unknown[] = [];
		const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
		process.on("unhandledRejection", onUnhandledRejection);

		try {
			await run();
			await new Promise((resolve) => setImmediate(resolve));
			await new Promise((resolve) => setImmediate(resolve));
		} finally {
			process.off("unhandledRejection", onUnhandledRejection);
		}

		return unhandled;
	};

	it("#prevote - should report a failure to process the own vote instead of leaving an unhandled rejection", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		logger,
		proposer,
	}) => {
		const prevote = { blockNumber: 1, round: 0, type: Enums.Crypto.MessageType.Prevote, validatorIndex: 1 };
		const validator = { prevote: async () => prevote };

		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyMessageProcess = stub(messageProcessor, "process").rejectedValue(new Error("worker is gone"));
		const spyLoggerError = spy(logger, "error");

		const unhandled = await collectUnhandledRejections(() => consensus.prevote("blockHash"));

		assert.equal(unhandled, []);
		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);
		spyLoggerError.calledOnce();
		assert.startsWith(spyLoggerError.getCallArgs(0)[0] as string, "Processing own prevote failed: ");
	});

	it("#precommit - should report a failure to process the own vote instead of leaving an unhandled rejection", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		logger,
		proposer,
	}) => {
		const precommit = { blockNumber: 1, round: 0, type: Enums.Crypto.MessageType.Precommit, validatorIndex: 1 };
		const validator = { precommit: async () => precommit };

		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyMessageProcess = stub(messageProcessor, "process").rejectedValue(new Error("worker is gone"));
		const spyLoggerError = spy(logger, "error");

		const unhandled = await collectUnhandledRejections(() => consensus.precommit("blockHash"));

		assert.equal(unhandled, []);
		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(precommit);
		spyLoggerError.calledOnce();
		assert.startsWith(spyLoggerError.getCallArgs(0)[0] as string, "Processing own precommit failed: ");
	});

	it("#prepareProposal - should still propose and report a failing block-forged listener instead of leaving an unhandled rejection", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposalProcessor,
		eventDispatcher,
		proposer,
		logger,
		forger,
		block,
		proposal,
	}) => {
		const validator = { getRandaoReveal: async () => "aa".repeat(96), propose: async () => proposal };

		stub(forger, "forgeBlock").resolvedValue(block);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		stub(eventDispatcher, "dispatch").callsFake(async (event: unknown) => {
			if (event === Events.BlockEvent.Forged) {
				throw new Error("listener is broken");
			}
		});

		const spyProposalProcess = spy(proposalProcessor, "process");
		const spyLoggerError = spy(logger, "error");

		const unhandled = await collectUnhandledRejections(async () => {
			await consensus.startRound(0);
			await consensus.onTimeoutBlockPrepare();
		});

		assert.equal(unhandled, []);
		spyProposalProcess.calledOnce();
		spyProposalProcess.calledWith(proposal);
		spyLoggerError.calledOnce();
		assert.startsWith(spyLoggerError.getCallArgs(0)[0] as string, "Dispatching block forged event failed: ");
	});

	it("#startRound - local validator should locked value", async () => {});

	it("#onProposal - should return if step !== propose", async ({ consensus, blockProcessor, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposal - should return if blockNumber doesn't match", async ({
		consensus,
		blockProcessor,
		roundState,
	}) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState = { ...roundState, blockNumber: 3 };
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposal - should return if round doesn't match", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState = { ...roundState, round: 2 };
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposal - should return if proposal is undefined", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState.getProposal = () => {};
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposal - should return if proposed validRound is defined", async ({
		consensus,
		blockProcessor,
		roundState,
		proposal,
	}) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		proposal.validRound = 0;
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposal - should return if not from valid proposer", async ({ consensus }) => {});

	it("#onProposal - broadcast prevote block hash, if block is valid & not locked", async ({
		consensus,
		storage,
		validatorSet,
		validatorsRepository,
		roundState,
		block,
		logger,
		proposal,
		proposer,
		eventDispatcher,
	}) => {
		const spyGetProcessorResult = stub(roundState, "getProcessorResult").returnValue({ success: true });

		const prevote = {
			blockNumber: 1,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyValidatorsRepositoryGetValidator = stub(validatorsRepository, "getValidator").returnValueOnce(
			validator,
		);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyLoggerInfo = spy(logger, "info");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		const spySaveState = spy(storage, "saveState");

		await consensus.onProposal(roundState);

		spyGetProcessorResult.calledOnce();

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();

		spyGetProcessorResult.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();
		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 0, block.hash); // validatorIndex, blockNumber, round, blockHash

		spyLoggerInfo.calledWith(`Received proposal ${1}/${0}/${proposal.getData().block.hash}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.ProposalAccepted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});
	});

	it("#onProposal - broadcast prevote undefined, if block is invalid", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		logger,
		proposal,
		proposer,
		eventDispatcher,
	}) => {
		const spyGetProcessorResult = stub(roundState, "getProcessorResult").returnValue({ success: false });

		const prevote = {
			blockNumber: 2,
			round: 0,
			serialized: Buffer.from(""),
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyValidatorsRepositoryGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const spyMessageProcess = spy(messageProcessor, "process");
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyLoggerInfo = spy(logger, "info");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.onProposal(roundState);

		spyGetProcessorResult.calledOnce();

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 0);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);
		spyLoggerInfo.calledWith(`Received proposal ${1}/${0}/${proposal.getData().block.hash}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.ProposalAccepted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposal - should skip prevote if already prevoted", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		logger,
		proposal,
		proposer,
		eventDispatcher,
	}) => {
		const spyGetProcessorResult = stub(roundState, "getProcessorResult").returnValue({ success: true });

		const prevote = {
			blockNumber: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyValidatorsRepositoryGetValidator = stub(validatorsRepository, "getValidator").returnValue([validator]);
		const spyMessageProcess = spy(messageProcessor, "process");
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyLoggerInfo = spy(logger, "info");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState.hasPrevote = () => true;
		await consensus.onProposal(roundState);

		spyGetProcessorResult.calledOnce();

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();

		spyValidatorPrevote.neverCalled();
		spyMessageProcess.neverCalled();

		spyLoggerInfo.calledWith(`Received proposal ${1}/${0}/${proposal.getData().block.hash}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.ProposalAccepted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposal - broadcast prevote null, if locked on another value", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		roundState,
		block,
		logger,
		proposal,
		proposer,
	}) => {
		const validator = {
			precommit: () => {},
			prevote: () => {},
		};
		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue({ blockNumber: 1, round: 0 });
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue({ blockNumber: 1, round: 1 });
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyLoggerInfo = spy(logger, "info");

		// Round 0: +2/3 prevotes for block A lock this node on it.
		roundState.getProcessorResult = () => ({ success: true }) as any;
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });
		await consensus.onMajorityPrevote(roundState);

		assert.equal(consensus.getLockedRound(), 0);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(1, 1, 0, block.hash);

		// Round 1: a proposer that missed those prevotes proposes a fresh block B, without a valid round.
		const otherBlock = { ...block, hash: "otherBlockHash", round: 1 };
		const otherProposal = {
			...proposal,
			blockHeader: otherBlock,
			getData: () => ({ block: otherBlock }),
			round: 1,
			validRound: undefined,
		};
		const nextRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			getProposal: () => otherProposal,
			round: 1,
		} as unknown as Contracts.Consensus.RoundState;
		await moveToRound(consensus, 1);

		await consensus.onProposal(nextRoundState);

		// The lock wins over the fresh proposal: a nil prevote, and the lock stays on A.
		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 1, undefined); // validatorIndex, blockNumber, round, no block hash
		spyLoggerInfo.calledWith(`Prevoting nil for 1/1/otherBlockHash, because locked on 0/${block.hash}`);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
		assert.equal(consensus.getLockedRound(), 0);
	});

	it("#onProposal - broadcast prevote null, if locked, even when the fresh proposal carries the locked block", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		roundState,
		block,
		proposal,
		proposer,
	}) => {
		const validator = {
			precommit: () => {},
			prevote: () => {},
		};
		stub(validator, "precommit").resolvedValue({ blockNumber: 1, round: 0 });
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue({ blockNumber: 1, round: 1 });
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		// Round 0: +2/3 prevotes for block A lock this node on it.
		roundState.getProcessorResult = () => ({ success: true }) as any;
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });
		await consensus.onMajorityPrevote(roundState);

		assert.equal(consensus.getLockedRound(), 0);

		// Round 1: a fresh proposal carrying the very block this node is locked on, but without validRound and lock
		// proof. Stricter than Tendermint line 23: the proof has to come along, so this still gets nil.
		const sameProposal = { ...proposal, round: 1, validRound: undefined };
		const nextRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			getProposal: () => sameProposal,
			round: 1,
		} as unknown as Contracts.Consensus.RoundState;
		await moveToRound(consensus, 1);

		await consensus.onProposal(nextRoundState);

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 1, undefined);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - broadcast prevote block hash, if block is valid and lockedRound is undefined", async ({
		consensus,
		storage,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		block,
		proposal,
		proposer,
		logger,
		eventDispatcher,
	}) => {
		await startAt(consensus, { round: 1 });

		const spyGetProcessorResult = stub(roundState, "getProcessorResult").returnValue({ success: true });

		const prevote = {
			blockNumber: 1,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyValidatorsRepositoryGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const spyMessageProcess = spy(messageProcessor, "process");
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyLoggerInfo = spy(logger, "info");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		proposal.lockProof = { signature: "1234", validators: [] };
		stub(proposal, "getData").returnValue({ block, lockProof: proposal.lockProof });

		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		const spySaveState = spy(storage, "saveState");

		await consensus.onProposalLocked(roundState);

		spyGetProcessorResult.calledOnce();

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 1, block.hash);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);
		spyLoggerInfo.calledWith(`Received locked proposal ${1}/${1}(${0})/${proposal.getData().block.hash}`);
		spyDispatch.calledWith(Events.ConsensusEvent.ProposalAccepted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 1,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 1,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});
	});

	it("#onProposalLocked - broadcast prevote block hash, if block is valid and valid round is higher or equal than lockedRound", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		roundState,
		block,
		proposal,
		proposer,
	}) => {
		const validator = {
			precommit: () => {},
			prevote: () => {},
		};
		stub(validator, "precommit").resolvedValue({ blockNumber: 1, round: 0 });
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue({ blockNumber: 1, round: 2 });
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		// Round 0: +2/3 prevotes for block A lock this node on it.
		roundState.getProcessorResult = () => ({ success: true }) as any;
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });
		await consensus.onMajorityPrevote(roundState);

		assert.equal(consensus.getLockedRound(), 0);

		// Round 2: block B is re-proposed with +2/3 prevotes from round 1, later than our lock. Tendermint line 29,
		// lockedRound <= vr: the newer proof unlocks this node.
		const otherBlock = { ...block, hash: "otherBlockHash", round: 1 };
		const reProposal = {
			...proposal,
			blockHeader: otherBlock,
			getData: () => ({ block: otherBlock }),
			lockProof: { signature: "1234", validators: [] },
			round: 2,
			validRound: 1,
		};
		const nextRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			getProposal: () => reProposal,
			round: 2,
		} as unknown as Contracts.Consensus.RoundState;
		await moveToRound(consensus, 2);

		await consensus.onProposalLocked(nextRoundState);

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 2, otherBlock.hash);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - broadcast prevote null, if block is valid and lockedRound is undefined", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		proposal,
		proposer,
		eventDispatcher,
		block,
	}) => {
		await startAt(consensus, { round: 1 });

		const spyGetProcessorResult = stub(roundState, "getProcessorResult").returnValue({ success: true });

		const prevote = {
			blockNumber: 1,
			round: 0,
			serialized: Buffer.from(""),
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyValidatorsRepositoryGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyMessageProcess = spy(messageProcessor, "process");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		proposal.lockProof = { signature: "1234", validators: [] };
		stub(proposal, "getData").returnValue({ block, lockProof: proposal.lockProof });

		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		spyGetProcessorResult.calledOnce();

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 1);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.ProposalAccepted, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 1,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - broadcast prevote null, if block is valid and lockedRound is higher than validRound", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		roundState,
		block,
		proposal,
		proposer,
	}) => {
		const validator = {
			precommit: () => {},
			prevote: () => {},
		};
		stub(validator, "precommit").resolvedValue({ blockNumber: 1, round: 1 });
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue({ blockNumber: 1, round: 2 });
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		// Round 1: +2/3 prevotes for block A lock this node on it.
		const lockRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			round: 1,
		} as unknown as Contracts.Consensus.RoundState;
		await startAt(consensus, { round: 1, step: Enums.Consensus.Step.Prevote });
		await consensus.onMajorityPrevote(lockRoundState);

		assert.equal(consensus.getLockedRound(), 1);

		// Round 2: another block B comes with a proof from round 0, older than our lock on A. Neither part of
		// Tendermint line 29 holds, so the lock keeps this node from prevoting B.
		const otherBlock = { ...block, hash: "otherBlockHash", round: 0 };
		const reProposal = {
			...proposal,
			blockHeader: otherBlock,
			getData: () => ({ block: otherBlock }),
			lockProof: { signature: "1234", validators: [] },
			round: 2,
			validRound: 0,
		};
		const nextRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			getProposal: () => reProposal,
			round: 2,
		} as unknown as Contracts.Consensus.RoundState;
		await moveToRound(consensus, 2);

		await consensus.onProposalLocked(nextRoundState);

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 2, undefined); // validatorIndex, blockNumber, round, no block hash
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
		assert.equal(consensus.getLockedRound(), 1);
	});

	it("#onProposalLocked - broadcast prevote block hash, if locked on the re-proposed block, even with an older valid round", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		roundState,
		block,
		proposal,
		proposer,
	}) => {
		const validator = {
			precommit: () => {},
			prevote: () => {},
		};
		stub(validator, "precommit").resolvedValue({ blockNumber: 1, round: 1 });
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue({ blockNumber: 1, round: 2 });
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		// Round 1: +2/3 prevotes for block A lock this node on it.
		const lockRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			round: 1,
		} as unknown as Contracts.Consensus.RoundState;
		await startAt(consensus, { round: 1, step: Enums.Consensus.Step.Prevote });
		await consensus.onMajorityPrevote(lockRoundState);

		assert.equal(consensus.getLockedRound(), 1);

		// Round 2: a proposer that missed the round 1 prevotes re-proposes A itself with its proof from round 0.
		// lockedRound > vr, but lockedValue = v: Tendermint line 29 lets this node prevote its own locked block.
		const reProposal = {
			...proposal,
			lockProof: { signature: "1234", validators: [] },
			round: 2,
			validRound: 0,
		};
		const nextRoundState = {
			...roundState,
			getProcessorResult: () => ({ success: true }),
			getProposal: () => reProposal,
			round: 2,
		} as unknown as Contracts.Consensus.RoundState;
		await moveToRound(consensus, 2);

		await consensus.onProposalLocked(nextRoundState);

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 2, block.hash);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - should return if step === prevote", async ({ consensus, roundState, proposal }) => {
		await startAt(consensus, { round: 1, step: Enums.Consensus.Step.Prevote });

		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - should return if step === precommit", async ({ consensus, roundState, proposal }) => {
		await startAt(consensus, { round: 1, step: Enums.Consensus.Step.Precommit });

		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onProposalLocked - should return if blockNumber doesn't match", async ({
		consensus,
		roundState,
		proposal,
	}) => {
		await startAt(consensus, { round: 1 });

		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		roundState = { ...roundState, blockNumber: 3 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if round doesn't match", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if proposal is undefined", async ({ consensus, roundState, proposal }) => {
		await startAt(consensus, { round: 1 });

		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		roundState.getProposal = () => {};
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is undefined", async ({ consensus, roundState, proposal }) => {
		await startAt(consensus, { round: 1 });

		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is higher than round", async ({
		consensus,
		roundState,
		proposal,
	}) => {
		await startAt(consensus, { round: 1 });

		proposal.validRound = 2;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is equal to round", async ({
		consensus,
		roundState,
		proposal,
	}) => {
		await startAt(consensus, { round: 1 });

		proposal.validRound = 1;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onMajorityPrevote - should set locked values, valid values and precommit, when step === prevote", async ({
		consensus,
		storage,
		roundState,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		block,
		logger,
		proposal,
		proposer,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const validator = {
			precommit: () => {},
		};

		const precommit = {
			blockNumber: 1,
			round: 0,
			serialized: Buffer.from(""),
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const spyMessageProcess = spy(messageProcessor, "process");
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyLoggerInfo = spy(logger, "info");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState.getProcessorResult = () => ({ success: true });

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());

		const spySaveState = spy(storage, "saveState");

		await consensus.onMajorityPrevote(roundState);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		getValidatorIndexByWalletAddress.calledOnce();
		getValidatorIndexByWalletAddress.calledWith(proposer.address);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(1, 1, 0, block.hash);
		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(precommit);
		spyLoggerInfo.calledWith(`Received +2/3 prevotes for ${1}/${0}/${proposal.getData().block.hash}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.PrevotedProposal, {
			blockNumber: 1,
			lockedRound: 0,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: 0,
		});

		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: 0,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: 0,
		});
	});

	it("#onMajorityPrevote - should set valid values and precommit, when step === precommit", async ({
		consensus,
		storage,
		roundState,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Precommit });

		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState.getProcessorResult = () => ({
			success: true,
		});

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());

		const spySaveState = spy(storage, "saveState");

		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.PrevotedProposal, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: 0,
		});

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: 0,
		});
	});

	it("#onMajorityPrevote - should only be called once", async ({
		consensus,
		roundState,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		block,
		proposer,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const validator = {
			precommit: () => {},
		};

		const precommit = {
			blockNumber: 1,
			round: 0,
			serialized: Buffer.from(""),
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spMessageProcess = spy(messageProcessor, "process");

		roundState.getProcessorResult = () => ({ success: true });

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());

		await consensus.onMajorityPrevote(roundState);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		getValidatorIndexByWalletAddress.calledOnce();
		getValidatorIndexByWalletAddress.calledWith(proposer.address);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(1, 1, 0, block.hash);
		spMessageProcess.calledOnce();
		spMessageProcess.calledWith(precommit);

		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);

		await startAt(consensus, {
			lockedValue: roundState,
			step: Enums.Consensus.Step.Prevote,
			validValue: roundState,
		});
		await consensus.onMajorityPrevote(roundState);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(1, 1, 0, block.hash);
		spMessageProcess.calledOnce();
		spMessageProcess.calledWith(precommit);

		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevote - should skip precommit if already precommitted", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		proposer,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const validator = {
			precommit: () => {},
		};

		const precommit = {
			blockNumber: 2,
			round: 0,
			serialized: Buffer.from(""),
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const spMessageProcess = spy(messageProcessor, "process");

		roundState.getProcessorResult = () => ({ success: true });
		roundState.hasPrecommit = () => true;

		await consensus.onMajorityPrevote(roundState);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);

		spyValidatorPrecommit.neverCalled();
		spMessageProcess.neverCalled();

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevote - should return if step === propose", async ({ consensus, roundState }) => {
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if blockNumber doesn't match", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		roundState = { ...roundState, blockNumber: 3 };
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if round doesn't match", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		roundState = { ...roundState, round: 1 };
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if proposal is undefined", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		roundState.getProposal = () => {};
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if processor result is false", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		roundState.getProcessorResult = () => ({ success: false });
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevoteAny - should schedule timeout prevote", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(1, 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.PrevotedAny, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});
	});

	it("#onMajorityPrevoteAny - should return if step !== prevote", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		spyDispatch.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onMajorityPrevoteAny - should return if blockNumber doesn't match", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState = { ...roundState, blockNumber: 3 };
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		spyDispatch.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteAny - should return if round doesn't match", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState = { ...roundState, round: 1 };
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		spyDispatch.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteAny - should not dispatch if timeout is scheduled", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyScheduleTimeout = stub(scheduler, "scheduleTimeoutPrevote").returnValue(false);
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(1, 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		spyDispatch.neverCalled();
	});

	it("#onMajorityPrevoteNull - should precommit", async ({
		consensus,
		storage,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		proposer,
		eventDispatcher,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const validator = {
			precommit: () => {},
		};

		const precommit = {
			blockNumber: 1,
			round: 0,
			serialized: Buffer.from(""),
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyMessageProcess = spy(messageProcessor, "process");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		const spySaveState = spy(storage, "saveState");

		await consensus.onMajorityPrevoteNull(roundState);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		getValidatorIndexByWalletAddress.calledOnce();
		getValidatorIndexByWalletAddress.calledWith(proposer.address);

		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(1, 1, 0);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(precommit);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.PrevotedNull, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: undefined,
		});

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: undefined,
		});
	});

	it("#onMajorityPrevoteNull - should return if step !== prevote", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Precommit });

		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevoteNull - should return if blockNumber doesn't match", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		roundState = { ...roundState, blockNumber: 3 };
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteNull - should return if round doesn't match", async ({ consensus, roundState }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		roundState = { ...roundState, round: 1 };
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onMajorityPrecommitAny - should schedule timeout precommit", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrecommit");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);

		await consensus.onMajorityPrecommitAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(1, 0);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.PrecommittedAny, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onMajorityPrecommitAny - should return if blockNumber doesn't match", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrecommit");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);

		roundState = { ...roundState, blockNumber: 3 };
		await consensus.onMajorityPrecommitAny(roundState);

		spyScheduleTimeout.neverCalled();
		spyDispatch.neverCalled();
	});

	it("#onMajorityPrecommitAny - should return if round doesn't match", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrecommit");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);

		roundState = { ...roundState, round: 2 };
		await consensus.onMajorityPrecommitAny(roundState);

		spyScheduleTimeout.neverCalled();
		spyDispatch.neverCalled();
	});

	it("#onMajorityPrecommitAny - should not dispatch if timeout is scheduled", async ({
		consensus,
		scheduler,
		roundState,
		eventDispatcher,
	}) => {
		const spyScheduleTimeout = stub(scheduler, "scheduleTimeoutPrecommit").returnValue(false);
		const spyDispatch = spy(eventDispatcher, "dispatch");

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);

		await consensus.onMajorityPrecommitAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(1, 0);
		spyDispatch.neverCalled();
	});

	it("#onMajorityPrecommit - should commit & increase blockNumber", async ({
		consensus,
		blockProcessor,
		roundState,
		roundStateRepository,
		logger,
		proposal,
		eventDispatcher,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.getData().block);
		const spyRoundStateRepositoryClear = stub(roundStateRepository, "clear");
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});
		const spyLoggerInfo = spy(logger, "info");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState.hasProcessorResult = () => true;
		roundState.getProcessorResult = () => ({ success: true });

		assert.equal(consensus.getBlockNumber(), 1);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.calledOnce();
		spyBlockProcessorCommit.calledWith(roundState);
		spyConsensusStartRound.calledOnce();
		spyConsensusStartRound.calledWith(0);
		spyRoundStateRepositoryClear.calledOnce();
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${0}/${proposal.getData().block.hash}`);
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.ConsensusEvent.PrecommittedProposal, {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
		assert.equal(consensus.getBlockNumber(), 2);
	});

	it("#onMajorityPrecommit - should terminate if processor throws", async ({
		app,
		consensus,
		blockProcessor,
		roundState,
		proposal,
	}) => {
		const fakeTimers = clock();

		const error = new Error("error");
		const spyAppTerminate = stub(app, "terminate").callsFake(() => {});
		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.getData().block);
		const spyBlockProcessorCommit = stub(blockProcessor, "commit").rejectedValue(error);

		roundState.hasProcessorResult = () => true;
		roundState.getProcessorResult = () => ({ success: true });

		assert.equal(consensus.getBlockNumber(), 1);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.calledOnce();
		spyBlockProcessorCommit.calledWith(roundState);
		spyAppTerminate.calledOnce();
		spyAppTerminate.calledWith("Failed to commit block", error);
	});

	it("#onMajorityPrecommit - should log and do nothing if result is invalid", async ({
		consensus,
		blockProcessor,
		roundState,
		logger,
		block,
		roundStateRepository,
		proposal,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.getData().block);
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyRoundStateRepositoryClear = stub(roundStateRepository, "clear");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});
		const spyLoggerInfo = spy(logger, "info");

		roundState.hasProcessorResult = () => true;
		roundState.getProcessorResult = () => ({ success: false });

		assert.equal(consensus.getBlockNumber(), 1);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.neverCalled();
		spyConsensusStartRound.neverCalled();
		spyRoundStateRepositoryClear.neverCalled();
		spyLoggerInfo.calledWith(`Block ${1}/${0}/${block.hash} is invalid`);
		assert.equal(consensus.getBlockNumber(), 1);
	});

	it("#onMajorityPrecommitWithoutProposal - should report the missing proposal once per round", async ({
		consensus,
		roundState,
		logger,
	}) => {
		const spyLoggerInfo = spy(logger, "info");

		consensus.onMajorityPrecommitWithoutProposal(roundState);
		consensus.onMajorityPrecommitWithoutProposal(roundState);

		spyLoggerInfo.calledOnce();
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${0}, but proposal is missing`);
	});

	it("#onMajorityPrecommitWithoutProposal - should ignore another round or block number", async ({
		consensus,
		logger,
	}) => {
		const spyLoggerInfo = spy(logger, "info");

		consensus.onMajorityPrecommitWithoutProposal({ blockNumber: 1, round: 1 } as Contracts.Consensus.RoundState);
		consensus.onMajorityPrecommitWithoutProposal({ blockNumber: 2, round: 0 } as Contracts.Consensus.RoundState);

		spyLoggerInfo.neverCalled();
	});

	it("#onMajorityPrecommitWithoutProposal - should report again in the next round", async ({
		consensus,
		roundState,
		logger,
	}) => {
		const spyLoggerInfo = spy(logger, "info");

		consensus.onMajorityPrecommitWithoutProposal(roundState);
		await consensus.startRound(1);
		consensus.onMajorityPrecommitWithoutProposal({ blockNumber: 1, round: 1 } as Contracts.Consensus.RoundState);

		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${0}, but proposal is missing`);
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${1}, but proposal is missing`);
	});

	it("#handle - should apply the rules to the round state", async ({ consensus, roundState }) => {
		const spyApplyRules = stub(consensus, "applyRules").callsFake(async () => {});

		await consensus.handle(roundState);

		spyApplyRules.calledOnce();
		spyApplyRules.calledWith(roundState);
	});

	it("#handle - should do nothing once disposed", async ({ consensus, roundState }) => {
		const spyApplyRules = stub(consensus, "applyRules").callsFake(async () => {});

		await consensus.dispose();
		await consensus.handle(roundState);

		spyApplyRules.neverCalled();
	});

	it("#handle - should report +2/3 precommits for a block whose proposal is missing", async ({
		consensus,
		blockProcessor,
		roundState,
		logger,
	}) => {
		roundState.getProposal = () => undefined;
		roundState.hasMajorityPrevotes = () => false;
		roundState.hasMajorityPrevotesAny = () => false;
		roundState.hasMajorityPrevotesNull = () => false;
		roundState.hasMajorityPrecommitsAny = () => false;
		roundState.hasMajorityPrecommits = () => false;
		roundState.hasMajorityPrecommitsWithoutProposal = () => true;
		roundState.hasMinorityPrevotesOrPrecommits = () => false;

		const spyBlockProcessorProcess = spy(blockProcessor, "process");
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyLoggerInfo = spy(logger, "info");

		await consensus.handle(roundState);

		spyBlockProcessorProcess.neverCalled();
		spyBlockProcessorCommit.neverCalled();
		spyLoggerInfo.calledOnce();
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${0}, but proposal is missing`);
		assert.equal(consensus.getBlockNumber(), 1);
	});

	it("#handle - should process the proposal before acting on +2/3 precommits", async ({
		consensus,
		blockProcessor,
		proposalProcessor,
		roundState,
		validatorSet,
		proposal,
		block,
	}) => {
		// onMajorityPrecommit relies on the unit carrying a processor result. hasMajorityPrecommits() is false
		// without a proposal, and handle() runs a present proposal through the processor before anything else,
		// so the result is there by the time the precommits are acted on.
		let processorResult: Contracts.Processor.BlockProcessorResult | undefined;
		roundState.getBlock = () => block;
		roundState.hasProcessorResult = () => processorResult !== undefined;
		roundState.setProcessorResult = (result) => (processorResult = result);
		roundState.getProcessorResult = () => processorResult!;
		roundState.hasMajorityPrevotes = () => false;
		roundState.hasMajorityPrevotesAny = () => false;
		roundState.hasMajorityPrevotesNull = () => false;
		roundState.hasMajorityPrecommitsAny = () => false;
		roundState.hasMajorityPrecommits = () => true;
		roundState.hasMajorityPrecommitsWithoutProposal = () => false;
		roundState.hasMinorityPrevotesOrPrecommits = () => false;
		proposal.deserializePayload = async () => {};
		proposalProcessor.hasValidLockProof = async () => true;

		stub(validatorSet, "getRoundValidators").returnValue([]);
		stub(consensus, "startRound").callsFake(async () => {});
		const spyBlockProcessorProcess = stub(blockProcessor, "process").resolvedValue({ success: true });
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");

		await consensus.handle(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);
		spyBlockProcessorCommit.calledOnce();
		spyBlockProcessorCommit.calledWith(roundState);
		assert.equal(consensus.getBlockNumber(), 2);
	});

	it("#handle - should prevote null when the block processor throws", async ({
		consensus,
		blockProcessor,
		proposalProcessor,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		proposal,
		proposer,
		logger,
	}) => {
		// #processProposal turns a throwing processor into a failed result instead of letting the error escape,
		// so the proposal counts as invalid and onProposal prevotes nil for it.
		let processorResult: Contracts.Processor.BlockProcessorResult | undefined;
		roundState.hasProcessorResult = () => processorResult !== undefined;
		roundState.setProcessorResult = (result) => (processorResult = result);
		roundState.getProcessorResult = () => processorResult!;
		roundState.hasMajorityPrevotes = () => false;
		roundState.hasMajorityPrevotesAny = () => false;
		roundState.hasMajorityPrevotesNull = () => false;
		roundState.hasMajorityPrecommitsAny = () => false;
		roundState.hasMajorityPrecommits = () => false;
		roundState.hasMajorityPrecommitsWithoutProposal = () => false;
		roundState.hasMinorityPrevotesOrPrecommits = () => false;
		proposal.deserializePayload = async () => {};
		proposalProcessor.hasValidLockProof = async () => true;

		const prevote = { blockNumber: 1, round: 0 };
		const validator = { prevote: () => {} };
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyBlockProcessorProcess = stub(blockProcessor, "process").rejectedValue(new Error("processor failed"));
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyMessageProcess = spy(messageProcessor, "process");
		const spyLoggerError = spy(logger, "error");

		await consensus.handle(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);
		spyLoggerError.calledOnce();
		spyLoggerError.calledWith(`Failed to process proposal ${1}/${0}: processor failed`);
		assert.equal(processorResult?.success, false);

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 0, undefined);
		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);
		spyBlockProcessorCommit.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#handle - should commit a block from an earlier round than the current one", async ({
		consensus,
		blockProcessor,
		proposalProcessor,
		scheduler,
		validatorSet,
		validatorsRepository,
		roundState,
		proposal,
		proposer,
		block,
	}) => {
		await startAt(consensus, { round: 2 });

		// run() replays the earlier rounds of the height after bootstrap for exactly this case: a fully decided
		// round this node already moved past. The round-bound handlers stay quiet for it, the commit goes through.
		let processorResult: Contracts.Processor.BlockProcessorResult | undefined;
		roundState.getBlock = () => block;
		roundState.hasProcessorResult = () => processorResult !== undefined;
		roundState.setProcessorResult = (result) => (processorResult = result);
		roundState.getProcessorResult = () => processorResult!;
		roundState.hasMajorityPrevotes = () => true;
		roundState.hasMajorityPrevotesAny = () => true;
		roundState.hasMajorityPrevotesNull = () => false;
		roundState.hasMajorityPrecommitsAny = () => true;
		roundState.hasMajorityPrecommits = () => true;
		roundState.hasMajorityPrecommitsWithoutProposal = () => false;
		roundState.hasMinorityPrevotesOrPrecommits = () => false;
		proposal.deserializePayload = async () => {};
		proposalProcessor.hasValidLockProof = async () => true;

		const validator = { precommit: () => {}, prevote: () => {} };
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue({});
		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue({});
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(async () => {});
		const spyBlockProcessorProcess = stub(blockProcessor, "process").resolvedValue({ success: true });
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyScheduleTimeoutPrevote = spy(scheduler, "scheduleTimeoutPrevote");
		const spyScheduleTimeoutPrecommit = spy(scheduler, "scheduleTimeoutPrecommit");

		await consensus.handle(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);
		spyBlockProcessorCommit.calledOnce();
		spyBlockProcessorCommit.calledWith(roundState);
		spyConsensusStartRound.calledOnce();
		spyConsensusStartRound.calledWith(0);
		assert.equal(consensus.getBlockNumber(), 2);

		spyValidatorPrevote.neverCalled();
		spyValidatorPrecommit.neverCalled();
		spyScheduleTimeoutPrevote.neverCalled();
		spyScheduleTimeoutPrecommit.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onMajorityPrecommit - should be called only once", async ({
		consensus,
		blockProcessor,
		roundState,
		proposal,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.getData().block);
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState.hasProcessorResult = () => true;
		roundState.getProcessorResult = () => ({ success: true });

		assert.equal(consensus.getBlockNumber(), 1);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyBlockProcessorCommit.calledOnce();
		spyConsensusStartRound.calledOnce();
		assert.equal(consensus.getBlockNumber(), 2);

		await consensus.onMajorityPrecommit(roundState);

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.calledOnce();
		spyConsensusStartRound.calledOnce();
		assert.equal(consensus.getBlockNumber(), 2);
	});

	it("#onMajorityPrecommit - should commit a block from an earlier round than the current one", async ({
		consensus,
		blockProcessor,
		roundState,
		roundStateRepository,
		logger,
		proposal,
	}) => {
		await startAt(consensus, { round: 2 });

		// Tendermint line 49 accepts +2/3 precommits from any round of the height. The network may have decided a
		// round this node already moved past, so only the block number is checked here, not the round.
		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.getData().block);
		const spyRoundStateRepositoryClear = stub(roundStateRepository, "clear");
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});
		const spyLoggerInfo = spy(logger, "info");

		roundState.hasProcessorResult = () => true;
		roundState.getProcessorResult = () => ({ success: true });

		assert.equal(roundState.round, 0);

		await consensus.onMajorityPrecommit(roundState);

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.calledOnce();
		spyBlockProcessorCommit.calledWith(roundState);
		spyRoundStateRepositoryClear.calledOnce();
		spyConsensusStartRound.calledOnce();
		spyConsensusStartRound.calledWith(0);
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${2}(${0})/${proposal.getData().block.hash}`);
		assert.equal(consensus.getBlockNumber(), 2);
	});

	it("#onMajorityPrecommit - should return if blockNumber doesn't match", async ({
		consensus,
		blockProcessor,
		roundState,
	}) => {
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState.getProcessorResult = () => ({ success: true });

		roundState = { ...roundState, blockNumber: 2 };
		await consensus.onMajorityPrecommit(roundState);

		spyBlockProcessorCommit.neverCalled();
		spyConsensusStartRound.neverCalled();
	});

	it("#onMinorityWithHigherRound - should start new round", async ({ consensus, roundState }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState = { ...roundState, round: 1 };
		void consensus.onMinorityWithHigherRound(roundState);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.calledWith(roundState.round);
	});

	it("#onMinorityWithHigherRound - should return if blockNumber doesn't match", async ({ consensus, roundState }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState = { ...roundState, blockNumber: 3 };
		void consensus.onMinorityWithHigherRound(roundState);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.neverCalled();
	});

	it("#onMinorityWithHigherRound - should return if round is not greater", async ({ consensus, roundState }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		void consensus.onMinorityWithHigherRound(roundState);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.neverCalled();
	});

	it("#onTimeoutPropose - should prevote null", async ({
		consensus,
		storage,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		proposer,
	}) => {
		const prevote = {
			blockNumber: 1,
			round: 0,
			serialized: Buffer.from(""),
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyValidatorsRepositoryGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyMessageProcess = spy(messageProcessor, "process");

		const spySaveState = spy(storage, "saveState");

		await consensus.onTimeoutPropose(1, 0);

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 0);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Prevote,
			validRound: undefined,
		});
	});

	it("#onTimeoutPropose - should return if step === prevote", async ({ consensus, messageProcessor }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPropose(1, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onTimeoutPropose - should return if step === precommit", async ({ consensus, messageProcessor }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Precommit });

		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPropose(1, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onTimeoutPropose - should return if blockNumber doesn't match", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPropose(2, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutPropose - should return if round doesn't match", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPropose(2, 1);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutPropose - should do nothing once disposed", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.dispose();
		await consensus.onTimeoutPropose(1, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutPrevote - should precommit null", async ({
		consensus,
		storage,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		proposer,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const validator = {
			precommit: () => {},
		};

		const precommit = {
			blockNumber: 1,
			round: 0,
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetRoundValidators = stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const getValidatorIndexByWalletAddress = stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		const spyMessageProcess = spy(messageProcessor, "process");

		const spySaveState = spy(storage, "saveState");

		await consensus.onTimeoutPrevote(1, 0);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);
		getValidatorIndexByWalletAddress.calledOnce();
		getValidatorIndexByWalletAddress.calledWith(proposer.address);

		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(1, 1, 0);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(precommit);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Precommit,
			validRound: undefined,
		});
	});

	it("#onTimeoutPrevote - should return if step === propose", async ({ consensus, messageProcessor }) => {
		const spMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPrevote(2, 0);

		spMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutPrevote - should return if step === precommit", async ({ consensus, messageProcessor }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Precommit });

		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPrevote(2, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onTimeoutPrevote - should return if blockNumber doesn't match", async ({ consensus, messageProcessor }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPrevote(3, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onTimeoutPrevote - should return if round doesn't match", async ({ consensus, messageProcessor }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.onTimeoutPrevote(2, 1);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onTimeoutPrevote - should do nothing once disposed", async ({ consensus, messageProcessor }) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });
		const spyMessageProcess = spy(messageProcessor, "process");

		await consensus.dispose();
		await consensus.onTimeoutPrevote(1, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	each(
		"#onTimeoutPrecommit - should start next round",
		async ({ context: { consensus }, dataset: step }: { context: Context; dataset: Contracts.Consensus.Step }) => {
			const fakeTimers = clock();
			const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

			await startAt(consensus, { step });
			void consensus.onTimeoutPrecommit(1, 0);
			await fakeTimers.nextAsync();

			spyConsensusStartRound.calledOnce();
			spyConsensusStartRound.calledWith(1);
		},
		[Enums.Consensus.Step.Propose, Enums.Consensus.Step.Prevote, Enums.Consensus.Step.Precommit],
	);

	it("#onTimeoutPrecommit - should return if blockNumber doesn't match", async ({ consensus }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		void consensus.onTimeoutPrecommit(3, 0);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.neverCalled();
	});

	it("#onTimeoutPrecommit - should return if round doesn't match", async ({ consensus }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		void consensus.onTimeoutPrecommit(2, 1);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.neverCalled();
	});

	it("#onTimeoutPrecommit - should do nothing once disposed", async ({ consensus }) => {
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(async () => {});

		await consensus.dispose();
		await consensus.onTimeoutPrecommit(1, 0);

		spyConsensusStartRound.neverCalled();
	});

	it("#run - should take the state over, announce it, arm the round and apply the rules to it", async ({
		consensus,
		roundState,
		roundStateRepository,
		scheduler,
		eventDispatcher,
	}) => {
		const requestedRoundStates: [number, number][] = [];
		roundStateRepository.getRoundState = (blockNumber: number, round: number) => {
			requestedRoundStates.push([blockNumber, round]);
			return roundState;
		};

		const spyApplyRules = stub(consensus, "applyRules").callsFake(async () => {});
		const spyScheduleTimeoutBlockPrepare = spy(scheduler, "scheduleTimeoutBlockPrepare");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.run({ blockNumber: 1, round: 0, step: Enums.Consensus.Step.Propose });

		const state = {
			blockNumber: 1,
			lockedRound: undefined,
			round: 0,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		};
		spyDispatch.calledTimes(2);
		spyDispatch.calledNthWith(0, Events.ConsensusEvent.Bootstrapped, state);
		spyDispatch.calledNthWith(1, Events.ConsensusEvent.RoundStarted, state);
		spyScheduleTimeoutBlockPrepare.calledOnce();
		spyApplyRules.calledOnce();
		spyApplyRules.calledWith(roundState);
		// Once to arm the round, once to apply the rules to it.
		assert.equal(requestedRoundStates, [
			[1, 0],
			[1, 0],
		]);
		assert.equal(consensus.getBlockNumber(), 1);
		assert.equal(consensus.getRound(), 0);
	});

	it("#run - should resume the round the state names, at its step, with its lock and valid value", async ({
		consensus,
		roundState,
		roundStateRepository,
		scheduler,
		validatorsRepository,
		eventDispatcher,
	}) => {
		const requestedRoundStates: [number, number][] = [];
		roundStateRepository.getRoundState = (blockNumber: number, round: number) => {
			requestedRoundStates.push([blockNumber, round]);
			return roundState;
		};

		const lockedValue = { ...roundState, round: 1 } as unknown as Contracts.Consensus.RoundState;
		const spyApplyRules = stub(consensus, "applyRules").callsFake(async () => {});
		const spyScheduleTimeoutBlockPrepare = spy(scheduler, "scheduleTimeoutBlockPrepare");
		const spyGetValidator = spy(validatorsRepository, "getValidator");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		await consensus.run({
			blockNumber: 1,
			lockedRound: 1,
			lockedValue,
			round: 2,
			step: Enums.Consensus.Step.Precommit,
			validRound: 1,
			validValue: lockedValue,
		});

		const state = { blockNumber: 1, lockedRound: 1, round: 2, step: Enums.Consensus.Step.Precommit, validRound: 1 };
		spyDispatch.calledWith(Events.ConsensusEvent.Bootstrapped, state);
		spyDispatch.calledWith(Events.ConsensusEvent.RoundStarted, state);
		// Past the propose step the round has its proposal, or its propose timeout, behind it: nothing to propose,
		// no block prepare timeout. The prevote and precommit timeouts come from the rules once +2/3 votes are in.
		spyScheduleTimeoutBlockPrepare.neverCalled();
		spyGetValidator.neverCalled();
		spyApplyRules.calledOnce();
		spyApplyRules.calledWith(roundState);
		assert.equal(requestedRoundStates, [
			[1, 2],
			[1, 2],
		]);
		assert.equal(consensus.getRound(), 2);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
		assert.equal(consensus.getLockedRound(), 1);
		assert.equal(consensus.getValidRound(), 1);
	});

	it("#run - should hold the handler lock, so a round state handled meanwhile waits for the round to be armed", async ({
		consensus,
		roundState,
	}) => {
		let finishRules: () => void = () => {};
		const appliedInRound: number[] = [];
		stub(consensus, "applyRules").callsFake(async () => {
			appliedInRound.push(consensus.getRound());

			if (appliedInRound.length === 1) {
				await new Promise<void>((resolve) => (finishRules = resolve));
			}
		});

		const running = consensus.run({ blockNumber: 1, round: 2, step: Enums.Consensus.Step.Precommit });
		const handling = consensus.handle(roundState);
		await new Promise((resolve) => setTimeout(resolve, 0));

		// run() is in the rules of round 2; the handled round state is still queued behind it.
		assert.equal(appliedInRound, [2]);

		finishRules();
		await running;
		await handling;

		assert.equal(appliedInRound, [2, 2]);
	});

	it("#run - should apply no rules when disposed while the round is armed", async ({
		consensus,
		eventDispatcher,
	}) => {
		const spyApplyRules = stub(consensus, "applyRules").callsFake(async () => {});

		// dispose() waits for the handler lock, which run() holds; it is not awaited inside the listener.
		let disposing: Promise<void> | undefined;
		stub(eventDispatcher, "dispatch").callsFake(async (event: unknown) => {
			if (event === Events.ConsensusEvent.RoundStarted) {
				disposing = consensus.dispose();
			}
		});

		await consensus.run({ blockNumber: 1, round: 0, step: Enums.Consensus.Step.Propose });
		await disposing;

		spyApplyRules.neverCalled();
		assert.true(consensus.isDisposed());
	});

	it("#run - should let an error escape to the caller", async ({ app, consensus }) => {
		// The bootstrap awaits run(); a failure reaches Application.boot(), which terminates the node.
		stub(consensus, "applyRules").rejectedValue(new Error("rules failed"));
		const spyTerminate = stub(app, "terminate").callsFake(async () => {});

		await assert.rejects(
			() => consensus.run({ blockNumber: 1, round: 0, step: Enums.Consensus.Step.Propose }),
			"rules failed",
		);

		spyTerminate.neverCalled();
	});

	it("#handleCommitState - should process the block and commit it", async ({
		consensus,
		blockProcessor,
		roundStateRepository,
		block,
		logger,
	}) => {
		let processorResult: Contracts.Processor.BlockProcessorResult | undefined;
		const commitState = {
			blockNumber: 1,
			getBlock: () => block,
			getProcessorResult: () => processorResult!,
			hasProcessorResult: () => processorResult !== undefined,
			round: 0,
			setProcessorResult: (result: Contracts.Processor.BlockProcessorResult) => (processorResult = result),
		} as unknown as Contracts.Processor.ProcessableUnit;

		const spyProcess = stub(blockProcessor, "process").resolvedValue({ success: true });
		const spyCommit = spy(blockProcessor, "commit");
		const spyClear = stub(roundStateRepository, "clear");
		const spyStartRound = stub(consensus, "startRound").callsFake(async () => {});
		const spyLoggerInfo = spy(logger, "info");

		await consensus.handleCommitState(commitState);

		spyProcess.calledOnce();
		spyProcess.calledWith(commitState);
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${0}/${block.hash}`);
		spyCommit.calledOnce();
		spyCommit.calledWith(commitState);
		spyClear.calledOnce();
		spyStartRound.calledOnce();
		spyStartRound.calledWith(0);
		assert.equal(consensus.getBlockNumber(), 2);
	});

	it("#handleCommitState - should reuse an existing processor result", async ({
		consensus,
		blockProcessor,
		roundStateRepository,
		block,
	}) => {
		const commitState = {
			blockNumber: 1,
			getBlock: () => block,
			getProcessorResult: () => ({ success: true }),
			hasProcessorResult: () => true,
			round: 0,
			setProcessorResult: () => {},
		} as unknown as Contracts.Processor.ProcessableUnit;

		const spyProcess = spy(blockProcessor, "process");
		const spyCommit = spy(blockProcessor, "commit");
		stub(roundStateRepository, "clear");
		stub(consensus, "startRound").callsFake(async () => {});

		await consensus.handleCommitState(commitState);

		spyProcess.neverCalled();
		spyCommit.calledOnce();
		spyCommit.calledWith(commitState);
		assert.equal(consensus.getBlockNumber(), 2);
	});

	it("#handleCommitState - should mark the block as invalid and skip the commit when processing throws", async ({
		consensus,
		blockProcessor,
		block,
		logger,
	}) => {
		let processorResult: Contracts.Processor.BlockProcessorResult | undefined;
		const commitState = {
			blockNumber: 1,
			getBlock: () => block,
			getProcessorResult: () => processorResult!,
			hasProcessorResult: () => processorResult !== undefined,
			round: 0,
			setProcessorResult: (result: Contracts.Processor.BlockProcessorResult) => (processorResult = result),
		} as unknown as Contracts.Processor.ProcessableUnit;

		const spyProcess = stub(blockProcessor, "process").rejectedValue(new Error("boom"));
		const spyCommit = spy(blockProcessor, "commit");
		const spyStartRound = stub(consensus, "startRound").callsFake(async () => {});
		const spyLoggerInfo = spy(logger, "info");

		await consensus.handleCommitState(commitState);

		spyProcess.calledOnce();
		assert.defined(processorResult);
		assert.false(processorResult!.success);
		spyLoggerInfo.calledWith(`Block ${1}/${0}/${block.hash} is invalid`);
		spyCommit.neverCalled();
		spyStartRound.neverCalled();
		assert.equal(consensus.getBlockNumber(), 1);
	});

	it("#handleCommitState - should do nothing once disposed", async ({ consensus, blockProcessor, block }) => {
		const commitState = {
			blockNumber: 1,
			getBlock: () => block,
			getProcessorResult: () => ({ success: true }),
			hasProcessorResult: () => false,
			round: 0,
			setProcessorResult: () => {},
		} as unknown as Contracts.Processor.ProcessableUnit;

		const spyProcess = spy(blockProcessor, "process");
		const spyCommit = spy(blockProcessor, "commit");

		await consensus.dispose();
		await consensus.handleCommitState(commitState);

		spyProcess.neverCalled();
		spyCommit.neverCalled();
		assert.equal(consensus.getBlockNumber(), 1);
	});

	it("#startRound - should store the state of a round above 0", async ({ consensus, storage }) => {
		const spySaveState = spy(storage, "saveState");

		await consensus.startRound(2);

		spySaveState.calledOnce();
		spySaveState.calledWith({
			blockNumber: 1,
			lockedRound: undefined,
			round: 2,
			step: Enums.Consensus.Step.Propose,
			validRound: undefined,
		});
	});

	it("#startRound - should not store the state of round 0", async ({ consensus, storage }) => {
		// Round 0 is what the bootstrapper assumes without a stored state, so a commit writes nothing.
		const spySaveState = spy(storage, "saveState");

		await consensus.startRound(0);

		spySaveState.neverCalled();
	});

	it("#startRound - should store the state before the round starts", async ({
		consensus,
		storage,
		eventDispatcher,
	}) => {
		const calls: string[] = [];
		storage.saveState = async () => {
			calls.push("store");
		};
		eventDispatcher.dispatch = async (event: string) => {
			if (event === Events.ConsensusEvent.RoundStarted) {
				calls.push("start");
			}
		};

		await consensus.startRound(2);

		assert.equal(calls, ["store", "start"]);
	});

	it("#onTimeoutPropose - should store the state before signing the prevote", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		storage,
		proposer,
	}) => {
		const calls: string[] = [];
		stub(storage, "saveState").callsFake(async () => {
			calls.push("store");
		});
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue({
			prevote: async () => {
				calls.push("sign");
				return {};
			},
		});
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		await consensus.onTimeoutPropose(1, 0);

		assert.equal(calls, ["store", "sign"]);
	});

	it("#onMajorityPrevote - should store the lock before signing the precommit", async ({
		consensus,
		roundState,
		validatorSet,
		validatorsRepository,
		storage,
		proposer,
	}) => {
		await startAt(consensus, { step: Enums.Consensus.Step.Prevote });

		const calls: string[] = [];
		stub(storage, "saveState").callsFake(async (state: Contracts.Consensus.StateData) => {
			calls.push(`store lock ${state.lockedRound}`);
		});
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue({
			precommit: async () => {
				calls.push("sign");
				return {};
			},
		});
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
		roundState.getProcessorResult = () => ({ success: true });

		await consensus.onMajorityPrevote(roundState);

		assert.equal(calls, ["store lock 0", "sign"]);
	});

	it("#prevote - should store the own prevote before handing it to the message processor", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		storage,
		proposer,
	}) => {
		const prevote = { blockNumber: 1, round: 0, type: Enums.Crypto.MessageType.Prevote, validatorIndex: 1 };
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue({ prevote: async () => prevote });
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const calls: string[] = [];
		const spySaveMessage = stub(storage, "saveMessage").callsFake(async () => {
			calls.push("store");
		});
		stub(messageProcessor, "process").callsFake(async () => {
			calls.push("process");
		});

		await consensus.prevote("blockHash");

		spySaveMessage.calledOnce();
		spySaveMessage.calledWith(prevote);
		assert.equal(calls, ["store", "process"]);
	});

	it("#precommit - should store the own precommit before handing it to the message processor", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		storage,
		proposer,
	}) => {
		const precommit = { blockNumber: 1, round: 0, type: Enums.Crypto.MessageType.Precommit, validatorIndex: 1 };
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue({ precommit: async () => precommit });
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const calls: string[] = [];
		const spySaveMessage = stub(storage, "saveMessage").callsFake(async () => {
			calls.push("store");
		});
		stub(messageProcessor, "process").callsFake(async () => {
			calls.push("process");
		});

		await consensus.precommit("blockHash");

		spySaveMessage.calledOnce();
		spySaveMessage.calledWith(precommit);
		assert.equal(calls, ["store", "process"]);
	});

	it("#onTimeoutBlockPrepare - should store the proposal before announcing and processing it", async ({
		consensus,
		proposalProcessor,
		proposal,
		eventDispatcher,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposer,
		forger,
		block,
		storage,
	}) => {
		stub(forger, "forgeBlock").resolvedValue(block);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue({
			getRandaoReveal: async () => "aa".repeat(96),
			propose: async () => proposal,
		});
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const calls: string[] = [];
		const spySaveProposal = stub(storage, "saveProposal").callsFake(async () => {
			calls.push("store");
		});
		stub(eventDispatcher, "dispatch").callsFake(async (event: string) => {
			if (event === Events.ConsensusEvent.Proposed) {
				calls.push("announce");
			}
		});
		stub(proposalProcessor, "process").callsFake(async () => {
			calls.push("process");
		});

		await consensus.startRound(0);
		await consensus.onTimeoutBlockPrepare();

		spySaveProposal.calledOnce();
		spySaveProposal.calledWith(proposal);
		assert.equal(calls, ["store", "announce", "process"]);
	});
});
