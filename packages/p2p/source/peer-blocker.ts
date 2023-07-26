import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class PeerBlocker {
	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#blacklist = new Map<string, dayjs.Dayjs>();

	public async blockPeer(peer: Contracts.P2P.Peer): Promise<void> {
		this.logger.debug(`Banning peer ${peer.ip}`);

		this.#blacklist.set(peer.ip, dayjs().add(20, "minute"));

		await this.peerProcessor.dispose(peer);
	}

	public async isBlocked(peer: Contracts.P2P.Peer): Promise<boolean> {
		const bannedUntil = this.#blacklist.get(peer.ip);

		if (bannedUntil) {
			if (bannedUntil.isAfter(dayjs())) {
				return true;
			}

			this.#blacklist.delete(peer.ip);
		}

		return false;
	}
}
