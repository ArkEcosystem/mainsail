import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import * as lmdb from "lmdb";

@injectable()
export class Service implements Contracts.ConsensusStorage.Service {
	@inject(Identifiers.ConsensusStorage.Storage.Proposal)
	private readonly proposalStorage!: lmdb.Database;

	@inject(Identifiers.ConsensusStorage.Storage.PreVote)
	private readonly prevoteStorage!: lmdb.Database;

	@inject(Identifiers.ConsensusStorage.Storage.PreCommit)
	private readonly precommitStorage!: lmdb.Database;

	@inject(Identifiers.ConsensusStorage.Storage.ConsensusState)
	private readonly stateStorage!: lmdb.Database;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	public async getState(): Promise<Contracts.Consensus.ConsensusStateData | undefined> {
		if (!this.stateStorage.doesExist("consensus-state")) {
			return undefined;
		}

		const data = await this.stateStorage.get("consensus-state");

		return {
			height: data.height,
			lockedRound: data.lockedRound,
			round: data.round,
			step: data.step,
			validRound: data.validRound,
		};
	}

	public async saveState(state: Contracts.Consensus.ConsensusState): Promise<void> {
		// always overwrite existing state; we only care about state for uncommitted blocks
		const data: Contracts.Consensus.ConsensusStateData = {
			height: state.height,
			lockedRound: state.lockedRound,
			round: state.round,
			step: state.step,
			validRound: state.validRound,
		};

		await this.stateStorage.put("consensus-state", data);
		await this.stateStorage.flushed;
	}

	public async saveProposals(proposals: Contracts.Crypto.Proposal[]): Promise<void> {
		await this.proposalStorage.transaction(() => {
			for (const proposal of proposals) {
				const validator = this.validatorSet.getValidator(proposal.validatorIndex);
				void this.proposalStorage.put(
					`${proposal.round}-${validator.getConsensusPublicKey()}`,
					proposal.toData(),
				);
			}
		});

		await this.proposalStorage.flushed;
	}

	public async savePrevotes(prevotes: Contracts.Crypto.Prevote[]): Promise<void> {
		await this.prevoteStorage.transaction(() => {
			for (const prevote of prevotes) {
				const validator = this.validatorSet.getValidator(prevote.validatorIndex);
				void this.prevoteStorage.put(`${prevote.round}-${validator.getConsensusPublicKey()}`, prevote.toData());
			}
		});

		await this.prevoteStorage.flushed;
	}

	public async savePrecommits(precommits: Contracts.Crypto.Precommit[]): Promise<void> {
		await this.precommitStorage.transaction(() => {
			for (const precommit of precommits) {
				const validator = this.validatorSet.getValidator(precommit.validatorIndex);
				void this.precommitStorage.put(
					`${precommit.round}-${validator.getConsensusPublicKey()}`,
					precommit.toData(),
				);
			}
		});

		await this.precommitStorage.flushed;
	}

	public async getProposals(): Promise<Contracts.Crypto.Proposal[]> {
		const proposals = [...this.proposalStorage.getValues(undefined as unknown as lmdb.Key)];
		return Promise.all(proposals.map((proposal) => this.messageFactory.makeProposalFromData(proposal)));
	}

	public async getPrevotes(): Promise<Contracts.Crypto.Prevote[]> {
		const prevotes = [...this.prevoteStorage.getValues(undefined as unknown as lmdb.Key)];
		return Promise.all(prevotes.map((prevote) => this.messageFactory.makePrevoteFromData(prevote)));
	}

	public async getPrecommits(): Promise<Contracts.Crypto.Precommit[]> {
		const precommits = [...this.precommitStorage.getValues(undefined as unknown as lmdb.Key)];
		return Promise.all(precommits.map((precommit) => this.messageFactory.makePrecommitFromData(precommit)));
	}

	public async clear(): Promise<void> {
		await Promise.all([
			this.proposalStorage.clearAsync(),
			this.prevoteStorage.clearAsync(),
			this.precommitStorage.clearAsync(),
			this.stateStorage.clearAsync(),
		]);
	}
}
