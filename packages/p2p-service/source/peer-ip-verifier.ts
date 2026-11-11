import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { CloseReason } from "@mainsail/p2p-websocket";
import { IpAddress, isBlacklisted, isWhitelisted } from "@mainsail/utils";

// Refuses sockets from addresses that can never become peers, before the handshake. Replaces the
// validate-ip plugin of @mainsail/p2p. Bans are refused by the transport's own ban list, and the
// subnet limit is applied by the processor after the handshake, where seeds can be exempted.
@injectable()
export class PeerIpVerifier implements Interfaces.ConnectionVerifier {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

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

		return undefined;
	}
}
