import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { describe, Sandbox } from "../../test-framework/distribution";
import { AttributeRepository } from "./attributes";
import { StateStore } from "./state-store";

describe<{
	sandbox: Sandbox;
	stateStore: StateStore;
	attributeRepository: AttributeRepository;
	logger: any;
	cryptoConfiguration: any;
	eventDispatcher: any;
}>("StateStore", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach(async (context) => {
		context.logger = {
			notice: () => {},
		};

		context.cryptoConfiguration = {
			isNewMilestone: () => false,
			getMilestoneDiff: () => ({}),
			setHeight: () => {},
		};

		context.eventDispatcher = {
			dispatch: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.State.AttributeRepository).to(AttributeRepository).inSingletonScope();
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("height", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("totalRound", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("customAttribute", Contracts.State.AttributeType.Number);

		context.attributeRepository = context.sandbox.app.get<AttributeRepository>(
			Identifiers.State.AttributeRepository,
		);

		context.stateStore = context.sandbox.app.resolve(StateStore).configure();
	});

	it("#initialize - should set height and totalRound", ({ stateStore }) => {
		assert.equal(stateStore.getAttribute("height"), 0);
		assert.equal(stateStore.getAttribute("totalRound"), 0);
	});

	it("#isBootstrap - should return true by default", ({ stateStore }) => {
		assert.true(stateStore.isBootstrap());
	});

	it("#setBootstrap - should set bootstrap", ({ stateStore }) => {
		stateStore.setBootstrap(false);
		assert.false(stateStore.isBootstrap());
	});

	it("#getLastBlock - should throw if not set", ({ stateStore }) => {
		assert.throws(() => stateStore.getLastBlock());
	});

	it("#setLastBlock - should set heigh attribute and configuration height", ({ stateStore, cryptoConfiguration }) => {
		const spyOnSetHeight = spy(cryptoConfiguration, "setHeight");

		assert.equal(stateStore.getAttribute("height"), 0);

		const block = {
			data: {
				height: 1,
			},
		};
		stateStore.setLastBlock(block as any);

		assert.equal(stateStore.getAttribute("height"), 1);
		spyOnSetHeight.calledOnce();
		spyOnSetHeight.calledWith(block.data.height + 1); // always next height to propose
	});

	it("#setLastBlock - should emit milestone changed", ({
		stateStore,
		logger,
		eventDispatcher,
		cryptoConfiguration,
	}) => {
		const spyNotice = spy(logger, "notice");
		const spyDispatch = spy(eventDispatcher, "dispatch");
		const spyIsNewMilestone = stub(cryptoConfiguration, "isNewMilestone").returnValue(true);

		const block = {
			data: {
				height: 1,
			},
		};
		stateStore.setLastBlock(block as any);

		spyIsNewMilestone.calledOnce();
		spyNotice.calledOnce();
		spyNotice.calledWith("Milestone change: {}");
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Enums.CryptoEvent.MilestoneChanged);
	});

	it("#getLastHeight - should return height", ({ stateStore }) => {
		assert.equal(stateStore.getLastHeight(), 0);

		const block = {
			data: {
				height: 1,
			},
		};
		stateStore.setLastBlock(block as any);
		assert.equal(stateStore.getLastHeight(), 1);
	});

	it("#getTotalRound - should return totalRound", ({ stateStore }) => {
		assert.equal(stateStore.getTotalRound(), 0);
	});

	it("#setTotalRound - should set totalRound", ({ stateStore }) => {
		stateStore.setTotalRound(1);
		assert.equal(stateStore.getTotalRound(), 1);
	});

	it("#hasAttribute - should return true if attribute is set", ({ stateStore }) => {
		assert.true(stateStore.hasAttribute("height"));
		assert.false(stateStore.hasAttribute("customAttribute"));
		assert.false(stateStore.hasAttribute("unknownAttribute"));
	});

	it("#setAttribute - should set attribute", ({ stateStore }) => {
		stateStore.setAttribute("customAttribute", 1);
		assert.equal(stateStore.getAttribute("customAttribute"), 1);
	});

	it("#setAttribute - should throw if attribute is not registered", ({ stateStore }) => {
		assert.throws(
			() => stateStore.setAttribute("unknownAttribute", 1),
			'Attribute "unknownAttribute" is not defined.',
		);
	});

	it("#getAttribute - should throw if attribute is not set", ({ stateStore }) => {
		assert.throws(() => stateStore.getAttribute("customAttribute"), 'Attribute "customAttribute" is not set.');
	});

	it("#getAttribute - should throw if attribute is not registered", ({ stateStore }) => {
		assert.throws(() => stateStore.getAttribute("unknownAttribute"), 'Attribute "unknownAttribute" is not set.');
	});

	it("#commitChanges - should pass", ({ stateStore }) => {
		stateStore.commitChanges();
	});
});

describe<{
	sandbox: Sandbox;
	stateStore: StateStore;
	stateStoreClone: StateStore;
	attributeRepository: AttributeRepository;
	logger: any;
	cryptoConfiguration: any;
	eventDispatcher: any;
}>("StateStore - Clone", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach(async (context) => {
		context.logger = {
			notice: () => {},
		};

		context.cryptoConfiguration = {
			isNewMilestone: () => false,
			setHeight: () => {},
		};

		context.eventDispatcher = {
			dispatch: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.State.AttributeRepository).to(AttributeRepository).inSingletonScope();
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("height", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("totalRound", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("customAttribute", Contracts.State.AttributeType.Number);

		context.attributeRepository = context.sandbox.app.get<AttributeRepository>(
			Identifiers.State.AttributeRepository,
		);

		context.stateStore = context.sandbox.app.resolve(StateStore).configure();

		context.stateStoreClone = context.sandbox.app.resolve(StateStore).configure(context.stateStore);
	});

	it("#initialize - should return original height and totalRound, isBootstrap, lastBlock and genesisBlock", ({
		stateStore,
		sandbox,
	}) => {
		const genesisBlock = { block: { data: { height: 0 } } };
		const block = { data: { height: 1 } };

		stateStore.setTotalRound(2);
		stateStore.setBootstrap(false);
		stateStore.setGenesisCommit(genesisBlock as any);
		stateStore.setLastBlock(block as any);

		const stateStoreClone = sandbox.app.resolve(StateStore).configure(stateStore);

		assert.equal(stateStoreClone.getTotalRound(), 2);
		assert.equal(stateStoreClone.getLastHeight(), 1);
		assert.false(stateStoreClone.isBootstrap());
	});

	it("#setBootstrap - should be set only on clone", ({ stateStore, stateStoreClone }) => {
		assert.true(stateStore.isBootstrap());
		assert.true(stateStoreClone.isBootstrap());

		stateStoreClone.setBootstrap(false);

		assert.true(stateStore.isBootstrap());
		assert.false(stateStoreClone.isBootstrap());
	});

	it("#setGenesisCommit - should be set only on clone", ({ stateStore, stateStoreClone }) => {
		assert.throws(() => stateStore.getGenesisCommit());
		assert.throws(() => stateStoreClone.getGenesisCommit());

		const genesisBlock = { block: { data: { height: 0 } } };
		stateStoreClone.setGenesisCommit(genesisBlock as any);

		assert.throws(() => stateStore.getGenesisCommit());
		assert.equal(stateStoreClone.getGenesisCommit(), genesisBlock);
	});

	it("#setLastBlock - should be set only on clone", ({ stateStore, stateStoreClone }) => {
		assert.throws(() => stateStore.getLastBlock());
		assert.throws(() => stateStoreClone.getLastBlock());

		const block = { data: { height: 1 } };
		stateStoreClone.setLastBlock(block as any);

		assert.throws(() => stateStore.getLastBlock());
		assert.equal(stateStoreClone.getLastBlock(), block);
		assert.equal(stateStore.getLastHeight(), 0);
		assert.equal(stateStoreClone.getLastHeight(), 1);
	});

	it("#setTotalRound - should be set only on clone", ({ stateStore, stateStoreClone }) => {
		assert.equal(stateStore.getTotalRound(), 0);
		assert.equal(stateStoreClone.getTotalRound(), 0);

		stateStoreClone.setTotalRound(1);

		assert.equal(stateStore.getTotalRound(), 0);
		assert.equal(stateStoreClone.getTotalRound(), 1);
	});

	it("#setAttribute - should be set only on clone", ({ stateStore, stateStoreClone }) => {
		assert.throws(() => stateStore.getAttribute("customAttribute"));
		assert.throws(() => stateStoreClone.getAttribute("customAttribute"));

		stateStoreClone.setAttribute("customAttribute", 1);

		assert.throws(() => stateStore.getAttribute("customAttribute"));
		assert.equal(stateStoreClone.getAttribute("customAttribute"), 1);
	});

	it("hasAttribute - should be true only on clone", ({ stateStore, stateStoreClone }) => {
		assert.false(stateStore.hasAttribute("customAttribute"));
		assert.false(stateStoreClone.hasAttribute("customAttribute"));

		stateStoreClone.setAttribute("customAttribute", 1);

		assert.false(stateStore.hasAttribute("customAttribute"));
		assert.true(stateStoreClone.hasAttribute("customAttribute"));
	});

	it("#geAttribute - should return if set on original", ({ stateStore, stateStoreClone }) => {
		assert.throws(() => stateStore.getAttribute("customAttribute"));
		assert.throws(() => stateStoreClone.getAttribute("customAttribute"));

		stateStore.setAttribute("customAttribute", 1);

		assert.equal(stateStore.getAttribute("customAttribute"), 1);
		assert.equal(stateStoreClone.getAttribute("customAttribute"), 1);
	});

	it("#geAttribute - should return if set on clone", ({ stateStore, stateStoreClone }) => {
		assert.throws(() => stateStore.getAttribute("customAttribute"));
		assert.throws(() => stateStoreClone.getAttribute("customAttribute"));

		stateStoreClone.setAttribute("customAttribute", 1);

		assert.throws(() => stateStore.getAttribute("customAttribute"));
		assert.equal(stateStoreClone.getAttribute("customAttribute"), 1);
	});

	it("#commitChanges - should copy changes back to original", ({ stateStore, stateStoreClone }) => {
		assert.equal(stateStore.getAttribute("height"), 0);
		assert.equal(stateStore.getAttribute("totalRound"), 0);
		assert.false(stateStore.hasAttribute("customAttribute"));
		assert.true(stateStore.isBootstrap());
		assert.throws(() => stateStore.getGenesisCommit());
		assert.throws(() => stateStore.getLastBlock());

		const genesisBlock = { block: { data: { height: 0 } } };
		const block = { data: { height: 1 } };

		stateStoreClone.setTotalRound(2);
		stateStoreClone.setBootstrap(false);
		stateStoreClone.setGenesisCommit(genesisBlock as any);
		stateStoreClone.setLastBlock(block as any);
		stateStoreClone.setAttribute("customAttribute", 1);

		stateStoreClone.commitChanges();

		assert.equal(stateStore.getAttribute("height"), 1);
		assert.equal(stateStore.getAttribute("totalRound"), 2);
		assert.equal(stateStore.getAttribute("customAttribute"), 1);
		assert.false(stateStore.isBootstrap());
		assert.equal(stateStore.getGenesisCommit(), genesisBlock);
		assert.equal(stateStore.getLastBlock(), block);
	});
});
