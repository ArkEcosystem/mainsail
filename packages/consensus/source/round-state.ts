import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { IPrecommit, IPrevote, IProposal } from "./types";

@injectable()
export class RoundState {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	#proposal?: IProposal;
	#prevotes = new Map<string, IPrevote>();
	#precommits = new Map<string, IPrecommit>();

	setProposal(proposal: IProposal): void {
		this.#proposal = proposal;
	}

	getProposal(): IProposal | undefined {
		return this.#proposal;
	}

	addPrevote(prevote: IPrevote): void {
		this.#prevotes.set(prevote.toData().validatorPublicKey, prevote);
	}

	addPrecommit(precommit: IPrecommit): void {
		this.#precommits.set(precommit.toData().validatorPublicKey, precommit);
	}

	hasMajorityPrevotes(): boolean {
		return this.#isMajority(this.#prevotes.size);
	}

	hasMajorityPrecommits(): boolean {
		return this.#isMajority(this.#precommits.size);
	}

	#isMajority(size: number): boolean {
		return size >= (this.configuration.getMilestone().activeValidators / 3) * 2 + 1;
	}
}
