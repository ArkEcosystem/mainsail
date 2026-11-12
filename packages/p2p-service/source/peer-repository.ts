import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { assert, IpAddress } from "@mainsail/utils";
import ipaddr from "ipaddr.js";

@injectable()
export class PeerRepository implements Contracts.P2PService.PeerRepository {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	readonly #peers: Map<string, Contracts.P2PService.Peer> = new Map<string, Contracts.P2PService.Peer>();
	readonly #peersPending: Map<string, Contracts.P2PService.Peer> = new Map<string, Contracts.P2PService.Peer>();
	readonly #peersKnown: Map<string, Contracts.P2PService.Peer> = new Map<string, Contracts.P2PService.Peer>();

	public hasPeer(ip: string): boolean {
		return this.#peers.has(ip) || this.#peersPending.has(ip) || this.#peersKnown.has(ip);
	}

	public getActivePeers(): Contracts.P2PService.Peer[] {
		return [...this.#peers.values()];
	}

	public hasActivePeers(): boolean {
		return this.#peers.size > 0;
	}

	public getActivePeer(ip: string): Contracts.P2PService.Peer {
		const peer: Contracts.P2PService.Peer | undefined = this.#peers.get(ip);

		assert.defined(peer);

		return peer;
	}

	// Active peers are announced; pending and known ones are internal to this package.
	public setActivePeer(peer: Contracts.P2PService.Peer): void {
		this.#peers.set(peer.ip, peer);

		void this.events.dispatch(Events.PeerEvent.Added, peer);
	}

	public forgetActivePeer(peer: Contracts.P2PService.Peer): void {
		if (this.#peers.delete(peer.ip)) {
			void this.events.dispatch(Events.PeerEvent.Removed, peer);
		}
	}

	public hasActivePeer(ip: string): boolean {
		return this.#peers.has(ip);
	}

	public getPendingPeers(): Contracts.P2PService.Peer[] {
		return [...this.#peersPending.values()];
	}

	public hasPendingPeers(): boolean {
		return this.#peersPending.size > 0;
	}

	public getPendingPeer(ip: string): Contracts.P2PService.Peer {
		const peer = this.#peersPending.get(ip);

		assert.defined(peer);

		return peer;
	}

	public setPendingPeer(peer: Contracts.P2PService.Peer): void {
		this.#peersPending.set(peer.ip, peer);
	}

	public forgetPendingPeer(peer: Contracts.P2PService.Peer): void {
		this.#peersPending.delete(peer.ip);
	}

	public hasPendingPeer(ip: string): boolean {
		return this.#peersPending.has(ip);
	}

	public getKnownPeers(): Contracts.P2PService.Peer[] {
		return [...this.#peersKnown.values()];
	}

	public hasKnownPeers(): boolean {
		return this.#peersKnown.size > 0;
	}

	public getKnownPeer(ip: string): Contracts.P2PService.Peer {
		const peer = this.#peersKnown.get(ip);

		assert.defined(peer);

		return peer;
	}

	public setKnownPeer(peer: Contracts.P2PService.Peer): void {
		this.#peersKnown.set(peer.ip, peer);
	}

	public forgetKnownPeer(peer: Contracts.P2PService.Peer): void {
		this.#peersKnown.delete(peer.ip);
	}

	public hasKnownPeer(ip: string): boolean {
		return this.#peersKnown.has(ip);
	}

	public removePeer(ip: string): void {
		if (this.#peers.has(ip)) {
			this.forgetActivePeer(this.getActivePeer(ip));
		}

		this.#peersPending.delete(ip);
		this.#peersKnown.delete(ip);
	}

	public demotePeer(ip: string): void {
		if (this.#peers.has(ip)) {
			const peer = this.getActivePeer(ip);
			this.forgetActivePeer(peer);
			this.setKnownPeer(peer);

			return;
		}

		this.#peersPending.delete(ip);
	}

	public hasMinimumPeers(): boolean {
		if (this.configuration.getOptional<boolean>("ignoreMinimumNetworkReach", false)) {
			return true;
		}

		return this.getActivePeers().length >= this.configuration.getRequired<number>("minimumNetworkReach");
	}

	public getSameSubnetPeers(peerIp: string): Contracts.P2PService.Peer[] {
		return this.getActivePeers().filter((peer) => {
			if (!IpAddress.isIPv6Address(peer.ip) && !IpAddress.isIPv6Address(peerIp)) {
				return this.#networkAddress(peer.ip) === this.#networkAddress(peerIp);
			}

			return false;
		});
	}

	#networkAddress(ip: string): string {
		return ipaddr.IPv4.networkAddressFromCIDR(`${ip}/24`).toString();
	}
}
