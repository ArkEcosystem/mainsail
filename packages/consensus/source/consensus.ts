import type { Contracts } from "@mainsail/contracts";

import { Enums, Events, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError, Lock } from "@mainsail/utils";
import dayjs from "dayjs";

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

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly processor!: Contracts.Processor.BlockProcessor;

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

	@inject(Identifiers.P2P.PendingCommits)
	private readonly pendingCommits!: Contracts.P2P.PendingCommits;

	@inject(Identifiers.ConsensusStorage.Service)
	private readonly storage!: Contracts.ConsensusStorage.Service;

	#blockNumber = 1;
	#round = 0;
	#step: Contracts.Consensus.Step = Enums.Consensus.Step.Propose;
	#lockedValue?: Contracts.Consensus.RoundState;
	#validValue?: Contracts.Consensus.RoundState;

	#didMajorityPrevote = false;
	#didMajorityPrecommit = false;
	#didMajorityPrecommitWithoutProposal = false;
	#isDisposed = false;
	#pendingJobs = new Set<Contracts.Consensus.RoundState>();

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

	public getStep(): Contracts.Consensus.Step {
		return this.#step;
	}

	public getLockedRound(): number | undefined {
		return this.#lockedValue ? this.#lockedValue.round : undefined;
	}

	public getValidRound(): number | undefined {
		return this.#validValue ? this.#validValue.round : undefined;
	}

	public isDisposed(): boolean {
		return this.#isDisposed;
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

	public async run(state: Contracts.Consensus.State): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			this.#blockNumber = state.blockNumber;
			this.#round = state.round;
			this.#step = state.step;
			this.#lockedValue = state.lockedValue;
			this.#validValue = state.validValue;

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.Bootstrapped, this.getState());

			await this.#beginRound();

			if (this.#isDisposed) {
				return;
			}

			await this.applyRules(this.roundStateRepository.getRoundState(this.#blockNumber, this.#round));
		});
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

			await this.applyRules(roundState);
		});
	}

	protected async applyRules(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (roundState.blockNumber !== this.#blockNumber) {
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

		if (roundState.hasMajorityPrecommitsWithoutProposal()) {
			this.onMajorityPrecommitWithoutProposal(roundState);
		}

		if (roundState.hasMinorityPrevotesOrPrecommits()) {
			await this.onMinorityWithHigherRound(roundState);
		}
	}

	async handleCommitState(commitState: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#isDisposed || commitState.blockNumber !== this.#blockNumber) {
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
		this.#didMajorityPrecommitWithoutProposal = false;

		// Round 0 is the position the bootstrapper assumes without a stored state.
		if (round > 0) {
			await this.#persistState();
		}

		await this.#beginRound();
	}

	async #beginRound(): Promise<void> {
		this.#roundStartTime = dayjs().valueOf();

		// A proposal still being built belongs to the round that just ended. Dropping it here keeps
		// onTimeoutBlockPrepare from submitting it under this round, or from mistaking it for this round's own.
		this.#proposalPromise = undefined;

		this.scheduler.clear();
		this.statisticService.newRound(this.#blockNumber, this.#round);

		if (this.#isDisposed) {
			return;
		}

		const roundState = this.roundStateRepository.getRoundState(this.#blockNumber, this.#round);
		this.logger.info(
			`>> Starting new round: ${this.#getBlockNumberRoundString()} with proposer: ${roundState.proposer.address}`,
			"consensus",
		);

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.RoundStarted, this.getState());

		// Past the propose step the round has its proposal, or its propose timeout, behind it. .
		if (this.#step !== Enums.Consensus.Step.Propose) {
			return;
		}

		this.scheduler.scheduleTimeoutBlockPrepare(this.scheduler.getNextBlockTimestamp(this.#roundStartTime));

		if (this.pendingCommits.has(this.#blockNumber)) {
			return;
		}

		await this.prepareProposal(roundState);
	}

	public async onTimeoutBlockPrepare(): Promise<void> {
		this.scheduler.scheduleTimeoutPropose(this.#blockNumber, this.#round);

		const proposalPromise = this.#proposalPromise;
		if (!proposalPromise) {
			return;
		}

		const proposal = await proposalPromise;

		// Building the block can outlast the round. startRound then drops the pending proposal or replaces it
		// with the next round's, so a promise that is no longer the pending one is stale and must not be
		// submitted, nor clear the one that superseded it.
		if (this.#proposalPromise !== proposalPromise) {
			return;
		}

		this.#proposalPromise = undefined;

		if (proposal === undefined) {
			// Building the proposal failed, and #makeProposal reported it. The propose timeout scheduled
			// above lets the round time out so consensus moves on.
			return;
		}

		await this.storage.saveProposal(proposal);

		this.#runInBackground("Dispatching proposed event", () =>
			this.eventDispatcher.dispatch(Events.ConsensusEvent.Proposed, proposal),
		);

		await this.proposalProcessor.process(proposal);
	}

	// The handlers below follow Algorithm 1 of "The latest gossip on BFT consensus" (Buchman, Kwon, Milosevic,
	// 2018). Each guard quotes the "upon" clause of its rule, with the line number in the paper, stated positively:
	// the handler runs when all of it holds.
	protected async onProposal(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		// Tendermint line 22: upon ⟨PROPOSAL, h, r, v, −1⟩ from proposer(h, r) while step = propose.
		if (!(
			this.#step === Enums.Consensus.Step.Propose &&
			this.#isCurrentRoundState(roundState) &&
			proposal !== undefined &&
			proposal.validRound === undefined
		)) {
			return;
		}

		this.#step = Enums.Consensus.Step.Prevote;
		await this.#persistState();

		this.logger.info(`Received proposal ${this.#getBlockString(proposal.blockHeader)}`, "consensus");
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.ProposalAccepted, this.getState());

		// A locked node prevotes nil for any fresh proposal. Prevoting for a fresh value while locked on another one
		// could help form +2/3 prevotes for a second block at this height, and with it a fork. This is stricter
		// than Tendermint line 23, which also accepts a fresh proposal of the locked value itself: an honest
		// proposer re-proposes its valid value with validRound and a lock proof, which onProposalLocked handles,
		// and a block forged in a later round carries that round in its hash, so it never equals the locked one.
		// A proposer that wants our vote for our locked block has to bring the proof.
		const lockedValue = this.#lockedValue;
		if (lockedValue !== undefined) {
			const lockedHash = lockedValue.getProposal()?.blockHeader.hash;
			this.logger.info(
				`Prevoting nil for ${this.#getBlockString(proposal.blockHeader)}, because locked on ${lockedValue.round}/${lockedHash}`,
				"consensus",
			);
			await this.prevote();
			return;
		}

		await this.prevote(roundState.getProcessorResult().success ? proposal.blockHeader.hash : undefined);
	}

	protected async onProposalLocked(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		// Tendermint line 28: upon ⟨PROPOSAL, h, r, v, vr⟩ from proposer(h, r) and +2/3 ⟨PREVOTE, h, vr, id(v)⟩
		// while step = propose ∧ 0 ≤ vr < r. The +2/3 prevotes are the lock proof, verified in #processProposal.
		if (!(
			this.#step === Enums.Consensus.Step.Propose &&
			this.#isCurrentRoundState(roundState) &&
			proposal !== undefined &&
			proposal.lockProof !== undefined &&
			proposal.validRound !== undefined &&
			proposal.validRound < this.#round
		)) {
			return;
		}

		this.#step = Enums.Consensus.Step.Prevote;
		await this.#persistState();

		this.logger.info(`Received locked proposal ${this.#getBlockString(proposal.blockHeader)}`, "consensus");
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.ProposalAccepted, this.getState());

		// Tendermint line 29: valid(v) ∧ (lockedRound ≤ vr ∨ lockedValue = v). A re-proposal keeps the original
		// block, so it can be the very block this node is locked on, brought with a proof from a round older than
		// the lock. Prevoting for the locked value itself is always safe.
		const lockedValue = this.#lockedValue;
		const isAllowedByLock =
			lockedValue === undefined ||
			lockedValue.round <= proposal.validRound ||
			lockedValue.getProposal()?.blockHeader.hash === proposal.blockHeader.hash;

		if (isAllowedByLock && roundState.getProcessorResult().success) {
			await this.prevote(proposal.blockHeader.hash);
		} else {
			await this.prevote();
		}
	}

	protected async onMajorityPrevote(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		// Tendermint line 36: upon ⟨PROPOSAL, h, r, v, ∗⟩ from proposer(h, r) and +2/3 ⟨PREVOTE, h, r, id(v)⟩
		// while valid(v) ∧ step ≥ prevote, for the first time.
		if (!(
			!this.#didMajorityPrevote &&
			this.#step >= Enums.Consensus.Step.Prevote &&
			this.#isCurrentRoundState(roundState) &&
			proposal !== undefined &&
			roundState.getProcessorResult().success
		)) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#getBlockString(proposal.blockHeader)}`, "consensus");

		this.#didMajorityPrevote = true;

		if (this.#step === Enums.Consensus.Step.Prevote) {
			this.#lockedValue = roundState;
			this.#validValue = roundState;
			this.#step = Enums.Consensus.Step.Precommit;
			await this.#persistState();

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedProposal, this.getState());
			await this.precommit(proposal.blockHeader.hash);
		} else {
			this.#validValue = roundState;
			await this.#persistState();

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedProposal, this.getState());
		}
	}

	protected async onMajorityPrevoteAny(roundState: Contracts.Consensus.RoundState): Promise<void> {
		// Tendermint line 34: upon +2/3 ⟨PREVOTE, h, r, ∗⟩ while step = prevote, for the first time. The scheduler
		// reports whether the timeout was newly scheduled, which stands for "for the first time".
		if (!(this.#step === Enums.Consensus.Step.Prevote && this.#isCurrentRoundState(roundState))) {
			return;
		}

		if (this.scheduler.scheduleTimeoutPrevote(this.#blockNumber, this.#round)) {
			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedAny, this.getState());
		}
	}

	protected async onMajorityPrevoteNull(roundState: Contracts.Consensus.RoundState): Promise<void> {
		// Tendermint line 44: upon +2/3 ⟨PREVOTE, h, r, nil⟩ while step = prevote.
		if (!(this.#step === Enums.Consensus.Step.Prevote && this.#isCurrentRoundState(roundState))) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#getBlockNumberRoundString()}/null`, "consensus");

		this.#step = Enums.Consensus.Step.Precommit;
		await this.#persistState();

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedNull, this.getState());
		await this.precommit();
	}

	protected async onMajorityPrecommitAny(roundState: Contracts.Consensus.RoundState): Promise<void> {
		// Tendermint line 47: upon +2/3 ⟨PRECOMMIT, h, r, ∗⟩ for the first time. The scheduler reports whether the
		// timeout was newly scheduled, which stands for "for the first time".
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
		// Tendermint line 49: upon ⟨PROPOSAL, h, r, v, ∗⟩ from proposer(h, r) and +2/3 ⟨PRECOMMIT, h, r, id(v)⟩
		// while decision[h] = nil. Any round r of the height qualifies, not only the current one; run() replays
		// the earlier rounds for this. The flag holds until startRound and keeps a round state whose block failed
		// from being reported again on every further message of the round. A commit state carries no such flag.
		if (!(processState.blockNumber === this.#blockNumber && (!isRoundState || !this.#didMajorityPrecommit))) {
			return;
		}

		// The unit always carries a processor result here. handle() gets this far only with a proposal, which
		// #processProposal has run by then, and handleCommitState() runs #processBlock first. A unit without a
		// result is a caller bug, and getProcessorResult() throws on it.
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

			this.roundStateRepository.clear();

			this.#blockNumber++;
			this.#lockedValue = undefined;
			this.#validValue = undefined;

			await this.startRound(0);
		});
	}

	protected onMajorityPrecommitWithoutProposal(roundState: Contracts.Consensus.RoundState): void {
		// Outside Algorithm 1. Runs once per round, while the round is the current one.
		if (!(!this.#didMajorityPrecommitWithoutProposal && this.#isCurrentRoundState(roundState))) {
			return;
		}

		// The network decided this round on a block whose proposal never reached this node. There is nothing to
		// act on: the proposal downloader fetches it while the round lasts, and once peers move on the commit
		// arrives through block download. Reported once per round, so the gap shows up in the log.
		this.#didMajorityPrecommitWithoutProposal = true;

		this.logger.info(
			`Received +2/3 precommits for ${this.#getBlockNumberRoundString()}, but proposal is missing`,
			"consensus",
		);
	}

	protected async onMinorityWithHigherRound(roundState: Contracts.Processor.ProcessableUnit): Promise<void> {
		// Tendermint line 55: upon f+1 ⟨∗, h, round, ∗, ∗⟩ with round > r.
		if (!(roundState.blockNumber === this.#blockNumber && roundState.round > this.#round)) {
			return;
		}

		await this.startRound(roundState.round);
	}

	public async onTimeoutPropose(blockNumber: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#isDisposed) {
				return;
			}

			// Tendermint line 57: OnTimeoutPropose(h, r) acts if h = h_p ∧ r = round_p ∧ step = propose.
			if (!(
				this.#step === Enums.Consensus.Step.Propose &&
				this.#blockNumber === blockNumber &&
				this.#round === round
			)) {
				return;
			}

			this.logger.info(`Timeout to propose ${this.#getBlockNumberRoundString()} expired`, "consensus");

			this.#step = Enums.Consensus.Step.Prevote;
			await this.#persistState();
			await this.prevote();
		});
	}

	public async onTimeoutPrevote(blockNumber: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#isDisposed) {
				return;
			}

			// Tendermint line 61: OnTimeoutPrevote(h, r) acts if h = h_p ∧ r = round_p ∧ step = prevote.
			if (!(
				this.#step === Enums.Consensus.Step.Prevote &&
				this.#blockNumber === blockNumber &&
				this.#round === round
			)) {
				return;
			}

			this.logger.info(`Timeout to prevote ${this.#getBlockNumberRoundString()} expired`, "consensus");
			this.roundStateRepository.getRoundState(this.#blockNumber, this.#round).logPrevotes();

			this.#step = Enums.Consensus.Step.Precommit;
			await this.#persistState();
			await this.precommit();
		});
	}

	public async onTimeoutPrecommit(blockNumber: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#isDisposed) {
				return;
			}

			// Tendermint line 65: OnTimeoutPrecommit(h, r) acts if h = h_p ∧ r = round_p.
			if (!(this.#blockNumber === blockNumber && this.#round === round)) {
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

		this.#proposalPromise = this.#makeProposal(roundState, registeredProposer);
	}

	async #makeProposal(
		roundState: Contracts.Consensus.RoundState,
		registeredProposer: Contracts.Validator.Validator,
	): Promise<Contracts.Crypto.Proposal | undefined> {
		// Read before the first await: the round can move on while the proposal is built, and the report
		// must name the position that was skipped, not whichever round is live by then.
		const position = this.#getBlockNumberRoundString();

		try {
			return await this.#createProposal(roundState, registeredProposer);
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.error(
				`Failed to create proposal for ${position}: ${error.stack ?? error.message}`,
				"consensus",
			);

			return undefined;
		}
	}

	async #createProposal(
		roundState: Contracts.Consensus.RoundState,
		registeredProposer: Contracts.Validator.Validator,
	): Promise<Contracts.Crypto.Proposal> {
		// The position is fixed here, before the first await. Building the block can outlast the round, and
		// the proposal has to be signed for the round it was requested in, not for the one live at signing
		// time; onTimeoutBlockPrepare then drops a proposal whose round has already ended.
		const blockNumber = this.#blockNumber;
		const round = this.#round;
		const validatorIndex = this.validatorSet.getValidatorIndexByWalletAddress(roundState.proposer.address);

		const validValue = this.#validValue;
		if (validValue) {
			const block = validValue.getBlock();
			const lockProof = await validValue.aggregatePrevotes();

			this.logger.info(`Created proposal with existing block ${this.#getBlockString(block)}`, "consensus");

			return await registeredProposer.propose(validatorIndex, round, validValue.round, block, lockProof);
		}

		const block = await this.blockForger.forgeBlock(
			roundState.proposer.address,
			round,
			this.scheduler.getNextBlockTimestamp(this.#roundStartTime),
			await registeredProposer.getRandaoReveal(blockNumber),
		);
		this.logger.info(`Created proposal with new block ${this.#getBlockString(block)}`, "consensus");

		this.#runInBackground("Dispatching block forged event", () =>
			this.eventDispatcher.dispatch(Events.BlockEvent.Forged, block),
		);

		return registeredProposer.propose(validatorIndex, round, undefined, block);
	}

	public async prevote(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#blockNumber, this.#round);
		const validators = this.#getValidators((validatorIndex) => roundState.hasPrevote(validatorIndex));
		for (const { validator, validatorIndex } of validators) {
			const prevote = await validator.prevote(validatorIndex, this.#blockNumber, this.#round, value);
			await this.storage.saveMessage(prevote);

			this.#runInBackground("Processing own prevote", () => this.messageProcessor.process(prevote));
		}
	}

	public async precommit(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#blockNumber, this.#round);
		const validators = this.#getValidators((validatorIndex) => roundState.hasPrecommit(validatorIndex));
		for (const { validator, validatorIndex } of validators) {
			const precommit = await validator.precommit(validatorIndex, this.#blockNumber, this.#round, value);
			await this.storage.saveMessage(precommit);

			this.#runInBackground("Processing own precommit", () => this.messageProcessor.process(precommit));
		}
	}

	#getValidators(
		hasMessage: (validatorIndex: number) => boolean,
	): { validator: Contracts.Validator.Validator; validatorIndex: number }[] {
		const validators: { validator: Contracts.Validator.Validator; validatorIndex: number }[] = [];

		for (const roundValidator of this.validatorSet.getRoundValidators()) {
			const validator = this.validatorsRepository.getValidator(roundValidator.blsPublicKey);
			if (validator === undefined) {
				continue;
			}

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletAddress(roundValidator.address);
			if (hasMessage(validatorIndex)) {
				continue;
			}

			validators.push({ validator, validatorIndex });
		}

		return validators;
	}

	async #persistState(): Promise<void> {
		await this.storage.saveState(this.getState());
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

	// Work nobody waits for: own votes go through the message processor like any peer's, and events fan out
	// to their listeners. A rejection there is reported instead of escaping as an unhandled rejection,
	// which would take the process down.
	#runInBackground(task: string, callback: () => Promise<unknown>): void {
		void (async () => {
			try {
				await callback();
			} catch (rawError) {
				const error = ensureError(rawError);
				this.logger.error(`${task} failed: ${error.stack ?? error.message}`, "consensus");
			}
		})();
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
}
