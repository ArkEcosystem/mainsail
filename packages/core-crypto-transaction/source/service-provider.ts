import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
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
		this.app.bind(BINDINGS.Transaction.TypeFactory).to(TransactionTypeFactory).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Factory).to(TransactionFactory).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Registry).to(TransactionRegistry).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Signer).to(Signer).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Utils).to(Utils).inSingletonScope();
		this.app.bind(BINDINGS.Transaction.Verifier).to(Verifier).inSingletonScope();
	}
}
