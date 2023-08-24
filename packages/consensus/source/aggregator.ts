import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Aggregator implements Contracts.Consensus.IAggregator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

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
}
