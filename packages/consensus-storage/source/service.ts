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

	@inject(Identifiers.ConsensusStorage.Storage.PreVote)
	private readonly prevoteStorage!: Database<string>;

	@inject(Identifiers.ConsensusStorage.Storage.PreCommit)
	private readonly precommitStorage!: Database<string>;

	@inject(Identifiers.ConsensusStorage.Storage.ConsensusState)
	private readonly stateStorage!: Database<Contracts.Consensus.StateData>;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

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
		prevotes,
		precommits,
	}: {
		state: Contracts.Consensus.State;
		proposals: Contracts.Crypto.Proposal[];
		prevotes: Contracts.Crypto.Message[];
		precommits: Contracts.Crypto.Message[];
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
				const validator = this.validatorSet.getValidator(proposal.validatorIndex);
				this.proposalStorage.putSync(
					`${proposal.round}-${validator.blsPublicKey}`,
					proposal.serialized.toString("hex"),
				);
			}

			// Prevotes
			for (const prevote of prevotes) {
				const validator = this.validatorSet.getValidator(prevote.validatorIndex);
				this.prevoteStorage.putSync(
					`${prevote.round}-${validator.blsPublicKey}`,
					prevote.serialized.toString("hex"),
				);
			}

			// Precommits
			for (const precommit of precommits) {
				const validator = this.validatorSet.getValidator(precommit.validatorIndex);
				this.precommitStorage.putSync(
					`${precommit.round}-${validator.blsPublicKey}`,
					precommit.serialized.toString("hex"),
				);
			}
		});
	}

	public async getProposals(): Promise<Contracts.Crypto.Proposal[]> {
		const proposals = [...this.proposalStorage.getRange().map((item) => item.value)];
		return Promise.all(
			proposals.map((proposal) => this.messageFactory.makeProposalFromBytes(Buffer.from(proposal, "hex"))),
		);
	}

	public async getPrevotes(): Promise<Contracts.Crypto.Message[]> {
		const prevotes = [...this.prevoteStorage.getRange().map((item) => item.value)];
		return Promise.all(
			prevotes.map((prevote) => this.messageFactory.makeMessageFromBytes(Buffer.from(prevote, "hex"))),
		);
	}

	public async getPrecommits(): Promise<Contracts.Crypto.Message[]> {
		const precommits = [...this.precommitStorage.getRange().map((item) => item.value)];
		return Promise.all(
			precommits.map((precommit) => this.messageFactory.makeMessageFromBytes(Buffer.from(precommit, "hex"))),
		);
	}

	#clear(): void {
		this.proposalStorage.clearSync();
		this.prevoteStorage.clearSync();
		this.precommitStorage.clearSync();
		this.stateStorage.clearSync();
	}
}
