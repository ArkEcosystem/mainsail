import type { Contracts as ApiDatabaseContracts, Models, TypeOrm } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

export interface EventListener extends Contracts.Kernel.EventListener {
	register(): Promise<void>;
	boot(): Promise<void>;
	dispose(): Promise<void>;
	flush(entityManager: TypeOrm.EntityManager): Promise<void>;
}

export interface Listeners {
	register(): Promise<void>;
	bootstrap(): Promise<void>;
	dispose(): Promise<void>;
	flush(entityManager: TypeOrm.EntityManager): Promise<void>;
}

export type TokenParserResult = {
	tokens: Models.Token[];
	tokenHolders: Models.TokenHolder[];
	tokenActions: Models.TokenAction[];
};
export interface TokenParser {
	parseReceipt(
		header: Contracts.Crypto.BlockHeader,
		transaction: Contracts.Crypto.Transaction,
		receipt: Contracts.Evm.TransactionReceipt,
		tokenRepository?: ApiDatabaseContracts.TokenRepository,
	): Promise<TokenParserResult>;
}
