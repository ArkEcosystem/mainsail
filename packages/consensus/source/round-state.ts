import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { IValidatorSetMajority } from "./types";

@injectable()
export class RoundState implements Contracts.Consensus.IRoundState {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private readonly walletRepository!: Contracts.State.WalletRepositoryClone;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	#height = 0;
	#round = 0;
	#proposal?: Contracts.Crypto.IProposal;
	#processorResult?: boolean;
	#prevotes = new Map<string, Contracts.Crypto.IPrevote>();
	#precommits = new Map<string, Contracts.Crypto.IPrecommit>();
	#validators = new Map<string, Contracts.State.Wallet>();
	#proposer!: string;

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	get proposer(): string {
		return this.#proposer;
	}

	public async configure(height: number, round: number): Promise<RoundState> {
		this.#height = height;
		this.#round = round;

		const validators = await this.validatorSet.getActiveValidators();
		for (const validator of validators) {
			const consensuPublicKey = validator.getAttribute<string>("consensus.publicKey");
			this.#validators.set(consensuPublicKey, validator);
		}
		this.#proposer = validators[0].getAttribute<string>("consensus.publicKey");

		return this;
	}

	public getWalletRepository(): Contracts.State.WalletRepositoryClone {
		return this.walletRepository;
	}

	public addProposal(proposal: Contracts.Crypto.IProposal): boolean {
		if (this.#proposal) {
			// TODO: Handle evidence
			return false;
		}

		this.#proposal = proposal;

		return true;
	}

	public getProposal(): Contracts.Crypto.IProposal | undefined {
		return this.#proposal;
	}

	public setProcessorResult(processorResult: boolean): void {
		this.#processorResult = processorResult;
	}

	public getProcessorResult(): boolean {
		return !!this.#processorResult;
	}

	public addPrevote(prevote: Contracts.Crypto.IPrevote): boolean {
		if (this.#prevotes.has(prevote.validatorPublicKey)) {
			// TODO: Handle evidence

			return false;
		}

		this.#prevotes.set(prevote.validatorPublicKey, prevote);
		return true;
	}

	public addPrecommit(precommit: Contracts.Crypto.IPrecommit): boolean {
		if (this.#precommits.has(precommit.validatorPublicKey)) {
			return false;
		}

		this.#precommits.set(precommit.validatorPublicKey, precommit);
		return true;
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
		const publicKeys: Buffer[] = [];
		const signatures: Buffer[] = [];

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
