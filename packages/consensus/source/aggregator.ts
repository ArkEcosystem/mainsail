import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Aggregator implements Contracts.Consensus.IAggregator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async aggregateMajorityPrevotes(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IAggregatedSignature> {
		if (!roundState.hasMajorityPrevotes()) {
			throw new Error("called aggregateMajorityPrevotes without majority");
		}

		return this.#aggregateValidatorSetMajority(roundState, roundState.getValidatorPrevoteSignatures());
	}

	public async aggregateMajorityPrecommits(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IAggregatedSignature> {
		if (!roundState.hasMajorityPrecommits()) {
			throw new Error("called aggregateMajorityPrecommits without majority");
		}

		return this.#aggregateValidatorSetMajority(roundState, roundState.getValidatorPrecommitSignatures());
	}

	async #aggregateValidatorSetMajority(
		roundState: Contracts.Consensus.IRoundState,
		majority: Map<string, { signature: string }>,
	): Promise<Contracts.Crypto.IAggregatedSignature> {
		const signatures: Buffer[] = [];

		const numberOfValidators = this.configuration.getMilestone().activeValidators;
		const validators: boolean[] = new Array(numberOfValidators).fill(false);

		for (const [key, { signature }] of majority) {
			signatures.push(Buffer.from(signature, "hex"));

			const validator = roundState.getValidator(key);

			const walletPublicKey = validator.getWalletPublicKey();

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletPublicKey(walletPublicKey);
			validators[validatorIndex] = true;
		}

		const signature = await this.signatureFactory.aggregate(signatures);

		return {
			signature,
			validators,
		};
	}
}
