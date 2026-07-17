import type { Contracts } from "@mainsail/contracts";

import Hapi from "@hapi/hapi";
import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { RpcError } from "@mainsail/exceptions";
import { chunk, ensureError } from "@mainsail/utils";

import { getRcpId, prepareRcpError } from "./utilities.js";

const BATCH_CONCURRENCY = 10;

@injectable()
export class Processor implements Contracts.Api.RPC.Processor {
	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	#actions: Map<string, Contracts.Api.RPC.Action> = new Map();

	public registerAction(action: Contracts.Api.RPC.Action): void {
		this.#actions.set(action.name, action);
		this.validator.addSchema(action.schema);
	}

	async process(
		request: Hapi.Request,
	): Promise<
		Contracts.Api.RPC.Response | Contracts.Api.RPC.Error | (Contracts.Api.RPC.Response | Contracts.Api.RPC.Error)[]
	> {
		if (!this.#validatePayload(request)) {
			return prepareRcpError(getRcpId(request), Enums.Api.RcpErrorCode.InvalidRequest);
		}

		const payload = request.payload as Contracts.Api.RPC.Request<[]>;

		if (!Array.isArray(payload)) {
			return this.#processSingle(payload);
		}

		const responses: (Contracts.Api.RPC.Response | Contracts.Api.RPC.Error)[] = [];
		for (const group of chunk(payload, BATCH_CONCURRENCY)) {
			responses.push(...(await Promise.all(group.map((rcpRequest) => this.#processSingle(rcpRequest)))));
		}
		return responses;
	}

	async #processSingle(
		rcpRequest: Contracts.Api.RPC.Request<[]>,
	): Promise<Contracts.Api.RPC.Response | Contracts.Api.RPC.Error> {
		const action = this.#actions.get(rcpRequest.method);
		if (!action) {
			return prepareRcpError(rcpRequest.id, Enums.Api.RcpErrorCode.MethodNotFound);
		}

		if (!this.#validateParams(rcpRequest.params, action)) {
			return prepareRcpError(rcpRequest.id, Enums.Api.RcpErrorCode.InvalidParameters);
		}

		try {
			return {
				id: rcpRequest.id,
				jsonrpc: "2.0",
				result: await action.handle(rcpRequest.params),
			};
		} catch (rawError) {
			const error = ensureError(rawError);
			if (error instanceof RpcError) {
				return prepareRcpError(rcpRequest.id, error.code, error.message, error.data);
			}

			return prepareRcpError(rcpRequest.id, Enums.Api.RcpErrorCode.InternalError);
		}
	}

	#validatePayload(request: Hapi.Request): boolean {
		const payload = request.payload as Contracts.Types.JsonObject;

		const { error } = this.validator.validate("jsonRpcPayload", payload);

		return !error;
	}

	#validateParams(parameters: [], action: Contracts.Api.RPC.Action): boolean {
		if (!action.schema.$id) {
			return true;
		}

		const { error } = this.validator.validate(action.schema.$id, parameters ?? []);

		return !error;
	}
}
