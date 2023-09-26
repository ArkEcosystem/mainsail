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
}>("StateStore", ({ it, beforeEach, assert, spy, stub, clock }) => {
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

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.StateAttributes).to(AttributeRepository).inSingletonScope();
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.StateAttributes)
			.set("height", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.StateAttributes)
			.set("totalRound", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.StateAttributes)
			.set("customAttribute", Contracts.State.AttributeType.Number);

		context.attributeRepository = context.sandbox.app.get<AttributeRepository>(Identifiers.StateAttributes);

		context.stateStore = context.sandbox.app.resolve(StateStore);
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
		spyOnSetHeight.calledWith(1);
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
		spyNotice.calledWith("Milestone change");
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
});
