import { Boom } from "@hapi/boom";
import { Request, ResponseObject, Server as HapiServer } from "@hapi/hapi";

type Id = string | number | null;

type RpcErrorResponse = {
	id: Id;
	jsonrpc: "2.0";
	error: {
		code: number;
		message: string;
	};
};

const getRcpId = (request: Request): Id => {
	const payload = request.payload as Record<string, unknown>;

	if (payload && typeof payload === "object") {
		const { id } = payload;

		if (typeof id === "string" || typeof id === "number") {
			return id;
		}
	}

	// eslint-disable-next-line unicorn/no-null
	return null;
};

const getRpcError = () => ({
	code: -32_603,
	message: "Internal error",
});

const prepareErrorResponse = (request: Request, response: Boom): RpcErrorResponse => ({
	error: getRpcError(),
	id: getRcpId(request),
	jsonrpc: "2.0",
});

const responseIsBoom = (response: ResponseObject | Boom): response is Boom => !!(response as Boom).isBoom;

export const rpcResponseHandler = {
	name: "rcpResponseHandler",
	register: (server: HapiServer) => {
		server.ext({
			method(request, h) {
				const response = request.response;

				if (responseIsBoom(response)) {
					return h.response(prepareErrorResponse(request, response));
				}

				return h.continue;
			},
			type: "onPreResponse",
		});
	},
	version: "1.0.0",
};
