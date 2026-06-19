import { injectable } from "@mainsail/container";

import { EvmInstance } from "./evm.js";

@injectable()
export class LimitedEvmInstance extends EvmInstance {
	// Max EVM calls this request-serving instance may run concurrently.
	//
	// Every napi EVM call holds one thread of the tokio blocking pool for its full duration, the
	// pool is process-wide and capped at 512 (`max_blocking_threads`, set in the Rust addon's
	// `init_tokio_runtime`), and ALL instances share it. So an unbounded API/mempool flood on the
	// externally-driven instances (`rpc`, `transaction-pool`) could occupy every thread and make
	// the consensus (`evm`) and forger (`validator`) instances — which are intentionally unbounded —
	// queue behind it. Block processing and block building must never wait on untrusted reads, so
	// only the externally-driven instances are capped; consensus/forger keep the remaining headroom.
	//
	// Sizing rule: Σ(per-instance caps) + peak consensus/forger demand < 512. The two capped
	// instances at 192 each = 384 worst case, leaving ~128 threads always free for consensus+forger
	// — ample, since their work is near-serial (one block at a time, sequential per-tx execution).
	// Raise for more RPC throughput, lower to reserve more for consensus, and re-tune together with
	// `max_blocking_threads` if that ever changes.
	//
	// TODO: move these limits (and `max_blocking_threads`) into config so operators can tune per
	//       deployment (high-RPC node vs. pure validator) without a code change; keep 192 as default
	protected override readonly concurrency = 192;
}
