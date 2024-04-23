import * as $protobuf from "protobufjs/minimal.js";
import Long from "long";
/** Namespace getApiNodes. */
export namespace getApiNodes {

    /** Properties of an ApiNode. */
    interface IApiNode {

        /** ApiNode url */
        url?: (string|null);
    }

    /** Represents an ApiNode. */
    class ApiNode implements IApiNode {

        /**
         * Constructs a new ApiNode.
         * @param [properties] Properties to set
         */
        constructor(properties?: getApiNodes.IApiNode);

        /** ApiNode url. */
        public url: string;

        /**
         * Creates a new ApiNode instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ApiNode instance
         */
        public static create(properties?: getApiNodes.IApiNode): getApiNodes.ApiNode;

        /**
         * Encodes the specified ApiNode message. Does not implicitly {@link getApiNodes.ApiNode.verify|verify} messages.
         * @param message ApiNode message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getApiNodes.IApiNode, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ApiNode message, length delimited. Does not implicitly {@link getApiNodes.ApiNode.verify|verify} messages.
         * @param message ApiNode message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getApiNodes.IApiNode, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ApiNode message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ApiNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getApiNodes.ApiNode;

        /**
         * Decodes an ApiNode message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ApiNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getApiNodes.ApiNode;

        /**
         * Verifies an ApiNode message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ApiNode message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ApiNode
         */
        public static fromObject(object: { [k: string]: any }): getApiNodes.ApiNode;

        /**
         * Creates a plain object from an ApiNode message. Also converts values to other types if specified.
         * @param message ApiNode
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getApiNodes.ApiNode, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ApiNode to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ApiNode
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetApiNodesRequest. */
    interface IGetApiNodesRequest {

        /** GetApiNodesRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a GetApiNodesRequest. */
    class GetApiNodesRequest implements IGetApiNodesRequest {

        /**
         * Constructs a new GetApiNodesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getApiNodes.IGetApiNodesRequest);

        /** GetApiNodesRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new GetApiNodesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetApiNodesRequest instance
         */
        public static create(properties?: getApiNodes.IGetApiNodesRequest): getApiNodes.GetApiNodesRequest;

        /**
         * Encodes the specified GetApiNodesRequest message. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @param message GetApiNodesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getApiNodes.IGetApiNodesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetApiNodesRequest message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @param message GetApiNodesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getApiNodes.IGetApiNodesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getApiNodes.GetApiNodesRequest;

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getApiNodes.GetApiNodesRequest;

        /**
         * Verifies a GetApiNodesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetApiNodesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetApiNodesRequest
         */
        public static fromObject(object: { [k: string]: any }): getApiNodes.GetApiNodesRequest;

        /**
         * Creates a plain object from a GetApiNodesRequest message. Also converts values to other types if specified.
         * @param message GetApiNodesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getApiNodes.GetApiNodesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetApiNodesRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetApiNodesRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetApiNodesResponse. */
    interface IGetApiNodesResponse {

        /** GetApiNodesResponse headers */
        headers?: (shared.IHeaders|null);

        /** GetApiNodesResponse apiNodes */
        apiNodes?: (getApiNodes.IApiNode[]|null);
    }

    /** Represents a GetApiNodesResponse. */
    class GetApiNodesResponse implements IGetApiNodesResponse {

        /**
         * Constructs a new GetApiNodesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getApiNodes.IGetApiNodesResponse);

        /** GetApiNodesResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** GetApiNodesResponse apiNodes. */
        public apiNodes: getApiNodes.IApiNode[];

        /**
         * Creates a new GetApiNodesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetApiNodesResponse instance
         */
        public static create(properties?: getApiNodes.IGetApiNodesResponse): getApiNodes.GetApiNodesResponse;

        /**
         * Encodes the specified GetApiNodesResponse message. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @param message GetApiNodesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getApiNodes.IGetApiNodesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetApiNodesResponse message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @param message GetApiNodesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getApiNodes.IGetApiNodesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getApiNodes.GetApiNodesResponse;

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getApiNodes.GetApiNodesResponse;

        /**
         * Verifies a GetApiNodesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetApiNodesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetApiNodesResponse
         */
        public static fromObject(object: { [k: string]: any }): getApiNodes.GetApiNodesResponse;

        /**
         * Creates a plain object from a GetApiNodesResponse message. Also converts values to other types if specified.
         * @param message GetApiNodesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getApiNodes.GetApiNodesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetApiNodesResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetApiNodesResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace getBlocks. */
export namespace getBlocks {

    /** Properties of a GetBlocksRequest. */
    interface IGetBlocksRequest {

        /** GetBlocksRequest fromHeight */
        fromHeight?: (number|null);

        /** GetBlocksRequest limit */
        limit?: (number|null);

        /** GetBlocksRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a GetBlocksRequest. */
    class GetBlocksRequest implements IGetBlocksRequest {

        /**
         * Constructs a new GetBlocksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getBlocks.IGetBlocksRequest);

        /** GetBlocksRequest fromHeight. */
        public fromHeight: number;

        /** GetBlocksRequest limit. */
        public limit: number;

        /** GetBlocksRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new GetBlocksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBlocksRequest instance
         */
        public static create(properties?: getBlocks.IGetBlocksRequest): getBlocks.GetBlocksRequest;

        /**
         * Encodes the specified GetBlocksRequest message. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @param message GetBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getBlocks.IGetBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBlocksRequest message, length delimited. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @param message GetBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getBlocks.IGetBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getBlocks.GetBlocksRequest;

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getBlocks.GetBlocksRequest;

        /**
         * Verifies a GetBlocksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBlocksRequest
         */
        public static fromObject(object: { [k: string]: any }): getBlocks.GetBlocksRequest;

        /**
         * Creates a plain object from a GetBlocksRequest message. Also converts values to other types if specified.
         * @param message GetBlocksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getBlocks.GetBlocksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBlocksRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetBlocksRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetBlocksResponse. */
    interface IGetBlocksResponse {

        /** GetBlocksResponse headers */
        headers?: (shared.IHeaders|null);

        /** GetBlocksResponse blocks */
        blocks?: (Uint8Array[]|null);
    }

    /** Represents a GetBlocksResponse. */
    class GetBlocksResponse implements IGetBlocksResponse {

        /**
         * Constructs a new GetBlocksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getBlocks.IGetBlocksResponse);

        /** GetBlocksResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** GetBlocksResponse blocks. */
        public blocks: Uint8Array[];

        /**
         * Creates a new GetBlocksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBlocksResponse instance
         */
        public static create(properties?: getBlocks.IGetBlocksResponse): getBlocks.GetBlocksResponse;

        /**
         * Encodes the specified GetBlocksResponse message. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @param message GetBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getBlocks.IGetBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBlocksResponse message, length delimited. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @param message GetBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getBlocks.IGetBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getBlocks.GetBlocksResponse;

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getBlocks.GetBlocksResponse;

        /**
         * Verifies a GetBlocksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBlocksResponse
         */
        public static fromObject(object: { [k: string]: any }): getBlocks.GetBlocksResponse;

        /**
         * Creates a plain object from a GetBlocksResponse message. Also converts values to other types if specified.
         * @param message GetBlocksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getBlocks.GetBlocksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBlocksResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetBlocksResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace getMessages. */
export namespace getMessages {

    /** Properties of a GetMessagesRequest. */
    interface IGetMessagesRequest {

        /** GetMessagesRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a GetMessagesRequest. */
    class GetMessagesRequest implements IGetMessagesRequest {

        /**
         * Constructs a new GetMessagesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getMessages.IGetMessagesRequest);

        /** GetMessagesRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new GetMessagesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetMessagesRequest instance
         */
        public static create(properties?: getMessages.IGetMessagesRequest): getMessages.GetMessagesRequest;

        /**
         * Encodes the specified GetMessagesRequest message. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @param message GetMessagesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getMessages.IGetMessagesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetMessagesRequest message, length delimited. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @param message GetMessagesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getMessages.IGetMessagesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getMessages.GetMessagesRequest;

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getMessages.GetMessagesRequest;

        /**
         * Verifies a GetMessagesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetMessagesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetMessagesRequest
         */
        public static fromObject(object: { [k: string]: any }): getMessages.GetMessagesRequest;

        /**
         * Creates a plain object from a GetMessagesRequest message. Also converts values to other types if specified.
         * @param message GetMessagesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getMessages.GetMessagesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetMessagesRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetMessagesRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetMessagesResponse. */
    interface IGetMessagesResponse {

        /** GetMessagesResponse headers */
        headers?: (shared.IHeaders|null);

        /** GetMessagesResponse prevotes */
        prevotes?: (Uint8Array[]|null);

        /** GetMessagesResponse precommits */
        precommits?: (Uint8Array[]|null);
    }

    /** Represents a GetMessagesResponse. */
    class GetMessagesResponse implements IGetMessagesResponse {

        /**
         * Constructs a new GetMessagesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getMessages.IGetMessagesResponse);

        /** GetMessagesResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** GetMessagesResponse prevotes. */
        public prevotes: Uint8Array[];

        /** GetMessagesResponse precommits. */
        public precommits: Uint8Array[];

        /**
         * Creates a new GetMessagesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetMessagesResponse instance
         */
        public static create(properties?: getMessages.IGetMessagesResponse): getMessages.GetMessagesResponse;

        /**
         * Encodes the specified GetMessagesResponse message. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @param message GetMessagesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getMessages.IGetMessagesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetMessagesResponse message, length delimited. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @param message GetMessagesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getMessages.IGetMessagesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getMessages.GetMessagesResponse;

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getMessages.GetMessagesResponse;

        /**
         * Verifies a GetMessagesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetMessagesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetMessagesResponse
         */
        public static fromObject(object: { [k: string]: any }): getMessages.GetMessagesResponse;

        /**
         * Creates a plain object from a GetMessagesResponse message. Also converts values to other types if specified.
         * @param message GetMessagesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getMessages.GetMessagesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetMessagesResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetMessagesResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace getPeers. */
export namespace getPeers {

    /** Properties of a GetPeersRequest. */
    interface IGetPeersRequest {

        /** GetPeersRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a GetPeersRequest. */
    class GetPeersRequest implements IGetPeersRequest {

        /**
         * Constructs a new GetPeersRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getPeers.IGetPeersRequest);

        /** GetPeersRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new GetPeersRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPeersRequest instance
         */
        public static create(properties?: getPeers.IGetPeersRequest): getPeers.GetPeersRequest;

        /**
         * Encodes the specified GetPeersRequest message. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @param message GetPeersRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getPeers.IGetPeersRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPeersRequest message, length delimited. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @param message GetPeersRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getPeers.IGetPeersRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getPeers.GetPeersRequest;

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getPeers.GetPeersRequest;

        /**
         * Verifies a GetPeersRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPeersRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPeersRequest
         */
        public static fromObject(object: { [k: string]: any }): getPeers.GetPeersRequest;

        /**
         * Creates a plain object from a GetPeersRequest message. Also converts values to other types if specified.
         * @param message GetPeersRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getPeers.GetPeersRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPeersRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetPeersRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetPeersResponse. */
    interface IGetPeersResponse {

        /** GetPeersResponse headers */
        headers?: (shared.IHeaders|null);

        /** GetPeersResponse peers */
        peers?: (shared.IPeerLike[]|null);
    }

    /** Represents a GetPeersResponse. */
    class GetPeersResponse implements IGetPeersResponse {

        /**
         * Constructs a new GetPeersResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getPeers.IGetPeersResponse);

        /** GetPeersResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** GetPeersResponse peers. */
        public peers: shared.IPeerLike[];

        /**
         * Creates a new GetPeersResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPeersResponse instance
         */
        public static create(properties?: getPeers.IGetPeersResponse): getPeers.GetPeersResponse;

        /**
         * Encodes the specified GetPeersResponse message. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @param message GetPeersResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getPeers.IGetPeersResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPeersResponse message, length delimited. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @param message GetPeersResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getPeers.IGetPeersResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getPeers.GetPeersResponse;

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getPeers.GetPeersResponse;

        /**
         * Verifies a GetPeersResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPeersResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPeersResponse
         */
        public static fromObject(object: { [k: string]: any }): getPeers.GetPeersResponse;

        /**
         * Creates a plain object from a GetPeersResponse message. Also converts values to other types if specified.
         * @param message GetPeersResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getPeers.GetPeersResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPeersResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetPeersResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace getProposal. */
export namespace getProposal {

    /** Properties of a GetProposalRequest. */
    interface IGetProposalRequest {

        /** GetProposalRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a GetProposalRequest. */
    class GetProposalRequest implements IGetProposalRequest {

        /**
         * Constructs a new GetProposalRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getProposal.IGetProposalRequest);

        /** GetProposalRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new GetProposalRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetProposalRequest instance
         */
        public static create(properties?: getProposal.IGetProposalRequest): getProposal.GetProposalRequest;

        /**
         * Encodes the specified GetProposalRequest message. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @param message GetProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getProposal.IGetProposalRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetProposalRequest message, length delimited. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @param message GetProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getProposal.IGetProposalRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getProposal.GetProposalRequest;

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getProposal.GetProposalRequest;

        /**
         * Verifies a GetProposalRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetProposalRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetProposalRequest
         */
        public static fromObject(object: { [k: string]: any }): getProposal.GetProposalRequest;

        /**
         * Creates a plain object from a GetProposalRequest message. Also converts values to other types if specified.
         * @param message GetProposalRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getProposal.GetProposalRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetProposalRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetProposalRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetProposalResponse. */
    interface IGetProposalResponse {

        /** GetProposalResponse headers */
        headers?: (shared.IHeaders|null);

        /** GetProposalResponse proposal */
        proposal?: (Uint8Array|null);
    }

    /** Represents a GetProposalResponse. */
    class GetProposalResponse implements IGetProposalResponse {

        /**
         * Constructs a new GetProposalResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getProposal.IGetProposalResponse);

        /** GetProposalResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** GetProposalResponse proposal. */
        public proposal: Uint8Array;

        /**
         * Creates a new GetProposalResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetProposalResponse instance
         */
        public static create(properties?: getProposal.IGetProposalResponse): getProposal.GetProposalResponse;

        /**
         * Encodes the specified GetProposalResponse message. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @param message GetProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getProposal.IGetProposalResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetProposalResponse message, length delimited. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @param message GetProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getProposal.IGetProposalResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getProposal.GetProposalResponse;

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getProposal.GetProposalResponse;

        /**
         * Verifies a GetProposalResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetProposalResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetProposalResponse
         */
        public static fromObject(object: { [k: string]: any }): getProposal.GetProposalResponse;

        /**
         * Creates a plain object from a GetProposalResponse message. Also converts values to other types if specified.
         * @param message GetProposalResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getProposal.GetProposalResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetProposalResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetProposalResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace getStatus. */
export namespace getStatus {

    /** Properties of a GetStatusRequest. */
    interface IGetStatusRequest {

        /** GetStatusRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a GetStatusRequest. */
    class GetStatusRequest implements IGetStatusRequest {

        /**
         * Constructs a new GetStatusRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getStatus.IGetStatusRequest);

        /** GetStatusRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new GetStatusRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetStatusRequest instance
         */
        public static create(properties?: getStatus.IGetStatusRequest): getStatus.GetStatusRequest;

        /**
         * Encodes the specified GetStatusRequest message. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @param message GetStatusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getStatus.IGetStatusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetStatusRequest message, length delimited. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @param message GetStatusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getStatus.IGetStatusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusRequest;

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusRequest;

        /**
         * Verifies a GetStatusRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetStatusRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetStatusRequest
         */
        public static fromObject(object: { [k: string]: any }): getStatus.GetStatusRequest;

        /**
         * Creates a plain object from a GetStatusRequest message. Also converts values to other types if specified.
         * @param message GetStatusRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getStatus.GetStatusRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetStatusRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetStatusRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetStatusResponse. */
    interface IGetStatusResponse {

        /** GetStatusResponse headers */
        headers?: (shared.IHeaders|null);

        /** GetStatusResponse state */
        state?: (getStatus.GetStatusResponse.IState|null);

        /** GetStatusResponse config */
        config?: (getStatus.GetStatusResponse.IConfig|null);
    }

    /** Represents a GetStatusResponse. */
    class GetStatusResponse implements IGetStatusResponse {

        /**
         * Constructs a new GetStatusResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getStatus.IGetStatusResponse);

        /** GetStatusResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** GetStatusResponse state. */
        public state?: (getStatus.GetStatusResponse.IState|null);

        /** GetStatusResponse config. */
        public config?: (getStatus.GetStatusResponse.IConfig|null);

        /**
         * Creates a new GetStatusResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetStatusResponse instance
         */
        public static create(properties?: getStatus.IGetStatusResponse): getStatus.GetStatusResponse;

        /**
         * Encodes the specified GetStatusResponse message. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @param message GetStatusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: getStatus.IGetStatusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetStatusResponse message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @param message GetStatusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: getStatus.IGetStatusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse;

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse;

        /**
         * Verifies a GetStatusResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetStatusResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetStatusResponse
         */
        public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse;

        /**
         * Creates a plain object from a GetStatusResponse message. Also converts values to other types if specified.
         * @param message GetStatusResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: getStatus.GetStatusResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetStatusResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetStatusResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace GetStatusResponse {

        /** Properties of a State. */
        interface IState {

            /** State height */
            height?: (number|null);

            /** State forgingAllowed */
            forgingAllowed?: (boolean|null);

            /** State currentSlot */
            currentSlot?: (number|null);

            /** State header */
            header?: (getStatus.GetStatusResponse.State.IBlockHeader|null);
        }

        /** Represents a State. */
        class State implements IState {

            /**
             * Constructs a new State.
             * @param [properties] Properties to set
             */
            constructor(properties?: getStatus.GetStatusResponse.IState);

            /** State height. */
            public height: number;

            /** State forgingAllowed. */
            public forgingAllowed: boolean;

            /** State currentSlot. */
            public currentSlot: number;

            /** State header. */
            public header?: (getStatus.GetStatusResponse.State.IBlockHeader|null);

            /**
             * Creates a new State instance using the specified properties.
             * @param [properties] Properties to set
             * @returns State instance
             */
            public static create(properties?: getStatus.GetStatusResponse.IState): getStatus.GetStatusResponse.State;

            /**
             * Encodes the specified State message. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @param message State message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: getStatus.GetStatusResponse.IState, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified State message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @param message State message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: getStatus.GetStatusResponse.IState, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a State message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.State;

            /**
             * Decodes a State message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.State;

            /**
             * Verifies a State message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a State message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns State
             */
            public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.State;

            /**
             * Creates a plain object from a State message. Also converts values to other types if specified.
             * @param message State
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: getStatus.GetStatusResponse.State, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this State to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for State
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace State {

            /** Properties of a BlockHeader. */
            interface IBlockHeader {

                /** BlockHeader id */
                id?: (string|null);

                /** BlockHeader version */
                version?: (number|null);

                /** BlockHeader timestamp */
                timestamp?: (number|null);

                /** BlockHeader previousBlock */
                previousBlock?: (string|null);

                /** BlockHeader height */
                height?: (number|null);

                /** BlockHeader numberOfTransactions */
                numberOfTransactions?: (number|null);

                /** BlockHeader totalAmount */
                totalAmount?: (string|null);

                /** BlockHeader totalFee */
                totalFee?: (string|null);

                /** BlockHeader reward */
                reward?: (string|null);

                /** BlockHeader payloadLength */
                payloadLength?: (number|null);

                /** BlockHeader payloadHash */
                payloadHash?: (string|null);

                /** BlockHeader generatorPublicKey */
                generatorPublicKey?: (string|null);

                /** BlockHeader blockSignature */
                blockSignature?: (string|null);
            }

            /** Represents a BlockHeader. */
            class BlockHeader implements IBlockHeader {

                /**
                 * Constructs a new BlockHeader.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: getStatus.GetStatusResponse.State.IBlockHeader);

                /** BlockHeader id. */
                public id: string;

                /** BlockHeader version. */
                public version: number;

                /** BlockHeader timestamp. */
                public timestamp: number;

                /** BlockHeader previousBlock. */
                public previousBlock: string;

                /** BlockHeader height. */
                public height: number;

                /** BlockHeader numberOfTransactions. */
                public numberOfTransactions: number;

                /** BlockHeader totalAmount. */
                public totalAmount: string;

                /** BlockHeader totalFee. */
                public totalFee: string;

                /** BlockHeader reward. */
                public reward: string;

                /** BlockHeader payloadLength. */
                public payloadLength: number;

                /** BlockHeader payloadHash. */
                public payloadHash: string;

                /** BlockHeader generatorPublicKey. */
                public generatorPublicKey: string;

                /** BlockHeader blockSignature. */
                public blockSignature: string;

                /**
                 * Creates a new BlockHeader instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns BlockHeader instance
                 */
                public static create(properties?: getStatus.GetStatusResponse.State.IBlockHeader): getStatus.GetStatusResponse.State.BlockHeader;

                /**
                 * Encodes the specified BlockHeader message. Does not implicitly {@link getStatus.GetStatusResponse.State.BlockHeader.verify|verify} messages.
                 * @param message BlockHeader message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: getStatus.GetStatusResponse.State.IBlockHeader, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified BlockHeader message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.State.BlockHeader.verify|verify} messages.
                 * @param message BlockHeader message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: getStatus.GetStatusResponse.State.IBlockHeader, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a BlockHeader message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns BlockHeader
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.State.BlockHeader;

                /**
                 * Decodes a BlockHeader message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns BlockHeader
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.State.BlockHeader;

                /**
                 * Verifies a BlockHeader message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a BlockHeader message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns BlockHeader
                 */
                public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.State.BlockHeader;

                /**
                 * Creates a plain object from a BlockHeader message. Also converts values to other types if specified.
                 * @param message BlockHeader
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: getStatus.GetStatusResponse.State.BlockHeader, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this BlockHeader to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for BlockHeader
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of a Config. */
        interface IConfig {

            /** Config version */
            version?: (string|null);

            /** Config network */
            network?: (getStatus.GetStatusResponse.Config.INetwork|null);

            /** Config plugins */
            plugins?: ({ [k: string]: getStatus.GetStatusResponse.Config.IPlugin }|null);
        }

        /** Represents a Config. */
        class Config implements IConfig {

            /**
             * Constructs a new Config.
             * @param [properties] Properties to set
             */
            constructor(properties?: getStatus.GetStatusResponse.IConfig);

            /** Config version. */
            public version: string;

            /** Config network. */
            public network?: (getStatus.GetStatusResponse.Config.INetwork|null);

            /** Config plugins. */
            public plugins: { [k: string]: getStatus.GetStatusResponse.Config.IPlugin };

            /**
             * Creates a new Config instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Config instance
             */
            public static create(properties?: getStatus.GetStatusResponse.IConfig): getStatus.GetStatusResponse.Config;

            /**
             * Encodes the specified Config message. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @param message Config message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: getStatus.GetStatusResponse.IConfig, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Config message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @param message Config message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: getStatus.GetStatusResponse.IConfig, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Config message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config;

            /**
             * Decodes a Config message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config;

            /**
             * Verifies a Config message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Config message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Config
             */
            public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config;

            /**
             * Creates a plain object from a Config message. Also converts values to other types if specified.
             * @param message Config
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: getStatus.GetStatusResponse.Config, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Config to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Config
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace Config {

            /** Properties of a Network. */
            interface INetwork {

                /** Network name */
                name?: (string|null);

                /** Network nethash */
                nethash?: (string|null);

                /** Network explorer */
                explorer?: (string|null);

                /** Network token */
                token?: (getStatus.GetStatusResponse.Config.Network.IToken|null);

                /** Network version */
                version?: (number|null);
            }

            /** Represents a Network. */
            class Network implements INetwork {

                /**
                 * Constructs a new Network.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: getStatus.GetStatusResponse.Config.INetwork);

                /** Network name. */
                public name: string;

                /** Network nethash. */
                public nethash: string;

                /** Network explorer. */
                public explorer: string;

                /** Network token. */
                public token?: (getStatus.GetStatusResponse.Config.Network.IToken|null);

                /** Network version. */
                public version: number;

                /**
                 * Creates a new Network instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Network instance
                 */
                public static create(properties?: getStatus.GetStatusResponse.Config.INetwork): getStatus.GetStatusResponse.Config.Network;

                /**
                 * Encodes the specified Network message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @param message Network message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: getStatus.GetStatusResponse.Config.INetwork, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Network message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @param message Network message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: getStatus.GetStatusResponse.Config.INetwork, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Network message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config.Network;

                /**
                 * Decodes a Network message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config.Network;

                /**
                 * Verifies a Network message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Network message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Network
                 */
                public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config.Network;

                /**
                 * Creates a plain object from a Network message. Also converts values to other types if specified.
                 * @param message Network
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: getStatus.GetStatusResponse.Config.Network, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Network to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Network
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace Network {

                /** Properties of a Token. */
                interface IToken {

                    /** Token name */
                    name?: (string|null);

                    /** Token symbol */
                    symbol?: (string|null);
                }

                /** Represents a Token. */
                class Token implements IToken {

                    /**
                     * Constructs a new Token.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: getStatus.GetStatusResponse.Config.Network.IToken);

                    /** Token name. */
                    public name: string;

                    /** Token symbol. */
                    public symbol: string;

                    /**
                     * Creates a new Token instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Token instance
                     */
                    public static create(properties?: getStatus.GetStatusResponse.Config.Network.IToken): getStatus.GetStatusResponse.Config.Network.Token;

                    /**
                     * Encodes the specified Token message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @param message Token message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: getStatus.GetStatusResponse.Config.Network.IToken, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Token message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @param message Token message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: getStatus.GetStatusResponse.Config.Network.IToken, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Token message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config.Network.Token;

                    /**
                     * Decodes a Token message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config.Network.Token;

                    /**
                     * Verifies a Token message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Token message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Token
                     */
                    public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config.Network.Token;

                    /**
                     * Creates a plain object from a Token message. Also converts values to other types if specified.
                     * @param message Token
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: getStatus.GetStatusResponse.Config.Network.Token, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Token to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Token
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }
            }

            /** Properties of a Plugin. */
            interface IPlugin {

                /** Plugin port */
                port?: (number|null);

                /** Plugin enabled */
                enabled?: (boolean|null);

                /** Plugin estimateTotalCount */
                estimateTotalCount?: (boolean|null);
            }

            /** Represents a Plugin. */
            class Plugin implements IPlugin {

                /**
                 * Constructs a new Plugin.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: getStatus.GetStatusResponse.Config.IPlugin);

                /** Plugin port. */
                public port: number;

                /** Plugin enabled. */
                public enabled: boolean;

                /** Plugin estimateTotalCount. */
                public estimateTotalCount: boolean;

                /**
                 * Creates a new Plugin instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Plugin instance
                 */
                public static create(properties?: getStatus.GetStatusResponse.Config.IPlugin): getStatus.GetStatusResponse.Config.Plugin;

                /**
                 * Encodes the specified Plugin message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @param message Plugin message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: getStatus.GetStatusResponse.Config.IPlugin, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Plugin message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @param message Plugin message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: getStatus.GetStatusResponse.Config.IPlugin, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Plugin message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config.Plugin;

                /**
                 * Decodes a Plugin message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config.Plugin;

                /**
                 * Verifies a Plugin message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Plugin message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Plugin
                 */
                public static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config.Plugin;

                /**
                 * Creates a plain object from a Plugin message. Also converts values to other types if specified.
                 * @param message Plugin
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: getStatus.GetStatusResponse.Config.Plugin, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Plugin to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Plugin
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }
    }
}

/** Namespace postPrecommit. */
export namespace postPrecommit {

    /** Properties of a PostPrecommitRequest. */
    interface IPostPrecommitRequest {

        /** PostPrecommitRequest precommit */
        precommit?: (Uint8Array|null);

        /** PostPrecommitRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostPrecommitRequest. */
    class PostPrecommitRequest implements IPostPrecommitRequest {

        /**
         * Constructs a new PostPrecommitRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: postPrecommit.IPostPrecommitRequest);

        /** PostPrecommitRequest precommit. */
        public precommit: Uint8Array;

        /** PostPrecommitRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostPrecommitRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostPrecommitRequest instance
         */
        public static create(properties?: postPrecommit.IPostPrecommitRequest): postPrecommit.PostPrecommitRequest;

        /**
         * Encodes the specified PostPrecommitRequest message. Does not implicitly {@link postPrecommit.PostPrecommitRequest.verify|verify} messages.
         * @param message PostPrecommitRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postPrecommit.IPostPrecommitRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostPrecommitRequest message, length delimited. Does not implicitly {@link postPrecommit.PostPrecommitRequest.verify|verify} messages.
         * @param message PostPrecommitRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postPrecommit.IPostPrecommitRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostPrecommitRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostPrecommitRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postPrecommit.PostPrecommitRequest;

        /**
         * Decodes a PostPrecommitRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostPrecommitRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postPrecommit.PostPrecommitRequest;

        /**
         * Verifies a PostPrecommitRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostPrecommitRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostPrecommitRequest
         */
        public static fromObject(object: { [k: string]: any }): postPrecommit.PostPrecommitRequest;

        /**
         * Creates a plain object from a PostPrecommitRequest message. Also converts values to other types if specified.
         * @param message PostPrecommitRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postPrecommit.PostPrecommitRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostPrecommitRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostPrecommitRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PostPrecommitResponse. */
    interface IPostPrecommitResponse {

        /** PostPrecommitResponse headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostPrecommitResponse. */
    class PostPrecommitResponse implements IPostPrecommitResponse {

        /**
         * Constructs a new PostPrecommitResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: postPrecommit.IPostPrecommitResponse);

        /** PostPrecommitResponse headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostPrecommitResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostPrecommitResponse instance
         */
        public static create(properties?: postPrecommit.IPostPrecommitResponse): postPrecommit.PostPrecommitResponse;

        /**
         * Encodes the specified PostPrecommitResponse message. Does not implicitly {@link postPrecommit.PostPrecommitResponse.verify|verify} messages.
         * @param message PostPrecommitResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postPrecommit.IPostPrecommitResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostPrecommitResponse message, length delimited. Does not implicitly {@link postPrecommit.PostPrecommitResponse.verify|verify} messages.
         * @param message PostPrecommitResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postPrecommit.IPostPrecommitResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostPrecommitResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostPrecommitResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postPrecommit.PostPrecommitResponse;

        /**
         * Decodes a PostPrecommitResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostPrecommitResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postPrecommit.PostPrecommitResponse;

        /**
         * Verifies a PostPrecommitResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostPrecommitResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostPrecommitResponse
         */
        public static fromObject(object: { [k: string]: any }): postPrecommit.PostPrecommitResponse;

        /**
         * Creates a plain object from a PostPrecommitResponse message. Also converts values to other types if specified.
         * @param message PostPrecommitResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postPrecommit.PostPrecommitResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostPrecommitResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostPrecommitResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace postPrevote. */
export namespace postPrevote {

    /** Properties of a PostPrevoteRequest. */
    interface IPostPrevoteRequest {

        /** PostPrevoteRequest prevote */
        prevote?: (Uint8Array|null);

        /** PostPrevoteRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostPrevoteRequest. */
    class PostPrevoteRequest implements IPostPrevoteRequest {

        /**
         * Constructs a new PostPrevoteRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: postPrevote.IPostPrevoteRequest);

        /** PostPrevoteRequest prevote. */
        public prevote: Uint8Array;

        /** PostPrevoteRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostPrevoteRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostPrevoteRequest instance
         */
        public static create(properties?: postPrevote.IPostPrevoteRequest): postPrevote.PostPrevoteRequest;

        /**
         * Encodes the specified PostPrevoteRequest message. Does not implicitly {@link postPrevote.PostPrevoteRequest.verify|verify} messages.
         * @param message PostPrevoteRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postPrevote.IPostPrevoteRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostPrevoteRequest message, length delimited. Does not implicitly {@link postPrevote.PostPrevoteRequest.verify|verify} messages.
         * @param message PostPrevoteRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postPrevote.IPostPrevoteRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostPrevoteRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostPrevoteRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postPrevote.PostPrevoteRequest;

        /**
         * Decodes a PostPrevoteRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostPrevoteRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postPrevote.PostPrevoteRequest;

        /**
         * Verifies a PostPrevoteRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostPrevoteRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostPrevoteRequest
         */
        public static fromObject(object: { [k: string]: any }): postPrevote.PostPrevoteRequest;

        /**
         * Creates a plain object from a PostPrevoteRequest message. Also converts values to other types if specified.
         * @param message PostPrevoteRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postPrevote.PostPrevoteRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostPrevoteRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostPrevoteRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PostPrevoteResponse. */
    interface IPostPrevoteResponse {

        /** PostPrevoteResponse headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostPrevoteResponse. */
    class PostPrevoteResponse implements IPostPrevoteResponse {

        /**
         * Constructs a new PostPrevoteResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: postPrevote.IPostPrevoteResponse);

        /** PostPrevoteResponse headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostPrevoteResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostPrevoteResponse instance
         */
        public static create(properties?: postPrevote.IPostPrevoteResponse): postPrevote.PostPrevoteResponse;

        /**
         * Encodes the specified PostPrevoteResponse message. Does not implicitly {@link postPrevote.PostPrevoteResponse.verify|verify} messages.
         * @param message PostPrevoteResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postPrevote.IPostPrevoteResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostPrevoteResponse message, length delimited. Does not implicitly {@link postPrevote.PostPrevoteResponse.verify|verify} messages.
         * @param message PostPrevoteResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postPrevote.IPostPrevoteResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostPrevoteResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostPrevoteResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postPrevote.PostPrevoteResponse;

        /**
         * Decodes a PostPrevoteResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostPrevoteResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postPrevote.PostPrevoteResponse;

        /**
         * Verifies a PostPrevoteResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostPrevoteResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostPrevoteResponse
         */
        public static fromObject(object: { [k: string]: any }): postPrevote.PostPrevoteResponse;

        /**
         * Creates a plain object from a PostPrevoteResponse message. Also converts values to other types if specified.
         * @param message PostPrevoteResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postPrevote.PostPrevoteResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostPrevoteResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostPrevoteResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace postProposal. */
export namespace postProposal {

    /** Properties of a PostProposalRequest. */
    interface IPostProposalRequest {

        /** PostProposalRequest proposal */
        proposal?: (Uint8Array|null);

        /** PostProposalRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostProposalRequest. */
    class PostProposalRequest implements IPostProposalRequest {

        /**
         * Constructs a new PostProposalRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: postProposal.IPostProposalRequest);

        /** PostProposalRequest proposal. */
        public proposal: Uint8Array;

        /** PostProposalRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostProposalRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostProposalRequest instance
         */
        public static create(properties?: postProposal.IPostProposalRequest): postProposal.PostProposalRequest;

        /**
         * Encodes the specified PostProposalRequest message. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @param message PostProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postProposal.IPostProposalRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostProposalRequest message, length delimited. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @param message PostProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postProposal.IPostProposalRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postProposal.PostProposalRequest;

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postProposal.PostProposalRequest;

        /**
         * Verifies a PostProposalRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostProposalRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostProposalRequest
         */
        public static fromObject(object: { [k: string]: any }): postProposal.PostProposalRequest;

        /**
         * Creates a plain object from a PostProposalRequest message. Also converts values to other types if specified.
         * @param message PostProposalRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postProposal.PostProposalRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostProposalRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostProposalRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PostProposalResponse. */
    interface IPostProposalResponse {

        /** PostProposalResponse headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostProposalResponse. */
    class PostProposalResponse implements IPostProposalResponse {

        /**
         * Constructs a new PostProposalResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: postProposal.IPostProposalResponse);

        /** PostProposalResponse headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostProposalResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostProposalResponse instance
         */
        public static create(properties?: postProposal.IPostProposalResponse): postProposal.PostProposalResponse;

        /**
         * Encodes the specified PostProposalResponse message. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @param message PostProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postProposal.IPostProposalResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostProposalResponse message, length delimited. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @param message PostProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postProposal.IPostProposalResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postProposal.PostProposalResponse;

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postProposal.PostProposalResponse;

        /**
         * Verifies a PostProposalResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostProposalResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostProposalResponse
         */
        public static fromObject(object: { [k: string]: any }): postProposal.PostProposalResponse;

        /**
         * Creates a plain object from a PostProposalResponse message. Also converts values to other types if specified.
         * @param message PostProposalResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postProposal.PostProposalResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostProposalResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostProposalResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace postTransactions. */
export namespace postTransactions {

    /** Properties of a PostTransactionsRequest. */
    interface IPostTransactionsRequest {

        /** PostTransactionsRequest transactions */
        transactions?: (Uint8Array|null);

        /** PostTransactionsRequest headers */
        headers?: (shared.IHeaders|null);
    }

    /** Represents a PostTransactionsRequest. */
    class PostTransactionsRequest implements IPostTransactionsRequest {

        /**
         * Constructs a new PostTransactionsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: postTransactions.IPostTransactionsRequest);

        /** PostTransactionsRequest transactions. */
        public transactions: Uint8Array;

        /** PostTransactionsRequest headers. */
        public headers?: (shared.IHeaders|null);

        /**
         * Creates a new PostTransactionsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostTransactionsRequest instance
         */
        public static create(properties?: postTransactions.IPostTransactionsRequest): postTransactions.PostTransactionsRequest;

        /**
         * Encodes the specified PostTransactionsRequest message. Does not implicitly {@link postTransactions.PostTransactionsRequest.verify|verify} messages.
         * @param message PostTransactionsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postTransactions.IPostTransactionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostTransactionsRequest message, length delimited. Does not implicitly {@link postTransactions.PostTransactionsRequest.verify|verify} messages.
         * @param message PostTransactionsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postTransactions.IPostTransactionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostTransactionsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostTransactionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postTransactions.PostTransactionsRequest;

        /**
         * Decodes a PostTransactionsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostTransactionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postTransactions.PostTransactionsRequest;

        /**
         * Verifies a PostTransactionsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostTransactionsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostTransactionsRequest
         */
        public static fromObject(object: { [k: string]: any }): postTransactions.PostTransactionsRequest;

        /**
         * Creates a plain object from a PostTransactionsRequest message. Also converts values to other types if specified.
         * @param message PostTransactionsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postTransactions.PostTransactionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostTransactionsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostTransactionsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PostTransactionsResponse. */
    interface IPostTransactionsResponse {

        /** PostTransactionsResponse headers */
        headers?: (shared.IHeaders|null);

        /** PostTransactionsResponse accept */
        accept?: (number[]|null);
    }

    /** Represents a PostTransactionsResponse. */
    class PostTransactionsResponse implements IPostTransactionsResponse {

        /**
         * Constructs a new PostTransactionsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: postTransactions.IPostTransactionsResponse);

        /** PostTransactionsResponse headers. */
        public headers?: (shared.IHeaders|null);

        /** PostTransactionsResponse accept. */
        public accept: number[];

        /**
         * Creates a new PostTransactionsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostTransactionsResponse instance
         */
        public static create(properties?: postTransactions.IPostTransactionsResponse): postTransactions.PostTransactionsResponse;

        /**
         * Encodes the specified PostTransactionsResponse message. Does not implicitly {@link postTransactions.PostTransactionsResponse.verify|verify} messages.
         * @param message PostTransactionsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: postTransactions.IPostTransactionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostTransactionsResponse message, length delimited. Does not implicitly {@link postTransactions.PostTransactionsResponse.verify|verify} messages.
         * @param message PostTransactionsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: postTransactions.IPostTransactionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostTransactionsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PostTransactionsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postTransactions.PostTransactionsResponse;

        /**
         * Decodes a PostTransactionsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PostTransactionsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postTransactions.PostTransactionsResponse;

        /**
         * Verifies a PostTransactionsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostTransactionsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostTransactionsResponse
         */
        public static fromObject(object: { [k: string]: any }): postTransactions.PostTransactionsResponse;

        /**
         * Creates a plain object from a PostTransactionsResponse message. Also converts values to other types if specified.
         * @param message PostTransactionsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: postTransactions.PostTransactionsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostTransactionsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PostTransactionsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace shared. */
export namespace shared {

    /** Properties of a Headers. */
    interface IHeaders {

        /** Headers version */
        version?: (string|null);

        /** Headers height */
        height?: (number|null);

        /** Headers round */
        round?: (number|null);

        /** Headers step */
        step?: (number|null);

        /** Headers proposedBlockId */
        proposedBlockId?: (string|null);

        /** Headers validatorsSignedPrevote */
        validatorsSignedPrevote?: (boolean[]|null);

        /** Headers validatorsSignedPrecommit */
        validatorsSignedPrecommit?: (boolean[]|null);
    }

    /** Represents a Headers. */
    class Headers implements IHeaders {

        /**
         * Constructs a new Headers.
         * @param [properties] Properties to set
         */
        constructor(properties?: shared.IHeaders);

        /** Headers version. */
        public version: string;

        /** Headers height. */
        public height: number;

        /** Headers round. */
        public round: number;

        /** Headers step. */
        public step: number;

        /** Headers proposedBlockId. */
        public proposedBlockId?: (string|null);

        /** Headers validatorsSignedPrevote. */
        public validatorsSignedPrevote: boolean[];

        /** Headers validatorsSignedPrecommit. */
        public validatorsSignedPrecommit: boolean[];

        /** Headers _proposedBlockId. */
        public _proposedBlockId?: "proposedBlockId";

        /**
         * Creates a new Headers instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Headers instance
         */
        public static create(properties?: shared.IHeaders): shared.Headers;

        /**
         * Encodes the specified Headers message. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @param message Headers message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: shared.IHeaders, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Headers message, length delimited. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @param message Headers message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: shared.IHeaders, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Headers message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): shared.Headers;

        /**
         * Decodes a Headers message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): shared.Headers;

        /**
         * Verifies a Headers message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Headers message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Headers
         */
        public static fromObject(object: { [k: string]: any }): shared.Headers;

        /**
         * Creates a plain object from a Headers message. Also converts values to other types if specified.
         * @param message Headers
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: shared.Headers, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Headers to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Headers
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PeerLike. */
    interface IPeerLike {

        /** PeerLike ip */
        ip?: (string|null);

        /** PeerLike port */
        port?: (number|null);

        /** PeerLike protocol */
        protocol?: (number|null);
    }

    /** Represents a PeerLike. */
    class PeerLike implements IPeerLike {

        /**
         * Constructs a new PeerLike.
         * @param [properties] Properties to set
         */
        constructor(properties?: shared.IPeerLike);

        /** PeerLike ip. */
        public ip: string;

        /** PeerLike port. */
        public port: number;

        /** PeerLike protocol. */
        public protocol: number;

        /**
         * Creates a new PeerLike instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PeerLike instance
         */
        public static create(properties?: shared.IPeerLike): shared.PeerLike;

        /**
         * Encodes the specified PeerLike message. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @param message PeerLike message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: shared.IPeerLike, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PeerLike message, length delimited. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @param message PeerLike message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: shared.IPeerLike, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PeerLike message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): shared.PeerLike;

        /**
         * Decodes a PeerLike message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): shared.PeerLike;

        /**
         * Verifies a PeerLike message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PeerLike message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PeerLike
         */
        public static fromObject(object: { [k: string]: any }): shared.PeerLike;

        /**
         * Creates a plain object from a PeerLike message. Also converts values to other types if specified.
         * @param message PeerLike
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: shared.PeerLike, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PeerLike to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PeerLike
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
