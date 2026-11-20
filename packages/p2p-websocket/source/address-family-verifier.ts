import { injectable } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";

import type { ConnectionVerifier } from "./interfaces/index.js";

import { CloseReason } from "./enums.js";

// Only IPv4 peers for now. The address rules of the peer layer (subnet limits, local-address checks)
// are written for IPv4, and an IPv6 peer would bypass them: a single /64 could present itself as any
// number of peers. Addresses arrive sanitized, so an IPv4-mapped IPv6 address is already plain IPv4.
@injectable()
export class AddressFamilyVerifier implements ConnectionVerifier {
	public verify(ip: string): CloseReason | undefined {
		return IpAddress.isIPv6Address(ip) ? CloseReason.Rejected : undefined;
	}
}
