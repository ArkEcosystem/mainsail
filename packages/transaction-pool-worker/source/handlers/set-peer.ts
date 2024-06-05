import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class SetPeerHandler {
	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly peerRepository!: Contracts.TransactionPool.PeerRepository;

	public async handle(ip: string): Promise<void> {
		this.peerRepository.setPeer(ip);
	}
}
