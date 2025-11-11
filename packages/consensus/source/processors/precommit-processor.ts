import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { AbstractProcessor } from "./abstract-processor.js";

enum SignatureCheckResult {
	Skip,
	Invalid,
	Accepted,
}

@injectable()
export class PrecommitProcessor extends AbstractProcessor implements Contracts.Consensus.PrecommitProcessor {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.P2P.Broadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	#pendingPrecommits: Map<string, ((value: SignatureCheckResult) => void)[]> = new Map();

	async process(
		precommit: Contracts.Crypto.Precommit,
		broadcast = true,
	): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidBlockNumberOrRound(precommit)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(precommit)) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(precommit.blockNumber, precommit.round);
			if (roundState.hasPrecommit(precommit.validatorIndex)) {
				const existingPrecommit = roundState.getPrecommit(precommit.validatorIndex);
				if (existingPrecommit && !existingPrecommit.serialized.equals(precommit.serialized)) {
					this.logger.warn(
						`Conflicting precommits for validator index ${precommit.validatorIndex} in block ${precommit.blockNumber}/${precommit.round}. Existing: ${existingPrecommit.serialized.toString("hex")}, New: ${precommit.serialized.toString("hex")}`,
					);
				}

				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			switch (await this.#signatureCheck(precommit)) {
				case SignatureCheckResult.Skip: {
					return Contracts.Consensus.ProcessorResult.Skipped;
				}
				case SignatureCheckResult.Invalid: {
					return Contracts.Consensus.ProcessorResult.Invalid;
				}
			}

			roundState.addPrecommit(precommit);

			if (broadcast) {
				void this.broadcaster.broadcastPrecommit(precommit);
			}

			void this.getConsensus().handle(roundState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});
	}

	async #signatureCheck(precommit: Contracts.Crypto.Precommit): Promise<SignatureCheckResult> {
		const serializedHex = precommit.serialized.toString("hex");
		if (this.#pendingPrecommits.has(serializedHex)) {
			return new Promise((resolve) => {
				this.#pendingPrecommits.get(serializedHex)!.push(resolve);
			});
		} else {
			this.#pendingPrecommits.set(serializedHex, []);
		}

		const hasValidSignature = await this.#hasValidSignature(precommit);

		for (const resolve of this.#pendingPrecommits.get(serializedHex)!) {
			resolve(hasValidSignature ? SignatureCheckResult.Skip : SignatureCheckResult.Invalid);
		}

		this.#pendingPrecommits.delete(serializedHex);

		return hasValidSignature ? SignatureCheckResult.Accepted : SignatureCheckResult.Invalid;
	}

	async #hasValidSignature(precommit: Contracts.Crypto.Precommit): Promise<boolean> {
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(precommit.signature, "hex"),
			await this.serializer.serializePrecommitForSignature(precommit),
			Buffer.from(this.validatorSet.getValidator(precommit.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
