import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import * as lmdb from "lmdb";

@injectable()
export class Storage implements Contracts.Consensus.ConsensusStorage {
	@inject(Identifiers.Database.Storage.Proposal)
	private readonly proposalStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.PreVote)
	private readonly prevoteStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.PreCommit)
	private readonly precommitStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.ConsensusState)
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
	}

	public async saveProposals(proposals: Contracts.Crypto.Proposal[]): Promise<void> {
		await this.proposalStorage.transaction(async () => {
			for (const proposal of proposals) {
				const validator = this.validatorSet.getValidator(proposal.validatorIndex);
				await this.proposalStorage.put(
					`${proposal.round}-${validator.getConsensusPublicKey()}`,
					proposal.toData(),
				);
			}
		});
	}

	public async savePrevotes(prevotes: Contracts.Crypto.Prevote[]): Promise<void> {
		await this.prevoteStorage.transaction(async () => {
			for (const prevote of prevotes) {
				const validator = this.validatorSet.getValidator(prevote.validatorIndex);
				await this.prevoteStorage.put(
					`${prevote.round}-${validator.getConsensusPublicKey()}`,
					prevote.toData(),
				);
			}
		});
	}

	public async savePrecommits(precommits: Contracts.Crypto.Precommit[]): Promise<void> {
		await this.precommitStorage.transaction(async () => {
			for (const precommit of precommits) {
				const validator = this.validatorSet.getValidator(precommit.validatorIndex);
				await this.precommitStorage.put(
					`${precommit.round}-${validator.getConsensusPublicKey()}`,
					precommit.toData(),
				);
			}
		});
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
