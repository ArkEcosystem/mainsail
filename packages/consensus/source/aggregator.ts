import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Aggregator implements Contracts.Consensus.IAggregator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	async aggregate(majority: Map<number, { signature: string }>): Promise<Contracts.Crypto.IAggregatedSignature> {
		if (!Utils.isMajority(majority.size, this.configuration)) {
			throw new Error("Failed to aggregate signatures, because the majority is not reached.");
		}

		const signatures: Buffer[] = [];

		const numberOfValidators = this.configuration.getMilestone().activeValidators;
		const validators: boolean[] = Array.from<boolean>({ length: numberOfValidators }).fill(false);

		for (const [key, { signature }] of majority) {
			signatures.push(Buffer.from(signature, "hex"));
			validators[key] = true;
		}

		const signature = await this.signatureFactory.aggregate(signatures);

		return {
			signature,
			validators,
		};
	}

	async verify(signature: Contracts.Crypto.IAggregatedSignature, data: Buffer): Promise<boolean> {
		// TODO: Extract to utils
		const isDefined = (item: Buffer | undefined): item is Buffer => !!item;

		const validatorPublicKeys: Buffer[] = signature.validators
			.map((v, index) =>
				v ? Buffer.from(this.validatorSet.getValidator(index).getConsensusPublicKey(), "hex") : undefined,
			)
			.filter(isDefined);

		if (!Utils.isMajority(validatorPublicKeys.length, this.configuration)) {
			return false;
		}

		const aggregatedPublicKey = await this.publicKeyFactory.aggregate(validatorPublicKeys);

		return this.signatureFactory.verify(
			Buffer.from(signature.signature, "hex"),
			data,
			Buffer.from(aggregatedPublicKey, "hex"),
		);
	}
}
