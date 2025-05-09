import { Container, inject, injectable, tagged } from "inversify";

import { describe } from "../../test-framework/source";
import { anyAncestorOrTargetTagged } from "./selectors";

interface WalletRepository {}

@injectable()
class BlockchainWalletRepository implements WalletRepository {}

@injectable()
class PoolWalletRepository implements WalletRepository {
	@inject("WalletRepository")
	@tagged("state", "blockchain")
	public readonly blockchainWalletRepository!: WalletRepository;
}

@injectable()
class TransactionHandler {
	@inject("WalletRepository")
	public readonly walletRepository!: WalletRepository;
}

@injectable()
class TransactionHandlerUnknownKey {
	@inject("WalletRepository")
	@tagged("undefined", "blockchain")
	public readonly walletRepository!: WalletRepository;
}

@injectable()
class TransactionHandlerUnknownValue {
	@inject("WalletRepository")
	@tagged("state", "undefined")
	public readonly walletRepository!: WalletRepository;
}

@injectable()
class BlockchainState {
	@inject("TransactionHandler")
	@tagged("state", "blockchain")
	public readonly blockchainTransactionHandler!: TransactionHandler;
}

@injectable()
class PoolState {
	@inject("TransactionHandler")
	@tagged("state", "pool")
	public readonly poolTransactionHandler!: TransactionHandler;
}

describe<{
	container: Container;
}>("anyAncestorOrTargetTaggedFirst", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		context.container
			.bind("WalletRepository")
			.to(BlockchainWalletRepository)
			.when(anyAncestorOrTargetTagged("state", "blockchain"));
		context.container
			.bind("WalletRepository")
			.to(PoolWalletRepository)
			.when(anyAncestorOrTargetTagged("state", "pool"));
		context.container.bind("TransactionHandler").to(TransactionHandler);
	});

	it("should match tag on target", (context) => {
		const poolWalletRepository = context.container.get(PoolWalletRepository, { autobind: true });

		assert.instance(poolWalletRepository.blockchainWalletRepository, BlockchainWalletRepository);
	});

	it("should match tag on ancestor", (context) => {
		const blockchainState = context.container.get(BlockchainState, { autobind: true });

		assert.instance(blockchainState.blockchainTransactionHandler.walletRepository, BlockchainWalletRepository);
	});

	it("should match first tag", (context) => {
		const poolState = context.container.get(PoolState, { autobind: true });
		const poolWalletRepository = poolState.poolTransactionHandler.walletRepository as PoolWalletRepository;

		assert.instance(poolWalletRepository, PoolWalletRepository);
		assert.instance(poolWalletRepository.blockchainWalletRepository, BlockchainWalletRepository);
	});

	it("should not match when attempting to load without tag", (context) => {
		assert.rejects(() => context.container.get(TransactionHandler, { autobind: true }));
	});

	it("should not match when attempting to load with unknown key tag", (context) => {
		assert.rejects(() => context.container.get(TransactionHandlerUnknownKey, { autobind: true }));
	});

	it("should not match when attempting to load with unknown value tag", (context) => {
		assert.rejects(() => context.container.get(TransactionHandlerUnknownValue, { autobind: true }));
	});
});
