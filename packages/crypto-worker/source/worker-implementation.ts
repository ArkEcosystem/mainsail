import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

type BufferJson = {
	type: "Buffer";
	data: Uint8Array | number[];
};

function isBufferJson(value: unknown): value is BufferJson {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const v = value as { type?: unknown; data?: unknown };
	if (v.type !== "Buffer") {
		return false;
	}

	return Array.isArray(v.data) || v.data instanceof Uint8Array;
}


@injectable()
export class WorkerImplementation {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.SignatureBls;

	@inject(Identifiers.Cryptography.Identity.PublicKey.Factory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.PublicKeyFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly walletSignature!: Contracts.Crypto.SignatureEcdsa;

	public async callConsensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureBls>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.SignatureBls, K>,
	): Promise<ReturnType<Contracts.Crypto.SignatureBls[K]>> {
		return this.#call(this.consensusSignature, method, arguments_);
	}

	public async callWalletSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureEcdsa>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.SignatureEcdsa, K>,
	): Promise<ReturnType<Contracts.Crypto.SignatureEcdsa[K]>> {
		return this.#call(this.walletSignature, method, arguments_);
	}

	public async callTransactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.TransactionFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.#call(this.transactionFactory, method, arguments_);
	}

	public async callBlockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.BlockFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.#call(this.blockFactory, method, arguments_);
	}

	public async callPublicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.PublicKeyFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.#call(this.publicKeyFactory, method, arguments_);
	}

	async #call<T, K extends Contracts.Kernel.IPC.Requests<T> & keyof T>(
		object: T,
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<T, K>,
	): Promise<Contracts.Kernel.IPC.MethodReturn<T, K>> {
		const normalizedArguments = (arguments_ as unknown[]).map((argument) => {
			if (isBufferJson(argument)) {
				return Buffer.from(argument.data);
			}

			if (Array.isArray(argument) && argument.length > 0 && isBufferJson(argument[0])) {
				return argument.map((item) => Buffer.from(item.data));
			}

			return argument;
		}) as Contracts.Kernel.IPC.MethodArguments<T, K>;

		if (typeof object[method] !== "function") {
			throw new TypeError(`property "${method}" is not a function`);
		}

		return (
			object[method] as (
				...arguments__: Contracts.Kernel.IPC.MethodArguments<T, K>
			) => Contracts.Kernel.IPC.MethodReturn<T, K>
		)(...normalizedArguments);
	}
}
