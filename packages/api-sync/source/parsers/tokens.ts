import type { Models } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";
import type { ContractFunctionParameters, EncodeFunctionDataParameters } from "viem";
import { decodeFunctionResult, encodeFunctionData, parseAbi, parseEventLogs, toHex, zeroAddress } from "viem";

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
				balance: await getTokenBalance(configuration, evm, contract, account),
				tokenAddress: contract,
			});
		}
	}

	return { tokenHolders, tokens };
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

	const tokenMetadata: TokenMetadataOptional = {
		decimals: undefined,
		name: undefined,
		symbol: undefined,
		totalSupply: undefined,
	};

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
						data: toHex(result.output!),
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
		args: [account],
		functionName: "balanceOf",
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
			data: toHex(result.output!),
			functionName: "balanceOf",
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
