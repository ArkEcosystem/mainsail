import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ForgetPeerHandler {
	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly peerRepository!: Contracts.TransactionPool.PeerRepository;

	public async handle(ip: string): Promise<void> {
		this.peerRepository.forgetPeer(ip);
	}
}
