import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { Transaction } from "./types/index.js";
import { signedSchema, strictSchema } from "./validation/utils.js";

export type TransactionConstructor = typeof Transaction;

@injectable()
export class TransactionRegistry implements Contracts.Crypto.TransactionRegistry {
	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	readonly #transactionTypes: Map<number, TransactionConstructor> = new Map();

	readonly #transactionSchemas = new Map<string, Contracts.Crypto.TransactionSchema>();

	@postConstruct()
	public postConstruct() {
		this.transactionTypeFactory.initialize(this.#transactionTypes);
	}

	public registerTransactionType(constructor: Contracts.Crypto.TransactionConstructor): void {
		const { type } = constructor;

		if (type === undefined) {
			throw new TypeError();
		}

		for (const registeredConstructor of this.#transactionTypes.values()) {
			if (registeredConstructor === constructor) {
				throw new Exceptions.TransactionAlreadyRegisteredError(constructor.name);
			}
		}

		this.#transactionTypes.set(type, constructor);
		this.#updateSchemas(constructor.getSchema());
	}

	public deregisterTransactionType(constructor: Contracts.Crypto.TransactionConstructor): void {
		const { type } = constructor;

		if (type === undefined) {
			throw new TypeError();
		}

		if (!this.#transactionTypes.has(type)) {
			throw new Exceptions.UnkownTransactionError(type.toString());
		}

		this.#updateSchemas(constructor.getSchema(), true);
		this.#transactionTypes.delete(type);
	}

	#updateSchemas(schema: Contracts.Crypto.TransactionSchema, remove?: boolean): void {
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
