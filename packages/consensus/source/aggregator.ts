import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Aggregator implements Contracts.Consensus.IAggregator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	public async aggregateMajorityPrevotes(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IAggregatedSignature> {
		throw new Error("Method not implemented.");
	}

	public async aggregateMajorityPrecommits(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IAggregatedSignature> {
		throw new Error("Method not implemented.");
	}

	async aggregate(majority: Map<number, { signature: string }>): Promise<Contracts.Crypto.IAggregatedSignature> {
		// TODO: Check size

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
