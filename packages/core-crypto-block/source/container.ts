import { Crypto } from "@arkecosystem/core-contracts";

export const INTERNAL_FACTORY = Symbol.for("Internal<BlockFactory>");

export type InternalFactory = (data: {
	data: Crypto.IBlockData;
	transactions: Crypto.ITransaction[];
	id?: string;
}) => Promise<Crypto.IBlock>;
