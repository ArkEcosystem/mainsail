import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer";
import { TransactionFactory } from "./factory";
import { TransactionRegistry } from "./registry";
import { Serializer } from "./serializer";
import { Signer } from "./signer";
import { TransactionTypeFactory } from "./types";
import { Utils } from "./utils";
import { makeFormats, makeKeywords, schemas } from "./validation";
import { Verifier } from "./verifier";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Transaction.TypeFactory).to(TransactionTypeFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Factory).to(TransactionFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Registry).to(TransactionRegistry).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Signer).to(Signer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Utils).to(Utils).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier).inSingletonScope();

		this.#registerValidation();
	}

	#registerValidation(): void {
		for (const [name, format] of Object.entries(
			makeFormats(this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)),
		)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addFormat(name, format);
		}

		for (const keyword of Object.values(
			makeKeywords(this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)),
		)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
