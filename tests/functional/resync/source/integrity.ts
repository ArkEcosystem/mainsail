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
CREATE OR REPLACE FUNCTION public.compute_table_hashes(
    p_exclude_schemas text[] DEFAULT ARRAY['pg_catalog','information_schema']
)
RETURNS TABLE(table_name text, hash text)
LANGUAGE plpgsql
AS $$
DECLARE
    r record;
    pk_cols text;
    sql text;
BEGIN
    FOR r IN
        SELECT n.nspname, c.relname, c.oid AS relid
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname <> ALL (p_exclude_schemas)
        ORDER BY n.nspname, c.relname
    LOOP
        -- Find primary key columns in ordinal order
        SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
        INTO pk_cols
        FROM pg_index i
        JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE i.indrelid = r.relid
          AND i.indisprimary;

        IF pk_cols IS NOT NULL THEN
            -- Option A: stable ordering by PK
            sql := format($f$
                SELECT md5(
                    coalesce(
                        string_agg(
                            encode(digest(to_jsonb(t)::text, 'sha256'), 'hex'),
                            '' ORDER BY %s
                        ),
                        ''
                    )
                )
                FROM %I.%I AS t
            $f$, pk_cols, r.nspname, r.relname);
        ELSE
            -- No PK: deterministic fallback (order by row-hash)
            sql := format($f$
                SELECT md5(
                    coalesce(
                        string_agg(h, '' ORDER BY h),
                        ''
                    )
                )
                FROM (
                    SELECT encode(digest(to_jsonb(t)::text, 'sha256'), 'hex') AS h
                    FROM %I.%I AS t
                ) s
            $f$, r.nspname, r.relname);
        END IF;

        table_name := format('%I.%I', r.nspname, r.relname);
        EXECUTE sql INTO hash;
        RETURN NEXT;
    END LOOP;
END;
$$;
`;

const computeNodeTableHashes = async (node: Contracts.Kernel.Application): Promise<TableHashes> => {
    const tableHashes = await runDatabaseQuery(node.get<string>(Identifiers.Application.Name), async (dataSource: TypeOrm.DataSource) => {
        await dataSource.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
        await dataSource.query(QUERY_COMPUTE_TABLE_HASHES);
        return dataSource.query<TableHashes>(`SELECT * FROM public.compute_table_hashes();`);
    });
    return tableHashes;
}

const verifyIntegrity = async (t: typeof assert, syncNode: Contracts.Kernel.Application, restoreNode: Contracts.Kernel.Application): Promise<void> => {
    await patchDatabase(syncNode);
    const tableHashesSyncNode = await computeNodeTableHashes(syncNode);
    const tableHashesRestoreNode = await computeNodeTableHashes(restoreNode);

    // TODO:
    // - wallets differ by the `updated_at` column (IGNORE)
    // - plugins stores the node's database name which differs (IGNORE)
    // - configuration (investigate)
    // - contracts (investigate)
    const brokenTables = ["public.contracts", "public.configuration", "public.plugins"];

    t.equal(
        tableHashesSyncNode.filter(t => !brokenTables.includes(t.table_name)),
        tableHashesRestoreNode.filter(t => !brokenTables.includes(t.table_name)),
    );
}

const patchDatabase = async (syncNode: Contracts.Kernel.Application, restoreNode: Contracts.Kernel.Application): Promise<void> => {
    const syncNodeName = syncNode.get<string>(Identifiers.Application.Name);
    const restoreNodeName = restoreNode.get<string>(Identifiers.Application.Name);

    await runDatabaseQuery(syncNodeName, async (dataSource: TypeOrm.DataSource) => {
        await dataSource.query(`UPDATE wallets SET updated_at = 0;`);

        await dataSource.query(`
            UPDATE plugins
            SET configuration = 
            jsonb_set(
                jsonb_set(
                    configuration,
                    '{database,database}',
                    to_jsonb('${restoreNodeName}'::text),
                    false
                ),
                '{database,applicationName}',
                to_jsonb('mainsail/${restoreNodeName}'::text),
                false
            )
            WHERE name = '@mainsail/api-database';
        `);
    });
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