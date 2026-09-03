import type { Contracts } from "@mainsail/contracts";

import { Enums, Events, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { DoubleSignError } from "@mainsail/exceptions";
import { assert, ensureError, Lock } from "@mainsail/utils";
import dayjs from "dayjs";

type OwnSlot = { address: string; blockNumber: number; round: number };

const FAILED_PROCESSOR_RESULT: Contracts.Processor.BlockProcessorResult = {
	feeUsed: 0n,
	gasUsed: 0,
	receipts: new Map(),
	success: false,
};

@injectable()
export class Consensus implements Contracts.Consensus.Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.Bootstrapper)
	private readonly bootstrapper!: Contracts.Consensus.Bootstrapper;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly processor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.Consensus.Processor.Message)
	private readonly messageProcessor!: Contracts.Consensus.MessageProcessor;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler!: Contracts.Consensus.Scheduler;

	@inject(Identifiers.Validator.Repository)
	private readonly validatorsRepository!: Contracts.Validator.ValidatorRepository;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.Consensus.CommitLock)
	private readonly commitLock!: Contracts.Kernel.Lock;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Forger.Block)
	private readonly blockForger!: Contracts.Forger.BlockForger;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.P2P.Statistic.Service)
	private readonly statisticService!: Contracts.P2P.StatisticService;

	#blockNumber = 1;
	#round = 0;
	#step: Contracts.Consensus.Step = Enums.Consensus.Step.Propose;
	#lockedValue?: Contracts.Consensus.RoundState;
	#validValue?: Contracts.Consensus.RoundState;

	#didMajorityPrevote = false;
	#didMajorityPrecommit = false;
	#didMajorityPrecommitAndProposalIsMissing = false;
	#isDisposed = false;
	#pendingJobs = new Set<Contracts.Consensus.RoundState>();

	#ownSlots: OwnSlot[] = [];
	#proposedBlock?: Contracts.Crypto.Block;
	#proposalPromise?: Promise<Contracts.Crypto.Proposal | undefined>;
	#roundStartTime = 0;

	// Handler lock is different than commit lock. It is used to prevent parallel processing and it is similar to queue.
	readonly #handlerLock = new Lock();

	public getBlockNumber(): number {
		return this.#blockNumber;
	}

	public getRound(): number {
		return this.#round;
	}

	// TODO: Only for tests
	public setRound(round: number): void {
		this.#round = round;
	}

	public getStep(): Contracts.Consensus.Step {
		return this.#step;
	}

	// TODO: Only for tests
	public setStep(step: Contracts.Consensus.Step): void {
		this.#step = step;
	}

	public getLockedRound(): number | undefined {
		return this.#lockedValue ? this.#lockedValue.round : undefined;
	}

	public getValidRound(): number | undefined {
		return this.#validValue ? this.#validValue.round : undefined;
	}

	// Only for tests
	public setValidValue(roundState: Contracts.Consensus.RoundState): void {
		this.#validValue = roundState;
	}

	// Only for tests
	public setProposal(proposalPromise: Promise<Contracts.Crypto.Proposal>, block: Contracts.Crypto.Block): void {
		this.#proposalPromise = proposalPromise;
		this.#proposedBlock = block;
	}

	public getState(): Contracts.Consensus.State {
		return {
			blockNumber: this.#blockNumber,
			lockedRound: this.getLockedRound(),
			round: this.#round,
			step: this.#step,
			validRound: this.getValidRound(),
		};
	}

	public async run(): Promise<void> {
		try {
			await this.#bootstrap();
			await this.startRound(this.#round);

			await this.handle(this.roundStateRepository.getRoundState(this.#blockNumber, this.#round));

			// Rerun previous rounds, in case proposal & +2/3 precommits were received
			for (let index = 0; index < this.#round; index++) {
				await this.handle(this.roundStateRepository.getRoundState(this.#blockNumber, index));
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			await this.app.terminate("Consensus bootstrap error", error);
		}
	}

	public async dispose(): Promise<void> {
		this.scheduler.clear();
		this.#isDisposed = true;
		await this.#handlerLock.runExclusive(async () => {});
	}

	async handle(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#pendingJobs.has(roundState)) {
			return;
		}
		this.#pendingJobs.add(roundState);

		await this.#handlerLock.runExclusive(async () => {
			this.#pendingJobs.delete(roundState);

			if (this.#isDisposed) {
				return;
			}

			await this.#processProposal(roundState);

			await this.onProposal(roundState);
			await this.onProposalLocked(roundState);

			if (roundState.hasMajorityPrevotes()) {
				await this.onMajorityPrevote(roundState);
			}

			if (roundState.hasMajorityPrevotesAny()) {
				await this.onMajorityPrevoteAny(roundState);
			}

			if (roundState.hasMajorityPrevotesNull()) {
				await this.onMajorityPrevoteNull(roundState);
			}

			if (roundState.hasMajorityPrecommitsAny()) {
				await this.onMajorityPrecommitAny(roundState);
			}

			if (roundState.hasMajorityPrecommits()) {
				await this.onMajorityPrecommit(roundState);
			}

			if (roundState.hasMinorityPrevotesOrPrecommits()) {
				await this.onMinorityWithHigherRound(roundState);
			}
		});
	}

	async handleCommitState(commitState: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#isDisposed) {
				return;
			}

			await this.#processBlock(commitState);

			await this.onMajorityPrecommit(commitState, false);
		});
	}

	public async startRound(round: number): Promise<void> {
		this.#round = round;
		this.#step = Enums.Consensus.Step.Propose;
		this.#didMajorityPrevote = false;
		this.#didMajorityPrecommit = false;
		this.#roundStartTime = dayjs().valueOf();

		this.scheduler.clear();
		this.statisticService.newRound(this.#blockNumber, round);

		if (this.#isDisposed) {
			return;
		}

		const roundState = this.roundStateRepository.getRoundState(this.#blockNumber, this.#round);
		this.logger.info(
			`>> Starting new round: ${this.#getBlockNumberRoundString()} with proposer: ${roundState.proposer.address}`,
			"consensus",
		);

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.RoundStarted, this.getState());

		this.scheduler.scheduleTimeoutBlockPrepare(this.scheduler.getNextBlockTimestamp(this.#roundStartTime));

		// TODO: Skip on sync
		await this.prepareProposal(roundState);
	}

	public async onTimeoutBlockPrepare(): Promise<void> {
		this.scheduler.scheduleTimeoutPropose(this.#blockNumber, this.#round);

		if (this.#proposalPromise) {
			const proposal = await this.#proposalPromise;
			this.#proposalPromise = undefined;

			if (proposal === undefined) {
				// Nothing to propose: either the double-sign guard refused this position, or building the
				// proposal failed. #makeProposal reported which. The propose timeout scheduled above lets
				// the round time out so consensus moves on.
				return;
			}

			assert.defined(this.#proposedBlock);

			const ownSlot = this.#ownSlots.find(
				(slot) => slot.blockNumber === this.#blockNumber && slot.round === this.#round,
			);

			this.logger.notice(
				`📦 Proposing block ${this.#getBlockString(this.#proposedBlock)} as ${
					ownSlot?.address ?? this.#proposedBlock.proposer
				}`,
				"consensus",
			);

			this.#proposedBlock = undefined;
			await this.proposalProcessor.process(proposal);
		}
	}

	protected async onProposal(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#step !== Enums.Consensus.Step.Propose ||
			!this.#isCurrentRoundState(roundState) ||
			!proposal ||
			proposal.validRound !== undefined
		) {
			return;
		}

		this.#step = Enums.Consensus.Step.Prevote;

		this.logger.info(`Received proposal ${this.#getBlockString(proposal.blockHeader)}`, "consensus");
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.ProposalAccepted, this.getState());

		await this.prevote(roundState.getProcessorResult().success ? proposal.blockHeader.hash : undefined);
	}

	protected async onProposalLocked(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#step !== Enums.Consensus.Step.Propose ||
			!this.#isCurrentRoundState(roundState) ||
			!proposal ||
			!proposal.lockProof ||
			proposal.validRound === undefined ||
			proposal.validRound >= this.#round
		) {
			return;
		}

		this.#step = Enums.Consensus.Step.Prevote;

		this.logger.info(`Received locked proposal ${this.#getBlockString(proposal.blockHeader)}`, "consensus");
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.ProposalAccepted, this.getState());

		const lockedRound = this.getLockedRound();

		if ((!lockedRound || lockedRound <= proposal.validRound) && roundState.getProcessorResult().success) {
			await this.prevote(proposal.blockHeader.hash);
		} else {
			await this.prevote();
		}
	}

	protected async onMajorityPrevote(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#didMajorityPrevote ||
			this.#step === Enums.Consensus.Step.Propose ||
			!this.#isCurrentRoundState(roundState) ||
			!proposal ||
			!roundState.getProcessorResult().success
		) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#getBlockString(proposal.blockHeader)}`, "consensus");

		this.#didMajorityPrevote = true;

		if (this.#step === Enums.Consensus.Step.Prevote) {
			this.#lockedValue = roundState;
			this.#validValue = roundState;
			this.#step = Enums.Consensus.Step.Precommit;

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedProposal, this.getState());
			await this.precommit(proposal.blockHeader.hash);
		} else {
			this.#validValue = roundState;

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedProposal, this.getState());
		}
	}

	protected async onMajorityPrevoteAny(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#step !== Enums.Consensus.Step.Prevote || !this.#isCurrentRoundState(roundState)) {
			return;
		}

		if (this.scheduler.scheduleTimeoutPrevote(this.#blockNumber, this.#round)) {
			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedAny, this.getState());
		}
	}

	protected async onMajorityPrevoteNull(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#step !== Enums.Consensus.Step.Prevote || !this.#isCurrentRoundState(roundState)) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#getBlockNumberRoundString()}/null`, "consensus");

		this.#step = Enums.Consensus.Step.Precommit;

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedNull, this.getState());
		await this.precommit();
	}

	protected async onMajorityPrecommitAny(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (!this.#isCurrentRoundState(roundState)) {
			return;
		}

		if (this.scheduler.scheduleTimeoutPrecommit(this.#blockNumber, this.#round)) {
			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrecommittedAny, this.getState());
		}
	}

	protected async onMajorityPrecommit(
		processState: Contracts.Processor.ProcessableUnit,
		isRoundState: boolean = true,
	): Promise<void> {
		// TODO: Only block number must match. Round can be any. Add tests
		if ((isRoundState && this.#didMajorityPrecommit) || processState.blockNumber !== this.#blockNumber) {
			return;
		}

		if (processState.hasProcessorResult() === false) {
			if (this.#didMajorityPrecommitAndProposalIsMissing) {
				return;
			}

			this.logger.info(
				`Received +2/3 precommits for ${this.#getBlockNumberRoundString()}, but proposal is missing`,
				"consensus",
			);
			this.#didMajorityPrecommitAndProposalIsMissing = true;
			return;
		}

		if (isRoundState) {
			// Sets it only once for round state
			this.#didMajorityPrecommit = true;
		}

		const block = processState.getBlock();

		this.logger.info(`Received +2/3 precommits for ${this.#getBlockString(block)}`, "consensus");

		if (!processState.getProcessorResult().success) {
			this.logger.info(`Block ${this.#getBlockString(block)} is invalid`, "consensus");
			return;
		}

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrecommittedProposal, this.getState());

		await this.commitLock.runExclusive(async () => {
			try {
				await this.processor.commit(processState);
			} catch (rawError) {
				const error = ensureError(rawError);
				await this.app.terminate("Failed to commit block", error);
			}

			this.#reportOwnSlotOutcome(block);

			this.roundStateRepository.clear();

			this.#blockNumber++;
			this.#lockedValue = undefined;
			this.#validValue = undefined;

			await this.startRound(0);
		});
	}

	protected async onMinorityWithHigherRound(roundState: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (roundState.blockNumber !== this.#blockNumber || roundState.round <= this.#round) {
			return;
		}

		await this.startRound(roundState.round);
	}

	public async onTimeoutPropose(blockNumber: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (
				this.#step !== Enums.Consensus.Step.Propose ||
				this.#blockNumber !== blockNumber ||
				this.#round !== round
			) {
				return;
			}

			this.logger.info(`Timeout to propose ${this.#getBlockNumberRoundString()} expired`, "consensus");

			this.#step = Enums.Consensus.Step.Prevote;
			await this.prevote();
		});
	}

	public async onTimeoutPrevote(blockNumber: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (
				this.#step !== Enums.Consensus.Step.Prevote ||
				this.#blockNumber !== blockNumber ||
				this.#round !== round
			) {
				return;
			}

			this.logger.info(`Timeout to prevote ${this.#getBlockNumberRoundString()} expired`, "consensus");
			this.roundStateRepository.getRoundState(this.#blockNumber, this.#round).logPrevotes();

			this.#step = Enums.Consensus.Step.Precommit;
			await this.precommit();
		});
	}

	public async onTimeoutPrecommit(blockNumber: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#blockNumber !== blockNumber || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to precommit ${this.#getBlockNumberRoundString()} expired`, "consensus");
			this.roundStateRepository.getRoundState(this.#blockNumber, this.#round).logPrevotes();
			this.roundStateRepository.getRoundState(this.#blockNumber, this.#round).logPrecommits();

			await this.startRound(this.#round + 1);
		});
	}

	#isCurrentRoundState(roundState: Contracts.Processor.ProcessableUnit): boolean {
		return roundState.blockNumber === this.#blockNumber && roundState.round === this.#round;
	}

	public async prepareProposal(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (roundState.hasProposal()) {
			return;
		}

		const registeredProposer = this.validatorsRepository.getValidator(roundState.proposer.blsPublicKey);

		if (registeredProposer === undefined) {
			return;
		}

		this.logger.info(`Found registered proposer: ${roundState.proposer.address}`, "consensus");

		this.#trackOwnSlot(roundState.proposer.address);

		this.#proposalPromise = this.#makeProposal(roundState, registeredProposer);
	}

	async #makeProposal(
		roundState: Contracts.Consensus.RoundState,
		registeredProposer: Contracts.Validator.Validator,
	): Promise<Contracts.Crypto.Proposal | undefined> {
		try {
			return await this.#createProposal(roundState, registeredProposer);
		} catch (rawError) {
			const error = ensureError(rawError);

			if (error instanceof DoubleSignError) {
				// Signing is allowed again once a later round passes the recorded watermark.
				this.logger.warn(
					`Skipped proposal for ${this.#getBlockNumberRoundString()}: ${error.message}`,
					"consensus",
				);
			} else {
				this.logger.error(
					`Failed to create proposal for ${this.#getBlockNumberRoundString()}: ${error.stack ?? error.message}`,
					"consensus",
				);
			}

			return undefined;
		}
	}

	async #createProposal(
		roundState: Contracts.Consensus.RoundState,
		registeredProposer: Contracts.Validator.Validator,
	): Promise<Contracts.Crypto.Proposal> {
		if (this.#validValue) {
			this.#proposedBlock = this.#validValue.getBlock();
			const lockProof = await this.#validValue.aggregatePrevotes();

			this.logger.info(
				`Created proposal with existing block ${this.#getBlockString(this.#proposedBlock)}`,
				"consensus",
			);

			return await registeredProposer.propose(
				this.validatorSet.getValidatorIndexByWalletAddress(roundState.proposer.address),
				this.#round,
				this.#validValue.round,
				this.#proposedBlock,
				lockProof,
			);
		}

		this.#proposedBlock = this.#proposedBlock = await this.blockForger.forgeBlock(
			roundState.proposer.address,
			this.#round,
			this.scheduler.getNextBlockTimestamp(this.#roundStartTime),
			await registeredProposer.getRandaoReveal(this.#blockNumber),
		);
		this.logger.info(`Created proposal with new block ${this.#getBlockString(this.#proposedBlock)}`, "consensus");

		void this.eventDispatcher.dispatch(Events.BlockEvent.Forged, this.#proposedBlock);

		return registeredProposer.propose(
			this.validatorSet.getValidatorIndexByWalletAddress(roundState.proposer.address),
			this.#round,
			undefined,
			this.#proposedBlock,
		);
	}

	public async prevote(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#blockNumber, this.#round);
		for (const validator of this.validatorSet.getRoundValidators()) {
			const localValidator = this.validatorsRepository.getValidator(validator.blsPublicKey);
			if (localValidator === undefined) {
				continue;
			}

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletAddress(validator.address);
			if (roundState.hasPrevote(validatorIndex)) {
				continue;
			}

			let prevote: Contracts.Crypto.Message;
			try {
				prevote = await localValidator.prevote(validatorIndex, this.#blockNumber, this.#round, value);
			} catch (error) {
				if (error instanceof DoubleSignError) {
					this.logger.warn(
						`Skipped prevote for ${this.#getBlockNumberRoundString()}: ${error.message}`,
						"consensus",
					);
					continue;
				}

				throw error;
			}

			void this.messageProcessor.process(prevote);
		}
	}

	public async precommit(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#blockNumber, this.#round);
		for (const validator of this.validatorSet.getRoundValidators()) {
			const localValidator = this.validatorsRepository.getValidator(validator.blsPublicKey);
			if (localValidator === undefined) {
				continue;
			}

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletAddress(validator.address);
			if (roundState.hasPrecommit(validatorIndex)) {
				continue;
			}

			let precommit: Contracts.Crypto.Message;
			try {
				precommit = await localValidator.precommit(validatorIndex, this.#blockNumber, this.#round, value);
			} catch (error) {
				if (error instanceof DoubleSignError) {
					this.logger.warn(
						`Skipped precommit for ${this.#getBlockNumberRoundString()}: ${error.message}`,
						"consensus",
					);
					continue;
				}

				throw error;
			}

			void this.messageProcessor.process(precommit);
		}
	}

	async #bootstrap(): Promise<void> {
		this.#blockNumber = this.stateStore.getLastBlock().number + 1;

		const state = await this.bootstrapper.run();

		if (state) {
			if (state.blockNumber === this.#blockNumber) {
				this.#step = state.step;
				this.#round = state.round;
				this.#lockedValue = state.lockedValue;
				this.#validValue = state.validValue;
			} else {
				const storedBlockNumber = state.blockNumber.toLocaleString(Locale);
				const currentBlockNumber = this.#blockNumber.toLocaleString(Locale);

				this.logger.warn(
					`Skipping state restore, because stored block number is ${storedBlockNumber}, but should be ${currentBlockNumber}`,
					"consensus",
				);

				this.roundStateRepository.clear();
			}
		}

		if (this.#blockNumber !== this.configuration.getHeight()) {
			throw new Error(
				`bootstrapped block number ${
					this.#blockNumber
				} does not match configuration block number ${this.configuration.getHeight()}`,
			);
		}

		this.logger.info(
			`Completed consensus bootstrap for ${this.#getBlockNumberRoundString()} with total round ${this.stateStore.getTotalRound()}`,
			"consensus",
		);

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.Bootstrapped, this.getState());
	}

	async #processProposal(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();
		if (!roundState.hasProcessorResult() && proposal) {
			try {
				await proposal.deserializePayload();

				if (!(await this.proposalProcessor.hasValidLockProof(proposal))) {
					roundState.setProcessorResult(FAILED_PROCESSOR_RESULT);
					return;
				}

				roundState.setProcessorResult(await this.processor.process(roundState));
			} catch (rawError) {
				const error = ensureError(rawError);
				this.logger.error(
					`Failed to process proposal ${this.#getBlockNumberRoundString()}: ${error.message}`,
					"consensus",
				);

				roundState.setProcessorResult(FAILED_PROCESSOR_RESULT);
			}
		}
	}

	async #processBlock(commitState: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (!commitState.hasProcessorResult()) {
			try {
				commitState.setProcessorResult(await this.processor.process(commitState));
			} catch {
				commitState.setProcessorResult(FAILED_PROCESSOR_RESULT);
			}
		}
	}

	#getBlockNumberRoundString(): string {
		const number = this.#blockNumber.toLocaleString(Locale);
		const consensusRound = this.#round.toLocaleString(Locale);

		return `${number}/${consensusRound}`;
	}

	#getBlockString(block: Contracts.Crypto.BlockHeader): string {
		const number = this.#blockNumber.toLocaleString(Locale);
		const consensusRound = this.#round.toLocaleString(Locale);
		const blockRound = block.round.toLocaleString(Locale);

		if (block.round !== this.#round) {
			return `${number}/${consensusRound}(${blockRound})/${block.hash}`;
		}

		return `${number}/${consensusRound}/${block.hash}`;
	}

	#trackOwnSlot(address: string): void {
		if (this.#ownSlots.length > 0 && this.#ownSlots[0].blockNumber !== this.#blockNumber) {
			this.#ownSlots = [];
		}

		this.#ownSlots.push({ address, blockNumber: this.#blockNumber, round: this.#round });
	}

	#reportOwnSlotOutcome(block: Contracts.Crypto.BlockHeader): void {
		const ownSlots = this.#ownSlots.filter((slot) => slot.blockNumber === block.number);

		if (ownSlots.length === 0) {
			return;
		}

		this.#ownSlots = [];

		// Whichever of our rounds it came from, and whoever ended up proposing it: the block is ours.
		if (ownSlots.some((slot) => slot.address === block.proposer)) {
			const position = `${block.number.toLocaleString(Locale)}/${block.round.toLocaleString(Locale)}`;

			this.logger.notice(`✅ Committed our block ${position} as ${block.proposer}`, "consensus");
			return;
		}

		for (const slot of ownSlots) {
			const position = `${slot.blockNumber.toLocaleString(Locale)}/${slot.round.toLocaleString(Locale)}`;

			this.logger.notice(
				`❌ Missed our slot ${position} as ${slot.address}, committed by ${block.proposer}`,
				"consensus",
			);
		}
	}
}
