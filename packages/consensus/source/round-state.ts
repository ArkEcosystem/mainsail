import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { IPrecommit, IPrevote, IProposal, IValidatorSetMajority } from "./types";

@injectable()
export class RoundState {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Consensus.Identity.PublicKeyFactory)
	private readonly publicKeyFactory: Contracts.Crypto.IPublicKeyFactory;

	@inject(Identifiers.Consensus.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	#proposal?: IProposal;
	#prevotes = new Map<string, IPrevote>();
	#precommits = new Map<string, IPrecommit>();

	public setProposal(proposal: IProposal): void {
		this.#proposal = proposal;
	}

	public getProposal(): IProposal | undefined {
		return this.#proposal;
	}

	public addPrevote(prevote: IPrevote): void {
		this.#prevotes.set(prevote.toData().validatorPublicKey, prevote);
	}

	public addPrecommit(precommit: IPrecommit): void {
		this.#precommits.set(precommit.toData().validatorPublicKey, precommit);
	}

	public hasMajorityPrevotes(): boolean {
		return this.#isMajority(this.#prevotes.size);
	}

	public hasMajorityPrecommits(): boolean {
		return this.#isMajority(this.#precommits.size);
	}

	#isMajority(size: number): boolean {
		return size >= (this.configuration.getMilestone().activeValidators / 3) * 2 + 1;
	}

	public async aggregateMajorityPrevotes(): Promise<IValidatorSetMajority> {
		return this.#aggregateValidatorSetMajority(this.#prevotes);
	}

	public async aggregateMajorityPrecommits(): Promise<IValidatorSetMajority> {
		return this.#aggregateValidatorSetMajority(this.#precommits);
	}

	async #aggregateValidatorSetMajority(majority: Map<string, { signature: string }>): Promise<IValidatorSetMajority> {
		const publicKeys = [];
		const signatures = [];

		for (const [key, { signature }] of majority) {
			publicKeys.push(Buffer.from(key, "hex"));
			signatures.push(Buffer.from(signature, "hex"));
		}

		const aggPublicKey = await this.publicKeyFactory.aggregate(publicKeys);
		const aggSignature = await this.signatureFactory.aggregate(signatures);

		return {
			aggPublicKey, // TODO: possibly not needed in this context
			aggSignature,
			validatorSet: new Set(publicKeys),
		};
	}
}
