import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers } from "@mainsail/kernel";
import dayjs from "dayjs";

import { errorTypes } from "./hapi-nes";

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

	public banPeer(peer: Contracts.P2P.Peer, error: Error | Contracts.P2P.NesError): void {
		if (!this.repository.hasPeer(peer.ip) || this.isBanned(peer.ip)) {
			return;
		}

		if (
			this.#isNesError(error) &&
			(error.type === errorTypes.WS || error.type === errorTypes.DISCONNECT || error.type === errorTypes.TIMEOUT)
		) {
			this.logger.debug(`Disposing peer ${peer.ip}, because: ${error.message}`);
			this.disposePeer(peer);

			return;
		}

		this.logger.debug(`Banning peer ${peer.ip}, because: ${error.message}`);

		const timeout = this.configuration.getRequired<number>("peerBanTime");
		if (timeout > 0) {
			this.#blacklist.set(peer.ip, dayjs().add(timeout, "minute"));
		}

		this.disposePeer(peer);
	}

	public disposePeer(peer: Contracts.P2P.Peer): void {
		this.repository.forgetPeer(peer);
		this.connector.disconnect(peer);
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

	#isNesError(error: Error | Contracts.P2P.NesError): error is Contracts.P2P.NesError {
		// @ts-ignore
		return !!error.isNes;
	}
}
