import { Contracts as ApiDatabaseContracts, Models } from "@mainsail/api-database";

export type IBlockRepository = ApiDatabaseContracts.IBlockRepository & {
    getLatest(): Promise<Models.Block | null>;
}
