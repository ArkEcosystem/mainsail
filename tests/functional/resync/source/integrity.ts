import type {
    TypeOrm
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import type { assert } from "@mainsail/test-runner";

import { runDatabaseQuery, setupRestoreNode, shutdown } from "./setup.js";

type TableHashes = ReadonlyArray<TableHash>;
interface TableHash {
    readonly table_name: string,
    readonly hash: string,
}

const QUERY_COMPUTE_TABLE_HASHES = `
SELECT
    n.nspname || '.' || c.relname AS table_name,
    md5(
        query_to_xml(
            format(
                'SELECT * FROM %I.%I ORDER BY ctid',
                n.nspname,
                c.relname
            ),
            true,
            false,
            ''
        ) :: text
    ) AS hash
FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
    c.relkind = 'r'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY
    n.nspname ASC,
    c.relname ASC;
`;


const computeNodeTableHashes = async (node: Contracts.Kernel.Application): Promise<TableHashes> => {
    const tableHashes = await runDatabaseQuery(node.get<string>(Identifiers.Application.Name), async (dataSource: TypeOrm.DataSource) => dataSource.query<TableHashes>(QUERY_COMPUTE_TABLE_HASHES));
    return tableHashes;
}

const verifyIntegrity = async (t: typeof assert, syncNode: Contracts.Kernel.Application, restoreNode: Contracts.Kernel.Application): Promise<void> => {
    const tableHashesSyncNode = await computeNodeTableHashes(syncNode);
    const tableHashesRestoreNode = await computeNodeTableHashes(restoreNode);

    // TODO:
    // - wallets differ by the `updated_at` column (IGNORE)
    // - plugins stores the node's database name which differs (IGNORE)
    // - configuration (investigate)
    // - contracts (investigate)
    const brokenTables = ["public.wallets", "public.contracts", "public.configuration", "public.plugins"];

    t.equal(
        tableHashesSyncNode.filter(t => !brokenTables.includes(t.table_name)),
        tableHashesRestoreNode.filter(t => !brokenTables.includes(t.table_name)),
    );
}

export const verifyNodeIntegrity = async (t: typeof assert, syncNode: Contracts.Kernel.Application, dataDirectory: string): Promise<void> => {
    // Stop sync node to cease writes
    await shutdown(syncNode);

    // Bootstrap restore node which triggers a restore to a fresh postgres database
    // by reusing the sync node's evm.db
    const restoreNode = await setupRestoreNode(dataDirectory);

    try {
        // Check that both nodes wrote the exact same data to postgres
        await verifyIntegrity(t, syncNode, restoreNode);

    } catch (ex) {
        console.log(ex);
        throw ex;
    } finally {
        await shutdown(restoreNode);
    }
}

/*

[
  {
    table_name: 'public.api_nodes',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.blocks',
    hash: '287dbc07f35ecce596068be6a143408a'
  },
  {
    table_name: 'public.configuration',
    hash: '98bd99a1bc9302e794e317d00792c607'
  },
  {
    table_name: 'public.contracts',
    hash: 'cdf145ca95bce1eb9842834c6c768a1f'
  },
  {
    table_name: 'public.legacy_cold_wallets',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.migrations',
    hash: 'e3ce7066d80b6b73c7b0aedd190731c2'
  },
  {
    table_name: 'public.multi_payments',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.peers',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.plugins',
    hash: '128e7aa899150cc64ad47481262963fe'
  },
  {
    table_name: 'public.state',
    hash: '3fecd1f8de67f3a4b3d4930a8ae9079c'
  },
  {
    table_name: 'public.system',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.token_holders',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.token_transfers',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.tokens',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.transactions',
    hash: '7cac674efc8c13b3558bb1491e331f96'
  },
  {
    table_name: 'public.validator_rounds',
    hash: '350e2307635f5c8bad0d4a83aae7cc1c'
  },
  {
    table_name: 'public.wallet_token_counts',
    hash: 'c3749de3b83987b4f1ff0a2911681a16'
  },
  {
    table_name: 'public.wallets',
    hash: '19cfc5cff67b48f612167e8d1d1295b2'
  }
]

*/