import type {
    TypeOrm
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import type { assert } from "@mainsail/test-runner";

import { runDatabaseQuery, setupLegacyRestoreNode, setupRestoreNode, shutdown } from "./setup.js";

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
    await patchDatabase(syncNode, restoreNode);

    const tableHashesSyncNode = await computeNodeTableHashes(syncNode);
    const tableHashesRestoreNode = await computeNodeTableHashes(restoreNode);

    const result = compareTableHashes(
        tableHashesSyncNode,
        tableHashesRestoreNode,
        ["public.validator_rounds"]
    );

    if (!result.equal) {
        console.error("Mismatching tables:");
        for (const difference of result.differences) {
            console.error(difference);
        };

        process.exit(1);
    }

    if (result.differencesIgnored.length > 0) {
        console.error("[IGNORED] Mismatching tables:");
        for (const difference of result.differencesIgnored) {
            console.error(difference);
        };
    }

    t.true(result.equal);
}

const compareTableHashes = (
    a: TableHashes,
    b: TableHashes,
    exceptions: string[] = [],
): { equal: boolean; differences: string[], differencesIgnored: string[] } => {
    const mapA = new Map(a.map(t => [t.table_name, t.hash]));
    const mapB = new Map(b.map(t => [t.table_name, t.hash]));

    const allTables = new Set([
        ...mapA.keys(),
        ...mapB.keys(),
    ]);

    const differences: string[] = [];
    const differencesIgnored: string[] = [];

    for (const table of allTables) {
        const hashA = mapA.get(table);
        const hashB = mapB.get(table);

        if (hashA !== hashB) {
            const difference = `${table} => A: ${hashA ?? "missing"} | B: ${hashB ?? "missing"}`;

            if (exceptions.includes(table)) {
                differencesIgnored.push(difference);
            } else {
                differences.push(difference);
            }

        }
    }

    return {
        differences,
        differencesIgnored,
        equal: differences.length === 0,
    };
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

const verifySyncAndRestoreNodeIntegrity = async (t: typeof assert, syncNode: Contracts.Kernel.Application, restoreNode: Contracts.Kernel.Application): Promise<void> => {
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

export const verifyNodeIntegrity = async (t: typeof assert, syncNode: Contracts.Kernel.Application, dataDirectory: string): Promise<void> => {
    // Stop sync node to cease writes
    await shutdown(syncNode);

    // Bootstrap restore node which triggers a restore to a fresh postgres database
    // by reusing the sync node's evm.db
    const restoreNode = await setupRestoreNode(dataDirectory);

    await verifySyncAndRestoreNodeIntegrity(t, syncNode, restoreNode);
}

export const verifyLegacyNodeIntegrity = async (t: typeof assert, syncNode: Contracts.Kernel.Application, dataDirectory: string): Promise<void> => {
    // Stop sync node to cease writes
    await shutdown(syncNode);

    // Bootstrap restore node which triggers a restore to a fresh postgres database
    // by reusing the sync node's evm.db
    const restoreNode = await setupLegacyRestoreNode(dataDirectory);

    await verifySyncAndRestoreNodeIntegrity(t, syncNode, restoreNode);
}

