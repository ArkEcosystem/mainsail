import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Aggregator implements Contracts.Consensus.Aggregator {
	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	public async aggregate(
		majority: Map<number, { signature: string }>,
		activeValidators: number,
	): Promise<Contracts.Crypto.AggregatedSignature> {
		if (!Utils.isMajority(majority.size, activeValidators)) {
			throw new Error("Failed to aggregate signatures, because the majority is not reached.");
		}

		const signatures: Buffer[] = [];

		const validators: boolean[] = Array.from<boolean>({ length: activeValidators }).fill(false);

		for (const [key, { signature }] of majority) {
			signatures.push(Buffer.from(signature, "hex"));
			validators[key] = true;
		}

		const worker = await this.workerPool.getWorker();
		const signature = await worker.consensusSignature("aggregate", signatures);

		return {
			signature,
			validators,
		};
	}

	async verify(
		signature: Contracts.Crypto.AggregatedSignature,
		data: Buffer,
		activeValidators: number,
	): Promise<boolean> {
		const validatorPublicKeys: Buffer[] = signature.validators
			.map((v, index) => (v ? Buffer.from(this.validatorSet.getValidator(index).blsPublicKey, "hex") : undefined))
			.filter((item): item is Buffer => !!item);

		if (!Utils.isMajority(validatorPublicKeys.length, activeValidators)) {
			return false;
		}

		const worker = await this.workerPool.getWorker();

		const aggregatedPublicKey = await worker.publicKeyFactory("aggregate", validatorPublicKeys);

		return await worker.consensusSignature(
			"verify",
			Buffer.from(signature.signature, "hex"),
			data,
			Buffer.from(aggregatedPublicKey, "hex"),
		);
	}
}
