import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { InternalTransactionType } from "./internal-transaction-type";
import { Transaction } from "./types";
import { signedSchema, strictSchema } from "./validation/utils";

export type TransactionConstructor = typeof Transaction;

@injectable()
export class TransactionRegistry implements Contracts.Crypto.ITransactionRegistry {
	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.IValidator;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.ITransactionTypeFactory;

	readonly #transactionTypes: Map<
		Contracts.Transactions.IInternalTransactionType,
		Map<number, TransactionConstructor>
	> = new Map();

	readonly #transactionSchemas = new Map<string, Contracts.Crypto.ITransactionSchema>();

	@postConstruct()
	public postConstruct() {
		this.transactionTypeFactory.initialize(this.#transactionTypes);
	}

	public registerTransactionType(constructor: Contracts.Crypto.TransactionConstructor): void {
		const { typeGroup, type } = constructor;

		if (typeof type === "undefined" || typeof typeGroup === "undefined") {
			throw new TypeError();
		}

		const internalType: Contracts.Transactions.IInternalTransactionType = InternalTransactionType.from(
			type,
			typeGroup,
		);

		for (const registeredConstructors of this.#transactionTypes.values()) {
			if (registeredConstructors.size > 0) {
				const first = [...registeredConstructors.values()][0];
				if (
					first.key === constructor.key &&
					// TODO: Check type
					// @ts-ignore
					InternalTransactionType.from(first.type, first.typeGroup) !== internalType
				) {
					// TODO: Check type
					// @ts-ignore
					throw new Exceptions.TransactionKeyAlreadyRegisteredError(first.key);
				}

				for (const registeredConstructor of registeredConstructors.values()) {
					if (registeredConstructor === constructor) {
						throw new Exceptions.TransactionAlreadyRegisteredError(constructor.name);
					}
				}
			}
		}

		if (!this.#transactionTypes.has(internalType)) {
			this.#transactionTypes.set(internalType, new Map());
		} else if (this.#transactionTypes.get(internalType)?.has(constructor.version)) {
			throw new Exceptions.TransactionVersionAlreadyRegisteredError(constructor.name, constructor.version);
		}

		this.#transactionTypes.get(internalType)!.set(constructor.version, constructor);
		this.#updateSchemas(constructor.getSchema());
	}

	public deregisterTransactionType(constructor: Contracts.Crypto.TransactionConstructor): void {
		const { typeGroup, type, version } = constructor;

		if (typeof type === "undefined" || typeof typeGroup === "undefined") {
			throw new TypeError();
		}

		const internalType: Contracts.Transactions.IInternalTransactionType = InternalTransactionType.from(
			type,
			typeGroup,
		);
		if (!this.#transactionTypes.has(internalType)) {
			throw new Exceptions.UnkownTransactionError(internalType.toString());
		}

		this.#updateSchemas(constructor.getSchema(), true);

		const constructors = this.#transactionTypes.get(internalType)!;
		if (!constructors.has(version)) {
			throw new Exceptions.UnkownTransactionError(internalType.toString());
		}

		constructors.delete(version);

		if (constructors.size === 0) {
			this.#transactionTypes.delete(internalType);
		}
	}

	#updateSchemas(schema: Contracts.Crypto.ITransactionSchema, remove?: boolean): void {
		this.validator.extend((ajv) => {
			if (ajv.getSchema(schema.$id)) {
				remove = true;
			}

			if (remove) {
				this.#transactionSchemas.delete(schema.$id);

				ajv.removeSchema(schema.$id);
				ajv.removeSchema(`${schema.$id}Signed`);
				ajv.removeSchema(`${schema.$id}Strict`);
			}

			this.#transactionSchemas.set(schema.$id, schema);

			ajv.addSchema(schema);
			ajv.addSchema(signedSchema(schema));
			ajv.addSchema(strictSchema(schema));

			// Update schemas
			ajv.removeSchema("transactions");
			ajv.addSchema({
				$id: "transactions",
				items: { anyOf: [...this.#transactionSchemas.keys()].map((schema) => ({ $ref: `${schema}Signed` })) },
				type: "array",
			});
		});
	}
}

export const transactionRegistry = new TransactionRegistry();
