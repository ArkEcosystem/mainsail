import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { CloseReason } from "@mainsail/p2p-websocket";
import { IpAddress, isBlacklisted, isWhitelisted } from "@mainsail/utils";

// The address rules of @mainsail/p2p (validate-ip plugin and PeerProcessor.validatePeerIp) in one
// place: run by the transport before every handshake and by the processor before an address is
// recorded. Bans are kept and refused by the transport's own ban list.
@injectable()
export class PeerIpVerifier implements Interfaces.ConnectionVerifier {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Peer.Seeds)
	private readonly seeds!: Contracts.P2PService.Seeds;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	public verify(ip: string): CloseReason | undefined {
		if (!IpAddress.isValidPeerIp(ip)) {
			return CloseReason.Rejected;
		}

		if (!isWhitelisted(this.configuration.getRequired<string[]>("whitelist"), ip)) {
			return CloseReason.Rejected;
		}

		if (isBlacklisted(this.configuration.getRequired<string[]>("blacklist"), ip)) {
			return CloseReason.Rejected;
		}

		if (this.#isSameSubnetLimitReached(ip)) {
			return CloseReason.Rejected;
		}

		return undefined;
	}

	#isSameSubnetLimitReached(ip: string): boolean {
		if (this.seeds.isSeed(ip)) {
			return false;
		}

		const maxSameSubnetPeers = this.configuration.getRequired<number>("maxSameSubnetPeers");

		if (this.repository.getSameSubnetPeers(ip).length < maxSameSubnetPeers) {
			return false;
		}

		this.logger.warnExtra(
			`Rejected ${ip} because we are already at the ${maxSameSubnetPeers} limit for peers sharing the same /24 subnet.`,
			"p2p",
		);

		return true;
	}
}
