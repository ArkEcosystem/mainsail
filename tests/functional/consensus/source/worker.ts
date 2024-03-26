import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Ipc, IpcWorker } from "@mainsail/kernel";

@injectable()
export class Worker implements IpcWorker.WorkerScriptHandler {
	// @inject(Identifiers.Cryptography.Block.Factory)
	// private readonly blockFactoryImp!: Contracts.Crypto.BlockFactory;

	// @inject(Identifiers.Cryptography.Transaction.Factory)
	// private readonly transactionFactoryImp!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignatureImp!: Contracts.Crypto.Signature;

	// @inject(Identifiers.Cryptography.Identity.PublicKey.Factory)
	// @tagged("type", "consensus")
	// private readonly publicKeyFactoryImp!: Contracts.Crypto.PublicKeyFactory;

	// @inject(Identifiers.Cryptography.Signature.Instance)
	// @tagged("type", "wallet")
	// private readonly walletSignatureImp!: Contracts.Crypto.Signature;

	public async boot(flags: IpcWorker.WorkerFlags): Promise<void> {
		//
	}

	public async consensusSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.#callConsensusSignature(method, arguments_);
	}

	public async walletSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		throw new Error("Method walletSignature not implemented.");
	}

	public async blockFactory<K extends Ipc.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		throw new Error("Method blockFactory not implemented.");
	}

	public async transactionFactory<K extends Ipc.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		throw new Error("Method transactionFactory not implemented.");
	}

	public async publicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		throw new Error("Method publicKeyFactory not implemented.");
	}

	public async getQueueSize(): Promise<number> {
		return 0;
	}

	public async kill(signal?: number | NodeJS.Signals): Promise<boolean> {
		return true;
	}

	async #callConsensusSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.Signature[K]>,
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.#call(this.consensusSignatureImp, method, arguments_);
	}

	// async #callWalletSignawture<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
	// 	method: K,
	// 	arguments_: Parameters<Contracts.Crypto.Signature[K]>,
	// ): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
	// 	return this.#call(this.walletSignatureImp, method, arguments_);
	// }

	// async #callTransactionFactory<K extends Ipc.Requests<Contracts.Crypto.TransactionFactory>>(
	// 	method: K,
	// 	arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>,
	// ): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
	// 	return this.#call(this.transactionFactoryImp, method, arguments_);
	// }

	// async #callBlockFactory<K extends Ipc.Requests<Contracts.Crypto.BlockFactory>>(
	// 	method: K,
	// 	arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>,
	// ): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
	// 	return this.#call(this.blockFactoryImp, method, arguments_);
	// }

	// async #callPublicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.PublicKeyFactory>>(
	// 	method: K,
	// 	arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>,
	// ): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
	// 	return this.#call(this.publicKeyFactoryImp, method, arguments_);
	// }

	async #call<T extends { [K in keyof T]: (...arguments_: any) => any }, K extends Ipc.Requests<T>>(
		object: T,
		method: K,
		arguments_: Parameters<T[K]>,
	): Promise<ReturnType<T[K]>> {
		arguments_ = arguments_.map((argument) => {
			if (argument?.type === "Buffer") {
				return Buffer.from(argument.data);
			}

			if (Array.isArray(argument) && argument.length > 0 && argument[0]?.type === "Buffer") {
				return argument.map((item) => Buffer.from(item.data));
			}

			return argument;
		}) as Parameters<T[K]>;

		// @ts-ignore
		return object[method](...arguments_);
	}
}
