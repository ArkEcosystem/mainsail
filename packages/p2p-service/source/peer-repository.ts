import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { assert, IpAddress } from "@mainsail/utils";
import ipaddr from "ipaddr.js";

@injectable()
export class PeerRepository implements Contracts.P2PService.PeerRepository {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	readonly #peers: Map<string, Contracts.P2PService.Peer> = new Map<string, Contracts.P2PService.Peer>();
	readonly #peersPending: Map<string, Contracts.P2PService.Peer> = new Map<string, Contracts.P2PService.Peer>();
	readonly #peersKnown: Map<string, Contracts.P2PService.Peer> = new Map<string, Contracts.P2PService.Peer>();

	public getPeers(): Contracts.P2PService.Peer[] {
		return [...this.#peers.values()];
	}

	public hasPeers(): boolean {
		return this.#peers.size > 0;
	}

	public getPeer(ip: string): Contracts.P2PService.Peer {
		const peer: Contracts.P2PService.Peer | undefined = this.#peers.get(ip);

		assert.defined(peer);

		return peer;
	}

	public setPeer(peer: Contracts.P2PService.Peer): void {
		this.#peers.set(peer.ip, peer);
	}

	public forgetPeer(peer: Contracts.P2PService.Peer): void {
		this.#peers.delete(peer.ip);
	}

	public hasPeer(ip: string): boolean {
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

	public hasMinimumPeers(): boolean {
		if (this.configuration.getOptional<boolean>("ignoreMinimumNetworkReach", false)) {
			return true;
		}

		return this.getPeers().length >= this.configuration.getRequired<number>("minimumNetworkReach");
	}

	public getSameSubnetPeers(peerIp: string): Contracts.P2PService.Peer[] {
		return this.getPeers().filter((peer) => {
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
