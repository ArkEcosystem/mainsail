import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

@injectable()
export class SetPeerHandler {
	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly peerRepository!: Contracts.TransactionPool.PeerRepository;

	public async handle(ip: string): Promise<void> {
		this.peerRepository.setPeer(ip);
	}
}
