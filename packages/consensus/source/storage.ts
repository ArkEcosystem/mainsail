import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Database, Key } from "lmdb";

@injectable()
export class Storage implements Contracts.Consensus.IConsensusStorage {
	@inject(Identifiers.Database.ProposalStorage)
	private readonly proposalStorage!: Database;

	@inject(Identifiers.Database.PrevoteStorage)
	private readonly prevoteStorage!: Database;

	@inject(Identifiers.Database.PrecommitStorage)
	private readonly precommitStorage!: Database;

	@inject(Identifiers.Database.ConsensusStorage)
	private readonly consensusStorage!: Database;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.IMessageFactory;

	public async getState(): Promise<Contracts.Consensus.IConsensusStateData | undefined> {
		if (!this.consensusStorage.doesExist("consensus-state")) {
			return undefined;
		}

		const data = await this.consensusStorage.get("consensus-state");

		return {
			height: data.height,
			lockedRound: data.lockedRound,
			round: data.round,
			step: data.step,
			validRound: data.validRound,
		};
	}

	public async saveState(state: Contracts.Consensus.IConsensusState): Promise<void> {
		// always overwrite existing state; we only care about state for uncommitted blocks
		const data: Contracts.Consensus.IConsensusStateData = {
			height: state.height,
			lockedRound: state.lockedRound,
			round: state.round,
			step: state.step,
			validRound: state.validRound,
		};

		await this.consensusStorage.put("consensus-state", data);
	}

	public async saveProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
		const validator = this.validatorSet.getValidator(proposal.validatorIndex);
		await this.proposalStorage.put(`${proposal.round}-${validator.getConsensusPublicKey()}`, proposal.toData());
	}

	public async savePrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {
		const validator = this.validatorSet.getValidator(prevote.validatorIndex);
		await this.prevoteStorage.put(`${prevote.round}-${validator.getConsensusPublicKey()}`, prevote.toData());
	}

	public async savePrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {
		const validator = this.validatorSet.getValidator(precommit.validatorIndex);
		await this.precommitStorage.put(`${precommit.round}-${validator.getConsensusPublicKey()}`, precommit.toData());
	}

	public async getProposals(): Promise<Contracts.Crypto.IProposal[]> {
		const proposals = [...this.proposalStorage.getValues(undefined as unknown as Key)];
		return Promise.all(proposals.map((proposal) => this.messageFactory.makeProposalFromData(proposal)));
	}

	public async getPrevotes(): Promise<Contracts.Crypto.IPrevote[]> {
		const prevotes = [...this.prevoteStorage.getValues(undefined as unknown as Key)];
		return Promise.all(prevotes.map((prevote) => this.messageFactory.makePrevoteFromData(prevote)));
	}

	public async getPrecommits(): Promise<Contracts.Crypto.IPrecommit[]> {
		const precommits = [...this.precommitStorage.getValues(undefined as unknown as Key)];
		return Promise.all(precommits.map((precommit) => this.messageFactory.makePrecommitFromData(precommit)));
	}

	public async clear(): Promise<void> {
		await Promise.all([
			this.proposalStorage.clearAsync(),
			this.prevoteStorage.clearAsync(),
			this.precommitStorage.clearAsync(),
			this.consensusStorage.clearAsync(),
		]);
	}
}
