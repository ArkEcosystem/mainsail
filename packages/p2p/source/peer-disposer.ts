import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers } from "@mainsail/kernel";
import dayjs from "dayjs";

@injectable()
export class PeerDisposer implements Contracts.P2P.PeerDisposer {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerConnector)
	private readonly connector!: Contracts.P2P.PeerConnector;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#blacklist = new Map<string, dayjs.Dayjs>();

	public banPeer(peer: Contracts.P2P.Peer, reason: string): void {
		if (this.isBanned(peer.ip)) {
			return;
		}

		this.logger.debug(`Banning peer ${peer.ip}, because: ${reason}`);

		const timeout = this.configuration.getRequired<number>("peerBanTime");
		if (timeout > 0) {
			this.#blacklist.set(peer.ip, dayjs().add(timeout, "minute"));
		}

		this.disposePeer(peer);
	}

	public disposePeer(peer: Contracts.P2P.Peer): void {
		this.connector.disconnect(peer);
		this.repository.forgetPeer(peer);
		peer.dispose();

		void this.events.dispatch(Enums.PeerEvent.Removed, peer);
	}

	public isBanned(peerIp: string): boolean {
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
