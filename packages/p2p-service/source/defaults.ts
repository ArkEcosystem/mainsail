import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

// Copied from @mainsail/p2p without the options this package does not read: api nodes, statistics,
// rate limiting and developmentMode (with its remoteAccess whitelist for internal routes, which the
// transport has no notion of), and txPoolPort (a peer's transaction pool API is not checked before the
// peer is accepted; the pool reports the peers it cannot reach). Also gone are disableDiscovery (a
// whitelist of the seeds does the same), skipPeerStateVerification, ignoreMinimumNetworkReach (a
// minimumNetworkReach of 0 does the same) and verifyTimeout (nothing ran the slow peer check it was
// for). The listening address and minimumVersions live in the @mainsail/p2p-websocket configuration: the
// transport decides in its handshake which versions it connects with.
export const defaults = {
	blacklist: [],
	getBlocksTimeout: 30_000,
	maxPeersBroadcast: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_BROADCAST, 4),
	maxSameSubnetPeers: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_SAME_SUBNET, 5),
	minimumNetworkReach: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MIN_NETWORK_REACH, 20),
	peerBanTime: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PEER_BAN_TIME, 3),
	whitelist: ["*"],
};
