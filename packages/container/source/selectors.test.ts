import { Container, inject, injectable, tagged } from "inversify";

import { describe } from "../../../core-test-framework";
import { anyAncestorOrTargetTaggedFirst } from "./selectors";

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
			.when(anyAncestorOrTargetTaggedFirst("state", "blockchain"));
		context.container
			.bind("WalletRepository")
			.to(PoolWalletRepository)
			.when(anyAncestorOrTargetTaggedFirst("state", "pool"));
		context.container.bind("TransactionHandler").to(TransactionHandler);
	});

	it("should match tag on target", (context) => {
		const poolWalletRepository = context.container.resolve(PoolWalletRepository);

		assert.instance(poolWalletRepository.blockchainWalletRepository, BlockchainWalletRepository);
	});

	it("should match tag on ancestor", (context) => {
		const blockchainState = context.container.resolve(BlockchainState);

		assert.instance(blockchainState.blockchainTransactionHandler.walletRepository, BlockchainWalletRepository);
	});

	it("should match first tag", (context) => {
		const poolState = context.container.resolve(PoolState);
		const poolWalletRepository = poolState.poolTransactionHandler.walletRepository as PoolWalletRepository;

		assert.instance(poolWalletRepository, PoolWalletRepository);
		assert.instance(poolWalletRepository.blockchainWalletRepository, BlockchainWalletRepository);
	});

	it("should not match when attempting to load without tag", (context) => {
		assert.rejects(() => context.container.resolve(TransactionHandler));
	});

	it("should not match when attempting to load with unknown key tag", (context) => {
		assert.rejects(() => context.container.resolve(TransactionHandlerUnknownKey));
	});

	it("should not match when attempting to load with unknown value tag", (context) => {
		assert.rejects(() => context.container.resolve(TransactionHandlerUnknownValue));
	});
});
