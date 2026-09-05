import { packBitmaps, packHeadersBitmaps, unpackBitmapsInPlace, unpackHeadersBitmaps } from "./headers.js";
import { getMessages as proto } from "./proto/protos.js";

export const getMessages = {
	request: {
		deserialize: (payload: Buffer): proto.IGetMessagesRequest => {
			const decoded = proto.GetMessagesRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			unpackBitmapsInPlace(decoded.query);
			return decoded;
		},
		serialize: (object: proto.IGetMessagesRequest): Buffer =>
			Buffer.from(
				proto.GetMessagesRequest.encode(
					packHeadersBitmaps(object.query ? { ...object, query: packBitmaps(object.query) } : object),
				).finish(),
			),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetMessagesResponse => {
			const decoded = proto.GetMessagesResponse.toObject(proto.GetMessagesResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetMessagesResponse): Buffer =>
			Buffer.from(proto.GetMessagesResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
