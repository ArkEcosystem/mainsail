import { Peer } from "@arkecosystem/core-p2p";
import Chance from "chance";

import { FactoryBuilder } from "../factory-builder";

const chance: Chance = new Chance();

export const registerPeerFactory = (factory: FactoryBuilder): void => {
	factory.set("Peer", async () => {
		const peer: Peer = new Peer(chance.ip(), chance.port());
		peer.version = chance.pickone(["3.0.0", "3.0.0-next.0"]);
		peer.latency = chance.integer({ max: 1000, min: 1 });
		return peer;
	});
};
