import type { Contracts } from "@mainsail/contracts";

import { isMajority } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Aggregator implements Contracts.Consensus.Aggregator {
	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	public async aggregate(
		signatures: Map<number, { signature: string }>,
		roundValidators: number,
	): Promise<Contracts.Crypto.AggregatedSignature> {
		if (!isMajority(signatures.size, roundValidators)) {
			throw new Error("Failed to aggregate signatures, because the majority is not reached.");
		}

		const validators: boolean[] = Array.from({ length: roundValidators }, () => false);
		const buffers: Buffer[] = [];

		for (const [validatorIndex, { signature }] of signatures) {
			if (!Number.isInteger(validatorIndex) || validatorIndex < 0 || validatorIndex >= roundValidators) {
				throw new Error(
					`Failed to aggregate signatures, because validator index ${validatorIndex} is out of range.`,
				);
			}

			validators[validatorIndex] = true;
			buffers.push(Buffer.from(signature, "hex"));
		}

		const signature = await this.workerPool.getWorker().consensusSignature("aggregate", buffers);

		return { signature, validators };
	}

	public async verify(
		signature: Contracts.Crypto.AggregatedSignature,
		data: Buffer,
		roundValidators: number,
	): Promise<boolean> {
		if (signature.validators.length !== roundValidators) {
			return false;
		}

		const publicKeys: Buffer[] = [];
		for (const [validatorIndex, signed] of signature.validators.entries()) {
			if (signed) {
				publicKeys.push(Buffer.from(this.validatorSet.getValidator(validatorIndex).blsPublicKey, "hex"));
			}
		}

		if (!isMajority(publicKeys.length, roundValidators)) {
			return false;
		}

		const worker = this.workerPool.getWorker();
		const aggregatedPublicKey = await worker.publicKeyFactory("aggregate", publicKeys);

		return worker.consensusSignature(
			"verify",
			Buffer.from(signature.signature, "hex"),
			data,
			Buffer.from(aggregatedPublicKey, "hex"),
		);
	}
}
