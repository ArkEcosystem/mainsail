import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PrevoteProcessor implements Contracts.Consensus.IProposalProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Message.Verifier)
	private readonly verifier!: Contracts.Crypto.IMessageVerifier;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.IRoundStateRepository;

	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	async process(data: Buffer, broadcast = true): Promise<Contracts.Consensus.ProcessorResult> {
		const prevote = await this.#makePrevote(data);

		if (!prevote) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (this.#isInvalidHeightOrRound(prevote)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}
		if (await this.#hasInvalidSignature(prevote)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		const roundState = this.roundStateRepo.getRoundState(prevote.height, prevote.round);
		if (roundState.hasPrevote(prevote.validatorIndex)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		await roundState.addPrevote(prevote);
		await this.storage.savePrevote(prevote);

		if (broadcast) {
			void this.broadcaster.broadcastPrevote(prevote);
		}

		void this.#getConsensus().handle(roundState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makePrevote(data: Buffer): Promise<Contracts.Crypto.IPrevote | undefined> {
		try {
			return await this.factory.makePrevoteFromBytes(data);
		} catch {
			return undefined;
		}
	}

	async #hasInvalidSignature(prevote: Contracts.Crypto.IPrevote): Promise<boolean> {
		const { errors } = await this.verifier.verifyPrevote(prevote);
		if (errors.length > 0) {
			this.logger.warning(`Received invalid prevote: ${prevote.toString()} errors: ${JSON.stringify(errors)}`);
			return true;
		}

		return false;
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
