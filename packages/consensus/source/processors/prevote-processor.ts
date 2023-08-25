import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class PrevoteProcessor extends AbstractProcessor implements Contracts.Consensus.IProcessor {
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
		const prevote = await this.#makePrevote(data);

		if (!prevote) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (!this.hasValidHeightOrRound(prevote)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		if (!(await this.#hasValidSignature(prevote))) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		const roundState = this.roundStateRepo.getRoundState(prevote.height, prevote.round);
		if (roundState.hasPrevote(prevote.validatorIndex)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		roundState.addPrevote(prevote);
		await this.storage.savePrevote(prevote);

		if (broadcast) {
			void this.broadcaster.broadcastPrevote(prevote);
		}

		this.handle(roundState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makePrevote(data: Buffer): Promise<Contracts.Crypto.IPrevote | undefined> {
		try {
			return await this.factory.makePrevoteFromBytes(data);
		} catch {
			return undefined;
		}
	}

	async #hasValidSignature(prevote: Contracts.Crypto.IPrevote): Promise<boolean> {
		return this.signature.verify(
			Buffer.from(prevote.signature, "hex"),
			await this.serializer.serializePrevoteForSignature(prevote),
			Buffer.from(this.validatorSet.getValidator(prevote.validatorIndex).getConsensusPublicKey(), "hex"),
		);
	}
}
