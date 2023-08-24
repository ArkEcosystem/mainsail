import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PrecommitProcessor implements Contracts.Consensus.IProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

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

		if (this.#isInvalidHeightOrRound(precommit)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}
		if (await this.#hasInvalidSignature(precommit)) {
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

		void this.#getConsensus().handle(roundState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makePrecommit(data: Buffer): Promise<Contracts.Crypto.IPrecommit | undefined> {
		try {
			return await this.factory.makePrecommitFromBytes(data);
		} catch {
			return undefined;
		}
	}

	async #hasInvalidSignature(precommit: Contracts.Crypto.IPrecommit): Promise<boolean> {
		const verified = this.signature.verify(
			Buffer.from(precommit.signature, "hex"),
			precommit.serialized,
			Buffer.from(this.validatorSet.getValidator(precommit.validatorIndex).getConsensusPublicKey(), "hex"),
		);

		return !verified;
	}

	#isInvalidHeightOrRound(message: { height: number; round: number }): boolean {
		return !(
			message.height === this.#getConsensus().getHeight() && message.round >= this.#getConsensus().getRound()
		);
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
