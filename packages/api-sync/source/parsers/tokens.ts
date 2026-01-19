import type { Contracts as ApiDatabaseContracts, Models } from "@mainsail/api-database";
import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import { LRUCache } from "lru-cache";
import type { ContractFunctionParameters, EncodeFunctionDataParameters } from "viem";
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

const erc20AbiEvents = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"] as const);

type TokenMetadata = {
	totalSupply: string;
	name: string;
	symbol: string;
	decimals: number;
};

type TokenMetadataOptional = Partial<TokenMetadata>;

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
	#transferIndexes: Map<`0x${string}`, number> = new Map<`0x${string}`, number>();
	#previousBlockNumber!: number;

	#preparedFunctionCalls: PreparedErc20Call[] = [];

	@postConstruct()
	public initialize(): void {
		this.#tokenCache = new LRUCache({
			max: this.pluginConfiguration.getRequired<number>("tokenCacheSize"),
		});

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
				args: [zeroAddress, 1n],
				functionName: "transfer",
			},
			{
				abi: erc20AbiFunctions,
				args: [zeroAddress, zeroAddress, 1n],
				functionName: "transferFrom",
			},
			{
				abi: erc20AbiFunctions,
				args: [zeroAddress, 1n],
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
	): Promise<{ tokens: Models.Token[]; tokenHolders: Models.TokenHolder[]; tokenTransfers: Models.TokenTransfer[] }> {
		const tokens: Models.Token[] = [];
		const tokenHolders: Models.TokenHolder[] = [];
		const tokenTransfers: Models.TokenTransfer[] = [];

		if (this.#previousBlockNumber !== header.number) {
			this.#resetTransferIndexes(header.number);
		}

		const blockNumber = header.number.toString();

		const eventLogs = parseEventLogs({
			abi: erc20AbiEvents,
			eventName: "Transfer",
			logs: receipt.logs ?? [],
		});

		const dirtyAccounts = new Map<`0x${string}`, Set<string>>();
		const dirtyContractAddresses = new Set<string>();

		for (const event of eventLogs) {
			const { from, to, value } = event.args;

			for (const account of [from, to]) {
				if (!dirtyAccounts.has(account)) {
					dirtyAccounts.set(account, new Set());
				}
			}

			dirtyAccounts.get(from)?.add(event.address);
			dirtyAccounts.get(to)?.add(event.address);
			dirtyContractAddresses.add(event.address);

			// Emitted events during deployment can have a event.logIndex of undefined and
			// we only care about having a accurate sort order, so we manage an index manually.
			const transferIndex = (this.#transferIndexes.get(event.address) ?? -1) + 1;
			this.#transferIndexes.set(event.address, transferIndex);

			tokenTransfers.push({
				address: event.address,
				blockNumber,
				from,
				index: transferIndex,
				to,
				transactionHash: transaction.hash,
				value: value.toString(),
			});
		}

		if (dirtyAccounts.size > 0) {
			// Get tokens for corresponding contracts. Not all contracts are guaranteed to be a ERC20 contract.
			const foundTokens = await this.#getTokens(
				transaction,
				[...dirtyContractAddresses.values()],
				tokenRepository,
			);

			for (const [account, contracts] of dirtyAccounts) {
				for (const contract of [...contracts.values()]) {
					// Skip anything if not deemed a token.
					if (!foundTokens.has(contract)) {
						this.logger.debugExtra(
							`Ignoring transfer in contract '${receipt.contractAddress}' because it does not implemented expected ERC20 ABI.`,
						);
						continue;
					} else {
						this.logger.debugExtra(
							`Detected ERC20 transfer affecting '${account}' in contract '${contract}' (cached: ${this.#tokenCache.has(contract)})`,
						);
					}

					if (!this.#tokenCache.has(contract)) {
						const foundToken = foundTokens.get(contract);
						assert.defined(foundToken);
						const { token, isNew } = foundToken;
						this.#tokenCache.set(contract, token);

						if (isNew) {
							tokens.push(token);
						}
					}

					tokenHolders.push({
						address: account,
						balance: await this.#getTokenBalance(contract, account),
						tokenAddress: contract,
					});
				}
			}
		}

		return { tokenHolders, tokenTransfers, tokens };
	}

	async #getTokens(
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
			const parsed = await this.#parseErc20Contract(address);
			if (!parsed) {
				continue;
			}

			this.logger.debugExtra(`Detected ERC20 token contract: ${address}`);

			result.set(address, {
				isNew: true,
				token: {
					address,
					deploymentHash: transaction.data.to === undefined ? transaction.hash : undefined,
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
			try {
				const result = await this.evm.view({
					data: Buffer.from(data, "hex"),
					from: zeroAddress,
					specId: evmSpec,
					to: contract,
				});

				if (result.success && result.output) {
					if (isTokenMetadataCall(call)) {
						const decoded = decodeFunctionResult({
							abi: erc20MetadataFunctions,
							data: toHex(result.output),
							functionName: call.functionName,
						});

						tokenMetadata[call.functionName] = decoded as unknown as undefined;
					}

					continue;
				}

				// The function does not exist if the output is 0x.
				if (!result.output || result.output.byteLength === 0) {
					return undefined;
				}

				// Anything else is malformed but not empty
			} catch {}
		}

		if (!hasRequiredTokenMetadata(tokenMetadata)) {
			return undefined;
		}

		return tokenMetadata;
	}

	async #getTokenBalance(contract: string, account: `0x${string}`): Promise<string> {
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
				specId: evmSpec,
				to: contract,
			});

			if (!result.success) {
				this.logger.warn(`Failed to call balanceOf on '${contract}' for ${account}`);
				return "0";
			}

			assert.defined(result.output);

			const decoded = decodeFunctionResult({
				abi: erc20AbiFunctions,
				data: toHex(result.output),
				functionName: "balanceOf",
			});

			return decoded.toString();
		} catch (ex) {
			console.log(ex.message);
		}

		return "0";
	}

	#resetTransferIndexes(blockNumber: number = -1): void {
		this.#transferIndexes.clear();
		this.#previousBlockNumber = blockNumber;
	}
}
