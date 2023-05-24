import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { IValidatorSetMajority } from "./types";

@injectable()
export class RoundState implements Contracts.Consensus.IRoundState {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory: Contracts.Crypto.IPublicKeyFactory;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	#proposal?: Contracts.Crypto.IProposal;
	#prevotes = new Map<string, Contracts.Crypto.IPrevote>();
	#precommits = new Map<string, Contracts.Crypto.IPrecommit>();

	public getWalletRepository(): Contracts.State.WalletRepository {
		return this.walletRepository;
	}

	public setProposal(proposal: Contracts.Crypto.IProposal): void {
		this.#proposal = proposal;
	}

	public getProposal(): Contracts.Crypto.IProposal | undefined {
		return this.#proposal;
	}

	public addPrevote(prevote: Contracts.Crypto.IPrevote): void {
		this.#prevotes.set(prevote.toData().validatorPublicKey, prevote);
	}

	public addPrecommit(precommit: Contracts.Crypto.IPrecommit): void {
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
