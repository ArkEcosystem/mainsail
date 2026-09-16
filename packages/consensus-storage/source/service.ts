import type { Contracts } from "@mainsail/contracts";
import type { Database, RootDatabase } from "lmdb";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";

const STATE_KEY = "consensus-state";

@injectable()
export class Service implements Contracts.ConsensusStorage.Service {
	@inject(Identifiers.ConsensusStorage.Root)
	private readonly rootStorage!: RootDatabase;

	@inject(Identifiers.ConsensusStorage.Storage.Proposal)
	private readonly proposalStorage!: Database<Buffer>;

	@inject(Identifiers.ConsensusStorage.Storage.Message)
	private readonly messageStorage!: Database<Buffer>;

	@inject(Identifiers.ConsensusStorage.Storage.ConsensusState)
	private readonly stateStorage!: Database<Contracts.Consensus.StateData>;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	#blockNumber = 0;

	@postConstruct()
	public initialize(): void {
		this.#blockNumber = this.stateStorage.get(STATE_KEY)?.blockNumber ?? 0;
	}

	public async getState(): Promise<Contracts.Consensus.StateData | undefined> {
		const data = this.stateStorage.get(STATE_KEY);
		if (data === undefined) {
			return undefined;
		}

		return {
			blockNumber: data.blockNumber,
			lockedRound: data.lockedRound,
			round: data.round,
			step: data.step,
			validRound: data.validRound,
		};
	}

	public async saveState(state: Contracts.Consensus.StateData): Promise<void> {
		const data: Contracts.Consensus.StateData = {
			blockNumber: state.blockNumber,
			lockedRound: state.lockedRound,
			round: state.round,
			step: state.step,
			validRound: state.validRound,
		};

		await this.#write(state.blockNumber, () => {
			this.stateStorage.putSync(STATE_KEY, data);
		});
	}

	public async saveProposal(proposal: Contracts.Crypto.Proposal): Promise<void> {
		await this.#write(proposal.blockHeader.number, () => {
			this.proposalStorage.putSync(`${proposal.round}-${proposal.validatorIndex}`, proposal.serialized);
		});
	}

	public async saveMessage(message: Contracts.Crypto.Message): Promise<void> {
		await this.#write(message.blockNumber, () => {
			this.messageStorage.putSync(
				`${message.round}-${message.validatorIndex}-${message.type}`,
				message.serialized,
			);
		});
	}

	public async getProposals(): Promise<Contracts.Crypto.Proposal[]> {
		const proposals = [...this.proposalStorage.getRange().map((item) => item.value)];
		return Promise.all(proposals.map((proposal) => this.proposalFactory.makeProposalFromBytes(proposal)));
	}

	public async getMessages(): Promise<Contracts.Crypto.Message[]> {
		const messages = [...this.messageStorage.getRange().map((item) => item.value)];
		return Promise.all(messages.map((message) => this.messageFactory.makeMessageFromBytes(message)));
	}

	async #write(blockNumber: number, write: () => void): Promise<void> {
		const replacesStoredBlock = blockNumber > this.#blockNumber;
		this.#blockNumber = Math.max(this.#blockNumber, blockNumber);

		await this.rootStorage.transaction(() => {
			if (replacesStoredBlock) {
				this.#clear();
			}

			write();
		});

		await this.rootStorage.flushed;
	}

	#clear(): void {
		this.proposalStorage.clearSync();
		this.messageStorage.clearSync();
		this.stateStorage.clearSync();
	}
}
