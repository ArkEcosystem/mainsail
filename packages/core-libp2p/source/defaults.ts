import { Constants } from "@arkecosystem/core-contracts";
import { NOISE } from "@chainsafe/libp2p-noise";
import Bootstrap from "libp2p-bootstrap";
import Gossipsub from "libp2p-gossipsub";
// import MPLEX from 'libp2p-mplex';
import TCP from "libp2p-tcp";
import WS from "libp2p-websockets";

export const defaults = {
	addresses: ["/ip4/0.0.0.0/tcp/0"],
	config: {
		peerDiscovery: {
			autoDial: true,
			[Bootstrap.tag]: {
				enabled: true,
				list: [],
			},
		},
		pubsub: {
			emitSelf: process.env[Constants.Flags.CORE_NETWORK_NAME] === "testnet",
			enabled: true,
		},
	},
	modules: {
		connEncryption: [NOISE],
		// peerDiscovery: [Bootstrap],
		pubsub: Gossipsub,
		// streamMuxer: [MPLEX],
		transport: [TCP, WS],
	},
};
