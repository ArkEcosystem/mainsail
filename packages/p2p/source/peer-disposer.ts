import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers } from "@mainsail/kernel";
import dayjs from "dayjs";

import { errorTypes } from "./hapi-nes/index.js";

@injectable()
export class PeerDisposer implements Contracts.P2P.PeerDisposer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Connector)
	private readonly connector!: Contracts.P2P.PeerConnector;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#blacklist = new Map<string, dayjs.Dayjs>();

	public banPeer(ip: string, error: Error | Contracts.P2P.NesError, checkRepository = true): void {
		if ((checkRepository && !this.repository.hasPeer(ip)) || this.isBanned(ip)) {
			return;
		}

		if (
			this.#isNesError(error) &&
			(error.type === errorTypes.WS || error.type === errorTypes.DISCONNECT || error.type === errorTypes.TIMEOUT)
		) {
			this.logger.debug(`Disposing peer ${ip}, because: ${error.message}`);
			this.disposePeer(ip);

			return;
		}

		this.logger.debug(`Banning peer ${ip}, because: ${error.message}`);

		const timeout = this.configuration.getRequired<number>("peerBanTime");
		if (timeout > 0) {
			this.#blacklist.set(ip, dayjs().add(timeout, "minute"));
		}

		this.disposePeer(ip);
	}

	public disposePeer(ip: string): void {
		void this.connector.disconnect(ip);

		if (this.repository.hasPeer(ip)) {
			const peer = this.repository.getPeer(ip);

			this.repository.forgetPeer(peer);
			peer.dispose();

			void this.events.dispatch(Enums.PeerEvent.Removed, peer);
		}
	}

	public async disposePeers(): Promise<void> {
		await Promise.all(
			this.repository.getPendingPeers().map(async (peer) => await this.connector.disconnect(peer.ip)),
		);
		await Promise.all(this.repository.getPeers().map(async (peer) => await this.connector.disconnect(peer.ip)));
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
