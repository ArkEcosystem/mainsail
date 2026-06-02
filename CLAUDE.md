# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Mainsail is a TypeScript-based Layer 1 blockchain protocol — the next evolution of ARK Core — featuring a new BFT consensus engine. It is a pnpm + Nx + Lerna monorepo with 64 packages under `packages/`.

## Commands

### Build

```bash
pnpm run build            # Build everything (Rust EVM addon + TypeScript)
pnpm run build:ts         # Build TypeScript only (via lerna + tsc project references)
pnpm run build:rs         # Build Rust EVM native addon only (packages/evm)
pnpm run clean:packages   # Remove all distribution/ and tsbuildinfo artifacts
```

Single package build:

```bash
cd packages/<name> && pnpm run build
# or from root:
pnpm --filter @mainsail/<name> run build
```

### Test

Tests use [uvu](https://github.com/lukeed/uvu) wrapped by `@mainsail/test-runner`.

```bash
pnpm run test:unit             # Run all unit tests in parallel
pnpm run test:integration      # Run all integration tests in parallel

# Within a package directory:
pnpm test                      # Run all .test.ts files in source/
pnpm run test:file <pattern>   # Run tests matching a glob pattern, e.g. pnpm run test:file consensus
```

Integration tests require PostgreSQL (see Database section).

### Lint & Format

```bash
pnpm run lint          # ESLint with auto-fix (source files only, not tests)
pnpm run lint:dry      # ESLint without fixing
pnpm run prettier      # Prettier with auto-fix
pnpm run format        # lint + prettier
```

### Database (PostgreSQL)

```bash
pnpm run pg:up     # Start PostgreSQL via Docker (port 5432, user/db: test_db, password: password)
pnpm run pg:down   # Stop PostgreSQL
pnpm run pg:reset  # Destroy and recreate
```

### Other

```bash
pnpm run madge:circular   # Detect circular dependencies
pnpm run references       # Update TypeScript project references in tsconfig.json
pnpm run deps             # Update dependencies across packages
```

## Architecture

### IoC Container & Service Providers

The application is built around **InversifyJS** (`@mainsail/container`). Every service is registered and resolved through the container.

- **`packages/container`** — re-exports InversifyJS (`inject`, `injectable`, `Container`, etc.)
- **`packages/constants/source/identifiers.ts`** — canonical Symbol-based identifiers for all IoC bindings (e.g., `Identifiers.Consensus.Service`, `Identifiers.P2P.Service`)
- **`packages/kernel`** — base `Application` class (extends container), `ServiceProvider` base class, and built-in kernel services (events, log, config, cache, queue, pipeline, schedule, triggers)

Every package exposes a `ServiceProvider` (extends `Providers.ServiceProvider`) with `register()`, `boot()`, and `dispose()` lifecycle methods. Registration in `register()` binds concrete classes to their identifiers; `boot()` starts any async work.

### Contracts (Interface Layer)

**`packages/contracts/source/contracts/`** is the single source of truth for all TypeScript interfaces. No package imports concrete implementations from another package — they depend only on `@mainsail/contracts` and use the IoC container to resolve them. This is the first place to look when understanding what a service does.

### Startup Flow (`packages/bootstrap`)

When `core:run` is invoked, `Application.bootstrap()` registers service providers, then `Bootstrapper.bootstrap()` orchestrates startup in order: set genesis commit → check stored genesis matches → import legacy snapshot (if any) → warm up database → boot EVM and tx-pool workers → start P2P server → start consensus. Read [packages/bootstrap/source/bootstrapper.ts](packages/bootstrap/source/bootstrapper.ts) when debugging "why doesn't the node start" or startup ordering issues.

### Milestone / Crypto-Config System (`packages/crypto-config`)

`Configuration` tracks the active milestone — a merged snapshot of all protocol parameters up to the current block height (validator count, block reward, gas limits, timeouts, etc.). Milestones are deep-merged so each inherits all previous values. `setHeight(n)` updates the active milestone via binary search. `isNewMilestone(height)` checks if a height starts a new milestone. Milestone changes to `roundValidators` are enforced to land only on round boundaries: `(height − prevMilestoneHeight) % prevValidators === 0`. Call `getMilestoneDiff()` to find what changed between the current and previous milestone.

### Consensus Engine (`packages/consensus`)

Implements a Tendermint-like BFT consensus with three phases per round: **Propose → Prevote → Precommit**. Key files:

- `consensus.ts` — main state machine tracking `blockNumber`, `round`, `step`, locked/valid values
- `scheduler.ts` — timeout scheduling for each phase
- `round-state.ts` / `round-state-repository.ts` — per-round state aggregation
- `processors/` — proposal and message processors

**Consensus Storage (`packages/consensus-storage`)** persists in-flight round data to **LMDB** (embedded key-value store) so nodes survive restarts mid-round. Three stores: proposal (`round-validatorIndex` → hex buffer), messages (`round-validatorIndex-type` → hex buffer), and a single JSON `consensus-state` key (`blockNumber`, `round`, `step`, `lockedRound`, `validRound`). `persist()` clears stale data then writes all current-round state atomically.

### Blockchain Utilities (`packages/blockchain-utils`)

Four stateless calculators injected wherever needed:

- **`RoundCalculator`** — derives round number, height, and `maxValidators` by iterating milestones. `isNewRound(height)` checks `(height − milestoneHeight) % roundValidators === 0`. Handles milestone transitions that change validator counts mid-chain.
- **`ProposerCalculator`** — selects the proposer index for a round: `(totalRound + round) % roundValidators`. Fully deterministic without per-round state.
- **`TimestampCalculator`** — computes the minimum valid block timestamp using block time + round timeouts with arithmetic progression (each extra round increases the timeout), preventing timestamp manipulation.
- **`FeeCalculator`** — `gasPrice × gasLimit` for transaction cost; `gasPrice × gasUsed` for consumed fee.

### Block Processing Pipeline (`packages/processor`)

`BlockProcessor` orchestrates: verify block → execute transactions via EVM → update state → persist to database. Block verification uses a chain of verifiers in `verifiers/` (timestamp, gas limit, generator, reward, size, transaction root, etc.).

### Validator vs ValidatorSet

- **`packages/validator`** — an individual signing node. `Validator` wraps a key pair and produces `propose()` (serialized block + BLS signature), `prevote()`, and `precommit()` consensus messages for a given round.
- **`packages/validator-set`** / **`packages/evm-consensus`** — the active set for the current round. `ValidatorSet` holds `#topValidators` (the `roundValidators`-sized active slice), `#allValidators` (all registered across the network), and `#dirtyValidators` (changed this block). `getRoundValidators()` returns the active slice. Proposer for a round is `(totalRound + round) % roundValidators` (deterministic, no per-round state).

### Forger (`packages/forger`)

Bridges consensus and the transaction pool. When `Consensus.propose()` runs (it's this node's turn), it calls `BlockForger` to build a block: `BlockForger` requests transactions from the pool via `TransactionForger`, runs them through the EVM to populate receipts, and returns a complete block ready to be signed by the validator. The forger is **not** the consensus engine — it's the block-builder consensus delegates to.

### Transaction Pool Architecture

The mempool is split across three packages by concern:

- **`packages/transaction-pool-service`** — main mempool: `Mempool`, `SenderMempool` (per-sender FIFO with nonce tracking), `Query` (lookup/iteration), `Processor` (accept/reject incoming transactions), `Storage` (LMDB persistence across restarts)
- **`packages/transaction-pool-worker`** — runs the mempool inside a Node.js worker thread; main thread holds only a thin `Worker` proxy via IPC. This keeps transaction validation off the consensus thread.
- **`packages/transaction-pool-broadcaster`** — gossips newly accepted transactions to peers over P2P

### EVM Integration

The EVM is a **Rust native addon** (`packages/evm`) compiled via napi-rs. TypeScript packages interact through:

- `packages/evm-service` — manages EVM instances (tagged bindings: `"evm"`, `"validator"`, `"transaction-pool"`, `"rpc"`)
- `packages/evm-consensus` — consensus-time EVM operations; also owns `ValidatorSet`
- `packages/evm-state` — state management
- `packages/evm-api-worker` — EVM operations in a worker thread
- **`packages/evm-contracts`** — Solidity ABIs (JSON) for on-chain contracts: `ConsensusV1`, `ERC1967Proxy`, `MultiPaymentV1`, `UsernamesV1`. Also exports a `FunctionSigs` map (function name → 4-byte selector) and `TransactionError` for parsing EVM revert data.

### Solidity Contracts (root `contracts/`)

Separate from `packages/evm-contracts` (which holds compiled ABIs), the root **`contracts/`** directory contains the **Solidity source** for on-chain protocol contracts, built with **Foundry** (`foundry.toml`, solc 0.8.27, evm_version shanghai):

- `contracts/src/consensus/ConsensusV1.sol` — validator registration, voting, vote-balance tracking, round selection. UUPS-upgradeable. This is the contract `packages/evm-consensus` interacts with for validator-set logic.
- `contracts/src/multi-payment/MultiPaymentV1.sol` — batched payments
- `contracts/src/usernames/UsernamesV1.sol` — username registration
- `contracts/test/` — Foundry tests (run with `forge test` from the `contracts/` directory; not part of the pnpm test pipeline)

When changing on-chain protocol behavior, edit the Solidity here, recompile, then update the corresponding ABI JSON in `packages/evm-contracts/source/`.

### Worker Threads

CPU-intensive work is offloaded to Node.js worker threads via a lightweight IPC layer (`packages/kernel/source/ipc/`). The worker listens on `parentPort`, receives `{ method, id, args }` messages, and responds with `{ id, result }`.

- **`packages/crypto-worker`** — cryptographic operations (signing, verification) in a worker pool
- **`packages/transaction-pool-worker`** — transaction pool operations isolated in a worker

Worker scripts (`worker-script.ts`) instantiate a `Ipc.Handler` wrapping the actual handler class.

### P2P Layer (`packages/p2p`)

WebSocket-based peer networking built on Hapi + custom `hapi-nes`. Handles peer discovery, block/proposal/message downloading, header exchange, and rate limiting. The `ServiceProvider` registers ~20 services including `PeerCommunicator`, `Broadcaster`, `PeerVerifier`, and three downloaders (blocks, proposals, messages).

### State Management (`packages/state`)

In-memory blockchain state:

- `Store` — last block, block number, genesis commit, milestone tracking
- `State` — overall node state (syncing, forging flags)
- `wallets/` — validator wallet state

### Database (`packages/api-database`)

PostgreSQL via TypeORM. Managed by `packages/database` (core DB service) and `packages/api-database` (API-optimized queries, migrations, repositories). The API database is separate from the consensus-critical database to support read replicas.

### API Layer (`packages/api-*`)

- `api-http` — Hapi HTTP server setup
- `api-common` — shared API utilities and base types
- `api-database` — TypeORM models, repositories, migrations for the read-optimized API DB
- `api-sync` — syncs committed blocks from consensus to the API database
- `api-transaction-pool` — exposes transaction pool over HTTP
- `api-evm` — EVM-specific API endpoints
- `api-development` — development/debug endpoints

### Crypto Primitives (`packages/crypto-*`)

Each cryptographic algorithm has its own package: `crypto-block`, `crypto-commit`, `crypto-messages`, `crypto-proposal`, `crypto-transaction`, `crypto-key-pair-bls12-381`, `crypto-key-pair-ecdsa`, `crypto-signature-bls12-381`, `crypto-signature-ecdsa`, `crypto-hash-bcrypto`, `crypto-address-base58`, `crypto-address-keccak256`, `crypto-wif`, `crypto-validation`. This allows swapping algorithms via configuration.

### Serializer (`packages/serializer`)

Blocks and proposals are encoded as **schema-driven binary** (not JSON). Each schema defines an ordered list of typed fields (`uint8/16/32/48/64/256`, `hash`, `address`, `publicKey`, `signature`, `validatorSet`, `hex`, `transactions`). `serialize()` writes fields sequentially into a `ByteBuffer`; optional fields are prefixed with a presence byte. `validatorSet` fields use bit-packing (`validatorSetPack` / `validatorSetUnpack` from `@mainsail/utils`) to compress boolean arrays. `transactions` writes length-prefixed sub-buffers. `deserialize()` reads in the same field order.

### Kernel Services (`packages/kernel/source/services/`)

- **Events** — in-memory pub/sub `EventDispatcher`. Consensus, processor, and p2p all emit typed events (defined in `packages/constants/source/events.ts`) that other services subscribe to without direct coupling.
- **Triggers** — named callable actions with `before`, `after`, and `error` hooks. `triggers.call("name", args)` runs the action then hooks in sequence. Plugins use triggers to intercept core behavior (e.g., wrapping block processing) without patching core code.
- **Log** — driver-managed; selects `MemoryLogger` by default or `WorkerLogger` inside worker threads.

### Validation (`packages/validation` vs `packages/crypto-validation`)

- **`packages/validation`** — general-purpose AJV wrapper. `Validator` exposes `validate(schemaId, data)`, `addSchema()`, `addFormat()`, `addKeyword()`. Used for config structures and API payloads.
- **`packages/crypto-validation`** — extends AJV with blockchain-specific keywords and formats (addresses, public keys, signatures, transaction types). Used during transaction and block deserialization to enforce crypto-domain constraints.

### CLI Entry Point (`packages/core`)

The `mainsail` CLI binary. Commands in `source/commands/` cover: `core:run`, `core:start`, `core:stop`, `config:*`, `env:*`, `plugin:*`, `pool:*`, etc.

## Test Patterns

Tests use `describe` from `@mainsail/test-runner` (wraps uvu suites):

```typescript
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Handler } from "./handler";

describe<{
	app: Application;
	handler: Handler;
	myService: any;
}>("Handler", ({ it, beforeEach, assert, stub, spy, clock }) => {
	beforeEach((context) => {
		// Set up stubs for injected dependencies
		context.myService = { method: () => {} };

		// Use Application (from @mainsail/kernel), not the raw Container — it auto-binds itself
		// as Identifiers.Application.Instance and exposes resolve() (which applies autobind).
		context.app = new Application();
		context.app.bind(Identifiers.SomeService).toConstantValue(context.myService);

		// Resolve the class under test once, here — never inline inside an it().
		context.handler = context.app.resolve(Handler);
	});

	// Destructure the context in the it() callback rather than threading `context.` through.
	it("does something", async ({ handler, myService }) => {
		const method = spy(myService, "method");

		await handler.handle();

		method.calledOnce();
	});
});
```

Conventions for IoC-injected classes under test:

- Bind stubs to their `Identifiers` on an `Application` instance and resolve the class with `app.resolve(Class)`. `Application.get(id)` takes only the identifier; use `resolve()` for autobinding the class under test.
- Resolve the tested class **in `beforeEach`** and store it on the context (e.g. `context.handler`). Don't resolve inline inside an `it()`.
- In `it()` callbacks, **destructure the context** — `async ({ handler, myService }) => {}` — instead of referencing `context.x`. Mutating a destructured stub (e.g. `myService.method = …`) still works since it's the same object the handler holds.

Helpers available: `assert` (custom assertions), `stub()` / `spy()` (sinon wrappers), `clock()` (sinon fake timers), `nock` (HTTP mocking), `each()` (data-driven tests), `schema` (zod).

Test factories for common entities (blocks, wallets, transactions, commits) are in `@mainsail/test-factories`. Transaction builders for tests are in `@mainsail/test-transaction-builders`.

## TypeScript Configuration

- `"module": "nodenext"` / `"moduleResolution": "nodenext"` — all imports must use `.js` extensions even in TypeScript source
- `"experimentalDecorators": true` + `"emitDecoratorMetadata": true` — required for InversifyJS
- Project references are used for incremental builds; run `pnpm run references` after adding packages
- Node.js >=24 required

## Conventions

- All source files live in `packages/<name>/source/`, compiled output goes to `packages/<name>/distribution/`
- Each package's `index.ts` is the public API surface — only export what consumers need
- Identifiers for new bindings go in `packages/constants/source/identifiers.ts`, not in individual packages
- Interfaces go in `packages/contracts/source/contracts/` before implementation
- Use `@inject(Identifiers.X.Y)` and `@injectable()` decorators for IoC; never manually instantiate services
