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

	public getActivePeer(ip: string): Contracts.P2PService.Peer {
		const peer: Contracts.P2PService.Peer | undefined = this.#peers.get(ip);

		assert.defined(peer);

		return peer;
	}

	// An active peer is in no other list. Active peers are announced; pending and known ones are internal
	// to this package.
	public setActivePeer(peer: Contracts.P2PService.Peer): void {
		this.#peersPending.delete(peer.ip);
		this.#peersKnown.delete(peer.ip);
		this.#peers.set(peer.ip, peer);

		void this.events.dispatch(Events.PeerEvent.Added, peer);
	}

	public hasActivePeer(ip: string): boolean {
		return this.#peers.has(ip);
	}

	public getPendingPeers(): Contracts.P2PService.Peer[] {
		return [...this.#peersPending.values()];
	}

	public setPendingPeer(peer: Contracts.P2PService.Peer): void {
		this.#peersPending.set(peer.ip, peer);
	}

	public hasPendingPeer(ip: string): boolean {
		return this.#peersPending.has(ip);
	}

	public getKnownPeers(): Contracts.P2PService.Peer[] {
		return [...this.#peersKnown.values()];
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
		this.#forgetActivePeer(ip);
		this.#peersPending.delete(ip);
		this.#peersKnown.delete(ip);
	}

	public demotePeer(ip: string): void {
		const peer = this.#forgetActivePeer(ip);
		if (peer) {
			this.setKnownPeer(peer);

			return;
		}

		this.#peersPending.delete(ip);
	}

	public hasMinimumPeers(): boolean {
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

	// Takes the peer off the active list and announces that; returns it, or nothing if it was not active.
	#forgetActivePeer(ip: string): Contracts.P2PService.Peer | undefined {
		const peer = this.#peers.get(ip);

		if (peer) {
			this.#peers.delete(ip);

			void this.events.dispatch(Events.PeerEvent.Removed, peer);
		}

		return peer;
	}

	#networkAddress(ip: string): string {
		return ipaddr.IPv4.networkAddressFromCIDR(`${ip}/24`).toString();
	}
}
