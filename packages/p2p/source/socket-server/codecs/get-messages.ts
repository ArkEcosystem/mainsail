import { getMessages as proto } from "./proto/protos";

export const getMessages = {
	request: {
		deserialize: (payload: Buffer): proto.IGetMessagesRequest => proto.GetMessagesRequest.decode(payload),
		serialize: (object: proto.IGetMessagesRequest): Buffer =>
			Buffer.from(proto.GetMessagesRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.GetMessagesResponse => proto.GetMessagesResponse.decode(payload),
		serialize: (object: proto.GetMessagesResponse): Buffer =>
			Buffer.from(proto.GetMessagesResponse.encode(object).finish()),
	},
};
