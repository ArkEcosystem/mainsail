import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import type { Database, RootDatabase } from "lmdb";

@injectable()
export class Service implements Contracts.ConsensusStorage.Service {
	@inject(Identifiers.ConsensusStorage.Root)
	private readonly rootStorage!: RootDatabase;

	@inject(Identifiers.ConsensusStorage.Storage.Proposal)
	private readonly proposalStorage!: Database<string>;

	@inject(Identifiers.ConsensusStorage.Storage.Message)
	private readonly messageStorage!: Database<string>;

	@inject(Identifiers.ConsensusStorage.Storage.ConsensusState)
	private readonly stateStorage!: Database<Contracts.Consensus.StateData>;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	public async getState(): Promise<Contracts.Consensus.StateData | undefined> {
		if (!this.stateStorage.doesExist("consensus-state")) {
			return undefined;
		}

		const data = this.stateStorage.get("consensus-state");
		assert.defined(data);

		return {
			blockNumber: data.blockNumber,
			lockedRound: data.lockedRound,
			round: data.round,
			step: data.step,
			validRound: data.validRound,
		};
	}

	public async persist({
		state,
		proposals,
		messages,
	}: {
		state: Contracts.Consensus.State;
		proposals: Contracts.Crypto.Proposal[];
		messages: Contracts.Crypto.Message[];
	}): Promise<void> {
		// always overwrite existing state; we only care about state for uncommitted blocks
		await this.rootStorage.transaction(async () => {
			this.#clear();

			// State
			const data: Contracts.Consensus.StateData = {
				blockNumber: state.blockNumber,
				lockedRound: state.lockedRound,
				round: state.round,
				step: state.step,
				validRound: state.validRound,
			};
			this.stateStorage.putSync("consensus-state", data);

			// Proposals
			for (const proposal of proposals) {
				this.proposalStorage.putSync(
					`${proposal.round}-${proposal.validatorIndex}`,
					proposal.serialized.toString("hex"),
				);
			}

			// Messages
			for (const message of messages) {
				this.messageStorage.putSync(
					`${message.round}-${message.validatorIndex}-${message.type}`,
					message.serialized.toString("hex"),
				);
			}
		});
	}

	public async getProposals(): Promise<Contracts.Crypto.Proposal[]> {
		const proposals = [...this.proposalStorage.getRange().map((item) => item.value)];
		return Promise.all(
			proposals.map((proposal) => this.proposalFactory.makeProposalFromBytes(Buffer.from(proposal, "hex"))),
		);
	}

	public async getMessages(): Promise<Contracts.Crypto.Message[]> {
		const messages = [...this.messageStorage.getRange().map((item) => item.value)];
		return Promise.all(
			messages.map((message) => this.messageFactory.makeMessageFromBytes(Buffer.from(message, "hex"))),
		);
	}

	#clear(): void {
		this.proposalStorage.clearSync();
		this.messageStorage.clearSync();
		this.stateStorage.clearSync();
	}
}
