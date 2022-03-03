import { Contracts } from "@arkecosystem/core-contracts";

export const INTERNAL_FACTORY = Symbol.for("Internal<BlockFactory>");

export type InternalFactory = (data: {
	data: Contracts.Crypto.IBlockData;
	transactions: Contracts.Crypto.ITransaction[];
	id?: string;
}) => Promise<Contracts.Crypto.IBlock>;
