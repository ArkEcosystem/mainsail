import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { getRcpId, prepareRcpError } from "./utilities.js";

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
			return prepareRcpError(getRcpId(request), Contracts.Api.RPC.ErrorCode.InvalidRequest);
		}

		const payload = request.payload as Contracts.Api.RPC.Request<any>;
		if (Array.isArray(payload)) {
			return Promise.all(payload.map(async (rcpRequest) => await this.#processSingle(rcpRequest)));
		} else {
			return this.#processSingle(payload);
		}
	}

	async #processSingle(
		rcpRequest: Contracts.Api.RPC.Request<any>,
	): Promise<Contracts.Api.RPC.Response | Contracts.Api.RPC.Error> {
		const action = this.#actions.get(rcpRequest.method);
		if (!action) {
			return prepareRcpError(rcpRequest.id, Contracts.Api.RPC.ErrorCode.MethodNotFound);
		}

		if (!this.#validateParams(rcpRequest.params, action)) {
			return prepareRcpError(rcpRequest.id, Contracts.Api.RPC.ErrorCode.InvalidParameters);
		}

		try {
			return {
				id: rcpRequest.id,
				jsonrpc: "2.0",
				result: await action.handle(rcpRequest.params),
			};
		} catch (error) {
			if (error instanceof Exceptions.RpcError) {
				return prepareRcpError(rcpRequest.id, error.code, error.message);
			}

			return prepareRcpError(rcpRequest.id, Contracts.Api.RPC.ErrorCode.InternalError);
		}
	}

	#validatePayload(request: Hapi.Request): boolean {
		const payload = request.payload as Contracts.Types.JsonObject;

		const { error } = this.validator.validate("jsonRpcPayload", payload);

		return !error;
	}

	#validateParams(parameters: any, action: Contracts.Api.RPC.Action): boolean {
		if (!action.schema.$id) {
			return true;
		}

		const { error } = this.validator.validate(action.schema.$id, parameters ?? []);

		return !error;
	}
}
