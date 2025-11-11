import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { assert } from "@mainsail/utils";
import * as lmdb from "lmdb";

@injectable()
export class Service implements Contracts.ConsensusStorage.Service {
	@inject(Identifiers.ConsensusStorage.Root)
	private readonly rootStorage!: lmdb.RootDatabase;

	@inject(Identifiers.ConsensusStorage.Storage.Proposal)
	private readonly proposalStorage!: lmdb.Database<Contracts.Crypto.ProposalData>;

	@inject(Identifiers.ConsensusStorage.Storage.PreVote)
	private readonly prevoteStorage!: lmdb.Database<Contracts.Crypto.PrevoteData>;

	@inject(Identifiers.ConsensusStorage.Storage.PreCommit)
	private readonly precommitStorage!: lmdb.Database<Contracts.Crypto.PrecommitData>;

	@inject(Identifiers.ConsensusStorage.Storage.ConsensusState)
	private readonly stateStorage!: lmdb.Database<Contracts.Consensus.StateData>;

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
		prevotes: Contracts.Crypto.Prevote[];
		precommits: Contracts.Crypto.Precommit[];
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
				this.proposalStorage.putSync(`${proposal.round}-${validator.blsPublicKey}`, proposal.toData());
			}

			// Prevotes
			for (const prevote of prevotes) {
				const validator = this.validatorSet.getValidator(prevote.validatorIndex);
				this.prevoteStorage.putSync(`${prevote.round}-${validator.blsPublicKey}`, prevote.toData());
			}

			// Precommits
			for (const precommit of precommits) {
				const validator = this.validatorSet.getValidator(precommit.validatorIndex);
				this.precommitStorage.putSync(`${precommit.round}-${validator.blsPublicKey}`, precommit.toData());
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

	#clear(): void {
		this.proposalStorage.clearSync();
		this.prevoteStorage.clearSync();
		this.precommitStorage.clearSync();
		this.stateStorage.clearSync();
	}
}
