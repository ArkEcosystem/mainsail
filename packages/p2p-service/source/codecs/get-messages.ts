import { getMessages as proto } from "../../protos/protos.js";
import {
	packBitmaps,
	packHeadersBitmaps,
	type Unpacked,
	unpackBitmapsInPlace,
	unpackHeadersBitmaps,
	type WithUnpackedHeaders,
} from "./headers.js";

type GetMessagesRequest = Omit<WithUnpackedHeaders<proto.GetMessagesRequest.$Properties>, "query"> & {
	query?: Unpacked<proto.GetMessagesQuery.$Properties> | null;
};

export const getMessages = {
	request: {
		deserialize: (payload: Buffer): GetMessagesRequest => {
			const decoded = proto.GetMessagesRequest.decode(payload);
			unpackBitmapsInPlace(decoded.query);
			return unpackHeadersBitmaps(decoded) as GetMessagesRequest;
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
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetMessagesResponse.$Properties> => {
			const decoded = proto.GetMessagesResponse.toObject(proto.GetMessagesResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetMessagesResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetMessagesResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
