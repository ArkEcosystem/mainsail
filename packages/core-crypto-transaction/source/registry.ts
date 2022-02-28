import { Container } from "@arkecosystem/core-container";
import { BINDINGS, ITransactionRegistry, IValidator } from "@arkecosystem/core-crypto-contracts";
import { schemas } from "@arkecosystem/core-crypto-validation";
import { Contracts } from "@arkecosystem/core-kernel";

import {
	TransactionAlreadyRegisteredError,
	TransactionKeyAlreadyRegisteredError,
	TransactionVersionAlreadyRegisteredError,
	UnkownTransactionError,
} from "./errors";
import { Transaction } from "./types";
import { signedSchema, strictSchema, TransactionSchema } from "./types/schemas";

export type TransactionConstructor = typeof Transaction;

@Container.injectable()
export class TransactionRegistry implements ITransactionRegistry {
	@Container.inject(BINDINGS.Validator)
	private readonly validator: IValidator;

	@Container.inject(BINDINGS.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	private readonly transactionTypes: Map<
		Contracts.Transactions.InternalTransactionType,
		Map<number, TransactionConstructor>
	> = new Map();

	readonly #transactionSchemas = new Map<string, TransactionSchema>();

	@Container.postConstruct()
	public postConstruct() {
		this.transactionTypeFactory.initialize(this.transactionTypes);
	}

	public registerTransactionType(constructor: TransactionConstructor): void {
		const { typeGroup, type } = constructor;

		if (typeof type === "undefined" || typeof typeGroup === "undefined") {
			throw new TypeError();
		}

		const internalType: Contracts.Transactions.InternalTransactionType =
			Contracts.Transactions.InternalTransactionType.from(type, typeGroup);

		for (const registeredConstructors of this.transactionTypes.values()) {
			if (registeredConstructors.size > 0) {
				const first = [...registeredConstructors.values()][0];
				if (
					first.key === constructor.key &&
					Contracts.Transactions.InternalTransactionType.from(first.type, first.typeGroup) !== internalType
				) {
					throw new TransactionKeyAlreadyRegisteredError(first.key);
				}

				for (const registeredConstructor of registeredConstructors.values()) {
					if (registeredConstructor === constructor) {
						throw new TransactionAlreadyRegisteredError(constructor.name);
					}
				}
			}
		}

		if (!this.transactionTypes.has(internalType)) {
			this.transactionTypes.set(internalType, new Map());
		} else if (this.transactionTypes.get(internalType)?.has(constructor.version)) {
			throw new TransactionVersionAlreadyRegisteredError(constructor.name, constructor.version);
		}

		this.transactionTypes.get(internalType)!.set(constructor.version, constructor);
		this.#updateSchemas(constructor.getSchema());
	}

	public deregisterTransactionType(constructor: TransactionConstructor): void {
		const { typeGroup, type, version } = constructor;

		if (typeof type === "undefined" || typeof typeGroup === "undefined") {
			throw new TypeError();
		}

		const internalType: Contracts.Transactions.InternalTransactionType =
			Contracts.Transactions.InternalTransactionType.from(type, typeGroup);
		if (!this.transactionTypes.has(internalType)) {
			throw new UnkownTransactionError(internalType.toString());
		}

		this.#updateSchemas(constructor.getSchema(), true);

		const constructors = this.transactionTypes.get(internalType)!;
		if (!constructors.has(version)) {
			throw new UnkownTransactionError(internalType.toString());
		}

		constructors.delete(version);

		if (constructors.size === 0) {
			this.transactionTypes.delete(internalType);
		}
	}

	#updateSchemas(schema: TransactionSchema, remove?: boolean): void {
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
			ajv.removeSchema("block");
			ajv.removeSchema("transactions");
			ajv.addSchema({
				$id: "transactions",
				additionalItems: false,
				items: { anyOf: [...this.#transactionSchemas.keys()].map((schema) => ({ $ref: `${schema}Signed` })) },
				type: "array",
			});
			ajv.addSchema(schemas.block);
		});
	}
}

export const transactionRegistry = new TransactionRegistry();
