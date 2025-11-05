import Hapi from "@hapi/hapi";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

import { getPeerIp } from "../../utils/index.js";

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Processor.PreVote)
	private readonly prevoteProcessor!: Contracts.Consensus.PrevoteProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	#times: number[] = [];

	@postConstruct()
	public init(): void {
		console.log("PostPrevoteController initialized");

		this.eventDispatcher.listen(Events.ConsensusEvent.RoundStarted, {
			handle: (payload: { name: string }) => {
				console.log("Event received:", payload.name);

				this.#times.sort((a, b) => a - b);
				console.log("Prevote processing times (ms):", this.#times.map((time) => Math.floor(time)).join(", "));

				this.#times = [];
			}
		});
	}

	public async handle(
		request: Contracts.P2P.PostPrevoteRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.PostPrevoteResponse> {
		const start = performance.now();

		try {
			const prevote = await this.factory.makePrevoteFromBytes(request.payload.prevote);

			const result = await this.prevoteProcessor.process(prevote);

			if (result === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid prevote");
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.peerDisposer.banPeer(getPeerIp(request), error.message);
		}

		const end = performance.now();
		this.#times.push(end - start);

		return {};
	}
}
