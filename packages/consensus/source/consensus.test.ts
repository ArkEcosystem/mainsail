import type { Contracts } from "@mainsail/contracts";
import { Identifiers, Events, Enums } from "@mainsail/constants";
import { DoubleSignError } from "@mainsail/exceptions";
import { Lock } from "@mainsail/utils";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Consensus } from "./consensus";

type Context = {
	app: Application;
	consensus: Consensus;
	blockProcessor: any;
	bootstrapper: any;
	cryptoConfiguration: any;
	state: any;
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
	forger: any;
};

describe<Context>("Consensus", ({ it, beforeEach, assert, stub, spy, clock, each }) => {
	beforeEach((context) => {
		context.blockProcessor = {
			commit: () => {},
			process: () => {},
		};

		context.state = {
			getLastBlock: () => {},
			getBlockNumber: () => 1,
		};

		context.cryptoConfiguration = {
			getMilestoneDiff: () => ({}),
			isNewMilestone: () => false,
			setBlockNumber: () => {},
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

		context.bootstrapper = {
			run: () => {},
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

		context.forger = {
			forgeBlock: () => {},
		};

		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.app.bind(Identifiers.Processor.BlockProcessor).toConstantValue(context.blockProcessor);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.state);
		context.app.bind(Identifiers.Consensus.Processor.Message).toConstantValue(context.messageProcessor);
		context.app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue(context.proposalProcessor);
		context.app.bind(Identifiers.Consensus.Bootstrapper).toConstantValue(context.bootstrapper);
		context.app.bind(Identifiers.Consensus.Scheduler).toConstantValue(context.scheduler);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(new Lock());
		context.app.bind(Identifiers.Validator.Repository).toConstantValue(context.validatorsRepository);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue(context.roundStateRepository);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.P2P.Statistic.Service).toConstantValue(context.peerStatistic);
		context.app.bind(Identifiers.Forger.Block).toConstantValue(context.forger);

		context.consensus = context.app.resolve(Consensus);
	});

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

		consensus.setValidRound(roundState);
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

	it("#onTimeoutStartRound - should propose if proposal is ready", async ({
		consensus,
		proposalProcessor,
		proposal,
		logger,
	}) => {
		const spyProposalProcess = spy(proposalProcessor, "process");
		const spyLoggerNotice = spy(logger, "notice");

		consensus.setProposal(proposal, proposal.getData().block);
		await consensus.onTimeoutStartRound();

		spyProposalProcess.calledOnce();
		spyProposalProcess.calledWith(proposal);
		spyLoggerNotice.calledWith(
			`📦 Proposing block ${1}/${0}/${proposal.getData().block.hash} as ${proposal.getData().block.proposer}`,
		);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutStartRound - should skip propose if already proposed", async ({
		consensus,
		proposalProcessor,
		proposal,
		eventDispatcher,
	}) => {
		const spyProposalProcess = spy(proposalProcessor, "process");

		consensus.setProposal(proposal, proposal.getData().block);
		await consensus.onTimeoutStartRound();
		await consensus.onTimeoutStartRound();

		spyProposalProcess.calledOnce();
		spyProposalProcess.calledWith(proposal);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutStartRound - should skip the proposal and continue when the double-sign guard refuses", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		validatorSet,
		proposalProcessor,
		proposer,
		logger,
		forger,
		block,
	}) => {
		const position = { blockNumber: 1, round: 0, step: Enums.Consensus.Step.Propose, value: "blockHash" };
		const validator = {
			getRandaoReveal: async () => "aa".repeat(96),
			propose: () => {},
		};

		stub(forger, "forgeBlock").resolvedValue(block);
		stub(validator, "propose").rejectedValue(
			new DoubleSignError("publicKey", { ...position, value: "conflictingHash" }, position),
		);
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const spyProposalProcess = spy(proposalProcessor, "process");
		const spyLoggerWarn = spy(logger, "warn");

		await consensus.startRound(0);
		await consensus.onTimeoutStartRound();

		spyLoggerWarn.calledOnce();
		spyProposalProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#propose - should catch a forging failure instead of leaving an unhandled rejection", async ({
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
		stub(validatorsRepository, "getValidator").returnValue({
			getRandaoReveal: async () => "aa".repeat(96),
			propose: () => {},
		});
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
		await consensus.onTimeoutStartRound();

		spyProposalProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#prevote - should skip the vote and continue when the double-sign guard refuses", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		logger,
		proposer,
	}) => {
		const position = { blockNumber: 1, round: 0, step: Enums.Consensus.Step.Prevote, value: "blockHash" };
		const validator = {
			prevote: () => {},
		};

		stub(validator, "prevote").rejectedValue(
			new DoubleSignError("publicKey", { ...position, value: "conflictingHash" }, position),
		);
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const spyMessageProcess = spy(messageProcessor, "process");
		const spyLoggerWarn = spy(logger, "warn");

		await consensus.prevote("blockHash");

		spyMessageProcess.neverCalled();
		spyLoggerWarn.calledOnce();
	});

	it("#precommit - should skip the vote and continue when the double-sign guard refuses", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		logger,
		proposer,
	}) => {
		const position = { blockNumber: 1, round: 0, step: Enums.Consensus.Step.Precommit, value: "blockHash" };
		const validator = {
			precommit: () => {},
		};

		stub(validator, "precommit").rejectedValue(
			new DoubleSignError("publicKey", { ...position, value: "conflictingHash" }, position),
		);
		stub(validatorSet, "getRoundValidators").returnValue([proposer]);
		stub(validatorsRepository, "getValidator").returnValue(validator);
		stub(validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);

		const spyMessageProcess = spy(messageProcessor, "process");
		const spyLoggerWarn = spy(logger, "warn");

		await consensus.precommit("blockHash");

		spyMessageProcess.neverCalled();
		spyLoggerWarn.calledOnce();
	});

	it("#startRound - local validator should locked value", async () => {});

	it("#onProposal - should return if step !== propose", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Prevote);
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

	// TODO: Handle on processor
	it("#onProposal - broadcast prevote null, if block processor throws", async ({ consensus }) => {});

	it("#onProposal - broadcast prevote null, if locked value exists", async ({ consensus }) => {});

	it("#onProposalLocked - broadcast prevote block hash, if block is valid and lockedRound is undefined", async ({
		consensus,
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
		consensus.setRound(1);
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
	});

	it("#onProposalLocked - broadcast prevote block hash, if block is valid and valid round is higher or equal than lockedRound ", async () => {});

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
		consensus.setRound(1);
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

	it("#onProposalLocked - broadcast prevote null, if block is valid and lockedRound is higher than validRound", async () => {});

	it("#onProposalLocked - should return if step === prevote", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - should return if step === precommit", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		consensus.setStep(Enums.Consensus.Step.Precommit);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onProposalLocked - should return if blockNumber doesn't match", async ({
		consensus,
		roundState,
		proposal,
	}) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
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
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		roundState.getProposal = () => {};
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is undefined", async ({ consensus, roundState, proposal }) => {
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is higher than round", async ({
		consensus,
		roundState,
		proposal,
	}) => {
		proposal.validRound = 2;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is equal to round", async ({
		consensus,
		roundState,
		proposal,
	}) => {
		proposal.validRound = 1;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onMajorityPrevote - should set locked values, valid values and precommit, when step === prevote", async ({
		consensus,
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

		consensus.setStep(Enums.Consensus.Step.Prevote);
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
	});

	it("#onMajorityPrevote - should set valid values and precommit, when step === precommit", async ({
		consensus,
		roundState,
		eventDispatcher,
	}) => {
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState.getProcessorResult = () => ({
			success: true,
		});

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());

		consensus.setStep(Enums.Consensus.Step.Precommit);
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

		consensus.setStep(Enums.Consensus.Step.Prevote);
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

		consensus.setStep(Enums.Consensus.Step.Prevote);
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

		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		spyGetRoundValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(proposer.blsPublicKey);

		spyValidatorPrecommit.neverCalled();
		spMessageProcess.neverCalled();

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevote - should return if step === propose", async ({ consensus, roundState }) => {
		consensus.setStep(Enums.Consensus.Step.Propose);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if blockNumber doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, blockNumber: 3 };
		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if round doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, round: 1 };
		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if proposal is undefined", async ({ consensus, roundState }) => {
		roundState.getProposal = () => {};
		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getValidRound());
	});

	it("#onMajorityPrevote - should return if processor result is false", async ({ consensus, roundState }) => {
		roundState.getProcessorResult = () => ({ success: false });
		consensus.setStep(Enums.Consensus.Step.Prevote);
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
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		consensus.setStep(Enums.Consensus.Step.Prevote);
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

		consensus.setStep(Enums.Consensus.Step.Propose);
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
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState = { ...roundState, blockNumber: 3 };
		consensus.setStep(Enums.Consensus.Step.Prevote);
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
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		roundState = { ...roundState, round: 1 };
		consensus.setStep(Enums.Consensus.Step.Prevote);
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
		const spyScheduleTimeout = stub(scheduler, "scheduleTimeoutPrevote").returnValue(false);
		const spyDispatch = spy(eventDispatcher, "dispatch");

		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(1, 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		spyDispatch.neverCalled();
	});

	it("#onMajorityPrevoteNull - should precommit", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		roundState,
		proposer,
		eventDispatcher,
	}) => {
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

		consensus.setStep(Enums.Consensus.Step.Prevote);
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
	});

	it("#onMajorityPrevoteNull - should return if step !== prevote", async ({ consensus, roundState }) => {
		consensus.setStep(Enums.Consensus.Step.Precommit);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevoteNull - should return if blockNumber doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, blockNumber: 3 };
		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteNull - should return if round doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, round: 1 };
		consensus.setStep(Enums.Consensus.Step.Prevote);
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
		spyDispatch.calledWith(Events.ConsensusEvent.PrecommitedAny, {
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
		spyDispatch.calledWith(Events.ConsensusEvent.PrecommitedProposal, {
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

	it("#onMajorityPrecommit - should log and do nothing if proposal is missing", async ({
		consensus,
		blockProcessor,
		roundState,
		logger,
		roundStateRepository,
		proposal,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.getData().block);
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyRoundStateRepositoryClear = stub(roundStateRepository, "clear");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});
		const spyLoggerInfo = spy(logger, "info");

		roundState.hasProcessorResult = () => false;

		assert.equal(consensus.getBlockNumber(), 1);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.neverCalled();
		spyBlockProcessorCommit.neverCalled();
		spyConsensusStartRound.neverCalled();
		spyRoundStateRepositoryClear.neverCalled();
		spyLoggerInfo.calledOnce();
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${1}/${0}, but proposal is missing`);
		assert.equal(consensus.getBlockNumber(), 1);

		// Should not try again
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.neverCalled();
		spyBlockProcessorCommit.neverCalled();
		spyConsensusStartRound.neverCalled();
		spyRoundStateRepositoryClear.neverCalled();
		spyLoggerInfo.calledOnce(); // still only called once from previous attempt
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

	// TODO: fix
	// it("#onMajorityPrecommit - should return if proposal is undefined", async ({
	// 	consensus,
	// 	blockProcessor,
	// 	roundState,
	// }) => {
	// 	const spyBlockProcessorCommit = spy(blockProcessor, "commit");
	// 	const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

	// 	roundState.getProcessorResult = () => ({ success: true });

	// 	roundState.getProposal = () => undefined;
	// 	await consensus.onMajorityPrecommit(roundState);

	// 	spyBlockProcessorCommit.neverCalled();
	// 	spyConsensusStartRound.neverCalled();
	// });

	// Our own slot reporting. False reports are the thing to guard against here: a node runner who sees
	// a missed slot that did not happen has no way to tell it apart from a real one.
	const OURS = "ourValidatorAddress";
	const THEIRS = "otherValidatorAddress";

	const beOurProposer = (context: any, address: string = OURS) => {
		stub(context.forger, "forgeBlock").resolvedValue(context.block);
		stub(context.roundStateRepository, "getRoundState").returnValue({
			hasProposal: () => false,
			proposer: { address, blsPublicKey: "ourBlsPublicKey" },
		});
		stub(context.validatorsRepository, "getValidator").callsFake((blsPublicKey: string) =>
			blsPublicKey === "ourBlsPublicKey" ? { propose: () => ({}) } : undefined,
		);
		stub(context.validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
	};

	const beOurProposerEachRound = (context: any, addressByRound: Record<number, string>) => {
		stub(context.forger, "forgeBlock").resolvedValue(context.block);
		stub(context.roundStateRepository, "getRoundState").callsFake((blockNumber: number, round: number) => ({
			hasProposal: () => false,
			proposer: { address: addressByRound[round] ?? THEIRS, blsPublicKey: "ourBlsPublicKey" },
		}));
		stub(context.validatorsRepository, "getValidator").callsFake((blsPublicKey: string) =>
			blsPublicKey === "ourBlsPublicKey" ? { propose: () => ({}) } : undefined,
		);
		stub(context.validatorSet, "getValidatorIndexByWalletAddress").returnValue(1);
	};

	const commitBlock = async (context: any, block: any, unit: any = context.roundState, isRoundState = true) => {
		context.fakeTimers ??= clock();

		unit.getBlock = () => block;
		unit.hasProcessorResult = () => true;
		unit.getProcessorResult = () => ({ success: true });

		void context.consensus.onMajorityPrecommit(unit, isRoundState);
		await context.fakeTimers.nextAsync();
	};

	it("#onTimeoutStartRound - should report the proposal this node submits", async ({
		consensus,
		logger,
		proposal,
	}) => {
		const spyLoggerNotice = spy(logger, "notice");

		consensus.setProposal(proposal, proposal.getData().block);
		await consensus.onTimeoutStartRound();

		spyLoggerNotice.calledOnce();
		spyLoggerNotice.calledWith(
			`📦 Proposing block ${1}/${0}/${proposal.getData().block.hash} as ${proposal.getData().block.proposer}`,
		);
	});

	it("#onTimeoutStartRound - should report nothing when there is no proposal to submit", async ({
		consensus,
		logger,
	}) => {
		const spyLoggerNotice = spy(logger, "notice");

		await consensus.onTimeoutStartRound();

		spyLoggerNotice.neverCalled();
	});

	it("#onMajorityPrecommit - should report our own block being committed", async (context) => {
		const { consensus, block, logger } = context;
		beOurProposer(context);

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await commitBlock(context, { ...block, proposer: OURS });

		spyLoggerNotice.calledOnce();
		spyLoggerNotice.calledWith(`✅ Committed our block ${1}/${0} as ${OURS}`);
	});

	it("#onMajorityPrecommit - should still count our block as ours when a later round re-proposed it", async (context) => {
		// Another validator re-proposes the value this node is locked on; the block is still ours.
		const { consensus, block, logger } = context;
		beOurProposer(context);

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await commitBlock(context, { ...block, proposer: OURS, round: 1 });

		spyLoggerNotice.calledOnce();
		spyLoggerNotice.calledWith(`✅ Committed our block ${1}/${1} as ${OURS}`);
	});

	it("#onMajorityPrecommit - should report a slot we lost to another validator", async (context) => {
		const { consensus, block, logger } = context;
		beOurProposer(context);

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await commitBlock(context, { ...block, proposer: THEIRS });

		spyLoggerNotice.calledOnce();
		spyLoggerNotice.calledWith(`❌ Missed our slot ${1}/${0} as ${OURS}, committed by ${THEIRS}`);
	});

	it("#propose - should report nothing while a round of ours is still in play", async (context) => {
		// A commit is accepted on block number alone, so the round we moved on from can still be the one
		// that commits. Reporting a lost slot here would be a guess.
		const { consensus, logger } = context;
		beOurProposerEachRound(context, { 0: OURS, 1: "ourSecondValidator" });

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await consensus.startRound(1);

		spyLoggerNotice.neverCalled();
	});

	it("#onMajorityPrecommit - should credit the round of ours that committed, not the latest one", async (context) => {
		// Two of this node's validators hold consecutive rounds; the earlier round is the one that wins.
		const { consensus, block, logger } = context;
		beOurProposerEachRound(context, { 0: OURS, 1: "ourSecondValidator" });

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await consensus.startRound(1);
		await commitBlock(context, { ...block, proposer: OURS, round: 0 });

		spyLoggerNotice.calledOnce();
		spyLoggerNotice.calledWith(`✅ Committed our block ${1}/${0} as ${OURS}`);
	});

	it("#onMajorityPrecommit - should report every slot of ours when another validator wins the height", async (context) => {
		const { consensus, block, logger } = context;
		beOurProposerEachRound(context, { 0: OURS, 1: "ourSecondValidator" });

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await consensus.startRound(1);
		await commitBlock(context, { ...block, proposer: THEIRS });

		spyLoggerNotice.calledTimes(2);
		spyLoggerNotice.calledWith(`❌ Missed our slot ${1}/${0} as ${OURS}, committed by ${THEIRS}`);
		spyLoggerNotice.calledWith(`❌ Missed our slot ${1}/${1} as ourSecondValidator, committed by ${THEIRS}`);
	});

	it("#onTimeoutStartRound - should name the validator proposing, not the forger of a re-proposed block", async (context) => {
		// A locked value is re-proposed as it stands, so its proposer can be another validator entirely.
		const { consensus, block, logger, proposal } = context;
		beOurProposer(context);

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		consensus.setProposal(proposal, { ...block, proposer: THEIRS });
		await consensus.onTimeoutStartRound();

		spyLoggerNotice.calledWith(`📦 Proposing block ${1}/${0}/${block.hash} as ${OURS}`);
	});

	it("#onMajorityPrecommit - should report nothing when this node runs no validators", async (context) => {
		const { consensus, block, logger, proposer, roundStateRepository, validatorsRepository } = context;
		stub(roundStateRepository, "getRoundState").returnValue({ hasProposal: () => false, proposer });
		stub(validatorsRepository, "getValidator").returnValue();

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await commitBlock(context, { ...block, proposer: THEIRS });

		spyLoggerNotice.neverCalled();
	});

	it("#onMajorityPrecommit - should report nothing when the proposer belongs to another node", async (context) => {
		// This node has validators, but none of them is the proposer for this round.
		const { consensus, block, logger } = context;
		beOurProposer(context, THEIRS);
		context.roundStateRepository.getRoundState = () => ({
			hasProposal: () => false,
			proposer: { address: THEIRS, blsPublicKey: "theirBlsPublicKey" },
		});

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await commitBlock(context, { ...block, proposer: THEIRS });

		spyLoggerNotice.neverCalled();
	});

	it("#onMajorityPrecommit - should report nothing when the round already had a proposal", async (context) => {
		// Restored mid-round: propose() returns before it can claim the slot, so nothing is reported.
		const { consensus, block, logger } = context;
		beOurProposer(context);
		context.roundStateRepository.getRoundState = () => ({
			hasProposal: () => true,
			proposer: { address: OURS, blsPublicKey: "ourBlsPublicKey" },
		});

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);
		await commitBlock(context, { ...block, proposer: THEIRS });

		spyLoggerNotice.neverCalled();
	});

	it("#onMajorityPrecommit - should report nothing when the block is invalid", async (context) => {
		const { consensus, roundState, block, logger } = context;
		beOurProposer(context);

		const spyLoggerNotice = spy(logger, "notice");

		await consensus.startRound(0);

		roundState.getBlock = () => ({ ...block, proposer: THEIRS });
		roundState.hasProcessorResult = () => true;
		roundState.getProcessorResult = () => ({ success: false });
		await consensus.onMajorityPrecommit(roundState);

		spyLoggerNotice.neverCalled();
	});

	it("#onMajorityPrecommit - should report a slot only once", async (context) => {
		const { consensus, block, logger } = context;
		beOurProposer(context);
		stub(consensus, "startRound").callsFake(async () => {});

		const spyLoggerNotice = spy(logger, "notice");

		consensus.setRound(0);
		await consensus.propose(context.roundStateRepository.getRoundState());
		await commitBlock(context, { ...block, proposer: THEIRS });

		// The next height arriving from a peer must not produce a second report for the same slot.
		await commitBlock(
			context,
			{ ...block, number: 2, proposer: THEIRS },
			{ ...context.roundState, blockNumber: 2 },
			false,
		);

		spyLoggerNotice.calledOnce();
	});

	it("#onMajorityPrecommit - should not resolve our slot with a block from another height", async (context) => {
		const { consensus, block, logger } = context;
		beOurProposer(context);
		stub(consensus, "startRound").callsFake(async () => {});

		const spyLoggerNotice = spy(logger, "notice");

		consensus.setRound(0);
		await consensus.propose(context.roundStateRepository.getRoundState());
		await commitBlock(context, { ...block, number: 2, proposer: THEIRS });

		spyLoggerNotice.neverCalled();
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

		await consensus.onTimeoutPropose(1, 0);

		spyValidatorSetGetRoundValidators.calledOnce();
		spyValidatorsRepositoryGetValidator.calledOnce();
		getValidatorIndexByWalletAddress.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(1, 1, 0);

		spyMessageProcess.calledOnce();
		spyMessageProcess.calledWith(prevote);

		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onTimeoutPropose - should return if step === prevote", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onTimeoutPropose(1, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onTimeoutPropose - should return if step === precommit", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Precommit);
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

	it("#onTimeoutPrevote - should precommit null", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		messageProcessor,
		proposer,
	}) => {
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

		consensus.setStep(Enums.Consensus.Step.Prevote);
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
	});

	it("#onTimeoutPrevote - should return if step === propose", async ({ consensus, messageProcessor }) => {
		const spMessageProcess = spy(messageProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Propose);
		await consensus.onTimeoutPrevote(2, 0);

		spMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Propose);
	});

	it("#onTimeoutPrevote - should return if step === precommit", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Precommit);
		await consensus.onTimeoutPrevote(2, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
	});

	it("#onTimeoutPrevote - should return if blockNumber doesn't match", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onTimeoutPrevote(3, 0);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	it("#onTimeoutPrevote - should return if round doesn't match", async ({ consensus, messageProcessor }) => {
		const spyMessageProcess = spy(messageProcessor, "process");

		consensus.setStep(Enums.Consensus.Step.Prevote);
		await consensus.onTimeoutPrevote(2, 1);

		spyMessageProcess.neverCalled();
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);
	});

	each(
		"#onTimeoutPrecommit - should start next round",
		async ({ context: { consensus }, dataset: step }: { context: Context; dataset: Contracts.Consensus.Step }) => {
			const fakeTimers = clock();
			const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

			consensus.setStep(step);
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
});
