import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { describe, describeSkip, Sandbox } from "../../test-framework/distribution";
import { AttributeRepository } from "./attributes";
import { Store } from "./store";

describeSkip<{
	sandbox: Sandbox;
	store: Store;
	attributeRepository: AttributeRepository;
	logger: any;
	cryptoConfiguration: any;
	eventDispatcher: any;
	walletRepository: any;
}>("Store", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach(async (context) => {
		context.logger = {
			notice: () => {},
		};

		context.cryptoConfiguration = {
			getMilestoneDiff: () => ({}),
			isNewMilestone: () => false,
			setHeight: () => {},
		};

		context.eventDispatcher = {
			dispatch: () => {},
		};

		context.walletRepository = {
			commitChanges: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.State.AttributeRepository).to(AttributeRepository).inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.State.WalletRepository.Base.Factory)
			.toConstantValue(() => context.walletRepository);
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

		context.store = context.sandbox.app.resolve(Store).configure();
	});

	it("#initialize - should set height and totalRound", ({ store }) => {
		assert.equal(store.getAttribute("height"), 0);
		assert.equal(store.getAttribute("totalRound"), 0);
	});

	it("#walletRepository - should return walletRepository", ({ store, walletRepository }) => {
		assert.equal(store.walletRepository, walletRepository);
	});

	it("#isBootstrap - should return true by default", ({ store }) => {
		assert.true(store.isBootstrap());
	});

	it("#setBootstrap - should set bootstrap", ({ store }) => {
		store.setBootstrap(false);
		assert.false(store.isBootstrap());
	});

	it("#getLastBlock - should throw if not set", ({ store }) => {
		assert.throws(() => store.getLastBlock());
	});

	it("#setLastBlock - should set heigh attribute and configuration height", ({ store, cryptoConfiguration }) => {
		const spyOnSetHeight = spy(cryptoConfiguration, "setHeight");

		assert.equal(store.getAttribute("height"), 0);

		const block = {
			data: {
				height: 1,
			},
		};
		store.setLastBlock(block as any);

		assert.equal(store.getAttribute("height"), 1);
		spyOnSetHeight.calledOnce();
		spyOnSetHeight.calledWith(block.data.height + 1); // always next height to propose
	});

	it("#setLastBlock - should emit milestone changed", ({ store, logger, eventDispatcher, cryptoConfiguration }) => {
		const spyNotice = spy(logger, "notice");
		const spyDispatch = spy(eventDispatcher, "dispatch");
		const spyIsNewMilestone = stub(cryptoConfiguration, "isNewMilestone").returnValue(true);

		const block = {
			data: {
				height: 1,
			},
		};
		store.setLastBlock(block as any);

		spyIsNewMilestone.calledOnce();
		spyNotice.calledOnce();
		spyNotice.calledWith("Milestone change: {}");
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Enums.CryptoEvent.MilestoneChanged);
	});

	it("#getLastHeight - should return height", ({ store }) => {
		assert.equal(store.getLastHeight(), 0);

		const block = {
			data: {
				height: 1,
			},
		};
		store.setLastBlock(block as any);
		assert.equal(store.getLastHeight(), 1);
	});

	it("#getTotalRound - should return totalRound", ({ store }) => {
		assert.equal(store.getTotalRound(), 0);
	});

	it("#hasAttribute - should return true if attribute is set", ({ store }) => {
		assert.true(store.hasAttribute("height"));
		assert.false(store.hasAttribute("customAttribute"));
		assert.false(store.hasAttribute("unknownAttribute"));
	});

	it("#setAttribute - should set attribute", ({ store }) => {
		store.setAttribute("customAttribute", 1);
		assert.equal(store.getAttribute("customAttribute"), 1);
	});

	it("#setAttribute - should throw if attribute is not registered", ({ store }) => {
		assert.throws(() => store.setAttribute("unknownAttribute", 1), 'Attribute "unknownAttribute" is not defined.');
	});

	it("#getAttribute - should throw if attribute is not set", ({ store }) => {
		assert.throws(() => store.getAttribute("customAttribute"), 'Attribute "customAttribute" is not set.');
	});

	it("#getAttribute - should throw if attribute is not registered", ({ store }) => {
		assert.throws(() => store.getAttribute("unknownAttribute"), 'Attribute "unknownAttribute" is not set.');
	});

	it("#commitChanges - should pass", ({ store }) => {
		const unit = {
			getBlock: () => ({
				data: {
					height: 1,
				},
			}),
			round: 1,
		} as Contracts.Processor.ProcessableUnit;
		store.commitChanges(unit);
	});
});

describe<{
	sandbox: Sandbox;
	store: Store;
	storeClone: Store;
	attributeRepository: AttributeRepository;
	logger: any;
	cryptoConfiguration: any;
	eventDispatcher: any;
	walletRepository: any;
}>("store - Clone", ({ it, beforeEach, assert }) => {
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

		context.walletRepository = {
			commitChanges: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.State.AttributeRepository).to(AttributeRepository).inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.State.WalletRepository.Base.Factory)
			.toConstantValue(() => context.walletRepository);
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

		context.store = context.sandbox.app.resolve(Store).configure();

		context.storeClone = context.sandbox.app.resolve(Store).configure(context.store);
	});

	it("#initialize - should return original height and totalRound, isBootstrap, lastBlock and genesisBlock", ({
		store,
		sandbox,
	}) => {
		const genesisBlock = { block: { data: { height: 0 } } };
		const block = { data: { height: 1 } };

		store.setAttribute("totalRound", 2);
		store.setBootstrap(false);
		store.setGenesisCommit(genesisBlock as any);
		store.setLastBlock(block as any);

		const storeClone = sandbox.app.resolve(Store).configure(store);

		assert.equal(storeClone.getTotalRound(), 2);
		assert.equal(storeClone.getLastHeight(), 1);
		assert.false(storeClone.isBootstrap());
	});

	it("#walletRepository - should return walletRepository", ({ store, walletRepository }) => {
		assert.equal(store.walletRepository, walletRepository);
	});

	it("#setBootstrap - should be set only on clone", ({ store, storeClone }) => {
		assert.true(store.isBootstrap());
		assert.true(storeClone.isBootstrap());

		storeClone.setBootstrap(false);

		assert.true(store.isBootstrap());
		assert.false(storeClone.isBootstrap());
	});

	it("#setGenesisCommit - should be set only on clone", ({ store, storeClone }) => {
		assert.throws(() => store.getGenesisCommit());
		assert.throws(() => storeClone.getGenesisCommit());

		const genesisBlock = { block: { data: { height: 0 } } };
		storeClone.setGenesisCommit(genesisBlock as any);

		assert.throws(() => store.getGenesisCommit());
		assert.equal(storeClone.getGenesisCommit(), genesisBlock);
	});

	it("#setLastBlock - should be set only on clone", ({ store, storeClone }) => {
		assert.throws(() => store.getLastBlock());
		assert.throws(() => storeClone.getLastBlock());

		const block = { data: { height: 1 } };
		storeClone.setLastBlock(block as any);

		assert.throws(() => store.getLastBlock());
		assert.equal(storeClone.getLastBlock(), block);
		assert.equal(store.getLastHeight(), 0);
		assert.equal(storeClone.getLastHeight(), 1);
	});

	it("#setAttribute - should be set only on clone", ({ store, storeClone }) => {
		assert.throws(() => store.getAttribute("customAttribute"));
		assert.throws(() => storeClone.getAttribute("customAttribute"));

		storeClone.setAttribute("customAttribute", 1);

		assert.throws(() => store.getAttribute("customAttribute"));
		assert.equal(storeClone.getAttribute("customAttribute"), 1);
	});

	it("hasAttribute - should be true only on clone", ({ store, storeClone }) => {
		assert.false(store.hasAttribute("customAttribute"));
		assert.false(storeClone.hasAttribute("customAttribute"));

		storeClone.setAttribute("customAttribute", 1);

		assert.false(store.hasAttribute("customAttribute"));
		assert.true(storeClone.hasAttribute("customAttribute"));
	});

	it("#geAttribute - should return if set on original", ({ store, storeClone }) => {
		assert.throws(() => store.getAttribute("customAttribute"));
		assert.throws(() => storeClone.getAttribute("customAttribute"));

		store.setAttribute("customAttribute", 1);

		assert.equal(store.getAttribute("customAttribute"), 1);
		assert.equal(storeClone.getAttribute("customAttribute"), 1);
	});

	it("#geAttribute - should return if set on clone", ({ store, storeClone }) => {
		assert.throws(() => store.getAttribute("customAttribute"));
		assert.throws(() => storeClone.getAttribute("customAttribute"));

		storeClone.setAttribute("customAttribute", 1);

		assert.throws(() => store.getAttribute("customAttribute"));
		assert.equal(storeClone.getAttribute("customAttribute"), 1);
	});

	it("#commitChanges - should copy changes back to original", ({ store, storeClone }) => {
		assert.equal(store.getAttribute("height"), 0);
		assert.equal(store.getAttribute("totalRound"), 0);
		assert.false(store.hasAttribute("customAttribute"));
		assert.true(store.isBootstrap());
		assert.throws(() => store.getGenesisCommit());
		assert.throws(() => store.getLastBlock());

		const genesisBlock = { block: { data: { height: 0 } } };
		const block = { data: { height: 1 } };

		storeClone.setBootstrap(false);
		storeClone.setGenesisCommit(genesisBlock as any);
		storeClone.setLastBlock(block as any);
		storeClone.setAttribute("customAttribute", 1);

		const unit = {
			getBlock: () => block,
			round: 1,
		} as Contracts.Processor.ProcessableUnit;
		storeClone.commitChanges(unit);

		assert.equal(store.getAttribute("height"), 1);
		assert.equal(store.getAttribute("totalRound"), 2);
		assert.equal(store.getAttribute("customAttribute"), 1);
		assert.false(store.isBootstrap());
		assert.equal(store.getGenesisCommit(), genesisBlock);
		assert.equal(store.getLastBlock(), block);
	});
});
