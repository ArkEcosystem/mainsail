import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class MessageDownloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	public async download(peer: Contracts.P2P.Peer): Promise<void> {
		await this.communicator.getMessages(peer);
	}
}
