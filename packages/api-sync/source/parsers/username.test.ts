import { describe } from "@mainsail/test-runner";
import { encodeAbiParameters, encodeEventTopics, parseAbi } from "viem";

import { parseUsernames } from "./username.js";

const usernamesAbi = parseAbi([
	"event UsernameRegistered(address addr, string username, string previousUsername)",
	"event UsernameResigned(address addr, string username)",
] as const);

const USERNAMES_CONTRACT = "0x1000000000000000000000000000000000000000";
// Digit-only address, unaffected by checksumming.
const WALLET = "0x1111111111111111111111111111111111111111";

const registeredLog = (addr: string, username: string) => ({
	address: USERNAMES_CONTRACT,
	data: encodeAbiParameters(
		[
			{ name: "addr", type: "address" },
			{ name: "username", type: "string" },
			{ name: "previousUsername", type: "string" },
		],
		[addr, username, ""],
	),
	topics: encodeEventTopics({ abi: usernamesAbi, eventName: "UsernameRegistered" }),
});

const resignedLog = (addr: string, username: string) => ({
	address: USERNAMES_CONTRACT,
	data: encodeAbiParameters(
		[
			{ name: "addr", type: "address" },
			{ name: "username", type: "string" },
		],
		[addr, username],
	),
	topics: encodeEventTopics({ abi: usernamesAbi, eventName: "UsernameResigned" }),
});

const otherLog = () => ({
	address: USERNAMES_CONTRACT,
	data: "0x" as const,
	topics: ["0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"] as [`0x${string}`],
});

const transaction = (to: string): any => ({ hash: "0xtransaction", to });

describe("parseUsernames", ({ assert, it }) => {
	it("ignores transactions that do not target the usernames contract", () => {
		const result = parseUsernames(USERNAMES_CONTRACT, transaction(WALLET), {
			logs: [registeredLog(WALLET, "alice")],
		} as any);

		assert.equal(result, []);
	});

	it("returns nothing without logs", () => {
		assert.equal(parseUsernames(USERNAMES_CONTRACT, transaction(USERNAMES_CONTRACT), { logs: [] } as any), []);
	});

	it("tolerates a receipt without a log field", () => {
		assert.equal(parseUsernames(USERNAMES_CONTRACT, transaction(USERNAMES_CONTRACT), {} as any), []);
	});

	it("maps a registration to the registered username", () => {
		const result = parseUsernames(USERNAMES_CONTRACT, transaction(USERNAMES_CONTRACT), {
			logs: [registeredLog(WALLET, "alice")],
		} as any);

		assert.equal(result, [{ address: WALLET, username: "alice" }]);
	});

	it("maps a resignation to an undefined username", () => {
		const result = parseUsernames(USERNAMES_CONTRACT, transaction(USERNAMES_CONTRACT), {
			logs: [resignedLog(WALLET, "alice")],
		} as any);

		assert.equal(result, [{ address: WALLET, username: undefined }]);
	});

	it("keeps the log order and skips unrelated events", () => {
		const result = parseUsernames(USERNAMES_CONTRACT, transaction(USERNAMES_CONTRACT), {
			logs: [registeredLog(WALLET, "alice"), otherLog(), resignedLog(WALLET, "alice")],
		} as any);

		assert.equal(result, [
			{ address: WALLET, username: "alice" },
			{ address: WALLET, username: undefined },
		]);
	});
});
