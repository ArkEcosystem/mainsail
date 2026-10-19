export const ADDRESS_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const ADDRESS_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
export const TOKEN_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc";
export const PUBLIC_KEY = `03${"ab".repeat(32)}`;
export const BLOCK_HASH = "b".repeat(64);
export const TRANSACTION_HASH = "a".repeat(64);

export const makeState = (overrides: Record<string, unknown> = {}) => ({
	blockNumber: "100",
	id: 1,
	supply: "1000000",
	...overrides,
});

export const makeBlock = (overrides: Record<string, unknown> = {}) => ({
	commitRound: 0,
	fee: "100",
	gasUsed: 21_000,
	hash: BLOCK_HASH,
	number: "90",
	parentHash: "c".repeat(64),
	payloadSize: 10,
	proposer: ADDRESS_A,
	reward: "200",
	round: 0,
	signature: "d".repeat(96),
	stateRoot: "e".repeat(64),
	timestamp: "1720000000000",
	transactionsCount: 1,
	transactionsRoot: "f".repeat(64),
	validatorRound: 1,
	validatorSet: "5", // 0b101
	version: 1,
	...overrides,
});

export const makeWallet = (overrides: Record<string, unknown> = {}) => ({
	address: ADDRESS_A,
	attributes: { username: "genesis" },
	balance: "1000",
	nonce: "1",
	publicKey: PUBLIC_KEY,
	updated_at: "90",
	...overrides,
});

export const makeTransaction = (overrides: Record<string, unknown> = {}) => ({
	blockHash: BLOCK_HASH,
	blockNumber: "90",
	// gas, gasUsed and cumulativeGasUsed are deliberately distinct so field swaps are detectable.
	cumulativeGasUsed: 42_000,
	data: "0x",
	decodedError: undefined,
	deployedContractAddress: undefined,
	from: ADDRESS_A,
	gas: 25_000,
	gasPrice: 5,
	gasRefunded: 0,
	gasUsed: 21_000,
	hash: TRANSACTION_HASH,
	legacySecondSignature: undefined,
	logs: [],
	nonce: "1",
	output: "0x",
	senderPublicKey: PUBLIC_KEY,
	signature: "ff".repeat(65),
	status: 1,
	timestamp: "1720000000000",
	to: ADDRESS_B,
	transactionIndex: 0,
	value: "0",
	...overrides,
});

export const makePeer = (overrides: Record<string, unknown> = {}) => ({
	blockNumber: 95,
	ip: "127.0.0.1",
	latency: 10,
	plugins: {},
	port: 4002,
	ports: {},
	version: "1.0.0",
	...overrides,
});

export const makeApiNode = (overrides: Record<string, unknown> = {}) => ({
	blockNumber: 95,
	latency: 10,
	url: "http://127.0.0.1:4003",
	version: "1.0.0",
	...overrides,
});

export const makeToken = (overrides: Record<string, unknown> = {}) => ({
	address: TOKEN_ADDRESS,
	decimals: 6,
	name: "Test Token",
	symbol: "TEST",
	totalSupply: "1000000000",
	...overrides,
});

export const makeValidatorRound = (overrides: Record<string, unknown> = {}) => ({
	round: 1,
	roundHeight: 1,
	validators: [ADDRESS_A, ADDRESS_B],
	votes: ["100", "200"],
	...overrides,
});

export const makeContract = (overrides: Record<string, unknown> = {}) => ({
	activeImplementation: ADDRESS_B,
	address: ADDRESS_A,
	implementations: [{ abi: { abi: [] }, address: ADDRESS_B }],
	name: "ConsensusV1",
	proxy: "UUPS",
	...overrides,
});

export const makeLegacyColdWallet = (overrides: Record<string, unknown> = {}) => ({
	address: "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax",
	attributes: {},
	balance: "500",
	mergeInfoTransactionHash: undefined,
	mergeInfoWalletAddress: undefined,
	...overrides,
});

export const makePage = <T>(results: T[], totalCount = results.length) => ({
	meta: { totalCountIsEstimate: false },
	results,
	totalCount,
});
