import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { IpcWorker, Utils } from "@mainsail/kernel";

@injectable()
export class Aggregator implements Contracts.Consensus.IAggregator {
	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Ipc.WorkerPool)
	private readonly workerPool!: IpcWorker.WorkerPool;

	public async aggregate(
		majority: Map<number, { signature: string }>,
		activeValidators: number,
	): Promise<Contracts.Crypto.IAggregatedSignature> {
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
		signature: Contracts.Crypto.IAggregatedSignature,
		data: Buffer,
		activeValidators: number,
	): Promise<boolean> {
		const validatorPublicKeys: Buffer[] = signature.validators
			.map((v, index) =>
				v ? Buffer.from(this.validatorSet.getValidator(index).getConsensusPublicKey(), "hex") : undefined,
			)
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
