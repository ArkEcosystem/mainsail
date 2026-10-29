import {
	packBitmaps,
	packHeadersBitmaps,
	type Unpacked,
	unpackBitmapsInPlace,
	unpackHeadersBitmaps,
	type WithUnpackedHeaders,
} from "./headers.js";
import { getMessages as proto } from "./proto/protos.js";

type GetMessagesRequest = Omit<WithUnpackedHeaders<proto.GetMessagesRequest.$Properties>, "query"> & {
	query?: Unpacked<proto.GetMessagesQuery.$Properties> | null;
};

export const getMessages = {
	request: {
		deserialize: (payload: Buffer): proto.GetMessagesRequest.$Properties => {
			const decoded = proto.GetMessagesRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			unpackBitmapsInPlace(decoded.query);
			return decoded;
		},
		serialize: (object: GetMessagesRequest): Buffer =>
			Buffer.from(
				proto.GetMessagesRequest.encode(
					packHeadersBitmaps<proto.GetMessagesRequest.$Properties>({
						...object,
						query: object.query ? packBitmaps(object.query) : object.query,
					}),
				).finish(),
			),
	},
	response: {
		deserialize: (payload: Buffer): proto.GetMessagesResponse.$Properties => {
			const decoded = proto.GetMessagesResponse.toObject(proto.GetMessagesResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetMessagesResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetMessagesResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
