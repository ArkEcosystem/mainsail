import { Enums, Identifiers } from "@mainsail/constants";
import { DoubleSignError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { DoubleSignGuard } from "./double-sign-guard";

const { Propose, Prevote, Precommit } = Enums.Consensus.Step;

const KEY = "97a8...bls";
const OTHER_KEY = "b12c...bls";
const A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const at = (blockNumber: number, round: number, step: Enums.Consensus.Step, value = A) => ({
	blockNumber,
	round,
	step,
	value,
});

describe<{
	dataDirectory: string;
	stateFile: string;
	guard: DoubleSignGuard;
	// Resolves a fresh guard over the same data directory, as the service provider would after a restart.
	resolveGuard: () => DoubleSignGuard;
}>("DoubleSignGuard", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach((context) => {
		context.dataDirectory = mkdtempSync(join(tmpdir(), "double-sign-guard-"));
		context.stateFile = join(context.dataDirectory, "validator-state.json");

		context.resolveGuard = () => {
			const app = new Application();
			app.bind("path.data").toConstantValue(context.dataDirectory);
			app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });
			return app.resolve(DoubleSignGuard);
		};

		context.guard = context.resolveGuard();
	});

	afterEach(({ dataDirectory }) => {
		rmSync(dataDirectory, { force: true, recursive: true });
	});

	it("should allow a strictly increasing sequence of positions", async ({ guard }) => {
		await guard.guard(KEY, at(1, 0, Propose));
		await guard.guard(KEY, at(1, 0, Prevote));
		await guard.guard(KEY, at(1, 0, Precommit));
		await guard.guard(KEY, at(1, 1, Prevote)); // next round
		await guard.guard(KEY, at(2, 0, Prevote)); // next block number
	});

	it("should reject a conflicting vote at the same block number, round and step", async ({ guard }) => {
		await guard.guard(KEY, at(5, 2, Prevote, A));

		await assert.rejects(() => guard.guard(KEY, at(5, 2, Prevote, B)), DoubleSignError);
	});

	it("should reject a nil vote conflicting with a prior value vote at the same position", async ({ guard }) => {
		await guard.guard(KEY, at(5, 2, Precommit, A));

		await assert.rejects(() => guard.guard(KEY, { blockNumber: 5, round: 2, step: Precommit }), DoubleSignError);
	});

	it("should reject a position that goes backwards", async ({ guard }) => {
		await guard.guard(KEY, at(5, 2, Precommit));

		await assert.rejects(() => guard.guard(KEY, at(5, 2, Prevote)), DoubleSignError); // earlier step
		await assert.rejects(() => guard.guard(KEY, at(5, 1, Precommit)), DoubleSignError); // earlier round
		await assert.rejects(() => guard.guard(KEY, at(4, 9, Precommit)), DoubleSignError); // earlier block number
	});

	it("should allow an idempotent re-sign of the identical position and value", async ({ guard }) => {
		await guard.guard(KEY, at(5, 2, Prevote, A));

		await guard.guard(KEY, at(5, 2, Prevote, A)); // resolves; a second identical sign is allowed
	});

	it("should track keys independently", async ({ guard }) => {
		await guard.guard(KEY, at(5, 2, Precommit));

		// A different key at an "earlier" position is unaffected by KEY's watermark.
		await guard.guard(OTHER_KEY, at(1, 0, Propose));
	});

	it("should persist the watermark to the state file before resolving", async ({ guard, stateFile }) => {
		await guard.guard(KEY, at(7, 3, Precommit, A));

		assert.equal(JSON.parse(readFileSync(stateFile, "utf8")), {
			[KEY]: { blockNumber: 7, round: 3, step: Precommit, value: A },
		});
	});

	it("should enforce the watermark across a restart", async ({ guard, resolveGuard }) => {
		// Pre-crash: the node prevotes block A at (9, 0) and the record is written to the state file.
		await guard.guard(KEY, at(9, 0, Prevote, A));

		// After a restart a fresh guard reads the state file from disk and still refuses to prevote
		// a different block at the same (blockNumber, round).
		const afterRestart = resolveGuard();
		await assert.rejects(() => afterRestart.guard(KEY, at(9, 0, Prevote, B)), DoubleSignError);

		// It may still move forward to a later round.
		await afterRestart.guard(KEY, at(9, 1, Prevote, B));
	});

	it("should enforce a persisted nil vote across a restart", async ({ guard, resolveGuard }) => {
		const nil = { blockNumber: 9, round: 0, step: Prevote };
		await guard.guard(KEY, nil);

		// A nil vote is stored without a value key, and must read back as the same nil vote.
		const afterRestart = resolveGuard();
		await afterRestart.guard(KEY, nil); // idempotent nil re-sign is allowed
		await assert.rejects(() => afterRestart.guard(KEY, at(9, 0, Prevote, B)), DoubleSignError);
	});

	it("should not be affected by a temporary file left behind by an interrupted write", async ({
		guard,
		resolveGuard,
		stateFile,
	}) => {
		await guard.guard(KEY, at(3, 0, Prevote, A));
		writeFileSync(`${stateFile}.tmp`, "garbage from a write that never completed");

		// The state file is only ever replaced atomically, so the leftover temporary is ignored.
		const afterRestart = resolveGuard();
		await assert.rejects(() => afterRestart.guard(KEY, at(3, 0, Prevote, B)), DoubleSignError);
		await afterRestart.guard(KEY, at(3, 1, Prevote, B));
	});

	it("should refuse to start on a corrupt state file instead of discarding it", ({ resolveGuard, stateFile }) => {
		writeFileSync(stateFile, "{ not json");

		assert.throws(() => resolveGuard());
	});
});
