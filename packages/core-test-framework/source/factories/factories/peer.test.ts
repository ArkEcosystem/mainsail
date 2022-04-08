import { Peer } from "@arkecosystem/core-p2p";

import { describe } from "../../index";
import { FactoryBuilder } from "../factory-builder";
import { registerPeerFactory } from "./peer";

describe<{
	factoryBuilder: FactoryBuilder;
}>("PeerFactory", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.factoryBuilder = new FactoryBuilder();

		registerPeerFactory(context.factoryBuilder);
	});

	it("should create a single peer", async ({ factoryBuilder }) => {
		const entity = await factoryBuilder.get("Peer").make<Peer>();

		assert.instance(entity, Peer);
		assert.string(entity.ip);
		assert.number(entity.port);
		assert.string(entity.version);
		assert.number(entity.latency);
	});

	it("should create many peers", async ({ factoryBuilder }) => {
		const entities: Peer[] = await factoryBuilder.get("Peer").makeMany<Peer>(5);

		assert.array(entities);
		assert.equal(entities.length, 5);

		for (const entity of entities) {
			assert.instance(entity, Peer);
			assert.string(entity.ip);
			assert.number(entity.port);
			assert.string(entity.version);
			assert.number(entity.latency);
		}
	});
});
