import type { Contracts } from "@mainsail/contracts";

import { randomNumber } from "@mainsail/utils";

export const getRandomPeer = (peers: Contracts.P2PService.Peer[]): Contracts.P2PService.Peer =>
	peers[randomNumber(0, peers.length - 1)];
