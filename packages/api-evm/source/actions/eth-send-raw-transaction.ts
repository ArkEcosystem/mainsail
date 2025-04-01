import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";
import { http } from "@mainsail/utils";

@injectable()
export class EthSendRawTransactionAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	public readonly name: string = "eth_sendRawTransaction";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string> {
		const response = await http.post(this.#getUrl(), {
			body: { transactions: [parameters[0].slice(2)] },
		});

		if (response.statusCode === 200) {
			if (response.data.data.accept.length > 0) {
				const tx = await this.transactionFactory.fromHex(parameters[0].slice(2));
				return `0x${tx.hash}`;
			} else {
				throw new Exceptions.RpcError(response.data.errors[0].message);
			}
		}

		// TODO Improve error handling
		throw new Exceptions.RpcError("Error sending transaction");
	}

	#getUrl(): string {
		const config = {
			http: {
				enabled: !Environment.isTrue(Constants.EnvironmentVariables.CORE_API_TRANSACTION_POOL_DISABLED),
				host: Environment.get(Constants.EnvironmentVariables.CORE_API_TRANSACTION_POOL_HOST, "0.0.0.0"),
				port: Environment.get(Constants.EnvironmentVariables.CORE_API_TRANSACTION_POOL_PORT, 4007),
			},
			https: {
				enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_TRANSACTION_POOL_SSL),
				host: Environment.get(Constants.EnvironmentVariables.CORE_API_TRANSACTION_POOL_SSL_HOST, "0.0.0.0"),
				port: Environment.get(Constants.EnvironmentVariables.CORE_API_TRANSACTION_POOL_SSL_PORT, 8447),
			},
		};

		if (config.http.enabled) {
			return `http://${config.http.host}:${config.http.port}/api/transactions`;
		}

		if (config.https.enabled) {
			return `https://${config.https.host}:${config.https.port}/api/transactions`;
		}

		throw new Error("Server is not enabled");
	}
}
