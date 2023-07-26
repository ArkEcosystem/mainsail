import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class PeerBlocker implements Contracts.P2P.PeerBlocker {
	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#blacklist = new Map<string, dayjs.Dayjs>();

	public blockPeer(peer: Contracts.P2P.Peer): void {
		if (this.isBlocked(peer.ip)) {
			return;
		}

		this.logger.debug(`Banning peer ${peer.ip}`);

		this.#blacklist.set(peer.ip, dayjs().add(20, "minute"));

		this.peerProcessor.dispose(peer);
	}

	public isBlocked(peerIp: string): boolean {
		const bannedUntil = this.#blacklist.get(peerIp);

		if (bannedUntil) {
			if (bannedUntil.isAfter(dayjs())) {
				return true;
			}

			this.#blacklist.delete(peerIp);
		}

		return false;
	}
}
