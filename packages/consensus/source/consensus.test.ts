import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { Consensus } from "./consensus";
import { Step } from "./enums";

describe<{
	sandbox: Sandbox;
	consensus: Consensus;
	blockProcessor: any;
	state: any;
	handler: any;
	broadcaster: any;
	scheduler: any;
	validatorsRepository: any;
	validatorSet: any;
	logger: any;
	block: any;
	proposal: any;
	roundState: Contracts.Consensus.IRoundState;
}>("Consensus", ({ it, beforeEach, assert, stub, spy }) => {
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
			scheduleTimeoutPrecommit: () => {},
			scheduleTimeoutPrevote: () => {},
			scheduleTimeoutPropose: () => {},
		};

		context.validatorsRepository = {
			getValidator: () => {},
			getValidators: () => {},
		};

		context.validatorSet = {
			getActiveValidators: () => {},
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
			block: context.block,
			height: 2,
			round: 0,
			validRound: undefined,
			validatorPublicKey: "validatorPublicKey",
		};

		context.roundState = {
			getProposal: () => context.proposal,
			height: 2,
			round: 0,
			setProcessorResult: () => {},
		} as unknown as Contracts.Consensus.IRoundState;

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.BlockProcessor).toConstantValue(context.blockProcessor);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.state);
		context.sandbox.app.bind(Identifiers.Consensus.Handler).toConstantValue(context.handler);
		context.sandbox.app.bind(Identifiers.Consensus.Broadcaster).toConstantValue(context.broadcaster);
		context.sandbox.app.bind(Identifiers.Consensus.Scheduler).toConstantValue(context.scheduler);
		context.sandbox.app
			.bind(Identifiers.Consensus.ValidatorRepository)
			.toConstantValue(context.validatorsRepository);
		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(context.validatorSet);
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
		assert.equal(consensus.getStep(), Step.propose);
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
			lockedValue: undefined,
			round: 0,
			step: Step.propose,
			validRound: undefined,
			validValue: undefined,
		});
	});

	it("#startRound - should schedule timout if proposer in not local validator", async ({
		consensus,
		scheduler,
		validatorSet,
		validatorsRepository,
		logger,
	}) => {
		const validatorPublicKey = "publicKey";

		const spyLoggerInfo = spy(logger, "info");
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").resolvedValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue();
		const spyScheduleTimeoutPropose = spy(scheduler, "scheduleTimeoutPropose");

		await consensus.startRound(0);

		spyGetActiveValidators.calledOnce();
		spyGetValidator.calledOnce();
		spyGetValidator.calledWith(validatorPublicKey);
		spyScheduleTimeoutPropose.calledOnce();
		spyLoggerInfo.calledWith(`>> Starting new round: ${2}/${0} with proposer ${validatorPublicKey}`);
		spyLoggerInfo.calledWith(`No registered proposer for ${validatorPublicKey}`);
		assert.equal(consensus.getStep(), Step.propose);
	});

	it("#startRound - local validator should propose", async ({
		consensus,
		scheduler,
		validatorSet,
		validatorsRepository,
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
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").resolvedValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidator = stub(validatorsRepository, "getValidator").returnValue(validator);
		const spyBroadcastProposal = spy(broadcaster, "broadcastProposal");
		const spyHandlerOnProposal = spy(handler, "onProposal");

		const spyScheduleTimeoutPropose = spy(scheduler, "scheduleTimeoutPropose");

		await consensus.startRound(0);

		spyGetActiveValidators.calledOnce();
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

		spyScheduleTimeoutPropose.neverCalled();
		spyLoggerInfo.calledWith(`>> Starting new round: ${2}/${0} with proposer ${validatorPublicKey}`);
		assert.equal(consensus.getStep(), Step.propose);
	});

	it("#onProposal - should return if step !== propose", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		consensus.setStep(Step.prevote);
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Step.prevote);
	});

	it("#onProposal - should return if height doesn't match", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState.height = 3;
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Step.propose);
	});

	it("#onProposal - should return if round doesn't match", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState.round = 2;
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Step.propose);
	});

	it("#onProposal - should return if proposal is undefined", async ({ consensus, blockProcessor, roundState }) => {
		const spyBlockProcessorProcess = spy(blockProcessor, "process");

		roundState.getProposal = () => {};
		await consensus.onProposal(roundState);

		spyBlockProcessorProcess.neverCalled();
		assert.equal(consensus.getStep(), Step.propose);
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
		assert.equal(consensus.getStep(), Step.propose);
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

		assert.equal(consensus.getStep(), Step.prevote);
	});

	it("#onProposal - broadcast prevote undefined, if block is invalid", async ({
		consensus,
		blockProcessor,
		validatorSet,
		validatorsRepository,
		broadcaster,
		handler,
		roundState,
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

		assert.equal(consensus.getStep(), Step.prevote);
	});

	// TODO: Handle on processor
	it("#onProposal - broadcast prevote null, if block processor throws", async ({ consensus }) => {});

	it("#onProposal - broadcast prevote null, if locked value exists", async ({ consensus }) => {});

	it("#onMajorityPrevote - should set locked values, valid values and precommit, when step === prevote", async ({
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
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").resolvedValue([
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

		consensus.setStep(Step.prevote);
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
		assert.equal(consensus.getStep(), Step.precommit);
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

		consensus.setStep(Step.precommit);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.equal(consensus.getValidRound(), 0);
		assert.equal(consensus.getValidValue(), roundState);
		assert.equal(consensus.getStep(), Step.precommit);
	});

	it("#onMajorityPrevote - should return if step === propose", async ({ consensus, roundState }) => {
		consensus.setStep(Step.propose);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if height doesn't match", async ({ consensus, roundState }) => {
		roundState.height = 3;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if round doesn't match", async ({ consensus, roundState }) => {
		roundState.round = 1;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if proposal is undefined", async ({ consensus, roundState }) => {
		roundState.getProposal = () => undefined;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevote - should return if processor result is false", async ({ consensus, roundState }) => {
		roundState.getProcessorResult = () => false;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevote(roundState);

		assert.undefined(consensus.getLockedRound());
		assert.undefined(consensus.getLockedValue());
		assert.undefined(consensus.getValidRound());
		assert.undefined(consensus.getValidValue());
	});

	it("#onMajorityPrevoteAny - should schedule timeout prevote", async ({ consensus, scheduler, roundState }) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(2, 0);
		assert.equal(consensus.getStep(), Step.prevote);
	});

	it("#onMajorityPrevoteAny - should return if step !== prevote", async ({ consensus, scheduler, roundState }) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		consensus.setStep(Step.propose);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		assert.equal(consensus.getStep(), Step.propose);
	});

	it("#onMajorityPrevoteAny - should return if height doesn't match", async ({
		consensus,
		scheduler,
		roundState,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		roundState.height = 3;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		assert.equal(consensus.getStep(), Step.prevote);
	});

	it("#onMajorityPrevoteAny - should return if height doesn't match", async ({
		consensus,
		scheduler,
		roundState,
	}) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrevote");

		roundState.round = 1;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevoteAny(roundState);

		spyScheduleTimeout.neverCalled();
		assert.equal(consensus.getStep(), Step.prevote);
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
		const spyGetActiveValidators = stub(validatorSet, "getActiveValidators").resolvedValue([
			{
				getAttribute: () => validatorPublicKey,
			},
		]);
		const spyGetValidators = stub(validatorsRepository, "getValidators").returnValue([validator]);
		const spyBroadcastPrecommit = spy(broadcaster, "broadcastPrecommit");
		const spyHandlerOnPrecommit = spy(handler, "onPrecommit");

		consensus.setStep(Step.prevote);
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

		assert.equal(consensus.getStep(), Step.precommit);
	});

	it("#onMajorityPrevoteNull - should return if step !== prevote", async ({ consensus, roundState }) => {
		consensus.setStep(Step.precommit);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Step.precommit);
	});

	it("#onMajorityPrevoteNull - should return if height doesn't match", async ({ consensus, roundState }) => {
		roundState.height = 3;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Step.prevote);
	});

	it("#onMajorityPrevoteNull - should return if round doesn't match", async ({ consensus, roundState }) => {
		roundState.round = 1;
		consensus.setStep(Step.prevote);
		await consensus.onMajorityPrevoteNull(roundState);

		assert.equal(consensus.getStep(), Step.prevote);
	});

	it("#onMajorityPrecommitAny - should schedule timeout precommit", async ({ consensus, scheduler, roundState }) => {
		const spyScheduleTimeout = spy(scheduler, "scheduleTimeoutPrecommit");

		assert.equal(consensus.getStep(), Step.propose);

		await consensus.onMajorityPrecommitAny(roundState);

		spyScheduleTimeout.calledOnce();
		spyScheduleTimeout.calledWith(2, 0);
		assert.equal(consensus.getStep(), Step.propose);
	});
});
