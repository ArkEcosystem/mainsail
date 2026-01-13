import type { Contracts as ApiDatabaseContracts, Models } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

export interface EventListener extends Contracts.Kernel.EventListener {
	register(): Promise<void>;
	boot(): Promise<void>;
	dispose(): Promise<void>;
}

export interface Listeners {
	register(): Promise<void>;
	bootstrap(): Promise<void>;
	dispose(): Promise<void>;
}

export type TokenParserResult = {
	tokens: Models.Token[];
	tokenHolders: Models.TokenHolder[];
	tokenTransfers: Models.TokenTransfer[];
};
export interface TokenParser {
	parseReceipt(
		header: Contracts.Crypto.BlockHeader,
		transaction: Contracts.Crypto.Transaction,
		receipt: Contracts.Evm.TransactionReceipt,
		tokenRepository?: ApiDatabaseContracts.TokenRepository,
	): Promise<TokenParserResult>;
}
