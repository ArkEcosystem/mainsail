import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace getApiNodes. */
export namespace getApiNodes {

    /**
     * Properties of an ApiNode.
     * @deprecated Use getApiNodes.ApiNode.$Properties instead.
     */
    interface IApiNode extends getApiNodes.ApiNode.$Properties {
    }

    /** Represents an ApiNode. */
    class ApiNode {

        /**
         * Constructs a new ApiNode.
         * @param [properties] Properties to set
         */
        constructor(properties?: getApiNodes.ApiNode.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ApiNode url. */
        url: string;

        /**
         * Creates a new ApiNode instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ApiNode instance
         */
        static create(properties: getApiNodes.ApiNode.$Shape): getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape;
        static create(properties?: getApiNodes.ApiNode.$Properties): getApiNodes.ApiNode;

        /**
         * Encodes the specified ApiNode message. Does not implicitly {@link getApiNodes.ApiNode.verify|verify} messages.
         * @param message ApiNode message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getApiNodes.ApiNode.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ApiNode message, length delimited. Does not implicitly {@link getApiNodes.ApiNode.verify|verify} messages.
         * @param message ApiNode message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getApiNodes.ApiNode.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ApiNode message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape} ApiNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape;

        /**
         * Decodes an ApiNode message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape} ApiNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape;

        /**
         * Verifies an ApiNode message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ApiNode message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ApiNode
         */
        static fromObject(object: { [k: string]: any }): getApiNodes.ApiNode;

        /**
         * Creates a plain object from an ApiNode message. Also converts values to other types if specified.
         * @param message ApiNode
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getApiNodes.ApiNode, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ApiNode to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ApiNode
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ApiNode {

        /** Properties of an ApiNode. */
        interface $Properties {

            /** ApiNode url */
            url?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an ApiNode. */
        type $Shape = getApiNodes.ApiNode.$Properties;
    }

    /**
     * Properties of a GetApiNodesRequest.
     * @deprecated Use getApiNodes.GetApiNodesRequest.$Properties instead.
     */
    interface IGetApiNodesRequest extends getApiNodes.GetApiNodesRequest.$Properties {
    }

    /** Represents a GetApiNodesRequest. */
    class GetApiNodesRequest {

        /**
         * Constructs a new GetApiNodesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getApiNodes.GetApiNodesRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetApiNodesRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new GetApiNodesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetApiNodesRequest instance
         */
        static create(properties: getApiNodes.GetApiNodesRequest.$Shape): getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape;
        static create(properties?: getApiNodes.GetApiNodesRequest.$Properties): getApiNodes.GetApiNodesRequest;

        /**
         * Encodes the specified GetApiNodesRequest message. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @param message GetApiNodesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getApiNodes.GetApiNodesRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetApiNodesRequest message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @param message GetApiNodesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getApiNodes.GetApiNodesRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape} GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape;

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape} GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape;

        /**
         * Verifies a GetApiNodesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetApiNodesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetApiNodesRequest
         */
        static fromObject(object: { [k: string]: any }): getApiNodes.GetApiNodesRequest;

        /**
         * Creates a plain object from a GetApiNodesRequest message. Also converts values to other types if specified.
         * @param message GetApiNodesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getApiNodes.GetApiNodesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetApiNodesRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetApiNodesRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetApiNodesRequest {

        /** Properties of a GetApiNodesRequest. */
        interface $Properties {

            /** GetApiNodesRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetApiNodesRequest. */
        type $Shape = getApiNodes.GetApiNodesRequest.$Properties;
    }

    /**
     * Properties of a GetApiNodesResponse.
     * @deprecated Use getApiNodes.GetApiNodesResponse.$Properties instead.
     */
    interface IGetApiNodesResponse extends getApiNodes.GetApiNodesResponse.$Properties {
    }

    /** Represents a GetApiNodesResponse. */
    class GetApiNodesResponse {

        /**
         * Constructs a new GetApiNodesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getApiNodes.GetApiNodesResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetApiNodesResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetApiNodesResponse apiNodes. */
        apiNodes: getApiNodes.ApiNode.$Properties[];

        /**
         * Creates a new GetApiNodesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetApiNodesResponse instance
         */
        static create(properties: getApiNodes.GetApiNodesResponse.$Shape): getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape;
        static create(properties?: getApiNodes.GetApiNodesResponse.$Properties): getApiNodes.GetApiNodesResponse;

        /**
         * Encodes the specified GetApiNodesResponse message. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @param message GetApiNodesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getApiNodes.GetApiNodesResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetApiNodesResponse message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @param message GetApiNodesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getApiNodes.GetApiNodesResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape} GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape;

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape} GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape;

        /**
         * Verifies a GetApiNodesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetApiNodesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetApiNodesResponse
         */
        static fromObject(object: { [k: string]: any }): getApiNodes.GetApiNodesResponse;

        /**
         * Creates a plain object from a GetApiNodesResponse message. Also converts values to other types if specified.
         * @param message GetApiNodesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getApiNodes.GetApiNodesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetApiNodesResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetApiNodesResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetApiNodesResponse {

        /** Properties of a GetApiNodesResponse. */
        interface $Properties {

            /** GetApiNodesResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetApiNodesResponse apiNodes */
            apiNodes?: (getApiNodes.ApiNode.$Properties[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetApiNodesResponse. */
        type $Shape = getApiNodes.GetApiNodesResponse.$Properties;
    }
}

/** Namespace shared. */
export namespace shared {

    /**
     * Properties of a Headers.
     * @deprecated Use shared.Headers.$Properties instead.
     */
    interface IHeaders extends shared.Headers.$Properties {
    }

    /** Represents a Headers. */
    class Headers {

        /**
         * Constructs a new Headers.
         * @param [properties] Properties to set
         */
        constructor(properties?: shared.Headers.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Headers version. */
        version: string;

        /** Headers blockNumber. */
        blockNumber: number;

        /** Headers round. */
        round: number;

        /** Headers step. */
        step: number;

        /** Headers proposedBlockHash. */
        proposedBlockHash?: (string|null);

        /** Headers validatorsSignedPrevote. */
        validatorsSignedPrevote: boolean[];

        /** Headers validatorsSignedPrecommit. */
        validatorsSignedPrecommit: boolean[];

        /**
         * Creates a new Headers instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Headers instance
         */
        static create(properties: shared.Headers.$Shape): shared.Headers & shared.Headers.$Shape;
        static create(properties?: shared.Headers.$Properties): shared.Headers;

        /**
         * Encodes the specified Headers message. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @param message Headers message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: shared.Headers.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Headers message, length delimited. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @param message Headers message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: shared.Headers.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Headers message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {shared.Headers & shared.Headers.$Shape} Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): shared.Headers & shared.Headers.$Shape;

        /**
         * Decodes a Headers message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {shared.Headers & shared.Headers.$Shape} Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): shared.Headers & shared.Headers.$Shape;

        /**
         * Verifies a Headers message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Headers message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Headers
         */
        static fromObject(object: { [k: string]: any }): shared.Headers;

        /**
         * Creates a plain object from a Headers message. Also converts values to other types if specified.
         * @param message Headers
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: shared.Headers, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Headers to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Headers
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Headers {

        /** Properties of a Headers. */
        interface $Properties {

            /** Headers version */
            version?: (string|null);

            /** Headers blockNumber */
            blockNumber?: (number|null);

            /** Headers round */
            round?: (number|null);

            /** Headers step */
            step?: (number|null);

            /** Headers proposedBlockHash */
            proposedBlockHash?: (string|null);

            /** Headers validatorsSignedPrevote */
            validatorsSignedPrevote?: (boolean[]|null);

            /** Headers validatorsSignedPrecommit */
            validatorsSignedPrecommit?: (boolean[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Headers. */
        type $Shape = shared.Headers.$Properties;
    }

    /**
     * Properties of a PeerLike.
     * @deprecated Use shared.PeerLike.$Properties instead.
     */
    interface IPeerLike extends shared.PeerLike.$Properties {
    }

    /** Represents a PeerLike. */
    class PeerLike {

        /**
         * Constructs a new PeerLike.
         * @param [properties] Properties to set
         */
        constructor(properties?: shared.PeerLike.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PeerLike ip. */
        ip: string;

        /** PeerLike port. */
        port: number;

        /** PeerLike protocol. */
        protocol: number;

        /**
         * Creates a new PeerLike instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PeerLike instance
         */
        static create(properties: shared.PeerLike.$Shape): shared.PeerLike & shared.PeerLike.$Shape;
        static create(properties?: shared.PeerLike.$Properties): shared.PeerLike;

        /**
         * Encodes the specified PeerLike message. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @param message PeerLike message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: shared.PeerLike.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PeerLike message, length delimited. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @param message PeerLike message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: shared.PeerLike.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PeerLike message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {shared.PeerLike & shared.PeerLike.$Shape} PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): shared.PeerLike & shared.PeerLike.$Shape;

        /**
         * Decodes a PeerLike message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {shared.PeerLike & shared.PeerLike.$Shape} PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): shared.PeerLike & shared.PeerLike.$Shape;

        /**
         * Verifies a PeerLike message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PeerLike message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PeerLike
         */
        static fromObject(object: { [k: string]: any }): shared.PeerLike;

        /**
         * Creates a plain object from a PeerLike message. Also converts values to other types if specified.
         * @param message PeerLike
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: shared.PeerLike, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PeerLike to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PeerLike
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PeerLike {

        /** Properties of a PeerLike. */
        interface $Properties {

            /** PeerLike ip */
            ip?: (string|null);

            /** PeerLike port */
            port?: (number|null);

            /** PeerLike protocol */
            protocol?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PeerLike. */
        type $Shape = shared.PeerLike.$Properties;
    }
}

/** Namespace getBlocks. */
export namespace getBlocks {

    /**
     * Properties of a GetBlocksRequest.
     * @deprecated Use getBlocks.GetBlocksRequest.$Properties instead.
     */
    interface IGetBlocksRequest extends getBlocks.GetBlocksRequest.$Properties {
    }

    /** Represents a GetBlocksRequest. */
    class GetBlocksRequest {

        /**
         * Constructs a new GetBlocksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getBlocks.GetBlocksRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetBlocksRequest fromBlockNumber. */
        fromBlockNumber: number;

        /** GetBlocksRequest limit. */
        limit: number;

        /** GetBlocksRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new GetBlocksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBlocksRequest instance
         */
        static create(properties: getBlocks.GetBlocksRequest.$Shape): getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape;
        static create(properties?: getBlocks.GetBlocksRequest.$Properties): getBlocks.GetBlocksRequest;

        /**
         * Encodes the specified GetBlocksRequest message. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @param message GetBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getBlocks.GetBlocksRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBlocksRequest message, length delimited. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @param message GetBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getBlocks.GetBlocksRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape} GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape;

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape} GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape;

        /**
         * Verifies a GetBlocksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBlocksRequest
         */
        static fromObject(object: { [k: string]: any }): getBlocks.GetBlocksRequest;

        /**
         * Creates a plain object from a GetBlocksRequest message. Also converts values to other types if specified.
         * @param message GetBlocksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getBlocks.GetBlocksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBlocksRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetBlocksRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetBlocksRequest {

        /** Properties of a GetBlocksRequest. */
        interface $Properties {

            /** GetBlocksRequest fromBlockNumber */
            fromBlockNumber?: (number|null);

            /** GetBlocksRequest limit */
            limit?: (number|null);

            /** GetBlocksRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetBlocksRequest. */
        type $Shape = getBlocks.GetBlocksRequest.$Properties;
    }

    /**
     * Properties of a GetBlocksResponse.
     * @deprecated Use getBlocks.GetBlocksResponse.$Properties instead.
     */
    interface IGetBlocksResponse extends getBlocks.GetBlocksResponse.$Properties {
    }

    /** Represents a GetBlocksResponse. */
    class GetBlocksResponse {

        /**
         * Constructs a new GetBlocksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getBlocks.GetBlocksResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetBlocksResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetBlocksResponse blocks. */
        blocks: Uint8Array[];

        /**
         * Creates a new GetBlocksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBlocksResponse instance
         */
        static create(properties: getBlocks.GetBlocksResponse.$Shape): getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape;
        static create(properties?: getBlocks.GetBlocksResponse.$Properties): getBlocks.GetBlocksResponse;

        /**
         * Encodes the specified GetBlocksResponse message. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @param message GetBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getBlocks.GetBlocksResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBlocksResponse message, length delimited. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @param message GetBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getBlocks.GetBlocksResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape} GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape;

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape} GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape;

        /**
         * Verifies a GetBlocksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBlocksResponse
         */
        static fromObject(object: { [k: string]: any }): getBlocks.GetBlocksResponse;

        /**
         * Creates a plain object from a GetBlocksResponse message. Also converts values to other types if specified.
         * @param message GetBlocksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getBlocks.GetBlocksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBlocksResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetBlocksResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetBlocksResponse {

        /** Properties of a GetBlocksResponse. */
        interface $Properties {

            /** GetBlocksResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetBlocksResponse blocks */
            blocks?: (Uint8Array[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetBlocksResponse. */
        type $Shape = getBlocks.GetBlocksResponse.$Properties;
    }
}

/** Namespace getMessages. */
export namespace getMessages {

    /**
     * Properties of a GetMessagesQuery.
     * @deprecated Use getMessages.GetMessagesQuery.$Properties instead.
     */
    interface IGetMessagesQuery extends getMessages.GetMessagesQuery.$Properties {
    }

    /** Represents a GetMessagesQuery. */
    class GetMessagesQuery {

        /**
         * Constructs a new GetMessagesQuery.
         * @param [properties] Properties to set
         */
        constructor(properties?: getMessages.GetMessagesQuery.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetMessagesQuery blockNumber. */
        blockNumber: number;

        /** GetMessagesQuery round. */
        round: number;

        /** GetMessagesQuery validatorsSignedPrevote. */
        validatorsSignedPrevote: boolean[];

        /** GetMessagesQuery validatorsSignedPrecommit. */
        validatorsSignedPrecommit: boolean[];

        /**
         * Creates a new GetMessagesQuery instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetMessagesQuery instance
         */
        static create(properties: getMessages.GetMessagesQuery.$Shape): getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape;
        static create(properties?: getMessages.GetMessagesQuery.$Properties): getMessages.GetMessagesQuery;

        /**
         * Encodes the specified GetMessagesQuery message. Does not implicitly {@link getMessages.GetMessagesQuery.verify|verify} messages.
         * @param message GetMessagesQuery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getMessages.GetMessagesQuery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetMessagesQuery message, length delimited. Does not implicitly {@link getMessages.GetMessagesQuery.verify|verify} messages.
         * @param message GetMessagesQuery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getMessages.GetMessagesQuery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetMessagesQuery message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape} GetMessagesQuery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape;

        /**
         * Decodes a GetMessagesQuery message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape} GetMessagesQuery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape;

        /**
         * Verifies a GetMessagesQuery message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetMessagesQuery message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetMessagesQuery
         */
        static fromObject(object: { [k: string]: any }): getMessages.GetMessagesQuery;

        /**
         * Creates a plain object from a GetMessagesQuery message. Also converts values to other types if specified.
         * @param message GetMessagesQuery
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getMessages.GetMessagesQuery, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetMessagesQuery to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetMessagesQuery
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetMessagesQuery {

        /** Properties of a GetMessagesQuery. */
        interface $Properties {

            /** GetMessagesQuery blockNumber */
            blockNumber?: (number|null);

            /** GetMessagesQuery round */
            round?: (number|null);

            /** GetMessagesQuery validatorsSignedPrevote */
            validatorsSignedPrevote?: (boolean[]|null);

            /** GetMessagesQuery validatorsSignedPrecommit */
            validatorsSignedPrecommit?: (boolean[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetMessagesQuery. */
        type $Shape = getMessages.GetMessagesQuery.$Properties;
    }

    /**
     * Properties of a GetMessagesRequest.
     * @deprecated Use getMessages.GetMessagesRequest.$Properties instead.
     */
    interface IGetMessagesRequest extends getMessages.GetMessagesRequest.$Properties {
    }

    /** Represents a GetMessagesRequest. */
    class GetMessagesRequest {

        /**
         * Constructs a new GetMessagesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getMessages.GetMessagesRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetMessagesRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetMessagesRequest query. */
        query?: (getMessages.GetMessagesQuery.$Properties|null);

        /**
         * Creates a new GetMessagesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetMessagesRequest instance
         */
        static create(properties: getMessages.GetMessagesRequest.$Shape): getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape;
        static create(properties?: getMessages.GetMessagesRequest.$Properties): getMessages.GetMessagesRequest;

        /**
         * Encodes the specified GetMessagesRequest message. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @param message GetMessagesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getMessages.GetMessagesRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetMessagesRequest message, length delimited. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @param message GetMessagesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getMessages.GetMessagesRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape} GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape;

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape} GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape;

        /**
         * Verifies a GetMessagesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetMessagesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetMessagesRequest
         */
        static fromObject(object: { [k: string]: any }): getMessages.GetMessagesRequest;

        /**
         * Creates a plain object from a GetMessagesRequest message. Also converts values to other types if specified.
         * @param message GetMessagesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getMessages.GetMessagesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetMessagesRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetMessagesRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetMessagesRequest {

        /** Properties of a GetMessagesRequest. */
        interface $Properties {

            /** GetMessagesRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetMessagesRequest query */
            query?: (getMessages.GetMessagesQuery.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetMessagesRequest. */
        type $Shape = getMessages.GetMessagesRequest.$Properties;
    }

    /**
     * Properties of a GetMessagesResponse.
     * @deprecated Use getMessages.GetMessagesResponse.$Properties instead.
     */
    interface IGetMessagesResponse extends getMessages.GetMessagesResponse.$Properties {
    }

    /** Represents a GetMessagesResponse. */
    class GetMessagesResponse {

        /**
         * Constructs a new GetMessagesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getMessages.GetMessagesResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetMessagesResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetMessagesResponse prevotes. */
        prevotes: Uint8Array[];

        /** GetMessagesResponse precommits. */
        precommits: Uint8Array[];

        /**
         * Creates a new GetMessagesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetMessagesResponse instance
         */
        static create(properties: getMessages.GetMessagesResponse.$Shape): getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape;
        static create(properties?: getMessages.GetMessagesResponse.$Properties): getMessages.GetMessagesResponse;

        /**
         * Encodes the specified GetMessagesResponse message. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @param message GetMessagesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getMessages.GetMessagesResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetMessagesResponse message, length delimited. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @param message GetMessagesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getMessages.GetMessagesResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape} GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape;

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape} GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape;

        /**
         * Verifies a GetMessagesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetMessagesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetMessagesResponse
         */
        static fromObject(object: { [k: string]: any }): getMessages.GetMessagesResponse;

        /**
         * Creates a plain object from a GetMessagesResponse message. Also converts values to other types if specified.
         * @param message GetMessagesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getMessages.GetMessagesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetMessagesResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetMessagesResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetMessagesResponse {

        /** Properties of a GetMessagesResponse. */
        interface $Properties {

            /** GetMessagesResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetMessagesResponse prevotes */
            prevotes?: (Uint8Array[]|null);

            /** GetMessagesResponse precommits */
            precommits?: (Uint8Array[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetMessagesResponse. */
        type $Shape = getMessages.GetMessagesResponse.$Properties;
    }
}

/** Namespace getPeers. */
export namespace getPeers {

    /**
     * Properties of a GetPeersRequest.
     * @deprecated Use getPeers.GetPeersRequest.$Properties instead.
     */
    interface IGetPeersRequest extends getPeers.GetPeersRequest.$Properties {
    }

    /** Represents a GetPeersRequest. */
    class GetPeersRequest {

        /**
         * Constructs a new GetPeersRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getPeers.GetPeersRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetPeersRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new GetPeersRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPeersRequest instance
         */
        static create(properties: getPeers.GetPeersRequest.$Shape): getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape;
        static create(properties?: getPeers.GetPeersRequest.$Properties): getPeers.GetPeersRequest;

        /**
         * Encodes the specified GetPeersRequest message. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @param message GetPeersRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getPeers.GetPeersRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPeersRequest message, length delimited. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @param message GetPeersRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getPeers.GetPeersRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape} GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape;

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape} GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape;

        /**
         * Verifies a GetPeersRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPeersRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPeersRequest
         */
        static fromObject(object: { [k: string]: any }): getPeers.GetPeersRequest;

        /**
         * Creates a plain object from a GetPeersRequest message. Also converts values to other types if specified.
         * @param message GetPeersRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getPeers.GetPeersRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPeersRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetPeersRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetPeersRequest {

        /** Properties of a GetPeersRequest. */
        interface $Properties {

            /** GetPeersRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetPeersRequest. */
        type $Shape = getPeers.GetPeersRequest.$Properties;
    }

    /**
     * Properties of a GetPeersResponse.
     * @deprecated Use getPeers.GetPeersResponse.$Properties instead.
     */
    interface IGetPeersResponse extends getPeers.GetPeersResponse.$Properties {
    }

    /** Represents a GetPeersResponse. */
    class GetPeersResponse {

        /**
         * Constructs a new GetPeersResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getPeers.GetPeersResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetPeersResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetPeersResponse peers. */
        peers: shared.PeerLike.$Properties[];

        /**
         * Creates a new GetPeersResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPeersResponse instance
         */
        static create(properties: getPeers.GetPeersResponse.$Shape): getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape;
        static create(properties?: getPeers.GetPeersResponse.$Properties): getPeers.GetPeersResponse;

        /**
         * Encodes the specified GetPeersResponse message. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @param message GetPeersResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getPeers.GetPeersResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPeersResponse message, length delimited. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @param message GetPeersResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getPeers.GetPeersResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape} GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape;

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape} GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape;

        /**
         * Verifies a GetPeersResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPeersResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPeersResponse
         */
        static fromObject(object: { [k: string]: any }): getPeers.GetPeersResponse;

        /**
         * Creates a plain object from a GetPeersResponse message. Also converts values to other types if specified.
         * @param message GetPeersResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getPeers.GetPeersResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPeersResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetPeersResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetPeersResponse {

        /** Properties of a GetPeersResponse. */
        interface $Properties {

            /** GetPeersResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetPeersResponse peers */
            peers?: (shared.PeerLike.$Properties[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetPeersResponse. */
        type $Shape = getPeers.GetPeersResponse.$Properties;
    }
}

/** Namespace getProposal. */
export namespace getProposal {

    /**
     * Properties of a GetProposalRequest.
     * @deprecated Use getProposal.GetProposalRequest.$Properties instead.
     */
    interface IGetProposalRequest extends getProposal.GetProposalRequest.$Properties {
    }

    /** Represents a GetProposalRequest. */
    class GetProposalRequest {

        /**
         * Constructs a new GetProposalRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getProposal.GetProposalRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetProposalRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new GetProposalRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetProposalRequest instance
         */
        static create(properties: getProposal.GetProposalRequest.$Shape): getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape;
        static create(properties?: getProposal.GetProposalRequest.$Properties): getProposal.GetProposalRequest;

        /**
         * Encodes the specified GetProposalRequest message. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @param message GetProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getProposal.GetProposalRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetProposalRequest message, length delimited. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @param message GetProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getProposal.GetProposalRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape} GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape;

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape} GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape;

        /**
         * Verifies a GetProposalRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetProposalRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetProposalRequest
         */
        static fromObject(object: { [k: string]: any }): getProposal.GetProposalRequest;

        /**
         * Creates a plain object from a GetProposalRequest message. Also converts values to other types if specified.
         * @param message GetProposalRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getProposal.GetProposalRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetProposalRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetProposalRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetProposalRequest {

        /** Properties of a GetProposalRequest. */
        interface $Properties {

            /** GetProposalRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetProposalRequest. */
        type $Shape = getProposal.GetProposalRequest.$Properties;
    }

    /**
     * Properties of a GetProposalResponse.
     * @deprecated Use getProposal.GetProposalResponse.$Properties instead.
     */
    interface IGetProposalResponse extends getProposal.GetProposalResponse.$Properties {
    }

    /** Represents a GetProposalResponse. */
    class GetProposalResponse {

        /**
         * Constructs a new GetProposalResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getProposal.GetProposalResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetProposalResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetProposalResponse proposal. */
        proposal: Uint8Array;

        /**
         * Creates a new GetProposalResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetProposalResponse instance
         */
        static create(properties: getProposal.GetProposalResponse.$Shape): getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape;
        static create(properties?: getProposal.GetProposalResponse.$Properties): getProposal.GetProposalResponse;

        /**
         * Encodes the specified GetProposalResponse message. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @param message GetProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getProposal.GetProposalResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetProposalResponse message, length delimited. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @param message GetProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getProposal.GetProposalResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape} GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape;

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape} GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape;

        /**
         * Verifies a GetProposalResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetProposalResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetProposalResponse
         */
        static fromObject(object: { [k: string]: any }): getProposal.GetProposalResponse;

        /**
         * Creates a plain object from a GetProposalResponse message. Also converts values to other types if specified.
         * @param message GetProposalResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getProposal.GetProposalResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetProposalResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetProposalResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetProposalResponse {

        /** Properties of a GetProposalResponse. */
        interface $Properties {

            /** GetProposalResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetProposalResponse proposal */
            proposal?: (Uint8Array|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetProposalResponse. */
        type $Shape = getProposal.GetProposalResponse.$Properties;
    }
}

/** Namespace getStatus. */
export namespace getStatus {

    /**
     * Properties of a GetStatusRequest.
     * @deprecated Use getStatus.GetStatusRequest.$Properties instead.
     */
    interface IGetStatusRequest extends getStatus.GetStatusRequest.$Properties {
    }

    /** Represents a GetStatusRequest. */
    class GetStatusRequest {

        /**
         * Constructs a new GetStatusRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: getStatus.GetStatusRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetStatusRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new GetStatusRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetStatusRequest instance
         */
        static create(properties: getStatus.GetStatusRequest.$Shape): getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape;
        static create(properties?: getStatus.GetStatusRequest.$Properties): getStatus.GetStatusRequest;

        /**
         * Encodes the specified GetStatusRequest message. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @param message GetStatusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getStatus.GetStatusRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetStatusRequest message, length delimited. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @param message GetStatusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getStatus.GetStatusRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape} GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape;

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape} GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape;

        /**
         * Verifies a GetStatusRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetStatusRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetStatusRequest
         */
        static fromObject(object: { [k: string]: any }): getStatus.GetStatusRequest;

        /**
         * Creates a plain object from a GetStatusRequest message. Also converts values to other types if specified.
         * @param message GetStatusRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getStatus.GetStatusRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetStatusRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetStatusRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetStatusRequest {

        /** Properties of a GetStatusRequest. */
        interface $Properties {

            /** GetStatusRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetStatusRequest. */
        type $Shape = getStatus.GetStatusRequest.$Properties;
    }

    /**
     * Properties of a GetStatusResponse.
     * @deprecated Use getStatus.GetStatusResponse.$Properties instead.
     */
    interface IGetStatusResponse extends getStatus.GetStatusResponse.$Properties {
    }

    /** Represents a GetStatusResponse. */
    class GetStatusResponse {

        /**
         * Constructs a new GetStatusResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: getStatus.GetStatusResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GetStatusResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /** GetStatusResponse state. */
        state?: (getStatus.GetStatusResponse.State.$Properties|null);

        /** GetStatusResponse config. */
        config?: (getStatus.GetStatusResponse.Config.$Properties|null);

        /**
         * Creates a new GetStatusResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetStatusResponse instance
         */
        static create(properties: getStatus.GetStatusResponse.$Shape): getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape;
        static create(properties?: getStatus.GetStatusResponse.$Properties): getStatus.GetStatusResponse;

        /**
         * Encodes the specified GetStatusResponse message. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @param message GetStatusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: getStatus.GetStatusResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetStatusResponse message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @param message GetStatusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: getStatus.GetStatusResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape} GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape;

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape} GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape;

        /**
         * Verifies a GetStatusResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetStatusResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetStatusResponse
         */
        static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse;

        /**
         * Creates a plain object from a GetStatusResponse message. Also converts values to other types if specified.
         * @param message GetStatusResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: getStatus.GetStatusResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetStatusResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GetStatusResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GetStatusResponse {

        /** Properties of a GetStatusResponse. */
        interface $Properties {

            /** GetStatusResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** GetStatusResponse state */
            state?: (getStatus.GetStatusResponse.State.$Properties|null);

            /** GetStatusResponse config */
            config?: (getStatus.GetStatusResponse.Config.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GetStatusResponse. */
        type $Shape = getStatus.GetStatusResponse.$Properties;

        /**
         * Properties of a State.
         * @deprecated Use getStatus.GetStatusResponse.State.$Properties instead.
         */
        interface IState extends getStatus.GetStatusResponse.State.$Properties {
        }

        /** Represents a State. */
        class State {

            /**
             * Constructs a new State.
             * @param [properties] Properties to set
             */
            constructor(properties?: getStatus.GetStatusResponse.State.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** State blockNumber. */
            blockNumber: number;

            /** State blockHash. */
            blockHash: string;

            /**
             * Creates a new State instance using the specified properties.
             * @param [properties] Properties to set
             * @returns State instance
             */
            static create(properties: getStatus.GetStatusResponse.State.$Shape): getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape;
            static create(properties?: getStatus.GetStatusResponse.State.$Properties): getStatus.GetStatusResponse.State;

            /**
             * Encodes the specified State message. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @param message State message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: getStatus.GetStatusResponse.State.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified State message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @param message State message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: getStatus.GetStatusResponse.State.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a State message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape} State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape;

            /**
             * Decodes a State message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape} State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape;

            /**
             * Verifies a State message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a State message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns State
             */
            static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.State;

            /**
             * Creates a plain object from a State message. Also converts values to other types if specified.
             * @param message State
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: getStatus.GetStatusResponse.State, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this State to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: any };

            /**
             * Gets the type url for State
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace State {

            /** Properties of a State. */
            interface $Properties {

                /** State blockNumber */
                blockNumber?: (number|null);

                /** State blockHash */
                blockHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a State. */
            type $Shape = getStatus.GetStatusResponse.State.$Properties;
        }

        /**
         * Properties of a Config.
         * @deprecated Use getStatus.GetStatusResponse.Config.$Properties instead.
         */
        interface IConfig extends getStatus.GetStatusResponse.Config.$Properties {
        }

        /** Represents a Config. */
        class Config {

            /**
             * Constructs a new Config.
             * @param [properties] Properties to set
             */
            constructor(properties?: getStatus.GetStatusResponse.Config.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** Config version. */
            version: string;

            /** Config network. */
            network?: (getStatus.GetStatusResponse.Config.Network.$Properties|null);

            /** Config plugins. */
            plugins: { [k: string]: getStatus.GetStatusResponse.Config.Plugin.$Properties };

            /**
             * Creates a new Config instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Config instance
             */
            static create(properties: getStatus.GetStatusResponse.Config.$Shape): getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape;
            static create(properties?: getStatus.GetStatusResponse.Config.$Properties): getStatus.GetStatusResponse.Config;

            /**
             * Encodes the specified Config message. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @param message Config message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: getStatus.GetStatusResponse.Config.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Config message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @param message Config message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: getStatus.GetStatusResponse.Config.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Config message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape} Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape;

            /**
             * Decodes a Config message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape} Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape;

            /**
             * Verifies a Config message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Config message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Config
             */
            static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config;

            /**
             * Creates a plain object from a Config message. Also converts values to other types if specified.
             * @param message Config
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: getStatus.GetStatusResponse.Config, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Config to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: any };

            /**
             * Gets the type url for Config
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace Config {

            /** Properties of a Config. */
            interface $Properties {

                /** Config version */
                version?: (string|null);

                /** Config network */
                network?: (getStatus.GetStatusResponse.Config.Network.$Properties|null);

                /** Config plugins */
                plugins?: ({ [k: string]: getStatus.GetStatusResponse.Config.Plugin.$Properties }|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a Config. */
            type $Shape = getStatus.GetStatusResponse.Config.$Properties;

            /**
             * Properties of a Network.
             * @deprecated Use getStatus.GetStatusResponse.Config.Network.$Properties instead.
             */
            interface INetwork extends getStatus.GetStatusResponse.Config.Network.$Properties {
            }

            /** Represents a Network. */
            class Network {

                /**
                 * Constructs a new Network.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: getStatus.GetStatusResponse.Config.Network.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** Network name. */
                name: string;

                /** Network nethash. */
                nethash: string;

                /** Network explorer. */
                explorer: string;

                /** Network token. */
                token?: (getStatus.GetStatusResponse.Config.Network.Token.$Properties|null);

                /** Network version. */
                version: number;

                /**
                 * Creates a new Network instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Network instance
                 */
                static create(properties: getStatus.GetStatusResponse.Config.Network.$Shape): getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape;
                static create(properties?: getStatus.GetStatusResponse.Config.Network.$Properties): getStatus.GetStatusResponse.Config.Network;

                /**
                 * Encodes the specified Network message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @param message Network message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: getStatus.GetStatusResponse.Config.Network.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Network message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @param message Network message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: getStatus.GetStatusResponse.Config.Network.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Network message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape} Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape;

                /**
                 * Decodes a Network message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape} Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape;

                /**
                 * Verifies a Network message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Network message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Network
                 */
                static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config.Network;

                /**
                 * Creates a plain object from a Network message. Also converts values to other types if specified.
                 * @param message Network
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: getStatus.GetStatusResponse.Config.Network, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Network to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };

                /**
                 * Gets the type url for Network
                 * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns The type url
                 */
                static getTypeUrl(prefix?: string): string;
            }

            namespace Network {

                /** Properties of a Network. */
                interface $Properties {

                    /** Network name */
                    name?: (string|null);

                    /** Network nethash */
                    nethash?: (string|null);

                    /** Network explorer */
                    explorer?: (string|null);

                    /** Network token */
                    token?: (getStatus.GetStatusResponse.Config.Network.Token.$Properties|null);

                    /** Network version */
                    version?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a Network. */
                type $Shape = getStatus.GetStatusResponse.Config.Network.$Properties;

                /**
                 * Properties of a Token.
                 * @deprecated Use getStatus.GetStatusResponse.Config.Network.Token.$Properties instead.
                 */
                interface IToken extends getStatus.GetStatusResponse.Config.Network.Token.$Properties {
                }

                /** Represents a Token. */
                class Token {

                    /**
                     * Constructs a new Token.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: getStatus.GetStatusResponse.Config.Network.Token.$Properties);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];

                    /** Token name. */
                    name: string;

                    /** Token symbol. */
                    symbol: string;

                    /**
                     * Creates a new Token instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Token instance
                     */
                    static create(properties: getStatus.GetStatusResponse.Config.Network.Token.$Shape): getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape;
                    static create(properties?: getStatus.GetStatusResponse.Config.Network.Token.$Properties): getStatus.GetStatusResponse.Config.Network.Token;

                    /**
                     * Encodes the specified Token message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @param message Token message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    static encode(message: getStatus.GetStatusResponse.Config.Network.Token.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Token message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @param message Token message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    static encodeDelimited(message: getStatus.GetStatusResponse.Config.Network.Token.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Token message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape} Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape;

                    /**
                     * Decodes a Token message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape} Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape;

                    /**
                     * Verifies a Token message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Token message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Token
                     */
                    static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config.Network.Token;

                    /**
                     * Creates a plain object from a Token message. Also converts values to other types if specified.
                     * @param message Token
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    static toObject(message: getStatus.GetStatusResponse.Config.Network.Token, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Token to JSON.
                     * @returns JSON object
                     */
                    toJSON(): { [k: string]: any };

                    /**
                     * Gets the type url for Token
                     * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                     * @returns The type url
                     */
                    static getTypeUrl(prefix?: string): string;
                }

                namespace Token {

                    /** Properties of a Token. */
                    interface $Properties {

                        /** Token name */
                        name?: (string|null);

                        /** Token symbol */
                        symbol?: (string|null);

                        /** Unknown fields preserved while decoding when enabled */
                        $unknowns?: Uint8Array[];
                    }

                    /** Shape of a Token. */
                    type $Shape = getStatus.GetStatusResponse.Config.Network.Token.$Properties;
                }
            }

            /**
             * Properties of a Plugin.
             * @deprecated Use getStatus.GetStatusResponse.Config.Plugin.$Properties instead.
             */
            interface IPlugin extends getStatus.GetStatusResponse.Config.Plugin.$Properties {
            }

            /** Represents a Plugin. */
            class Plugin {

                /**
                 * Constructs a new Plugin.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: getStatus.GetStatusResponse.Config.Plugin.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** Plugin port. */
                port: number;

                /** Plugin enabled. */
                enabled: boolean;

                /** Plugin estimateTotalCount. */
                estimateTotalCount: boolean;

                /**
                 * Creates a new Plugin instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Plugin instance
                 */
                static create(properties: getStatus.GetStatusResponse.Config.Plugin.$Shape): getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape;
                static create(properties?: getStatus.GetStatusResponse.Config.Plugin.$Properties): getStatus.GetStatusResponse.Config.Plugin;

                /**
                 * Encodes the specified Plugin message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @param message Plugin message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: getStatus.GetStatusResponse.Config.Plugin.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Plugin message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @param message Plugin message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: getStatus.GetStatusResponse.Config.Plugin.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Plugin message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape} Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape;

                /**
                 * Decodes a Plugin message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape} Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape;

                /**
                 * Verifies a Plugin message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Plugin message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Plugin
                 */
                static fromObject(object: { [k: string]: any }): getStatus.GetStatusResponse.Config.Plugin;

                /**
                 * Creates a plain object from a Plugin message. Also converts values to other types if specified.
                 * @param message Plugin
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: getStatus.GetStatusResponse.Config.Plugin, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Plugin to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };

                /**
                 * Gets the type url for Plugin
                 * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns The type url
                 */
                static getTypeUrl(prefix?: string): string;
            }

            namespace Plugin {

                /** Properties of a Plugin. */
                interface $Properties {

                    /** Plugin port */
                    port?: (number|null);

                    /** Plugin enabled */
                    enabled?: (boolean|null);

                    /** Plugin estimateTotalCount */
                    estimateTotalCount?: (boolean|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a Plugin. */
                type $Shape = getStatus.GetStatusResponse.Config.Plugin.$Properties;
            }
        }
    }
}

/** Namespace postMessage. */
export namespace postMessage {

    /**
     * Properties of a PostMessageRequest.
     * @deprecated Use postMessage.PostMessageRequest.$Properties instead.
     */
    interface IPostMessageRequest extends postMessage.PostMessageRequest.$Properties {
    }

    /** Represents a PostMessageRequest. */
    class PostMessageRequest {

        /**
         * Constructs a new PostMessageRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: postMessage.PostMessageRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PostMessageRequest message. */
        message: Uint8Array;

        /** PostMessageRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new PostMessageRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostMessageRequest instance
         */
        static create(properties: postMessage.PostMessageRequest.$Shape): postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape;
        static create(properties?: postMessage.PostMessageRequest.$Properties): postMessage.PostMessageRequest;

        /**
         * Encodes the specified PostMessageRequest message. Does not implicitly {@link postMessage.PostMessageRequest.verify|verify} messages.
         * @param message PostMessageRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: postMessage.PostMessageRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostMessageRequest message, length delimited. Does not implicitly {@link postMessage.PostMessageRequest.verify|verify} messages.
         * @param message PostMessageRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: postMessage.PostMessageRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostMessageRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape} PostMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape;

        /**
         * Decodes a PostMessageRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape} PostMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape;

        /**
         * Verifies a PostMessageRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostMessageRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostMessageRequest
         */
        static fromObject(object: { [k: string]: any }): postMessage.PostMessageRequest;

        /**
         * Creates a plain object from a PostMessageRequest message. Also converts values to other types if specified.
         * @param message PostMessageRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: postMessage.PostMessageRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostMessageRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PostMessageRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PostMessageRequest {

        /** Properties of a PostMessageRequest. */
        interface $Properties {

            /** PostMessageRequest message */
            message?: (Uint8Array|null);

            /** PostMessageRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PostMessageRequest. */
        type $Shape = postMessage.PostMessageRequest.$Properties;
    }

    /**
     * Properties of a PostMessageResponse.
     * @deprecated Use postMessage.PostMessageResponse.$Properties instead.
     */
    interface IPostMessageResponse extends postMessage.PostMessageResponse.$Properties {
    }

    /** Represents a PostMessageResponse. */
    class PostMessageResponse {

        /**
         * Constructs a new PostMessageResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: postMessage.PostMessageResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PostMessageResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new PostMessageResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostMessageResponse instance
         */
        static create(properties: postMessage.PostMessageResponse.$Shape): postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape;
        static create(properties?: postMessage.PostMessageResponse.$Properties): postMessage.PostMessageResponse;

        /**
         * Encodes the specified PostMessageResponse message. Does not implicitly {@link postMessage.PostMessageResponse.verify|verify} messages.
         * @param message PostMessageResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: postMessage.PostMessageResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostMessageResponse message, length delimited. Does not implicitly {@link postMessage.PostMessageResponse.verify|verify} messages.
         * @param message PostMessageResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: postMessage.PostMessageResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostMessageResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape} PostMessageResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape;

        /**
         * Decodes a PostMessageResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape} PostMessageResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape;

        /**
         * Verifies a PostMessageResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostMessageResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostMessageResponse
         */
        static fromObject(object: { [k: string]: any }): postMessage.PostMessageResponse;

        /**
         * Creates a plain object from a PostMessageResponse message. Also converts values to other types if specified.
         * @param message PostMessageResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: postMessage.PostMessageResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostMessageResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PostMessageResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PostMessageResponse {

        /** Properties of a PostMessageResponse. */
        interface $Properties {

            /** PostMessageResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PostMessageResponse. */
        type $Shape = postMessage.PostMessageResponse.$Properties;
    }
}

/** Namespace postProposal. */
export namespace postProposal {

    /**
     * Properties of a PostProposalRequest.
     * @deprecated Use postProposal.PostProposalRequest.$Properties instead.
     */
    interface IPostProposalRequest extends postProposal.PostProposalRequest.$Properties {
    }

    /** Represents a PostProposalRequest. */
    class PostProposalRequest {

        /**
         * Constructs a new PostProposalRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: postProposal.PostProposalRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PostProposalRequest proposal. */
        proposal: Uint8Array;

        /** PostProposalRequest headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new PostProposalRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostProposalRequest instance
         */
        static create(properties: postProposal.PostProposalRequest.$Shape): postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape;
        static create(properties?: postProposal.PostProposalRequest.$Properties): postProposal.PostProposalRequest;

        /**
         * Encodes the specified PostProposalRequest message. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @param message PostProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: postProposal.PostProposalRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostProposalRequest message, length delimited. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @param message PostProposalRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: postProposal.PostProposalRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape} PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape;

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape} PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape;

        /**
         * Verifies a PostProposalRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostProposalRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostProposalRequest
         */
        static fromObject(object: { [k: string]: any }): postProposal.PostProposalRequest;

        /**
         * Creates a plain object from a PostProposalRequest message. Also converts values to other types if specified.
         * @param message PostProposalRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: postProposal.PostProposalRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostProposalRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PostProposalRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PostProposalRequest {

        /** Properties of a PostProposalRequest. */
        interface $Properties {

            /** PostProposalRequest proposal */
            proposal?: (Uint8Array|null);

            /** PostProposalRequest headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PostProposalRequest. */
        type $Shape = postProposal.PostProposalRequest.$Properties;
    }

    /**
     * Properties of a PostProposalResponse.
     * @deprecated Use postProposal.PostProposalResponse.$Properties instead.
     */
    interface IPostProposalResponse extends postProposal.PostProposalResponse.$Properties {
    }

    /** Represents a PostProposalResponse. */
    class PostProposalResponse {

        /**
         * Constructs a new PostProposalResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: postProposal.PostProposalResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PostProposalResponse headers. */
        headers?: (shared.Headers.$Properties|null);

        /**
         * Creates a new PostProposalResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PostProposalResponse instance
         */
        static create(properties: postProposal.PostProposalResponse.$Shape): postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape;
        static create(properties?: postProposal.PostProposalResponse.$Properties): postProposal.PostProposalResponse;

        /**
         * Encodes the specified PostProposalResponse message. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @param message PostProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: postProposal.PostProposalResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PostProposalResponse message, length delimited. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @param message PostProposalResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: postProposal.PostProposalResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape} PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape;

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape} PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape;

        /**
         * Verifies a PostProposalResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PostProposalResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PostProposalResponse
         */
        static fromObject(object: { [k: string]: any }): postProposal.PostProposalResponse;

        /**
         * Creates a plain object from a PostProposalResponse message. Also converts values to other types if specified.
         * @param message PostProposalResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: postProposal.PostProposalResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PostProposalResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PostProposalResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PostProposalResponse {

        /** Properties of a PostProposalResponse. */
        interface $Properties {

            /** PostProposalResponse headers */
            headers?: (shared.Headers.$Properties|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PostProposalResponse. */
        type $Shape = postProposal.PostProposalResponse.$Properties;
    }
}
