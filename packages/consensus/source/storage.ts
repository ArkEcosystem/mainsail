import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Database, Key } from "lmdb";

import { RoundState } from "./round-state";

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

	public async getState(): Promise<Contracts.Consensus.IConsensusState | undefined> {
		if (!this.consensusStorage.doesExist("consensus-state")) {
			return undefined;
		}

		const data = await this.consensusStorage.get("consensus-state");

		let validValue: Contracts.Consensus.IRoundState | undefined;
		if (data.validValue !== null) {
			validValue = await new RoundState().fromData(data.validValue);
		}

		let lockedValue: Contracts.Consensus.IRoundState | undefined;
		if (data.lockedValue !== null) {
			lockedValue = await new RoundState().fromData(data.lockedValue);
		}

		return {
			height: data.height,
			lockedRound: data.lockedRound,
			lockedValue,
			round: data.round,
			step: data.step,
			validRound: data.validRound,
			validValue,
		};
	}

	public async saveState(state: Contracts.Consensus.IConsensusState): Promise<void> {
		// always overwrite existing state; we only care about state for uncommitted blocks
		const data: Contracts.Consensus.IConsensusStateData = {
			height: state.height,
			lockedRound: state.lockedRound,
			lockedValue: state.lockedValue?.toData() ?? null,
			round: state.round,
			step: state.step,
			validRound: state.validRound,
			validValue: state.validValue?.toData() ?? null,
		};

		await this.consensusStorage.put("consensus-state", data);
	}

	public async saveProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(proposal.validatorIndex);
		await this.proposalStorage.put(validatorPublicKey, proposal.toData());
	}

	public async savePrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(prevote.validatorIndex);
		await this.prevoteStorage.put(validatorPublicKey, prevote.toData());
	}

	public async savePrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(precommit.validatorIndex);
		await this.precommitStorage.put(validatorPublicKey, precommit.toData());
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
