import type { Models } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";
import {
	ContractFunctionParameters,
	decodeFunctionResult,
	encodeFunctionData,
	EncodeFunctionDataParameters,
	parseAbi,
	parseEventLogs,
	toHex,
	zeroAddress,
} from "viem";

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

const erc20AbiEvents = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"] as const);

export async function parseTokens(
	logger: Contracts.Kernel.Logger,
	configuration: Contracts.Crypto.Configuration,
	evm: Contracts.Evm.Instance,
	transaction: Contracts.Crypto.Transaction,
	receipt: Contracts.Evm.TransactionReceipt,
): Promise<{ tokens: Models.Token[]; tokenHolders: Models.TokenHolder[] }> {
	const tokens: Models.Token[] = [];
	const tokenHolders: Models.TokenHolder[] = [];

	if (transaction.data.to === undefined) {
		if (receipt.contractAddress) {
			const parsed = await parseErc20Contract(configuration, evm, receipt.contractAddress);
			if (parsed) {
				logger.debug(`Detected new ERC20 token contract: ${receipt.contractAddress}`);

				tokens.push({
					address: receipt.contractAddress,
					deploymentHash: transaction.hash,
					...parsed,
				});
			}
		}

		// Continue to look for potential events since a constructor could mint tokens on deployment.
	}

	const eventLogs = parseEventLogs({
		abi: erc20AbiEvents,
		eventName: "Transfer",
		logs: receipt.logs ?? [],
	});

	const dirtyAccounts = new Map<`0x${string}`, string>();

	for (const event of eventLogs) {
		const { from, to } = event.args;

		dirtyAccounts.set(from, event.address);
		dirtyAccounts.set(to, event.address);
	}

	if (dirtyAccounts.size > 0) {
		logger.debug(`Detected new ERC20 transfers affecting ${dirtyAccounts.size} account(s)`);

		for (const [account, contract] of dirtyAccounts) {
			tokenHolders.push({
				address: account,
				tokenAddress: contract,
				balance: await getTokenBalance(configuration, evm, contract, account),
			});
		}
	}

	return { tokens, tokenHolders };
}

type TokenMetadata = {
	totalSupply: string;
	name: string;
	symbol: string;
	decimals: number;
};

type TokenMetadataOptional = Partial<TokenMetadata>;

const parseErc20Contract = async (
	configuration: Contracts.Crypto.Configuration,
	evm: Contracts.Evm.Instance,
	contract: string,
): Promise<TokenMetadata | undefined> => {
	const { evmSpec } = configuration.getMilestone();

	let tokenMetadata: TokenMetadataOptional = {
		name: undefined,
		symbol: undefined,
		decimals: undefined,
		totalSupply: undefined,
	};

	const calls: (Erc20Call | Erc20MetadataCall)[] = [
		{
			abi: erc20AbiFunctions,
			functionName: "totalSupply",
			args: undefined,
		},
		{
			abi: erc20MetadataFunctions,
			functionName: "name",
			args: undefined,
		},
		{
			abi: erc20MetadataFunctions,
			functionName: "symbol",
			args: undefined,
		},
		{
			abi: erc20MetadataFunctions,
			functionName: "decimals",
			args: undefined,
		},
		{
			abi: erc20AbiFunctions,
			functionName: "allowance",
			args: [zeroAddress, zeroAddress],
		},
		{
			abi: erc20AbiFunctions,
			functionName: "balanceOf",
			args: [zeroAddress],
		},
		{
			abi: erc20AbiFunctions,
			functionName: "transfer",
			args: [zeroAddress, 1n],
		},
		{
			abi: erc20AbiFunctions,
			functionName: "transferFrom",
			args: [zeroAddress, zeroAddress, 1n],
		},
		{
			abi: erc20AbiFunctions,
			functionName: "approve",
			args: [zeroAddress, 1n],
		},
	];

	for (const call of calls) {
		const data = encodeFunctionData(call as EncodeFunctionDataParameters).slice(2);

		try {
			const result = await evm.view({
				data: Buffer.from(data, "hex"),
				from: zeroAddress,
				specId: evmSpec,
				to: contract,
			});

			if (result.success && result.output) {
				if (isTokenMetadataCall(call)) {
					const decoded = decodeFunctionResult({
						abi: erc20MetadataFunctions,
						functionName: call.functionName,
						data: toHex(result.output!),
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
};

const getTokenBalance = async (
	configuration: Contracts.Crypto.Configuration,
	evm: Contracts.Evm.Instance,
	contract: string,
	account: `0x${string}`,
): Promise<string> => {
	const { evmSpec } = configuration.getMilestone();

	const data = encodeFunctionData({
		abi: erc20AbiFunctions,
		functionName: "balanceOf",
		args: [account],
	}).slice(2);

	try {
		const result = await evm.view({
			data: Buffer.from(data, "hex"),
			from: zeroAddress,
			specId: evmSpec,
			to: contract,
		});

		const decoded = decodeFunctionResult({
			abi: erc20AbiFunctions,
			functionName: "balanceOf",
			data: toHex(result.output!),
		});

		return decoded.toString();
	} catch (ex) {
		console.log(ex.message);
	}

	return "0";
};

function isTokenMetadataCall(call: Erc20Call | Erc20MetadataCall): call is Erc20MetadataCall {
	return erc20MetadataFunctions.some((m) => m.name === call.functionName);
}

function hasRequiredTokenMetadata(tokenMetadata: TokenMetadataOptional): tokenMetadata is TokenMetadata {
	return Object.values(tokenMetadata).every((v) => v !== undefined);
}
