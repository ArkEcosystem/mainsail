import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

@injectable()
export class Worker implements Contracts.Crypto.WorkerScriptHandler {
	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactoryImp!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignatureImp!: Contracts.Crypto.SignatureBls;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {}

	public async consensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureBls>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.SignatureBls[K]>
	): Promise<ReturnType<Contracts.Crypto.SignatureBls[K]>> {
		return this.#callConsensusSignature(method, arguments_);
	}

	public async walletSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureEcdsa>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.SignatureEcdsa[K]>
	): Promise<ReturnType<Contracts.Crypto.SignatureEcdsa[K]>> {
		throw new Error("Method walletSignature not implemented.");
	}

	public async blockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		throw new Error("Method blockFactory not implemented.");
	}

	public async transactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.#call(this.transactionFactoryImp, method, arguments_);
	}

	public async publicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
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

	async #callConsensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureBls>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.SignatureBls[K]>,
	): Promise<ReturnType<Contracts.Crypto.SignatureBls[K]>> {
		return this.#call(this.consensusSignatureImp, method, arguments_);
	}

	async #call<T extends { [K in keyof T]: (...arguments_: any) => any }, K extends Contracts.Kernel.IPC.Requests<T>>(
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
