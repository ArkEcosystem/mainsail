// A single byte (two hex chars) repeated keeps addresses (20 bytes) and hashes (32 bytes)
// well-formed for any n, with distinct values per n below 256.
const byte = (index: number): string => (index % 256).toString(16).padStart(2, "0");

export const makeTransaction = (n: number) => {
	const data = {
		data: "",
		from: `0x${byte(n).repeat(20)}`,
		gasLimit: 21_000,
		gasPrice: 5,
		hash: byte(n).repeat(32),
		network: 30,
		nonce: BigInt(n),
		r: "r".repeat(64),
		s: "s".repeat(64),
		senderPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
		to: `0x${byte(n + 4).repeat(20)}`,
		v: 1,
		value: BigInt(n) * 100_000n,
	};

	return {
		...data,
		serialized: Buffer.from("deadbeef", "hex"),
		toData: () => data,
	};
};

// Mirrors the pool's QueryIterable semantics (see transaction-pool-service/source/query.ts):
// predicates are AND-chained, first() and has() evaluate all(), first() throws when empty
// and whereHash() is an exact-match predicate on the hash.
export const makeQueryIterable = (transactions: unknown[]) => {
	const predicates: Array<(t: unknown) => Promise<boolean>> = [];
	const iterable = {
		all: async () => {
			const result: unknown[] = [];
			for (const transaction of transactions) {
				let matches = true;
				for (const predicate of predicates) {
					matches = matches && (await predicate(transaction));
				}
				if (matches) {
					result.push(transaction);
				}
			}
			return result;
		},
		first: async () => {
			for (const transaction of await iterable.all()) {
				return transaction;
			}

			throw new Error("Transaction not found");
		},
		has: async () => (await iterable.all()).length > 0,
		whereHash: (hash: string) => {
			predicates.push(async (t: any) => t.hash === hash);
			return iterable;
		},
		wherePredicate: (predicate: (t: unknown) => Promise<boolean>) => {
			predicates.push(predicate);
			return iterable;
		},
	};
	return iterable;
};
