import { getMessages as proto } from "./proto/protos.js";

export const getMessages = {
	request: {
		deserialize: (payload: Buffer): proto.IGetMessagesRequest => proto.GetMessagesRequest.decode(payload),
		serialize: (object: proto.IGetMessagesRequest): Buffer =>
			Buffer.from(proto.GetMessagesRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetMessagesResponse =>
			proto.GetMessagesResponse.toObject(proto.GetMessagesResponse.decode(payload), { defaults: true }),
		serialize: (object: proto.IGetMessagesResponse): Buffer =>
			Buffer.from(proto.GetMessagesResponse.encode(object).finish()),
	},
};
