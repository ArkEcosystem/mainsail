import type { Contracts, Utils } from "@mainsail/contracts";

import { Enums, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

type Records = {
	state: Contracts.Consensus.StateData | undefined;
	proposals: Contracts.Crypto.Proposal[];
	messages: Contracts.Crypto.Message[];
};

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

		const records = await this.#readRecords();
		if (records === undefined) {
			return this.#completed(this.#initialState(blockNumber));
		}

		this.#loadRounds(blockNumber, records);

		const { state } = records;

		if (state !== undefined && state.blockNumber === blockNumber) {
			return this.#completed(await this.#restoreState(blockNumber, state));
		}

		if (state !== undefined && state.blockNumber > blockNumber) {
			this.logger.warn(
				`Clearing the stored consensus state of ${state.blockNumber.toLocaleString(Locale)}, which is ahead of the database at ${blockNumber.toLocaleString(Locale)}`,
				"consensus",
			);
			await this.storage.clear();
		}

		return this.#completed(this.#initialState(blockNumber));
	}

	async #readRecords(): Promise<Records | undefined> {
		try {
			return {
				messages: await this.storage.getMessages(),
				proposals: await this.storage.getProposals(),
				state: await this.storage.getState(),
			};
		} catch (rawError) {
			const error = ensureError(rawError);

			this.logger.error(`Clearing the unreadable consensus store: ${error.message}`, "consensus");
			await this.storage.clear();

			return undefined;
		}
	}

	#loadRounds(blockNumber: number, { messages, proposals }: Records): void {
		const proposalsOfBlock = proposals.filter((proposal) => proposal.blockHeader.number === blockNumber);
		const messagesOfBlock = messages.filter((message) => message.blockNumber === blockNumber);

		for (const proposal of proposalsOfBlock) {
			this.roundStateRepo.getRoundState(blockNumber, proposal.round).addProposal(proposal);
		}

		for (const message of messagesOfBlock) {
			this.roundStateRepo.getRoundState(blockNumber, message.round).addMessage(message);
		}

		const prevotes = messagesOfBlock.filter((message) => message.type === Enums.Crypto.MessageType.Prevote);
		const precommits = messagesOfBlock.filter((message) => message.type === Enums.Crypto.MessageType.Precommit);
		const dropped = proposals.length - proposalsOfBlock.length + messages.length - messagesOfBlock.length;

		this.logger.info(
			`Consensus Bootstrap - Proposals: ${proposalsOfBlock.length}, Prevotes: ${prevotes.length}, Precommits: ${precommits.length}` +
				(dropped > 0 ? `, dropped ${dropped} records of another block` : ""),
			"consensus",
		);
	}

	async #restoreState(
		blockNumber: number,
		stored: Contracts.Consensus.StateData,
	): Promise<Contracts.Consensus.State> {
		const state = { ...stored } as Utils.Mutable<Contracts.Consensus.State>;

		if (stored.validRound !== undefined) {
			state.validValue = await this.#getProvenRoundState(blockNumber, stored.validRound, "valid");
		}

		if (stored.lockedRound !== undefined) {
			state.lockedValue = await this.#getProvenRoundState(blockNumber, stored.lockedRound, "locked");
		}

		return state;
	}

	async #getProvenRoundState(
		blockNumber: number,
		round: number,
		kind: string,
	): Promise<Contracts.Consensus.RoundState> {
		const position = `${blockNumber.toLocaleString(Locale)}/${round.toLocaleString(Locale)}`;
		const roundState = this.roundStateRepo.getRoundState(blockNumber, round);
		const proposal = roundState.getProposal();

		if (proposal === undefined) {
			throw new Error(
				`refusing to start on an inconsistent consensus store: the proposal of ${kind} round ${position} is not stored`,
			);
		}

		await proposal.deserializePayload();

		if (!roundState.hasMajorityPrevotes()) {
			throw new Error(
				`refusing to start on an inconsistent consensus store: the +2/3 prevotes of ${kind} round ${position} are not stored`,
			);
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
