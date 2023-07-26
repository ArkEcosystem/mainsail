import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class PeerBanner {
	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#bannedPeers = new Map<string, dayjs.Dayjs>();

	public async banPeer(peer: Contracts.P2P.Peer): Promise<void> {
		this.logger.debug(`Banning peer ${peer.ip}`);

		this.#bannedPeers.set(peer.ip, dayjs().add(20, "minute"));

		await this.peerProcessor.dispose(peer);
	}

	public async isBanned(peer: Contracts.P2P.Peer): Promise<boolean> {
		const bannedUntil = this.#bannedPeers.get(peer.ip);

		if (bannedUntil) {
			if (bannedUntil.isAfter(dayjs())) {
				return true;
			}

			this.#bannedPeers.delete(peer.ip);
		}

		return false;
	}
}
