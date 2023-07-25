import { Contracts } from "@mainsail/contracts";
import { randomNumber } from "@mainsail/utils";

export const getRandomPeer = (peers: Contracts.P2P.Peer[]): Contracts.P2P.Peer =>
	peers[randomNumber(0, peers.length - 1)];
