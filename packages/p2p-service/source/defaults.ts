import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

// Copied from @mainsail/p2p without the options this package does not read: api nodes, statistics,
// rate limiting and developmentMode (with its remoteAccess whitelist for internal routes, which the
// transport has no notion of), and txPoolPort (the tx pool checks its own port now). The listening
// address lives in the @mainsail/p2p-websocket configuration.
export const defaults = {
	blacklist: [],
	disableDiscovery: false,
	getBlocksTimeout: 30_000,
	ignoreMinimumNetworkReach: false,
	maxPeersBroadcast: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_BROADCAST, 4),
	maxSameSubnetPeers: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_SAME_SUBNET, 5),
	minimumNetworkReach: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MIN_NETWORK_REACH, 20),
	minimumVersions: ["^0.0.1"],
	peerBanTime: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PEER_BAN_TIME, 3),
	skipPeerStateVerification: Environment.isTrue(EnvironmentVariables.MAINSAIL_SKIP_PEER_STATE_VERIFICATION),
	verifyTimeout: 60_000,
	whitelist: ["*"],
};
