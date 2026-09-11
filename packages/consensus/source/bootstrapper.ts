import type { Contracts, Utils } from "@mainsail/contracts";

import { Enums, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

@injectable()
export class Bootstrapper implements Contracts.Consensus.Bootstrapper {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.ConsensusStorage.Service)
	private readonly storage!: Contracts.ConsensusStorage.Service;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async bootstrap(): Promise<Contracts.Consensus.State> {
		const blockNumber = this.stateStore.getLastBlock().number + 1;

		if (blockNumber !== this.configuration.getHeight()) {
			throw new Error(
				`bootstrapped block number ${blockNumber} does not match configuration block number ${this.configuration.getHeight()}`,
			);
		}

		try {
			await this.#loadRounds();

			return this.#completed(await this.#getConsensusState(blockNumber));
		} catch (rawError) {
			const error = ensureError(rawError);

			this.logger.error(
				`Discarding stored consensus state for ${blockNumber.toLocaleString(Locale)}: ${error.message}`,
				"consensus",
			);
			this.roundStateRepo.clear();

			return this.#completed(this.#initialState(blockNumber));
		}
	}

	async #loadRounds(): Promise<void> {
		const proposals = await this.storage.getProposals();

		this.logger.info(`Consensus Bootstrap - Proposals: ${proposals.length}`, "consensus");

		for (const proposal of proposals) {
			this.roundStateRepo.getRoundState(proposal.blockHeader.number, proposal.round).addProposal(proposal);
		}

		const messages = await this.storage.getMessages();

		const prevotes = messages.filter((message) => message.type === Enums.Crypto.MessageType.Prevote);
		const precommits = messages.filter((message) => message.type === Enums.Crypto.MessageType.Precommit);

		this.logger.info(
			`Consensus Bootstrap - Prevotes: ${prevotes.length}, Precommits: ${precommits.length}`,
			"consensus",
		);

		for (const message of messages) {
			this.roundStateRepo.getRoundState(message.blockNumber, message.round).addMessage(message);
		}
	}

	async #getConsensusState(blockNumber: number): Promise<Contracts.Consensus.State> {
		const stored = await this.storage.getState();
		const roundStates = this.roundStateRepo.getRoundStates();

		if (stored === undefined) {
			if (roundStates.length > 0) {
				throw new Error("proposals or messages are stored without a state");
			}

			return this.#initialState(blockNumber);
		}

		if (stored.blockNumber < blockNumber) {
			// Expected after a crash: the state is persisted on a clean shutdown only, so the store names the block
			// the node was at back then. Nothing of it applies to the block at hand.
			const storedBlockNumber = stored.blockNumber.toLocaleString(Locale);
			const currentBlockNumber = blockNumber.toLocaleString(Locale);

			this.logger.warn(
				`Skipping state restore, because stored block number is ${storedBlockNumber}, but should be ${currentBlockNumber}`,
				"consensus",
			);
			this.roundStateRepo.clear();

			return this.#initialState(blockNumber);
		}

		if (stored.blockNumber > blockNumber) {
			throw new Error(`stored block number ${stored.blockNumber} is ahead of the database`);
		}

		for (const roundState of roundStates) {
			if (roundState.blockNumber !== blockNumber) {
				throw new Error(`round state ${roundState.blockNumber}/${roundState.round} belongs to another block`);
			}
		}

		const state = { ...stored } as Utils.Mutable<Contracts.Consensus.State>;

		if (state.validRound !== undefined) {
			state.validValue = await this.#getProvenRoundState(blockNumber, state.validRound, "valid");
		}

		if (state.lockedRound !== undefined) {
			state.lockedValue = await this.#getProvenRoundState(blockNumber, state.lockedRound, "locked");
		}

		return state;
	}

	async #getProvenRoundState(
		blockNumber: number,
		round: number,
		kind: string,
	): Promise<Contracts.Consensus.RoundState> {
		const roundState = this.roundStateRepo.getRoundState(blockNumber, round);
		const proposal = roundState.getProposal();

		if (proposal === undefined) {
			throw new Error(`the proposal of ${kind} round ${round} is not stored`);
		}

		await proposal.deserializePayload();

		if (!roundState.hasMajorityPrevotes()) {
			throw new Error(`the +2/3 prevotes of ${kind} round ${round} are not stored`);
		}

		return roundState;
	}

	#initialState(blockNumber: number): Contracts.Consensus.State {
		return { blockNumber, round: 0, step: Enums.Consensus.Step.Propose };
	}

	#completed(state: Contracts.Consensus.State): Contracts.Consensus.State {
		const blockNumber = state.blockNumber.toLocaleString(Locale);
		const round = state.round.toLocaleString(Locale);

		this.logger.info(
			`Completed consensus bootstrap for ${blockNumber}/${round} with total round ${this.stateStore.getTotalRound()}`,
			"consensus",
		);

		return state;
	}
}
