import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class SetPeerHandler {
	@inject(Identifiers.TransactionPool.Peer.Processor)
	private readonly peerProcessor!: Contracts.TransactionPool.PeerProcessor;

	public async handle(ip: string): Promise<void> {
		await this.peerProcessor.validateAndAcceptPeer(ip);
	}
}
