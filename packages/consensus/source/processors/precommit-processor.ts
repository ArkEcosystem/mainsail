import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class PrecommitProcessor extends AbstractProcessor implements Contracts.Consensus.IProcessor {
	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signature!: Contracts.Crypto.ISignature;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.IRoundStateRepository;

	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	async process(data: Buffer, broadcast = true): Promise<Contracts.Consensus.ProcessorResult> {
		const precommit = await this.#makePrecommit(data);

		if (!precommit) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (!this.hasValidHeightOrRound(precommit)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		if (!(await this.#hasValidSignature(precommit))) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		const roundState = this.roundStateRepo.getRoundState(precommit.height, precommit.round);
		if (roundState.hasPrecommit(precommit.validatorIndex)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		roundState.addPrecommit(precommit);
		await this.storage.savePrecommit(precommit);

		if (broadcast) {
			void this.broadcaster.broadcastPrecommit(precommit);
		}

		this.handle(roundState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makePrecommit(data: Buffer): Promise<Contracts.Crypto.IPrecommit | undefined> {
		try {
			return await this.factory.makePrecommitFromBytes(data);
		} catch {
			return undefined;
		}
	}

	async #hasValidSignature(precommit: Contracts.Crypto.IPrecommit): Promise<boolean> {
		return this.signature.verify(
			Buffer.from(precommit.signature, "hex"),
			await this.serializer.serializePrecommitForSignature(precommit),
			Buffer.from(this.validatorSet.getValidator(precommit.validatorIndex).getConsensusPublicKey(), "hex"),
		);
	}
}
