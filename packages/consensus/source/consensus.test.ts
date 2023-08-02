import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { Consensus } from "./consensus";

type Context = {
	sandbox: Sandbox;
	consensus: Consensus;
	blockProcessor: any;
	bootstrapper: any;
	state: any;
	storage: any;
	handler: any;
	broadcaster: any;
	scheduler: any;
	validatorsRepository: any;
	validatorSet: any;
	proposerPicker: any;
	logger: any;
	block: any;
	aggregator: any;
	verifier: any;
	proposal: any;
	roundState: Contracts.Consensus.IRoundState;
	roundStateRepository: any;
};

describe<Context>("Consensus", ({ it, beforeEach, assert, stub, spy, clock, each }) => {
	beforeEach((context) => {
		context.blockProcessor = {
			commit: () => {},
			process: () => {},
		};

		context.state = {
			getLastBlock: () => {},
		};

		context.handler = {
			onPrecommit: () => {},
			onPrevote: () => {},
			onProposal: () => {},
		};

		context.broadcaster = {
			broadcastPrecommit: () => {},
			broadcastPrevote: () => {},
			broadcastProposal: () => {},
		};

		context.scheduler = {
			clear: () => {},
			scheduleTimeoutPrecommit: () => {},
			scheduleTimeoutPrevote: () => {},
			scheduleTimeoutPropose: () => {},
			scheduleTimeoutStartRound: () => {},
		};

		context.storage = {
			clear: () => {},
			getPrecommits: () => {},
			getPrevotes: () => {},
			getProposals: () => {},
			getState: () => {},
			savePrecommit: () => {},
			savePrevote: () => {},
			saveProposal: () => {},
			saveState: () => {},
		};

		context.bootstrapper = {
			run: () => {},
		};

		context.aggregator = {};

		context.validatorsRepository = {
			getValidator: () => {},
			getValidators: () => {},
		};

		context.roundStateRepository = {
			getRoundState: () => {},
		};

		context.validatorSet = {
			getActiveValidators: () => {},
		};

		context.proposerPicker = {
			getValidatorIndex: () => {},
		};

		context.logger = {
			info: () => {},
		};

		context.block = {
			data: {
				height: 2,
				id: "blockId",
			},
		};

		context.proposal = {
			block: {
				block: context.block,
			},
			height: 2,
			round: 0,
			validRound: undefined,
			validatorPublicKey: "validatorPublicKey",
		};

		context.roundStateRepository = {
			getRoundState: () => {},
		};

		context.roundState = {
			getBlock: () => {},
			getProposal: () => context.proposal,
			hasPrecommit: () => false,
			hasPrevote: () => false,
			hasProposal: () => false,
			height: 2,
			round: 0,
			setProcessorResult: () => {},
		} as unknown as Contracts.Consensus.IRoundState;

		context.roundStateRepository = {
			getRoundState: () => context.roundState,
		};

		context.verifier = {
			hasValidProposalLockProof: () => true,
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.BlockProcessor).toConstantValue(context.blockProcessor);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.state);
		context.sandbox.app.bind(Identifiers.Consensus.Handler).toConstantValue(context.handler);
		context.sandbox.app.bind(Identifiers.PeerBroadcaster).toConstantValue(context.broadcaster);
		context.sandbox.app.bind(Identifiers.Consensus.Bootstrapper).toConstantValue(context.bootstrapper);
		context.sandbox.app.bind(Identifiers.Consensus.Scheduler).toConstantValue(context.scheduler);
		context.sandbox.app.bind(Identifiers.Consensus.Storage).toConstantValue(context.storage);
		context.sandbox.app.bind(Identifiers.Consensus.Aggregator).toConstantValue(context.aggregator);
		context.sandbox.app.bind(Identifiers.Consensus.Verifier).toConstantValue(context.verifier);
		context.sandbox.app
			.bind(Identifiers.Consensus.ValidatorRepository)
			.toConstantValue(context.validatorsRepository);
		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(context.validatorSet);
		context.sandbox.app.bind(Identifiers.Consensus.ProposerPicker).toConstantValue(context.proposerPicker);
		context.sandbox.app
			.bind(Identifiers.Consensus.RoundStateRepository)
			.toConstantValue(context.roundStateRepository);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);

		context.consensus = context.sandbox.app.resolve(Consensus);
	});

	it("#getHeight - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getHeight(), 2);
	});

	it("#getRound - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getRound(), 0);
	});

	it("#getStep - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#getLockedValue - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getLockedValue());
	});

	it("#getLockedRound - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getLockedRound());
	});

	it("#getValidValue - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getValidValue());
	});

	it("#getValidRound - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getValidRound());
	});

	it("#getState - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getState(), {
			height: 2,
			lockedRound: undefined,
			round: 0,
			step: Contracts.Consensus.Step.Propose,
			validRound: undefined,
		});
	});

	it("#startRound - should clear storage if round === 0", async ({ consensus, storage, scheduler }) => {
		const spyClear = spy(storage, "clear");
		const spySaveState = spy(storage, "saveState");
		const spyScheduleTimeoutStartRound = spy(scheduler, "scheduleTimeoutStartRound");

		await consensus.startRound(0);

		spyClear.calledOnce();
		spySaveState.calledOnce();
		spyScheduleTimeoutStartRound.calledOnce();
	});

	it("#startRound - should not clear storage if round !== 0", async ({ consensus, storage, scheduler }) => {
		const spyClear = spy(storage, "clear");
		const spySaveState = spy(storage, "saveState");
		const spyScheduleTimeoutStartRound = spy(scheduler, "scheduleTimeoutStartRound");

		await consensus.startRound(1);

		spyClear.neverCalled();
		spySaveState.calledOnce();
		spyScheduleTimeoutStartRound.calledOnce();
	});

	it("#onTimeoutStartRound - should schedule timeout if proposer is not local validator", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		logger,
	}) => {
		const validatorPublicKey = "publicKey";

		const spyLoggerInfo = spy(logger, "info");
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue();
		const spyGetRoundState = stub(roundStateRepository, "getRoundState").returnValue({
			proposer: validatorPublicKey,
		});

		await consensus.onTimeoutStartRound();

		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(validatorPublicKey);
		spyGetRoundState.calledOnce();
		spyGetRoundState.calledWith(2, 0);
		spyLoggerInfo.calledWith(`>> Starting new round: ${2}/${0} with proposer ${validatorPublicKey}`);
		spyLoggerInfo.calledWith(`No registered proposer for ${validatorPublicKey}`);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onTimeoutStartRound - local validator should propose", async ({
		consensus,
		validatorsRepository,
		roundStateRepository,
		logger,
		broadcaster,
		handler,
		block,
		proposal,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			prepareBlock: () => {},
			propose: () => {},
		};

		const spyValidatorPrepareBlock = stub(validator, "prepareBlock").resolvedValue(block);
		const spyValidatorPropose = stub(validator, "propose").resolvedValue(proposal);

		const spyLoggerInfo = spy(logger, "info");
		const spyGetRoundState = stub(roundStateRepository, "getRoundState").returnValue({
			hasProposal: () => false,
			proposer: validatorPublicKey,
		});
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const spyBroadcastProposal = spy(broadcaster, "broadcastProposal");
		const spyHandlerOnProposal = spy(handler, "onProposal");

		await consensus.onTimeoutStartRound(0);

		spyGetRoundState.calledTimes(2);
		spyGetRoundState.calledWith(2, 0);
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(validatorPublicKey);
		spyValidatorPrepareBlock.calledOnce();
		spyValidatorPrepareBlock.calledWith(2, 0);
		spyValidatorPropose.calledOnce();
		spyValidatorPropose.calledWith(2, 0, block);
		spyBroadcastProposal.calledOnce();
		spyBroadcastProposal.calledWith(proposal);
		spyHandlerOnProposal.calledOnce();
		spyHandlerOnProposal.calledWith(proposal);
		spyLoggerInfo.calledWith(`>> Starting new round: ${2}/${0} with proposer ${validatorPublicKey}`);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onTimeoutStartRound - should skip propose if already proposed", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		roundState,
		proposal,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			prepareBlock: () => {},
			propose: () => {},
		};

		stub(validatorSet, "getActiveValidators").returnValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		stub(validatorsRepository, "getValidator").returnValue(validator);

		roundState.hasProposal = () => true;

		const spyValidatorPropose = stub(validator, "propose").resolvedValue(proposal);

		await consensus.onTimeoutStartRound(0);

		spyValidatorPropose.neverCalled();
	});

	it("#startRound - local validator should locked value", async () => {});

	it("#onProposal - should return if step !== propose", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onProposal - should return if height doesn't match", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState = { ...roundState, height: 3 };
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposal - should return if round doesn't match", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState = { ...roundState, round: 2 };
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposal - should return if proposal is undefined", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState.getProposal = () => {};
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposal - should return if proposed validRound is defined", async ({
		consensus,
		blockProcessor,
		roundState,
		proposal,
	}) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		proposal.validRound = 1;
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposal - should return if not from valid proposer", async ({ consensus }) => {});

	it("#onProposal - broadcast prevote block id, if block is valid & not locked", async ({
		consensus,
		blockProcessor,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
		block,
		logger,
		proposal,
	}) => {
		const spyBlockProcessorProcess = stub(blockProcessor, "process").returnValue(true);

		const prevote = {
			height: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetActoveValidators = stub(validatorSet, "getActiveValidators").returnValue([]);
		const spyValidatorsRepositoryGetValidators = stub(validatorsRepository, "getValidators").returnValue([
			validator,
		]);
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");
		const spyHandlerOnPrevote = spy(handler, "onPrevote");
		const spyLoggerInfo = spy(logger, "info");

		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);

		spyValidatorSetGetActoveValidators.calledOnce();
		spyValidatorsRepositoryGetValidators.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(2, 0, block.data.id);

		spyBroadcastPrevote.calledOnce();
		spyBroadcastPrevote.calledWith(prevote);
		spyHandlerOnPrevote.calledOnce();
		spyHandlerOnPrevote.calledWith(prevote);
		spyLoggerInfo.calledWith(`Received proposal ${2}/${0} blockId: ${proposal.block.block.data.id}`);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onProposal - broadcast prevote undefined, if block is invalid", async ({
		consensus,
		blockProcessor,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
		logger,
		proposal,
	}) => {
		const spyBlockProcessorProcess = stub(blockProcessor, "process").returnValue(false);

		const prevote = {
			height: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetActoveValidators = stub(validatorSet, "getActiveValidators").returnValue([]);
		const spyValidatorsRepositoryGetValidators = stub(validatorsRepository, "getValidators").returnValue([
			validator,
		]);
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");
		const spyHandlerOnPrevote = spy(handler, "onPrevote");
		const spyLoggerInfo = spy(logger, "info");

		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);

		spyValidatorSetGetActoveValidators.calledOnce();
		spyValidatorsRepositoryGetValidators.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(2, 0);

		spyBroadcastPrevote.calledOnce();
		spyBroadcastPrevote.calledWith(prevote);
		spyHandlerOnPrevote.calledOnce();
		spyHandlerOnPrevote.calledWith(prevote);
		spyLoggerInfo.calledWith(`Received proposal ${2}/${0} blockId: ${proposal.block.block.data.id}`);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onProposal - should skip prevote if already prevoted", async ({
		consensus,
		blockProcessor,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
		logger,
		proposal,
	}) => {
		const spyBlockProcessorProcess = stub(blockProcessor, "process").returnValue(true);

		const prevote = {
			height: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetActoveValidators = stub(validatorSet, "getActiveValidators").returnValue([]);
		const spyValidatorsRepositoryGetValidators = stub(validatorsRepository, "getValidators").returnValue([
			validator,
		]);
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");
		const spyHandlerOnPrevote = spy(handler, "onPrevote");
		const spyLoggerInfo = spy(logger, "info");

		roundState.hasPrevote = () => true;
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);

		spyValidatorSetGetActoveValidators.calledOnce();
		spyValidatorsRepositoryGetValidators.calledOnce();

		spyValidatorPrevote.neverCalled();
		spyBroadcastPrevote.neverCalled();
		spyHandlerOnPrevote.neverCalled();

		spyLoggerInfo.calledWith(`Received proposal ${2}/${0} blockId: ${proposal.block.block.data.id}`);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	// TODO: Handle on processor
	it("#onProposal - broadcast prevote null, if block processor throws", async ({ consensus }) => {});

	it("#onProposal - broadcast prevote null, if locked value exists", async ({ consensus }) => {});

	it("#onProposalLocked - broadcast prevote block id, if block is valid and lockedRound is undefined", async ({
		consensus,
		blockProcessor,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
		block,
		proposal,
		logger,
	}) => {
		const spyBlockProcessorProcess = stub(blockProcessor, "process").returnValue(true);

		const prevote = {
			height: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetActoveValidators = stub(validatorSet, "getActiveValidators").returnValue([]);
		const spyValidatorsRepositoryGetValidators = stub(validatorsRepository, "getValidators").returnValue([
			validator,
		]);
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");
		const spyHandlerOnPrevote = spy(handler, "onPrevote");
		const spyLoggerInfo = spy(logger, "info");

		proposal.validRound = 0;
		proposal.block.lockProof = { signature: "1234", validators: [] };
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		await consensus.onProposalLocked(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);

		spyValidatorSetGetActoveValidators.calledOnce();
		spyValidatorsRepositoryGetValidators.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(2, 1, block.data.id);

		spyBroadcastPrevote.calledOnce();
		spyBroadcastPrevote.calledWith(prevote);
		spyHandlerOnPrevote.calledOnce();
		spyHandlerOnPrevote.calledWith(prevote);
		spyLoggerInfo.calledWith(`Received proposal ${2}/${1} with locked blockId: ${proposal.block.block.data.id}`);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - broadcast prevote block id, if block is valid and valid round is higher or equal than lockedRound ", async () => {});

	it("#onProposalLocked - broadcast prevote null, if block is valid and lockedRound is undefined", async ({
		consensus,
		blockProcessor,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
		proposal,
	}) => {
		const spyBlockProcessorProcess = stub(blockProcessor, "process").returnValue(false);

		const prevote = {
			height: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetActoveValidators = stub(validatorSet, "getActiveValidators").returnValue([]);
		const spyValidatorsRepositoryGetValidators = stub(validatorsRepository, "getValidators").returnValue([
			validator,
		]);
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");
		const spyHandlerOnPrevote = spy(handler, "onPrevote");

		proposal.validRound = 0;
		proposal.block.lockProof = { signature: "1234", validators: [] };
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		await consensus.onProposalLocked(roundState);

		spyBlockProcessorProcess.calledOnce();
		spyBlockProcessorProcess.calledWith(roundState);

		spyValidatorSetGetActoveValidators.calledOnce();
		spyValidatorsRepositoryGetValidators.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(2, 1);

		spyBroadcastPrevote.calledOnce();
		spyBroadcastPrevote.calledWith(prevote);
		spyHandlerOnPrevote.calledOnce();
		spyHandlerOnPrevote.calledWith(prevote);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - broadcast prevote null, if block is valid and lockedRound is higher than validRound", async () => {});

	it("#onProposalLocked - should return if step === prevote", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onProposalLocked - should return if step === precommit", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		consensus.setStep(Contracts.Consensus.Step.Precommit);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onProposalLocked - should return if height doesn't match", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		roundState = { ...roundState, height: 3 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if round doesn't match", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if proposal is undefined", async ({ consensus, roundState, proposal }) => {
		proposal.validRound = 0;
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		roundState.getProposal = () => {};
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onProposalLocked - should return if validRound is undefined", async ({ consensus, roundState, proposal }) => {
		roundState = { ...roundState, round: 1 };
		consensus.setRound(1);
		await consensus.onProposalLocked(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
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

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
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

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onMajorityPrevote - should set locked values, valid values and precommit, when step === prevote", async ({
		consensus,
		roundState,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		block,
		logger,
		proposal,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			precommit: () => {},
		};

		const precommit = {
			height: 2,
			round: 0,
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").returnValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidators = stub(validatorsRepository, "getValidators").returnValue([validator]);
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");
		const spyHandlerOnPrecommit = spy(handler, "onPrecommit");
		const spyLoggerInfo = spy(logger, "info");

		roundState.getProcessorResult = () => true;

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		spyGetActiveValidators.calledOnce();
		spyGetValidators.calledOnce();
		spyGetValidators.calledWith([validatorPublicKey]);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(2, 0, block.data.id);
		spyBroadcastPrecommit.calledOnce();
		spyBroadcastPrecommit.calledWith(precommit);
		spyHandlerOnPrecommit.calledOnce();
		spyHandlerOnPrecommit.calledWith(precommit);
		spyLoggerInfo.calledWith(`Received +2/3 prevotes for ${2}/${0} blockId: ${proposal.block.block.data.id}`);

		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getLockedValue(), roundState);
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getValidValue(), roundState);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevote - should set valid values and precommit, when step === precommit", async ({
		consensus,
		roundState,
	}) => {
		roundState.getProcessorResult = () => true;

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());

		consensus.setStep(Contracts.Consensus.Step.Precommit);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getValidValue(), roundState);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevote - should only be called once", async ({
		consensus,
		roundState,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		block,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			precommit: () => {},
		};

		const precommit = {
			height: 2,
			round: 0,
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").returnValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidators = stub(validatorsRepository, "getValidators").returnValue([validator]);
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");
		const spyHandlerOnPrecommit = spy(handler, "onPrecommit");

		roundState.getProcessorResult = () => true;

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		spyGetActiveValidators.calledOnce();
		spyGetValidators.calledOnce();
		spyGetValidators.calledWith([validatorPublicKey]);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(2, 0, block.data.id);
		spyBroadcastPrecommit.calledOnce();
		spyBroadcastPrecommit.calledWith(precommit);
		spyHandlerOnPrecommit.calledOnce();
		spyHandlerOnPrecommit.calledWith(precommit);

		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getLockedValue(), roundState);
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getValidValue(), roundState);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		spyGetActiveValidators.calledOnce();
		spyGetValidators.calledOnce();
		spyGetValidators.calledWith([validatorPublicKey]);
		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(2, 0, block.data.id);
		spyBroadcastPrecommit.calledOnce();
		spyBroadcastPrecommit.calledWith(precommit);
		spyHandlerOnPrecommit.calledOnce();
		spyHandlerOnPrecommit.calledWith(precommit);

		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getLockedValue(), roundState);
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getValidValue(), roundState);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevote - should skip precommit if already precommitted", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			precommit: () => {},
		};

		const precommit = {
			height: 2,
			round: 0,
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").returnValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidators = stub(validatorsRepository, "getValidators").returnValue([validator]);
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");
		const spyHandlerOnPrecommit = spy(handler, "onPrecommit");

		roundState.getProcessorResult = () => true;
		roundState.hasPrecommit = () => true;

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		spyGetActiveValidators.calledOnce();
		spyGetValidators.calledOnce();
		spyGetValidators.calledWith([validatorPublicKey]);

		spyValidatorPrecommit.neverCalled();
		spyBroadcastPrecommit.neverCalled();
		spyHandlerOnPrecommit.neverCalled();

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevote - should return if step === propose", async ({ consensus, roundState }) => {
		consensus.setStep(Contracts.Consensus.Step.Propose);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if height doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, height: 3 };
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if round doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, round: 1 };
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if proposal is undefined", async ({ consensus, roundState }) => {
		roundState.getProposal = () => {};
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if processor result is false", async ({ consensus, roundState }) => {
		roundState.getProcessorResult = () => false;
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevoteAny - should schedule timeout prevote", async ({ consensus, scheduler, roundState }) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(2, 0);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteAny - should return if step !== prevote", async ({ consensus, scheduler, roundState }) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		consensus.setStep(Contracts.Consensus.Step.Propose);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onMajorityPrevoteAny - should return if height doesn't match", async ({
		consensus,
		scheduler,
		roundState,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		roundState = { ...roundState, height: 3 };
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteAny - should return if height doesn't match", async ({
		consensus,
		scheduler,
		roundState,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		roundState = { ...roundState, round: 1 };
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteNull - should precommit", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			precommit: () => {},
		};

		const precommit = {
			height: 2,
			round: 0,
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").returnValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidators = stub(validatorsRepository, "getValidators").returnValue([validator]);
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");
		const spyHandlerOnPrecommit = spy(handler, "onPrecommit");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteNull(roundState);

		spyGetActiveValidators.calledOnce();
		spyGetValidators.calledOnce();
		spyGetValidators.calledWith([validatorPublicKey]);

		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(2, 0);

		spyBroadcastPrecommit.calledOnce();
		spyBroadcastPrecommit.calledWith(precommit);
		spyHandlerOnPrecommit.calledOnce();
		spyHandlerOnPrecommit.calledWith(precommit);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevoteNull - should return if step !== prevote", async ({ consensus, roundState }) => {
		consensus.setStep(Contracts.Consensus.Step.Precommit);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onMajorityPrevoteNull - should return if height doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, height: 3 };
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onMajorityPrevoteNull - should return if round doesn't match", async ({ consensus, roundState }) => {
		roundState = { ...roundState, round: 1 };
		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onMajorityPrecommitAny - should schedule timeout precommit", async ({ consensus, scheduler, roundState }) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrecommit");

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);

		await consensus.onMajorityPrecommitAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(2, 0);
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onMajorityPrecommit - should commit & increase height", async ({
		consensus,
		blockProcessor,
		roundState,
		logger,
		proposal,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.block.block);
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});
		const spyLoggerInfo = spy(logger, "info");

		roundState.getProcessorResult = () => true;

		assert.equal(consensus.getHeight(), 2);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.calledOnce();
		spyBlockProcessorCommit.calledWith(roundState);
		spyConsensusStartRound.calledOnce();
		spyConsensusStartRound.calledWith(0);
		spyLoggerInfo.calledWith(`Received +2/3 precommits for ${2}/${0} blockId: ${proposal.block.block.data.id}`);
		assert.equal(consensus.getHeight(), 3);
	});

	it("#onMajorityPrecommit - should log and do nothing if result is invalid", async ({
		consensus,
		blockProcessor,
		roundState,
		logger,
		block,
		proposal,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.block.block);
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});
		const spyLoggerInfo = spy(logger, "info");

		roundState.getProcessorResult = () => false;

		assert.equal(consensus.getHeight(), 2);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.neverCalled();
		spyConsensusStartRound.neverCalled();
		spyLoggerInfo.calledWith(`Block ${block.data.id} on height ${2} received +2/3 precommit but is invalid`);
		assert.equal(consensus.getHeight(), 2);
	});

	it("#onMajorityPrecommit - should be called only once", async ({
		consensus,
		blockProcessor,
		roundState,
		proposal,
	}) => {
		const fakeTimers = clock();

		const spyRoundStateGetBlock = stub(roundState, "getBlock").returnValue(proposal.block.block);
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState.getProcessorResult = () => true;

		assert.equal(consensus.getHeight(), 2);
		void consensus.onMajorityPrecommit(roundState);
		await fakeTimers.nextAsync();

		spyBlockProcessorCommit.calledOnce();
		spyConsensusStartRound.calledOnce();
		assert.equal(consensus.getHeight(), 3);

		await consensus.onMajorityPrecommit(roundState);

		spyRoundStateGetBlock.calledOnce();
		spyBlockProcessorCommit.calledOnce();
		spyConsensusStartRound.calledOnce();
		assert.equal(consensus.getHeight(), 3);
	});

	it("#onMajorityPrecommit - should return if height doesn't match", async ({
		consensus,
		blockProcessor,
		roundState,
	}) => {
		const spyBlockProcessorCommit = spy(blockProcessor, "commit");
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState.getProcessorResult = () => true;

		roundState = { ...roundState, height: 3 };
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

	// 	roundState.getProcessorResult = () => true;

	// 	roundState.getProposal = () => undefined;
	// 	await consensus.onMajorityPrecommit(roundState);

	// 	spyBlockProcessorCommit.neverCalled();
	// 	spyConsensusStartRound.neverCalled();
	// });

	it("#onMinorityWithHigherRound - should start new round", async ({ consensus, roundState }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState = { ...roundState, round: 1 };
		void consensus.onMinorityWithHigherRound(roundState);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.calledWith(roundState.round);
	});

	it("#onMinorityWithHigherRound - should return if height doesn't match", async ({ consensus, roundState }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		roundState = { ...roundState, height: 3 };
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
		broadcaster,
		handler,
	}) => {
		const prevote = {
			height: 2,
			round: 0,
		};

		const validator = {
			prevote: () => {},
		};
		const spyValidatorPrevote = stub(validator, "prevote").resolvedValue(prevote);

		const spyValidatorSetGetActoveValidators = stub(validatorSet, "getActiveValidators").returnValue([]);
		const spyValidatorsRepositoryGetValidators = stub(validatorsRepository, "getValidators").returnValue([
			validator,
		]);
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");
		const spyHandlerOnPrevote = spy(handler, "onPrevote");

		await consensus.onTimeoutPropose(2, 0);

		spyValidatorSetGetActoveValidators.calledOnce();
		spyValidatorsRepositoryGetValidators.calledOnce();

		spyValidatorPrevote.calledOnce();
		spyValidatorPrevote.calledWith(2, 0);

		spyBroadcastPrevote.calledOnce();
		spyBroadcastPrevote.calledWith(prevote);
		spyHandlerOnPrevote.calledOnce();
		spyHandlerOnPrevote.calledWith(prevote);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onTimeoutPropose - should return if step === prevote", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onTimeoutPropose(2, 0);

		spyBroadcastPrevote.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onTimeoutPropose - should return if step === precommit", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");

		consensus.setStep(Contracts.Consensus.Step.Precommit);
		await consensus.onTimeoutPropose(2, 0);

		spyBroadcastPrevote.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onTimeoutPropose - should return if height doesn't match", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");

		await consensus.onTimeoutPropose(3, 0);

		spyBroadcastPrevote.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onTimeoutPropose - should return if round doesn't match", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrevote = spy(broadcaster, "broadcastPrevote");

		await consensus.onTimeoutPropose(2, 1);

		spyBroadcastPrevote.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onTimeoutPrevote - should precommit null", async ({
		consensus,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
	}) => {
		const validatorPublicKey = "publicKey";
		const validator = {
			precommit: () => {},
		};

		const precommit = {
			height: 2,
			round: 0,
		};

		const spyValidatorPrecommit = stub(validator, "precommit").resolvedValue(precommit);
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").returnValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidators = stub(validatorsRepository, "getValidators").returnValue([validator]);
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");
		const spyHandlerOnPrecommit = spy(handler, "onPrecommit");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onTimeoutPrevote(2, 0);

		spyGetActiveValidators.calledOnce();
		spyGetValidators.calledOnce();
		spyGetValidators.calledWith([validatorPublicKey]);

		spyValidatorPrecommit.calledOnce();
		spyValidatorPrecommit.calledWith(2, 0);

		spyBroadcastPrecommit.calledOnce();
		spyBroadcastPrecommit.calledWith(precommit);
		spyHandlerOnPrecommit.calledOnce();
		spyHandlerOnPrecommit.calledWith(precommit);

		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onTimeoutPrevote - should return if step === propose", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");

		consensus.setStep(Contracts.Consensus.Step.Propose);
		await consensus.onTimeoutPrevote(2, 0);

		spyBroadcastPrecommit.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Propose);
	});

	it("#onTimeoutPrevote - should return if step === precommit", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");

		consensus.setStep(Contracts.Consensus.Step.Precommit);
		await consensus.onTimeoutPrevote(2, 0);

		spyBroadcastPrecommit.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Precommit);
	});

	it("#onTimeoutPrevote - should return if height doesn't match", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onTimeoutPrevote(3, 0);

		spyBroadcastPrecommit.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	it("#onTimeoutPrevote - should return if round doesn't match", async ({ consensus, broadcaster }) => {
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");

		consensus.setStep(Contracts.Consensus.Step.Prevote);
		await consensus.onTimeoutPrevote(2, 1);

		spyBroadcastPrecommit.neverCalled();
		assert.equal(consensus.getStep(), Contracts.Consensus.Step.Prevote);
	});

	each(
		"#onTimeoutPrecommit - should start next round",
		async ({ context: { consensus }, dataset: step }: { context: Context; dataset: Contracts.Consensus.Step }) => {
			const fakeTimers = clock();
			const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

			consensus.setStep(step);
			void consensus.onTimeoutPrecommit(2, 0);
			await fakeTimers.nextAsync();

			spyConsensusStartRound.calledOnce();
			spyConsensusStartRound.calledWith(1);
		},
		[Contracts.Consensus.Step.Propose, Contracts.Consensus.Step.Prevote, Contracts.Consensus.Step.Precommit],
	);

	it("#onTimeoutPrecommit - should return if height doesn't match", async ({ consensus, broadcaster }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		void consensus.onTimeoutPrecommit(3, 0);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.neverCalled();
	});

	it("#onTimeoutPrecommit - should return if round doesn't match", async ({ consensus, broadcaster }) => {
		const fakeTimers = clock();
		const spyConsensusStartRound = stub(consensus, "startRound").callsFake(() => {});

		void consensus.onTimeoutPrecommit(2, 1);
		await fakeTimers.nextAsync();

		spyConsensusStartRound.neverCalled();
	});
});
