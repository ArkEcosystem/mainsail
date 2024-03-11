import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.getMessages as typeof types.getMessages;

export const getMessages = {
	request: {
		deserialize: (payload: Buffer): types.getMessages.IGetMessagesRequest =>
			proto.GetMessagesRequest.decode(payload),
		serialize: (object: types.getMessages.IGetMessagesRequest): Buffer =>
			Buffer.from(proto.GetMessagesRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): types.getMessages.IGetMessagesResponse =>
			proto.GetMessagesResponse.toObject(proto.GetMessagesResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.getMessages.IGetMessagesResponse): Buffer =>
			Buffer.from(proto.GetMessagesResponse.encode(object).finish()),
	},
};
