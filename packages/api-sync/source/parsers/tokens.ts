import type { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";
import type { ContractFunctionParameters, EncodeFunctionDataParameters } from "viem";

import { Identifiers as ApiDatabaseIdentifiers, Models } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { assert, ensureError } from "@mainsail/utils";
import { LRUCache } from "lru-cache";
import { decodeFunctionResult, encodeFunctionData, parseAbi, parseEventLogs, toHex, zeroAddress } from "viem";

import { TokenParser } from "../contracts.js";

const erc20AbiFunctions = parseAbi([
	"function totalSupply() view returns (uint256)",
	"function balanceOf(address account) view returns (uint256)",
	"function transfer(address recipient, uint256 amount) returns (bool)",
	"function approve(address spender, uint256 amount) returns (bool)",
	"function allowance(address owner, address spender) view returns (uint256)",
	"function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
] as const);

const erc20MetadataFunctions = parseAbi([
	"function totalSupply() view returns (uint256)",
	"function name() view returns (string)",
	"function symbol() view returns (string)",
	"function decimals() view returns (uint8)",
] as const);

type Erc20Call = Omit<ContractFunctionParameters<typeof erc20AbiFunctions>, "address">;
type Erc20MetadataCall = Omit<ContractFunctionParameters<typeof erc20MetadataFunctions>, "address">;

type PreparedErc20Call = { call: Erc20Call | Erc20MetadataCall; data: string };

const erc20AbiEvents = parseAbi([
	"event Transfer(address indexed from, address indexed to, uint256 value)",
	"event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const);

type TokenMetadata = {
	totalSupply: string;
	name: string;
	symbol: string;
	decimals: number;
};

type TokenMetadataOptional = Partial<TokenMetadata>;

const MAX_TOKEN_METADATA_LENGTH = 64;
const MAX_UINT8 = 255;

// Enough gas for real tokens, including share-based (stETH ~61k) and reflection tokens (~75k); a contract that
// needs more is not indexed.
const VIEW_GAS_LIMIT = 100_000n;

// In standard tokens a zero amount writes no new storage, and a non-zero recipient passes bare
// `require(to != address(0))` checks that would otherwise revert without data.
const PROBE_RECIPIENT = "0x000000000000000000000000000000000000dEaD";

// Contracts not detected as tokens are checked again after this many blocks, in case they change.
const NON_TOKEN_REPROBE_BLOCKS = 100;

// Postgres text cannot hold NUL.
function isIndexableTokenString(value: string): boolean {
	return value.length <= MAX_TOKEN_METADATA_LENGTH && !value.includes("\u0000");
}

function decodeTokenMetadata(
	functionName: Erc20MetadataCall["functionName"],
	output: Buffer,
): string | number | undefined {
	let decoded: unknown;
	try {
		decoded = decodeFunctionResult({ abi: erc20MetadataFunctions, data: toHex(output), functionName });
	} catch {
		return undefined;
	}

	if (functionName === "name" || functionName === "symbol") {
		return isIndexableTokenString(decoded as string) ? (decoded as string) : undefined;
	}

	if (functionName === "decimals") {
		// viem does not range-check a uint8 below 2^53.
		const decimals = decoded as number;
		return decimals <= MAX_UINT8 ? decimals : undefined;
	}

	return (decoded as bigint).toString();
}

function isTokenMetadataCall(call: Erc20Call | Erc20MetadataCall): call is Erc20MetadataCall {
	return erc20MetadataFunctions.some((m) => m.name === call.functionName);
}

function hasRequiredTokenMetadata(tokenMetadata: TokenMetadataOptional): tokenMetadata is TokenMetadata {
	return Object.values(tokenMetadata).every((v) => v !== undefined);
}

@injectable()
export class TokenParserService implements TokenParser {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.ApiSync.Logger)
	private readonly logger!: Contracts.ApiSync.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-sync")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	#tokenCache!: LRUCache<string, Models.Token>;
	#nonTokenCache!: LRUCache<string, number>;
	#actionIndex = 0;
	#previousBlockNumber!: number;

	#preparedFunctionCalls: PreparedErc20Call[] = [];

	@postConstruct()
	public initialize(): void {
		const tokenCacheSize = this.pluginConfiguration.getRequired<number>("tokenCacheSize");
		this.#tokenCache = new LRUCache({ max: tokenCacheSize });
		this.#nonTokenCache = new LRUCache({ max: tokenCacheSize });

		const calls: (Erc20Call | Erc20MetadataCall)[] = [
			{
				abi: erc20AbiFunctions,
				args: undefined,
				functionName: "totalSupply",
			},
			{
				abi: erc20MetadataFunctions,
				args: undefined,
				functionName: "name",
			},
			{
				abi: erc20MetadataFunctions,
				args: undefined,
				functionName: "symbol",
			},
			{
				abi: erc20MetadataFunctions,
				args: undefined,
				functionName: "decimals",
			},
			{
				abi: erc20AbiFunctions,
				args: [zeroAddress, zeroAddress],
				functionName: "allowance",
			},
			{
				abi: erc20AbiFunctions,
				args: [zeroAddress],
				functionName: "balanceOf",
			},
			{
				abi: erc20AbiFunctions,
				args: [PROBE_RECIPIENT, 0n],
				functionName: "transfer",
			},
			{
				abi: erc20AbiFunctions,
				args: [zeroAddress, PROBE_RECIPIENT, 0n],
				functionName: "transferFrom",
			},
			{
				abi: erc20AbiFunctions,
				args: [PROBE_RECIPIENT, 0n],
				functionName: "approve",
			},
		];

		for (const call of calls) {
			const data = encodeFunctionData(call as EncodeFunctionDataParameters).slice(2);
			this.#preparedFunctionCalls.push({ call, data });
		}

		this.#resetTransferIndexes();
	}

	public async parseReceipt(
		header: Contracts.Crypto.BlockHeader,
		transaction: Contracts.Crypto.Transaction,
		receipt: Contracts.Evm.TransactionReceipt,
		tokenRepository?: ApiDatabaseContracts.TokenRepository,
	): Promise<{
		tokens: Models.Token[];
		tokenHolders: Models.TokenHolder[];
		tokenActions: Models.TokenAction[];
	}> {
		const tokens: Models.Token[] = [];
		const tokenHolders: Models.TokenHolder[] = [];
		const tokenActions: Models.TokenAction[] = [];

		if (this.#previousBlockNumber !== header.number) {
			this.#resetTransferIndexes(header.number);
		}

		const blockNumber = header.number.toString();

		const eventLogs = parseEventLogs({
			abi: erc20AbiEvents,
			eventName: ["Transfer", "Approval"],
			logs: receipt.logs ?? [],
		});

		const dirtyAccounts = new Map<`0x${string}`, Set<string>>();
		const dirtyContractAddresses = new Set<string>();

		for (const event of eventLogs) {
			// Emitted events during deployment can have a event.logIndex of undefined and
			// we only care about having a accurate sort order, so we manage an index manually.
			// It counts the actions of all tokens in a block, so that they sort in the order they were emitted.
			const actionIndex = this.#actionIndex++;

			let from: `0x${string}`;
			let to: `0x${string}`;
			let value: bigint;
			let action: Models.TokenActionEnum;

			switch (event.eventName) {
				case "Transfer": {
					({ from, to, value } = event.args);
					action = Models.TokenActionEnum.Transfer;
					break;
				}
				case "Approval": {
					({ owner: from, spender: to, value } = event.args);
					action = Models.TokenActionEnum.Approval;
					break;
				}
				default: {
					throw new Error("unsupported token event");
				}
			}

			for (const account of [from, to]) {
				if (!dirtyAccounts.has(account)) {
					dirtyAccounts.set(account, new Set());
				}
			}

			dirtyAccounts.get(from)?.add(event.address);
			dirtyAccounts.get(to)?.add(event.address);
			dirtyContractAddresses.add(event.address);

			tokenActions.push({
				action,
				address: event.address,
				blockNumber,
				from,
				index: actionIndex,
				to,
				transactionHash: transaction.hash,
				value: value.toString(),
			});
		}

		if (dirtyAccounts.size > 0) {
			// Get tokens for corresponding contracts. Not all contracts are guaranteed to be a ERC20 contract.
			const foundTokens = await this.#getTokens(
				header.number,
				transaction,
				[...dirtyContractAddresses.values()],
				tokenRepository,
			);

			for (const [account, contracts] of dirtyAccounts) {
				for (const contract of [...contracts.values()]) {
					// Skip anything if not deemed a token.
					if (!foundTokens.has(contract)) {
						this.logger.debugExtra(
							`Ignoring tx to contract '${contract}' because it does not implement the expected ERC20 ABI.`,
						);
						continue;
					} else {
						this.logger.debugExtra(
							`Detected ERC20 tx affecting '${account}' in contract '${contract}' (cached: ${this.#tokenCache.has(contract)})`,
						);
					}

					if (!this.#tokenCache.has(contract)) {
						const foundToken = foundTokens.get(contract);
						assert.defined(foundToken);
						const { isNew, token } = foundToken;
						this.#tokenCache.set(contract, token);

						if (isNew) {
							tokens.push(token);
						}
					}

					const balance = await this.#getTokenBalance(contract, account);
					if (balance !== undefined) {
						tokenHolders.push({ address: account, balance, tokenAddress: contract });
					}
				}
			}
		}

		return { tokenActions, tokenHolders, tokens };
	}

	async #getTokens(
		blockNumber: number,
		transaction: Contracts.Crypto.Transaction,
		addresses: string[],
		tokenRepository?: ApiDatabaseContracts.TokenRepository,
	): Promise<Map<string, { readonly token: Models.Token; readonly isNew: boolean }>> {
		if (!tokenRepository) {
			tokenRepository = this.tokenRepositoryFactory();
		}

		const result = new Map<string, { readonly token: Models.Token; readonly isNew: boolean }>();

		for (const address of addresses) {
			const fromCache = this.#tokenCache.get(address);
			if (fromCache) {
				result.set(address, { isNew: false, token: fromCache });
				continue;
			}

			const judgedAt = this.#nonTokenCache.get(address);
			if (judgedAt !== undefined && blockNumber - judgedAt < NON_TOKEN_REPROBE_BLOCKS) {
				continue;
			}

			// Postgres might already have the contract, load it and bail early.
			const databaseToken = await tokenRepository
				.createQueryBuilder()
				.where("address = :address", { address })
				.getOne();

			if (databaseToken) {
				this.logger.debugExtra(`Found ERC20 token contract in postgres: ${address}`);
				result.set(address, { isNew: false, token: databaseToken });
				continue;
			}

			// Perform calls on the contract to check if it conform to the ERC20 ABI.
			// This should work regardless of what kind of ERC20 contract it is (Vanilla, Proxy, etc.)
			let parsed: TokenMetadata | undefined;
			try {
				parsed = await this.#parseErc20Contract(address);
			} catch (rawError) {
				// A failed state read says nothing about the contract, so it is not cached.
				this.logger.warn(`Failed to probe '${address}' for ERC20: ${ensureError(rawError).message}`);
				continue;
			}

			if (!parsed) {
				this.#nonTokenCache.set(address, blockNumber);
				continue;
			}

			this.logger.debugExtra(`Detected ERC20 token contract: ${address}`);

			result.set(address, {
				isNew: true,
				token: {
					address,
					deploymentHash: transaction.to === undefined ? transaction.hash : undefined,
					...parsed,
				},
			});
		}

		return result;
	}

	async #parseErc20Contract(contract: string): Promise<TokenMetadata | undefined> {
		const { evmSpec } = this.configuration.getMilestone();

		const tokenMetadata: TokenMetadataOptional = {
			decimals: undefined,
			name: undefined,
			symbol: undefined,
			totalSupply: undefined,
		};

		for (const { call, data } of this.#preparedFunctionCalls) {
			const result = await this.evm.view({
				data: Buffer.from(data, "hex"),
				from: zeroAddress,
				gasLimit: VIEW_GAS_LIMIT,
				specId: evmSpec,
				to: contract,
			});

			if (result.success && result.output) {
				if (isTokenMetadataCall(call)) {
					const value = decodeTokenMetadata(call.functionName, result.output);
					if (value === undefined) {
						return undefined;
					}

					tokenMetadata[call.functionName] = value as unknown as undefined;
				}

				continue;
			}

			// Empty output: a missing function, a revert without data or running out of gas.
			if (!result.output || result.output.byteLength === 0) {
				return undefined;
			}

			// Anything else is malformed but not empty
		}

		if (!hasRequiredTokenMetadata(tokenMetadata)) {
			return undefined;
		}

		return tokenMetadata;
	}

	async #getTokenBalance(contract: string, account: `0x${string}`): Promise<string | undefined> {
		const { evmSpec } = this.configuration.getMilestone();

		const data = encodeFunctionData({
			abi: erc20AbiFunctions,
			args: [account],
			functionName: "balanceOf",
		}).slice(2);

		try {
			const result = await this.evm.view({
				data: Buffer.from(data, "hex"),
				from: zeroAddress,
				gasLimit: VIEW_GAS_LIMIT,
				specId: evmSpec,
				to: contract,
			});

			if (!result.success) {
				this.logger.warn(`Failed to call balanceOf on '${contract}' for ${account}`);
				return undefined;
			}

			assert.defined(result.output);

			const decoded = decodeFunctionResult({
				abi: erc20AbiFunctions,
				data: toHex(result.output),
				functionName: "balanceOf",
			});

			return decoded.toString();
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.warn(`Failed to call balanceOf on '${contract}' for ${account}: ${error.message}`);
		}

		return undefined;
	}

	#resetTransferIndexes(blockNumber: number = -1): void {
		this.#actionIndex = 0;
		this.#previousBlockNumber = blockNumber;
	}
}
