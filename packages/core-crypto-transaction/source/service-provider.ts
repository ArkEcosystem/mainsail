import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Deserializer } from "./deserializer";
import { TransactionFactory } from "./factory";
import { TransactionRegistry } from "./registry";
import { Serializer } from "./serializer";
import { Signer } from "./signer";
import { TransactionTypeFactory } from "./types";
import { Utils } from "./utils";
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
	}
}
