import { Contracts, Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { AttributeRepository } from "./attributes";
import { Store } from "./store";

describe<{
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
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("height", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("totalRound", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
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

	it("#getLastBlock - should throw if not set", ({ store }) => {
		assert.throws(() => store.getLastBlock());
	});

	it("#setLastBlock - should be ok", ({ store, cryptoConfiguration }) => {
		const block = {
			data: {
				height: 1,
			},
		};
		store.setLastBlock(block as any);
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
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("height", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("totalRound", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("customAttribute", Contracts.State.AttributeType.Number);

		context.attributeRepository = context.sandbox.app.get<AttributeRepository>(
			Identifiers.State.AttributeRepository,
		);

		context.store = context.sandbox.app.resolve(Store).configure();

		context.storeClone = context.sandbox.app.resolve(Store).configure(context.store);
	});

	it("#initialize - should return original height and totalRound, lastBlock and genesisBlock", ({
		store,
		sandbox,
	}) => {
		const genesisBlock = { block: { data: { height: 0 } } };
		const block = { data: { height: 1 } };

		store.setAttribute("totalRound", 2);
		store.setGenesisCommit(genesisBlock as any);
		store.setLastBlock(block as any);

		const storeClone = sandbox.app.resolve(Store).configure(store);

		assert.equal(storeClone.getTotalRound(), 2);
	});

	it("#walletRepository - should return walletRepository", ({ store, walletRepository }) => {
		assert.equal(store.walletRepository, walletRepository);
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
		assert.false(store.hasAttribute("customAttribute"));
		assert.throws(() => store.getGenesisCommit());
		assert.throws(() => store.getLastBlock());

		const genesisBlock = { block: { data: { height: 0 } } };
		const block = { data: { height: 1 } };

		storeClone.setGenesisCommit(genesisBlock as any);
		storeClone.setLastBlock(block as any);
		storeClone.setAttribute("customAttribute", 1);

		storeClone.commitChanges();

		assert.equal(store.getAttribute("customAttribute"), 1);
		assert.equal(store.getGenesisCommit(), genesisBlock);
		assert.equal(store.getLastBlock(), block);
	});
});
