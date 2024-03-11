/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

import * as _$protobuf from "protobufjs";
const $protobuf = _$protobuf.default;

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.getApiNodes = (function() {

    /**
     * Namespace getApiNodes.
     * @exports getApiNodes
     * @namespace
     */
    var getApiNodes = {};

    getApiNodes.GetApiNodesRequest = (function() {

        /**
         * Properties of a GetApiNodesRequest.
         * @memberof getApiNodes
         * @interface IGetApiNodesRequest
         * @property {shared.IHeaders|null} [headers] GetApiNodesRequest headers
         */

        /**
         * Constructs a new GetApiNodesRequest.
         * @memberof getApiNodes
         * @classdesc Represents a GetApiNodesRequest.
         * @implements IGetApiNodesRequest
         * @constructor
         * @param {getApiNodes.IGetApiNodesRequest=} [properties] Properties to set
         */
        function GetApiNodesRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetApiNodesRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getApiNodes.GetApiNodesRequest
         * @instance
         */
        GetApiNodesRequest.prototype.headers = null;

        /**
         * Creates a new GetApiNodesRequest instance using the specified properties.
         * @function create
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.IGetApiNodesRequest=} [properties] Properties to set
         * @returns {getApiNodes.GetApiNodesRequest} GetApiNodesRequest instance
         */
        GetApiNodesRequest.create = function create(properties) {
            return new GetApiNodesRequest(properties);
        };

        /**
         * Encodes the specified GetApiNodesRequest message. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @function encode
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.IGetApiNodesRequest} message GetApiNodesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetApiNodesRequest message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.IGetApiNodesRequest} message GetApiNodesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getApiNodes.GetApiNodesRequest} GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getApiNodes.GetApiNodesRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getApiNodes.GetApiNodesRequest} GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetApiNodesRequest message.
         * @function verify
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetApiNodesRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetApiNodesRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getApiNodes.GetApiNodesRequest} GetApiNodesRequest
         */
        GetApiNodesRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getApiNodes.GetApiNodesRequest)
                return object;
            var message = new $root.getApiNodes.GetApiNodesRequest();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getApiNodes.GetApiNodesRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetApiNodesRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.GetApiNodesRequest} message GetApiNodesRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetApiNodesRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetApiNodesRequest to JSON.
         * @function toJSON
         * @memberof getApiNodes.GetApiNodesRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetApiNodesRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetApiNodesRequest
         * @function getTypeUrl
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetApiNodesRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getApiNodes.GetApiNodesRequest";
        };

        return GetApiNodesRequest;
    })();

    getApiNodes.GetApiNodesResponse = (function() {

        /**
         * Properties of a GetApiNodesResponse.
         * @memberof getApiNodes
         * @interface IGetApiNodesResponse
         * @property {shared.IHeaders|null} [headers] GetApiNodesResponse headers
         * @property {Array.<shared.IPeerLike>|null} [apiNodes] GetApiNodesResponse apiNodes
         */

        /**
         * Constructs a new GetApiNodesResponse.
         * @memberof getApiNodes
         * @classdesc Represents a GetApiNodesResponse.
         * @implements IGetApiNodesResponse
         * @constructor
         * @param {getApiNodes.IGetApiNodesResponse=} [properties] Properties to set
         */
        function GetApiNodesResponse(properties) {
            this.apiNodes = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetApiNodesResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getApiNodes.GetApiNodesResponse
         * @instance
         */
        GetApiNodesResponse.prototype.headers = null;

        /**
         * GetApiNodesResponse apiNodes.
         * @member {Array.<shared.IPeerLike>} apiNodes
         * @memberof getApiNodes.GetApiNodesResponse
         * @instance
         */
        GetApiNodesResponse.prototype.apiNodes = $util.emptyArray;

        /**
         * Creates a new GetApiNodesResponse instance using the specified properties.
         * @function create
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.IGetApiNodesResponse=} [properties] Properties to set
         * @returns {getApiNodes.GetApiNodesResponse} GetApiNodesResponse instance
         */
        GetApiNodesResponse.create = function create(properties) {
            return new GetApiNodesResponse(properties);
        };

        /**
         * Encodes the specified GetApiNodesResponse message. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @function encode
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.IGetApiNodesResponse} message GetApiNodesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.apiNodes != null && message.apiNodes.length)
                for (var i = 0; i < message.apiNodes.length; ++i)
                    $root.shared.PeerLike.encode(message.apiNodes[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetApiNodesResponse message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.IGetApiNodesResponse} message GetApiNodesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getApiNodes.GetApiNodesResponse} GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getApiNodes.GetApiNodesResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        if (!(message.apiNodes && message.apiNodes.length))
                            message.apiNodes = [];
                        message.apiNodes.push($root.shared.PeerLike.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getApiNodes.GetApiNodesResponse} GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetApiNodesResponse message.
         * @function verify
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetApiNodesResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.apiNodes != null && message.hasOwnProperty("apiNodes")) {
                if (!Array.isArray(message.apiNodes))
                    return "apiNodes: array expected";
                for (var i = 0; i < message.apiNodes.length; ++i) {
                    var error = $root.shared.PeerLike.verify(message.apiNodes[i]);
                    if (error)
                        return "apiNodes." + error;
                }
            }
            return null;
        };

        /**
         * Creates a GetApiNodesResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getApiNodes.GetApiNodesResponse} GetApiNodesResponse
         */
        GetApiNodesResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getApiNodes.GetApiNodesResponse)
                return object;
            var message = new $root.getApiNodes.GetApiNodesResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getApiNodes.GetApiNodesResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.apiNodes) {
                if (!Array.isArray(object.apiNodes))
                    throw TypeError(".getApiNodes.GetApiNodesResponse.apiNodes: array expected");
                message.apiNodes = [];
                for (var i = 0; i < object.apiNodes.length; ++i) {
                    if (typeof object.apiNodes[i] !== "object")
                        throw TypeError(".getApiNodes.GetApiNodesResponse.apiNodes: object expected");
                    message.apiNodes[i] = $root.shared.PeerLike.fromObject(object.apiNodes[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a GetApiNodesResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.GetApiNodesResponse} message GetApiNodesResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetApiNodesResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.apiNodes = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.apiNodes && message.apiNodes.length) {
                object.apiNodes = [];
                for (var j = 0; j < message.apiNodes.length; ++j)
                    object.apiNodes[j] = $root.shared.PeerLike.toObject(message.apiNodes[j], options);
            }
            return object;
        };

        /**
         * Converts this GetApiNodesResponse to JSON.
         * @function toJSON
         * @memberof getApiNodes.GetApiNodesResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetApiNodesResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetApiNodesResponse
         * @function getTypeUrl
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetApiNodesResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getApiNodes.GetApiNodesResponse";
        };

        return GetApiNodesResponse;
    })();

    return getApiNodes;
})();

$root.getBlocks = (function() {

    /**
     * Namespace getBlocks.
     * @exports getBlocks
     * @namespace
     */
    var getBlocks = {};

    getBlocks.GetBlocksRequest = (function() {

        /**
         * Properties of a GetBlocksRequest.
         * @memberof getBlocks
         * @interface IGetBlocksRequest
         * @property {number|null} [fromHeight] GetBlocksRequest fromHeight
         * @property {number|null} [limit] GetBlocksRequest limit
         * @property {shared.IHeaders|null} [headers] GetBlocksRequest headers
         */

        /**
         * Constructs a new GetBlocksRequest.
         * @memberof getBlocks
         * @classdesc Represents a GetBlocksRequest.
         * @implements IGetBlocksRequest
         * @constructor
         * @param {getBlocks.IGetBlocksRequest=} [properties] Properties to set
         */
        function GetBlocksRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetBlocksRequest fromHeight.
         * @member {number} fromHeight
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         */
        GetBlocksRequest.prototype.fromHeight = 0;

        /**
         * GetBlocksRequest limit.
         * @member {number} limit
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         */
        GetBlocksRequest.prototype.limit = 0;

        /**
         * GetBlocksRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         */
        GetBlocksRequest.prototype.headers = null;

        /**
         * Creates a new GetBlocksRequest instance using the specified properties.
         * @function create
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.IGetBlocksRequest=} [properties] Properties to set
         * @returns {getBlocks.GetBlocksRequest} GetBlocksRequest instance
         */
        GetBlocksRequest.create = function create(properties) {
            return new GetBlocksRequest(properties);
        };

        /**
         * Encodes the specified GetBlocksRequest message. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @function encode
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.IGetBlocksRequest} message GetBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.fromHeight != null && Object.hasOwnProperty.call(message, "fromHeight"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.fromHeight);
            if (message.limit != null && Object.hasOwnProperty.call(message, "limit"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.limit);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetBlocksRequest message, length delimited. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.IGetBlocksRequest} message GetBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getBlocks.GetBlocksRequest} GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getBlocks.GetBlocksRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.fromHeight = reader.uint32();
                        break;
                    }
                case 2: {
                        message.limit = reader.uint32();
                        break;
                    }
                case 3: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getBlocks.GetBlocksRequest} GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetBlocksRequest message.
         * @function verify
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetBlocksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.fromHeight != null && message.hasOwnProperty("fromHeight"))
                if (!$util.isInteger(message.fromHeight))
                    return "fromHeight: integer expected";
            if (message.limit != null && message.hasOwnProperty("limit"))
                if (!$util.isInteger(message.limit))
                    return "limit: integer expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getBlocks.GetBlocksRequest} GetBlocksRequest
         */
        GetBlocksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getBlocks.GetBlocksRequest)
                return object;
            var message = new $root.getBlocks.GetBlocksRequest();
            if (object.fromHeight != null)
                message.fromHeight = object.fromHeight >>> 0;
            if (object.limit != null)
                message.limit = object.limit >>> 0;
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getBlocks.GetBlocksRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetBlocksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.GetBlocksRequest} message GetBlocksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetBlocksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.fromHeight = 0;
                object.limit = 0;
                object.headers = null;
            }
            if (message.fromHeight != null && message.hasOwnProperty("fromHeight"))
                object.fromHeight = message.fromHeight;
            if (message.limit != null && message.hasOwnProperty("limit"))
                object.limit = message.limit;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetBlocksRequest to JSON.
         * @function toJSON
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetBlocksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetBlocksRequest
         * @function getTypeUrl
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetBlocksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getBlocks.GetBlocksRequest";
        };

        return GetBlocksRequest;
    })();

    getBlocks.GetBlocksResponse = (function() {

        /**
         * Properties of a GetBlocksResponse.
         * @memberof getBlocks
         * @interface IGetBlocksResponse
         * @property {shared.IHeaders|null} [headers] GetBlocksResponse headers
         * @property {Array.<Uint8Array>|null} [blocks] GetBlocksResponse blocks
         */

        /**
         * Constructs a new GetBlocksResponse.
         * @memberof getBlocks
         * @classdesc Represents a GetBlocksResponse.
         * @implements IGetBlocksResponse
         * @constructor
         * @param {getBlocks.IGetBlocksResponse=} [properties] Properties to set
         */
        function GetBlocksResponse(properties) {
            this.blocks = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetBlocksResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getBlocks.GetBlocksResponse
         * @instance
         */
        GetBlocksResponse.prototype.headers = null;

        /**
         * GetBlocksResponse blocks.
         * @member {Array.<Uint8Array>} blocks
         * @memberof getBlocks.GetBlocksResponse
         * @instance
         */
        GetBlocksResponse.prototype.blocks = $util.emptyArray;

        /**
         * Creates a new GetBlocksResponse instance using the specified properties.
         * @function create
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {getBlocks.IGetBlocksResponse=} [properties] Properties to set
         * @returns {getBlocks.GetBlocksResponse} GetBlocksResponse instance
         */
        GetBlocksResponse.create = function create(properties) {
            return new GetBlocksResponse(properties);
        };

        /**
         * Encodes the specified GetBlocksResponse message. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @function encode
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {getBlocks.IGetBlocksResponse} message GetBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.blocks != null && message.blocks.length)
                for (var i = 0; i < message.blocks.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.blocks[i]);
            return writer;
        };

        /**
         * Encodes the specified GetBlocksResponse message, length delimited. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {getBlocks.IGetBlocksResponse} message GetBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getBlocks.GetBlocksResponse} GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getBlocks.GetBlocksResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        if (!(message.blocks && message.blocks.length))
                            message.blocks = [];
                        message.blocks.push(reader.bytes());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getBlocks.GetBlocksResponse} GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetBlocksResponse message.
         * @function verify
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetBlocksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.blocks != null && message.hasOwnProperty("blocks")) {
                if (!Array.isArray(message.blocks))
                    return "blocks: array expected";
                for (var i = 0; i < message.blocks.length; ++i)
                    if (!(message.blocks[i] && typeof message.blocks[i].length === "number" || $util.isString(message.blocks[i])))
                        return "blocks: buffer[] expected";
            }
            return null;
        };

        /**
         * Creates a GetBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getBlocks.GetBlocksResponse} GetBlocksResponse
         */
        GetBlocksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getBlocks.GetBlocksResponse)
                return object;
            var message = new $root.getBlocks.GetBlocksResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getBlocks.GetBlocksResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.blocks) {
                if (!Array.isArray(object.blocks))
                    throw TypeError(".getBlocks.GetBlocksResponse.blocks: array expected");
                message.blocks = [];
                for (var i = 0; i < object.blocks.length; ++i)
                    if (typeof object.blocks[i] === "string")
                        $util.base64.decode(object.blocks[i], message.blocks[i] = $util.newBuffer($util.base64.length(object.blocks[i])), 0);
                    else if (object.blocks[i].length >= 0)
                        message.blocks[i] = object.blocks[i];
            }
            return message;
        };

        /**
         * Creates a plain object from a GetBlocksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {getBlocks.GetBlocksResponse} message GetBlocksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetBlocksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.blocks = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.blocks && message.blocks.length) {
                object.blocks = [];
                for (var j = 0; j < message.blocks.length; ++j)
                    object.blocks[j] = options.bytes === String ? $util.base64.encode(message.blocks[j], 0, message.blocks[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.blocks[j]) : message.blocks[j];
            }
            return object;
        };

        /**
         * Converts this GetBlocksResponse to JSON.
         * @function toJSON
         * @memberof getBlocks.GetBlocksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetBlocksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetBlocksResponse
         * @function getTypeUrl
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetBlocksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getBlocks.GetBlocksResponse";
        };

        return GetBlocksResponse;
    })();

    return getBlocks;
})();

$root.getMessages = (function() {

    /**
     * Namespace getMessages.
     * @exports getMessages
     * @namespace
     */
    var getMessages = {};

    getMessages.GetMessagesRequest = (function() {

        /**
         * Properties of a GetMessagesRequest.
         * @memberof getMessages
         * @interface IGetMessagesRequest
         * @property {shared.IHeaders|null} [headers] GetMessagesRequest headers
         */

        /**
         * Constructs a new GetMessagesRequest.
         * @memberof getMessages
         * @classdesc Represents a GetMessagesRequest.
         * @implements IGetMessagesRequest
         * @constructor
         * @param {getMessages.IGetMessagesRequest=} [properties] Properties to set
         */
        function GetMessagesRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetMessagesRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getMessages.GetMessagesRequest
         * @instance
         */
        GetMessagesRequest.prototype.headers = null;

        /**
         * Creates a new GetMessagesRequest instance using the specified properties.
         * @function create
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.IGetMessagesRequest=} [properties] Properties to set
         * @returns {getMessages.GetMessagesRequest} GetMessagesRequest instance
         */
        GetMessagesRequest.create = function create(properties) {
            return new GetMessagesRequest(properties);
        };

        /**
         * Encodes the specified GetMessagesRequest message. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @function encode
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.IGetMessagesRequest} message GetMessagesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetMessagesRequest message, length delimited. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.IGetMessagesRequest} message GetMessagesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesRequest} GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getMessages.GetMessagesRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesRequest} GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetMessagesRequest message.
         * @function verify
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetMessagesRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetMessagesRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getMessages.GetMessagesRequest} GetMessagesRequest
         */
        GetMessagesRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getMessages.GetMessagesRequest)
                return object;
            var message = new $root.getMessages.GetMessagesRequest();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getMessages.GetMessagesRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetMessagesRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.GetMessagesRequest} message GetMessagesRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetMessagesRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetMessagesRequest to JSON.
         * @function toJSON
         * @memberof getMessages.GetMessagesRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetMessagesRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetMessagesRequest
         * @function getTypeUrl
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetMessagesRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getMessages.GetMessagesRequest";
        };

        return GetMessagesRequest;
    })();

    getMessages.GetMessagesResponse = (function() {

        /**
         * Properties of a GetMessagesResponse.
         * @memberof getMessages
         * @interface IGetMessagesResponse
         * @property {shared.IHeaders|null} [headers] GetMessagesResponse headers
         * @property {Array.<Uint8Array>|null} [prevotes] GetMessagesResponse prevotes
         * @property {Array.<Uint8Array>|null} [precommits] GetMessagesResponse precommits
         */

        /**
         * Constructs a new GetMessagesResponse.
         * @memberof getMessages
         * @classdesc Represents a GetMessagesResponse.
         * @implements IGetMessagesResponse
         * @constructor
         * @param {getMessages.IGetMessagesResponse=} [properties] Properties to set
         */
        function GetMessagesResponse(properties) {
            this.prevotes = [];
            this.precommits = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetMessagesResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getMessages.GetMessagesResponse
         * @instance
         */
        GetMessagesResponse.prototype.headers = null;

        /**
         * GetMessagesResponse prevotes.
         * @member {Array.<Uint8Array>} prevotes
         * @memberof getMessages.GetMessagesResponse
         * @instance
         */
        GetMessagesResponse.prototype.prevotes = $util.emptyArray;

        /**
         * GetMessagesResponse precommits.
         * @member {Array.<Uint8Array>} precommits
         * @memberof getMessages.GetMessagesResponse
         * @instance
         */
        GetMessagesResponse.prototype.precommits = $util.emptyArray;

        /**
         * Creates a new GetMessagesResponse instance using the specified properties.
         * @function create
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {getMessages.IGetMessagesResponse=} [properties] Properties to set
         * @returns {getMessages.GetMessagesResponse} GetMessagesResponse instance
         */
        GetMessagesResponse.create = function create(properties) {
            return new GetMessagesResponse(properties);
        };

        /**
         * Encodes the specified GetMessagesResponse message. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @function encode
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {getMessages.IGetMessagesResponse} message GetMessagesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.prevotes != null && message.prevotes.length)
                for (var i = 0; i < message.prevotes.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.prevotes[i]);
            if (message.precommits != null && message.precommits.length)
                for (var i = 0; i < message.precommits.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.precommits[i]);
            return writer;
        };

        /**
         * Encodes the specified GetMessagesResponse message, length delimited. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {getMessages.IGetMessagesResponse} message GetMessagesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesResponse} GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getMessages.GetMessagesResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        if (!(message.prevotes && message.prevotes.length))
                            message.prevotes = [];
                        message.prevotes.push(reader.bytes());
                        break;
                    }
                case 3: {
                        if (!(message.precommits && message.precommits.length))
                            message.precommits = [];
                        message.precommits.push(reader.bytes());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesResponse} GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetMessagesResponse message.
         * @function verify
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetMessagesResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.prevotes != null && message.hasOwnProperty("prevotes")) {
                if (!Array.isArray(message.prevotes))
                    return "prevotes: array expected";
                for (var i = 0; i < message.prevotes.length; ++i)
                    if (!(message.prevotes[i] && typeof message.prevotes[i].length === "number" || $util.isString(message.prevotes[i])))
                        return "prevotes: buffer[] expected";
            }
            if (message.precommits != null && message.hasOwnProperty("precommits")) {
                if (!Array.isArray(message.precommits))
                    return "precommits: array expected";
                for (var i = 0; i < message.precommits.length; ++i)
                    if (!(message.precommits[i] && typeof message.precommits[i].length === "number" || $util.isString(message.precommits[i])))
                        return "precommits: buffer[] expected";
            }
            return null;
        };

        /**
         * Creates a GetMessagesResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getMessages.GetMessagesResponse} GetMessagesResponse
         */
        GetMessagesResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getMessages.GetMessagesResponse)
                return object;
            var message = new $root.getMessages.GetMessagesResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getMessages.GetMessagesResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.prevotes) {
                if (!Array.isArray(object.prevotes))
                    throw TypeError(".getMessages.GetMessagesResponse.prevotes: array expected");
                message.prevotes = [];
                for (var i = 0; i < object.prevotes.length; ++i)
                    if (typeof object.prevotes[i] === "string")
                        $util.base64.decode(object.prevotes[i], message.prevotes[i] = $util.newBuffer($util.base64.length(object.prevotes[i])), 0);
                    else if (object.prevotes[i].length >= 0)
                        message.prevotes[i] = object.prevotes[i];
            }
            if (object.precommits) {
                if (!Array.isArray(object.precommits))
                    throw TypeError(".getMessages.GetMessagesResponse.precommits: array expected");
                message.precommits = [];
                for (var i = 0; i < object.precommits.length; ++i)
                    if (typeof object.precommits[i] === "string")
                        $util.base64.decode(object.precommits[i], message.precommits[i] = $util.newBuffer($util.base64.length(object.precommits[i])), 0);
                    else if (object.precommits[i].length >= 0)
                        message.precommits[i] = object.precommits[i];
            }
            return message;
        };

        /**
         * Creates a plain object from a GetMessagesResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {getMessages.GetMessagesResponse} message GetMessagesResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetMessagesResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.prevotes = [];
                object.precommits = [];
            }
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.prevotes && message.prevotes.length) {
                object.prevotes = [];
                for (var j = 0; j < message.prevotes.length; ++j)
                    object.prevotes[j] = options.bytes === String ? $util.base64.encode(message.prevotes[j], 0, message.prevotes[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.prevotes[j]) : message.prevotes[j];
            }
            if (message.precommits && message.precommits.length) {
                object.precommits = [];
                for (var j = 0; j < message.precommits.length; ++j)
                    object.precommits[j] = options.bytes === String ? $util.base64.encode(message.precommits[j], 0, message.precommits[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.precommits[j]) : message.precommits[j];
            }
            return object;
        };

        /**
         * Converts this GetMessagesResponse to JSON.
         * @function toJSON
         * @memberof getMessages.GetMessagesResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetMessagesResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetMessagesResponse
         * @function getTypeUrl
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetMessagesResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getMessages.GetMessagesResponse";
        };

        return GetMessagesResponse;
    })();

    return getMessages;
})();

$root.getPeers = (function() {

    /**
     * Namespace getPeers.
     * @exports getPeers
     * @namespace
     */
    var getPeers = {};

    getPeers.GetPeersRequest = (function() {

        /**
         * Properties of a GetPeersRequest.
         * @memberof getPeers
         * @interface IGetPeersRequest
         * @property {shared.IHeaders|null} [headers] GetPeersRequest headers
         */

        /**
         * Constructs a new GetPeersRequest.
         * @memberof getPeers
         * @classdesc Represents a GetPeersRequest.
         * @implements IGetPeersRequest
         * @constructor
         * @param {getPeers.IGetPeersRequest=} [properties] Properties to set
         */
        function GetPeersRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetPeersRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getPeers.GetPeersRequest
         * @instance
         */
        GetPeersRequest.prototype.headers = null;

        /**
         * Creates a new GetPeersRequest instance using the specified properties.
         * @function create
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.IGetPeersRequest=} [properties] Properties to set
         * @returns {getPeers.GetPeersRequest} GetPeersRequest instance
         */
        GetPeersRequest.create = function create(properties) {
            return new GetPeersRequest(properties);
        };

        /**
         * Encodes the specified GetPeersRequest message. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @function encode
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.IGetPeersRequest} message GetPeersRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetPeersRequest message, length delimited. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.IGetPeersRequest} message GetPeersRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getPeers.GetPeersRequest} GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getPeers.GetPeersRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getPeers.GetPeersRequest} GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetPeersRequest message.
         * @function verify
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetPeersRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetPeersRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getPeers.GetPeersRequest} GetPeersRequest
         */
        GetPeersRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getPeers.GetPeersRequest)
                return object;
            var message = new $root.getPeers.GetPeersRequest();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getPeers.GetPeersRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetPeersRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.GetPeersRequest} message GetPeersRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetPeersRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetPeersRequest to JSON.
         * @function toJSON
         * @memberof getPeers.GetPeersRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetPeersRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetPeersRequest
         * @function getTypeUrl
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetPeersRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getPeers.GetPeersRequest";
        };

        return GetPeersRequest;
    })();

    getPeers.GetPeersResponse = (function() {

        /**
         * Properties of a GetPeersResponse.
         * @memberof getPeers
         * @interface IGetPeersResponse
         * @property {shared.IHeaders|null} [headers] GetPeersResponse headers
         * @property {Array.<shared.IPeerLike>|null} [peers] GetPeersResponse peers
         */

        /**
         * Constructs a new GetPeersResponse.
         * @memberof getPeers
         * @classdesc Represents a GetPeersResponse.
         * @implements IGetPeersResponse
         * @constructor
         * @param {getPeers.IGetPeersResponse=} [properties] Properties to set
         */
        function GetPeersResponse(properties) {
            this.peers = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetPeersResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getPeers.GetPeersResponse
         * @instance
         */
        GetPeersResponse.prototype.headers = null;

        /**
         * GetPeersResponse peers.
         * @member {Array.<shared.IPeerLike>} peers
         * @memberof getPeers.GetPeersResponse
         * @instance
         */
        GetPeersResponse.prototype.peers = $util.emptyArray;

        /**
         * Creates a new GetPeersResponse instance using the specified properties.
         * @function create
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.IGetPeersResponse=} [properties] Properties to set
         * @returns {getPeers.GetPeersResponse} GetPeersResponse instance
         */
        GetPeersResponse.create = function create(properties) {
            return new GetPeersResponse(properties);
        };

        /**
         * Encodes the specified GetPeersResponse message. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @function encode
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.IGetPeersResponse} message GetPeersResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.peers != null && message.peers.length)
                for (var i = 0; i < message.peers.length; ++i)
                    $root.shared.PeerLike.encode(message.peers[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetPeersResponse message, length delimited. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.IGetPeersResponse} message GetPeersResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getPeers.GetPeersResponse} GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getPeers.GetPeersResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        if (!(message.peers && message.peers.length))
                            message.peers = [];
                        message.peers.push($root.shared.PeerLike.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getPeers.GetPeersResponse} GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetPeersResponse message.
         * @function verify
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetPeersResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.peers != null && message.hasOwnProperty("peers")) {
                if (!Array.isArray(message.peers))
                    return "peers: array expected";
                for (var i = 0; i < message.peers.length; ++i) {
                    var error = $root.shared.PeerLike.verify(message.peers[i]);
                    if (error)
                        return "peers." + error;
                }
            }
            return null;
        };

        /**
         * Creates a GetPeersResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getPeers.GetPeersResponse} GetPeersResponse
         */
        GetPeersResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getPeers.GetPeersResponse)
                return object;
            var message = new $root.getPeers.GetPeersResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getPeers.GetPeersResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.peers) {
                if (!Array.isArray(object.peers))
                    throw TypeError(".getPeers.GetPeersResponse.peers: array expected");
                message.peers = [];
                for (var i = 0; i < object.peers.length; ++i) {
                    if (typeof object.peers[i] !== "object")
                        throw TypeError(".getPeers.GetPeersResponse.peers: object expected");
                    message.peers[i] = $root.shared.PeerLike.fromObject(object.peers[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a GetPeersResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.GetPeersResponse} message GetPeersResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetPeersResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.peers = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.peers && message.peers.length) {
                object.peers = [];
                for (var j = 0; j < message.peers.length; ++j)
                    object.peers[j] = $root.shared.PeerLike.toObject(message.peers[j], options);
            }
            return object;
        };

        /**
         * Converts this GetPeersResponse to JSON.
         * @function toJSON
         * @memberof getPeers.GetPeersResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetPeersResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetPeersResponse
         * @function getTypeUrl
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetPeersResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getPeers.GetPeersResponse";
        };

        return GetPeersResponse;
    })();

    return getPeers;
})();

$root.getProposal = (function() {

    /**
     * Namespace getProposal.
     * @exports getProposal
     * @namespace
     */
    var getProposal = {};

    getProposal.GetProposalRequest = (function() {

        /**
         * Properties of a GetProposalRequest.
         * @memberof getProposal
         * @interface IGetProposalRequest
         * @property {shared.IHeaders|null} [headers] GetProposalRequest headers
         */

        /**
         * Constructs a new GetProposalRequest.
         * @memberof getProposal
         * @classdesc Represents a GetProposalRequest.
         * @implements IGetProposalRequest
         * @constructor
         * @param {getProposal.IGetProposalRequest=} [properties] Properties to set
         */
        function GetProposalRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetProposalRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getProposal.GetProposalRequest
         * @instance
         */
        GetProposalRequest.prototype.headers = null;

        /**
         * Creates a new GetProposalRequest instance using the specified properties.
         * @function create
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.IGetProposalRequest=} [properties] Properties to set
         * @returns {getProposal.GetProposalRequest} GetProposalRequest instance
         */
        GetProposalRequest.create = function create(properties) {
            return new GetProposalRequest(properties);
        };

        /**
         * Encodes the specified GetProposalRequest message. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @function encode
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.IGetProposalRequest} message GetProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetProposalRequest message, length delimited. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.IGetProposalRequest} message GetProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getProposal.GetProposalRequest} GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getProposal.GetProposalRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalRequest} GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetProposalRequest message.
         * @function verify
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetProposalRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetProposalRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getProposal.GetProposalRequest} GetProposalRequest
         */
        GetProposalRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getProposal.GetProposalRequest)
                return object;
            var message = new $root.getProposal.GetProposalRequest();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getProposal.GetProposalRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetProposalRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.GetProposalRequest} message GetProposalRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetProposalRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetProposalRequest to JSON.
         * @function toJSON
         * @memberof getProposal.GetProposalRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetProposalRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetProposalRequest
         * @function getTypeUrl
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetProposalRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getProposal.GetProposalRequest";
        };

        return GetProposalRequest;
    })();

    getProposal.GetProposalResponse = (function() {

        /**
         * Properties of a GetProposalResponse.
         * @memberof getProposal
         * @interface IGetProposalResponse
         * @property {shared.IHeaders|null} [headers] GetProposalResponse headers
         * @property {Uint8Array|null} [proposal] GetProposalResponse proposal
         */

        /**
         * Constructs a new GetProposalResponse.
         * @memberof getProposal
         * @classdesc Represents a GetProposalResponse.
         * @implements IGetProposalResponse
         * @constructor
         * @param {getProposal.IGetProposalResponse=} [properties] Properties to set
         */
        function GetProposalResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetProposalResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getProposal.GetProposalResponse
         * @instance
         */
        GetProposalResponse.prototype.headers = null;

        /**
         * GetProposalResponse proposal.
         * @member {Uint8Array} proposal
         * @memberof getProposal.GetProposalResponse
         * @instance
         */
        GetProposalResponse.prototype.proposal = $util.newBuffer([]);

        /**
         * Creates a new GetProposalResponse instance using the specified properties.
         * @function create
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {getProposal.IGetProposalResponse=} [properties] Properties to set
         * @returns {getProposal.GetProposalResponse} GetProposalResponse instance
         */
        GetProposalResponse.create = function create(properties) {
            return new GetProposalResponse(properties);
        };

        /**
         * Encodes the specified GetProposalResponse message. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @function encode
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {getProposal.IGetProposalResponse} message GetProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.proposal != null && Object.hasOwnProperty.call(message, "proposal"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.proposal);
            return writer;
        };

        /**
         * Encodes the specified GetProposalResponse message, length delimited. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {getProposal.IGetProposalResponse} message GetProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getProposal.GetProposalResponse} GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getProposal.GetProposalResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.proposal = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalResponse} GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetProposalResponse message.
         * @function verify
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetProposalResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.proposal != null && message.hasOwnProperty("proposal"))
                if (!(message.proposal && typeof message.proposal.length === "number" || $util.isString(message.proposal)))
                    return "proposal: buffer expected";
            return null;
        };

        /**
         * Creates a GetProposalResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getProposal.GetProposalResponse} GetProposalResponse
         */
        GetProposalResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getProposal.GetProposalResponse)
                return object;
            var message = new $root.getProposal.GetProposalResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getProposal.GetProposalResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.proposal != null)
                if (typeof object.proposal === "string")
                    $util.base64.decode(object.proposal, message.proposal = $util.newBuffer($util.base64.length(object.proposal)), 0);
                else if (object.proposal.length >= 0)
                    message.proposal = object.proposal;
            return message;
        };

        /**
         * Creates a plain object from a GetProposalResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {getProposal.GetProposalResponse} message GetProposalResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetProposalResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.headers = null;
                if (options.bytes === String)
                    object.proposal = "";
                else {
                    object.proposal = [];
                    if (options.bytes !== Array)
                        object.proposal = $util.newBuffer(object.proposal);
                }
            }
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.proposal != null && message.hasOwnProperty("proposal"))
                object.proposal = options.bytes === String ? $util.base64.encode(message.proposal, 0, message.proposal.length) : options.bytes === Array ? Array.prototype.slice.call(message.proposal) : message.proposal;
            return object;
        };

        /**
         * Converts this GetProposalResponse to JSON.
         * @function toJSON
         * @memberof getProposal.GetProposalResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetProposalResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetProposalResponse
         * @function getTypeUrl
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetProposalResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getProposal.GetProposalResponse";
        };

        return GetProposalResponse;
    })();

    return getProposal;
})();

$root.getStatus = (function() {

    /**
     * Namespace getStatus.
     * @exports getStatus
     * @namespace
     */
    var getStatus = {};

    getStatus.GetStatusRequest = (function() {

        /**
         * Properties of a GetStatusRequest.
         * @memberof getStatus
         * @interface IGetStatusRequest
         * @property {shared.IHeaders|null} [headers] GetStatusRequest headers
         */

        /**
         * Constructs a new GetStatusRequest.
         * @memberof getStatus
         * @classdesc Represents a GetStatusRequest.
         * @implements IGetStatusRequest
         * @constructor
         * @param {getStatus.IGetStatusRequest=} [properties] Properties to set
         */
        function GetStatusRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetStatusRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getStatus.GetStatusRequest
         * @instance
         */
        GetStatusRequest.prototype.headers = null;

        /**
         * Creates a new GetStatusRequest instance using the specified properties.
         * @function create
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.IGetStatusRequest=} [properties] Properties to set
         * @returns {getStatus.GetStatusRequest} GetStatusRequest instance
         */
        GetStatusRequest.create = function create(properties) {
            return new GetStatusRequest(properties);
        };

        /**
         * Encodes the specified GetStatusRequest message. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @function encode
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.IGetStatusRequest} message GetStatusRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetStatusRequest message, length delimited. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.IGetStatusRequest} message GetStatusRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getStatus.GetStatusRequest} GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getStatus.GetStatusRequest} GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetStatusRequest message.
         * @function verify
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetStatusRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetStatusRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getStatus.GetStatusRequest} GetStatusRequest
         */
        GetStatusRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getStatus.GetStatusRequest)
                return object;
            var message = new $root.getStatus.GetStatusRequest();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getStatus.GetStatusRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetStatusRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.GetStatusRequest} message GetStatusRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetStatusRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetStatusRequest to JSON.
         * @function toJSON
         * @memberof getStatus.GetStatusRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetStatusRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetStatusRequest
         * @function getTypeUrl
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetStatusRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getStatus.GetStatusRequest";
        };

        return GetStatusRequest;
    })();

    getStatus.GetStatusResponse = (function() {

        /**
         * Properties of a GetStatusResponse.
         * @memberof getStatus
         * @interface IGetStatusResponse
         * @property {shared.IHeaders|null} [headers] GetStatusResponse headers
         * @property {getStatus.GetStatusResponse.IState|null} [state] GetStatusResponse state
         * @property {getStatus.GetStatusResponse.IConfig|null} [config] GetStatusResponse config
         */

        /**
         * Constructs a new GetStatusResponse.
         * @memberof getStatus
         * @classdesc Represents a GetStatusResponse.
         * @implements IGetStatusResponse
         * @constructor
         * @param {getStatus.IGetStatusResponse=} [properties] Properties to set
         */
        function GetStatusResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetStatusResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getStatus.GetStatusResponse
         * @instance
         */
        GetStatusResponse.prototype.headers = null;

        /**
         * GetStatusResponse state.
         * @member {getStatus.GetStatusResponse.IState|null|undefined} state
         * @memberof getStatus.GetStatusResponse
         * @instance
         */
        GetStatusResponse.prototype.state = null;

        /**
         * GetStatusResponse config.
         * @member {getStatus.GetStatusResponse.IConfig|null|undefined} config
         * @memberof getStatus.GetStatusResponse
         * @instance
         */
        GetStatusResponse.prototype.config = null;

        /**
         * Creates a new GetStatusResponse instance using the specified properties.
         * @function create
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.IGetStatusResponse=} [properties] Properties to set
         * @returns {getStatus.GetStatusResponse} GetStatusResponse instance
         */
        GetStatusResponse.create = function create(properties) {
            return new GetStatusResponse(properties);
        };

        /**
         * Encodes the specified GetStatusResponse message. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @function encode
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.IGetStatusResponse} message GetStatusResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.state != null && Object.hasOwnProperty.call(message, "state"))
                $root.getStatus.GetStatusResponse.State.encode(message.state, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.config != null && Object.hasOwnProperty.call(message, "config"))
                $root.getStatus.GetStatusResponse.Config.encode(message.config, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetStatusResponse message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.IGetStatusResponse} message GetStatusResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getStatus.GetStatusResponse} GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.state = $root.getStatus.GetStatusResponse.State.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.config = $root.getStatus.GetStatusResponse.Config.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getStatus.GetStatusResponse} GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetStatusResponse message.
         * @function verify
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetStatusResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.state != null && message.hasOwnProperty("state")) {
                var error = $root.getStatus.GetStatusResponse.State.verify(message.state);
                if (error)
                    return "state." + error;
            }
            if (message.config != null && message.hasOwnProperty("config")) {
                var error = $root.getStatus.GetStatusResponse.Config.verify(message.config);
                if (error)
                    return "config." + error;
            }
            return null;
        };

        /**
         * Creates a GetStatusResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getStatus.GetStatusResponse} GetStatusResponse
         */
        GetStatusResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getStatus.GetStatusResponse)
                return object;
            var message = new $root.getStatus.GetStatusResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getStatus.GetStatusResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.state != null) {
                if (typeof object.state !== "object")
                    throw TypeError(".getStatus.GetStatusResponse.state: object expected");
                message.state = $root.getStatus.GetStatusResponse.State.fromObject(object.state);
            }
            if (object.config != null) {
                if (typeof object.config !== "object")
                    throw TypeError(".getStatus.GetStatusResponse.config: object expected");
                message.config = $root.getStatus.GetStatusResponse.Config.fromObject(object.config);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetStatusResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.GetStatusResponse} message GetStatusResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetStatusResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.headers = null;
                object.state = null;
                object.config = null;
            }
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.state != null && message.hasOwnProperty("state"))
                object.state = $root.getStatus.GetStatusResponse.State.toObject(message.state, options);
            if (message.config != null && message.hasOwnProperty("config"))
                object.config = $root.getStatus.GetStatusResponse.Config.toObject(message.config, options);
            return object;
        };

        /**
         * Converts this GetStatusResponse to JSON.
         * @function toJSON
         * @memberof getStatus.GetStatusResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetStatusResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetStatusResponse
         * @function getTypeUrl
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetStatusResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getStatus.GetStatusResponse";
        };

        GetStatusResponse.State = (function() {

            /**
             * Properties of a State.
             * @memberof getStatus.GetStatusResponse
             * @interface IState
             * @property {number|null} [height] State height
             * @property {boolean|null} [forgingAllowed] State forgingAllowed
             * @property {number|null} [currentSlot] State currentSlot
             * @property {getStatus.GetStatusResponse.State.IBlockHeader|null} [header] State header
             */

            /**
             * Constructs a new State.
             * @memberof getStatus.GetStatusResponse
             * @classdesc Represents a State.
             * @implements IState
             * @constructor
             * @param {getStatus.GetStatusResponse.IState=} [properties] Properties to set
             */
            function State(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * State height.
             * @member {number} height
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             */
            State.prototype.height = 0;

            /**
             * State forgingAllowed.
             * @member {boolean} forgingAllowed
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             */
            State.prototype.forgingAllowed = false;

            /**
             * State currentSlot.
             * @member {number} currentSlot
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             */
            State.prototype.currentSlot = 0;

            /**
             * State header.
             * @member {getStatus.GetStatusResponse.State.IBlockHeader|null|undefined} header
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             */
            State.prototype.header = null;

            /**
             * Creates a new State instance using the specified properties.
             * @function create
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.IState=} [properties] Properties to set
             * @returns {getStatus.GetStatusResponse.State} State instance
             */
            State.create = function create(properties) {
                return new State(properties);
            };

            /**
             * Encodes the specified State message. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @function encode
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.IState} message State message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            State.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.height);
                if (message.forgingAllowed != null && Object.hasOwnProperty.call(message, "forgingAllowed"))
                    writer.uint32(/* id 2, wireType 0 =*/16).bool(message.forgingAllowed);
                if (message.currentSlot != null && Object.hasOwnProperty.call(message, "currentSlot"))
                    writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.currentSlot);
                if (message.header != null && Object.hasOwnProperty.call(message, "header"))
                    $root.getStatus.GetStatusResponse.State.BlockHeader.encode(message.header, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified State message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @function encodeDelimited
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.IState} message State message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            State.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a State message from the specified reader or buffer.
             * @function decode
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {getStatus.GetStatusResponse.State} State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            State.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse.State();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.height = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.forgingAllowed = reader.bool();
                            break;
                        }
                    case 3: {
                            message.currentSlot = reader.uint32();
                            break;
                        }
                    case 4: {
                            message.header = $root.getStatus.GetStatusResponse.State.BlockHeader.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a State message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {getStatus.GetStatusResponse.State} State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            State.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a State message.
             * @function verify
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            State.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.height != null && message.hasOwnProperty("height"))
                    if (!$util.isInteger(message.height))
                        return "height: integer expected";
                if (message.forgingAllowed != null && message.hasOwnProperty("forgingAllowed"))
                    if (typeof message.forgingAllowed !== "boolean")
                        return "forgingAllowed: boolean expected";
                if (message.currentSlot != null && message.hasOwnProperty("currentSlot"))
                    if (!$util.isInteger(message.currentSlot))
                        return "currentSlot: integer expected";
                if (message.header != null && message.hasOwnProperty("header")) {
                    var error = $root.getStatus.GetStatusResponse.State.BlockHeader.verify(message.header);
                    if (error)
                        return "header." + error;
                }
                return null;
            };

            /**
             * Creates a State message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {getStatus.GetStatusResponse.State} State
             */
            State.fromObject = function fromObject(object) {
                if (object instanceof $root.getStatus.GetStatusResponse.State)
                    return object;
                var message = new $root.getStatus.GetStatusResponse.State();
                if (object.height != null)
                    message.height = object.height >>> 0;
                if (object.forgingAllowed != null)
                    message.forgingAllowed = Boolean(object.forgingAllowed);
                if (object.currentSlot != null)
                    message.currentSlot = object.currentSlot >>> 0;
                if (object.header != null) {
                    if (typeof object.header !== "object")
                        throw TypeError(".getStatus.GetStatusResponse.State.header: object expected");
                    message.header = $root.getStatus.GetStatusResponse.State.BlockHeader.fromObject(object.header);
                }
                return message;
            };

            /**
             * Creates a plain object from a State message. Also converts values to other types if specified.
             * @function toObject
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.State} message State
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            State.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.height = 0;
                    object.forgingAllowed = false;
                    object.currentSlot = 0;
                    object.header = null;
                }
                if (message.height != null && message.hasOwnProperty("height"))
                    object.height = message.height;
                if (message.forgingAllowed != null && message.hasOwnProperty("forgingAllowed"))
                    object.forgingAllowed = message.forgingAllowed;
                if (message.currentSlot != null && message.hasOwnProperty("currentSlot"))
                    object.currentSlot = message.currentSlot;
                if (message.header != null && message.hasOwnProperty("header"))
                    object.header = $root.getStatus.GetStatusResponse.State.BlockHeader.toObject(message.header, options);
                return object;
            };

            /**
             * Converts this State to JSON.
             * @function toJSON
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            State.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for State
             * @function getTypeUrl
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            State.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/getStatus.GetStatusResponse.State";
            };

            State.BlockHeader = (function() {

                /**
                 * Properties of a BlockHeader.
                 * @memberof getStatus.GetStatusResponse.State
                 * @interface IBlockHeader
                 * @property {string|null} [id] BlockHeader id
                 * @property {number|null} [version] BlockHeader version
                 * @property {number|null} [timestamp] BlockHeader timestamp
                 * @property {string|null} [previousBlock] BlockHeader previousBlock
                 * @property {number|null} [height] BlockHeader height
                 * @property {number|null} [numberOfTransactions] BlockHeader numberOfTransactions
                 * @property {string|null} [totalAmount] BlockHeader totalAmount
                 * @property {string|null} [totalFee] BlockHeader totalFee
                 * @property {string|null} [reward] BlockHeader reward
                 * @property {number|null} [payloadLength] BlockHeader payloadLength
                 * @property {string|null} [payloadHash] BlockHeader payloadHash
                 * @property {string|null} [generatorPublicKey] BlockHeader generatorPublicKey
                 * @property {string|null} [blockSignature] BlockHeader blockSignature
                 */

                /**
                 * Constructs a new BlockHeader.
                 * @memberof getStatus.GetStatusResponse.State
                 * @classdesc Represents a BlockHeader.
                 * @implements IBlockHeader
                 * @constructor
                 * @param {getStatus.GetStatusResponse.State.IBlockHeader=} [properties] Properties to set
                 */
                function BlockHeader(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * BlockHeader id.
                 * @member {string} id
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.id = "";

                /**
                 * BlockHeader version.
                 * @member {number} version
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.version = 0;

                /**
                 * BlockHeader timestamp.
                 * @member {number} timestamp
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.timestamp = 0;

                /**
                 * BlockHeader previousBlock.
                 * @member {string} previousBlock
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.previousBlock = "";

                /**
                 * BlockHeader height.
                 * @member {number} height
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.height = 0;

                /**
                 * BlockHeader numberOfTransactions.
                 * @member {number} numberOfTransactions
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.numberOfTransactions = 0;

                /**
                 * BlockHeader totalAmount.
                 * @member {string} totalAmount
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.totalAmount = "";

                /**
                 * BlockHeader totalFee.
                 * @member {string} totalFee
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.totalFee = "";

                /**
                 * BlockHeader reward.
                 * @member {string} reward
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.reward = "";

                /**
                 * BlockHeader payloadLength.
                 * @member {number} payloadLength
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.payloadLength = 0;

                /**
                 * BlockHeader payloadHash.
                 * @member {string} payloadHash
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.payloadHash = "";

                /**
                 * BlockHeader generatorPublicKey.
                 * @member {string} generatorPublicKey
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.generatorPublicKey = "";

                /**
                 * BlockHeader blockSignature.
                 * @member {string} blockSignature
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 */
                BlockHeader.prototype.blockSignature = "";

                /**
                 * Creates a new BlockHeader instance using the specified properties.
                 * @function create
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {getStatus.GetStatusResponse.State.IBlockHeader=} [properties] Properties to set
                 * @returns {getStatus.GetStatusResponse.State.BlockHeader} BlockHeader instance
                 */
                BlockHeader.create = function create(properties) {
                    return new BlockHeader(properties);
                };

                /**
                 * Encodes the specified BlockHeader message. Does not implicitly {@link getStatus.GetStatusResponse.State.BlockHeader.verify|verify} messages.
                 * @function encode
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {getStatus.GetStatusResponse.State.IBlockHeader} message BlockHeader message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                BlockHeader.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.version);
                    if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                        writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.timestamp);
                    if (message.previousBlock != null && Object.hasOwnProperty.call(message, "previousBlock"))
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.previousBlock);
                    if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                        writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.height);
                    if (message.numberOfTransactions != null && Object.hasOwnProperty.call(message, "numberOfTransactions"))
                        writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.numberOfTransactions);
                    if (message.totalAmount != null && Object.hasOwnProperty.call(message, "totalAmount"))
                        writer.uint32(/* id 7, wireType 2 =*/58).string(message.totalAmount);
                    if (message.totalFee != null && Object.hasOwnProperty.call(message, "totalFee"))
                        writer.uint32(/* id 8, wireType 2 =*/66).string(message.totalFee);
                    if (message.reward != null && Object.hasOwnProperty.call(message, "reward"))
                        writer.uint32(/* id 9, wireType 2 =*/74).string(message.reward);
                    if (message.payloadLength != null && Object.hasOwnProperty.call(message, "payloadLength"))
                        writer.uint32(/* id 10, wireType 0 =*/80).uint32(message.payloadLength);
                    if (message.payloadHash != null && Object.hasOwnProperty.call(message, "payloadHash"))
                        writer.uint32(/* id 11, wireType 2 =*/90).string(message.payloadHash);
                    if (message.generatorPublicKey != null && Object.hasOwnProperty.call(message, "generatorPublicKey"))
                        writer.uint32(/* id 12, wireType 2 =*/98).string(message.generatorPublicKey);
                    if (message.blockSignature != null && Object.hasOwnProperty.call(message, "blockSignature"))
                        writer.uint32(/* id 13, wireType 2 =*/106).string(message.blockSignature);
                    return writer;
                };

                /**
                 * Encodes the specified BlockHeader message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.State.BlockHeader.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {getStatus.GetStatusResponse.State.IBlockHeader} message BlockHeader message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                BlockHeader.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a BlockHeader message from the specified reader or buffer.
                 * @function decode
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.State.BlockHeader} BlockHeader
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                BlockHeader.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse.State.BlockHeader();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.id = reader.string();
                                break;
                            }
                        case 2: {
                                message.version = reader.uint32();
                                break;
                            }
                        case 3: {
                                message.timestamp = reader.uint32();
                                break;
                            }
                        case 4: {
                                message.previousBlock = reader.string();
                                break;
                            }
                        case 5: {
                                message.height = reader.uint32();
                                break;
                            }
                        case 6: {
                                message.numberOfTransactions = reader.uint32();
                                break;
                            }
                        case 7: {
                                message.totalAmount = reader.string();
                                break;
                            }
                        case 8: {
                                message.totalFee = reader.string();
                                break;
                            }
                        case 9: {
                                message.reward = reader.string();
                                break;
                            }
                        case 10: {
                                message.payloadLength = reader.uint32();
                                break;
                            }
                        case 11: {
                                message.payloadHash = reader.string();
                                break;
                            }
                        case 12: {
                                message.generatorPublicKey = reader.string();
                                break;
                            }
                        case 13: {
                                message.blockSignature = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a BlockHeader message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.State.BlockHeader} BlockHeader
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                BlockHeader.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a BlockHeader message.
                 * @function verify
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                BlockHeader.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.id != null && message.hasOwnProperty("id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.version != null && message.hasOwnProperty("version"))
                        if (!$util.isInteger(message.version))
                            return "version: integer expected";
                    if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                        if (!$util.isInteger(message.timestamp))
                            return "timestamp: integer expected";
                    if (message.previousBlock != null && message.hasOwnProperty("previousBlock"))
                        if (!$util.isString(message.previousBlock))
                            return "previousBlock: string expected";
                    if (message.height != null && message.hasOwnProperty("height"))
                        if (!$util.isInteger(message.height))
                            return "height: integer expected";
                    if (message.numberOfTransactions != null && message.hasOwnProperty("numberOfTransactions"))
                        if (!$util.isInteger(message.numberOfTransactions))
                            return "numberOfTransactions: integer expected";
                    if (message.totalAmount != null && message.hasOwnProperty("totalAmount"))
                        if (!$util.isString(message.totalAmount))
                            return "totalAmount: string expected";
                    if (message.totalFee != null && message.hasOwnProperty("totalFee"))
                        if (!$util.isString(message.totalFee))
                            return "totalFee: string expected";
                    if (message.reward != null && message.hasOwnProperty("reward"))
                        if (!$util.isString(message.reward))
                            return "reward: string expected";
                    if (message.payloadLength != null && message.hasOwnProperty("payloadLength"))
                        if (!$util.isInteger(message.payloadLength))
                            return "payloadLength: integer expected";
                    if (message.payloadHash != null && message.hasOwnProperty("payloadHash"))
                        if (!$util.isString(message.payloadHash))
                            return "payloadHash: string expected";
                    if (message.generatorPublicKey != null && message.hasOwnProperty("generatorPublicKey"))
                        if (!$util.isString(message.generatorPublicKey))
                            return "generatorPublicKey: string expected";
                    if (message.blockSignature != null && message.hasOwnProperty("blockSignature"))
                        if (!$util.isString(message.blockSignature))
                            return "blockSignature: string expected";
                    return null;
                };

                /**
                 * Creates a BlockHeader message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {getStatus.GetStatusResponse.State.BlockHeader} BlockHeader
                 */
                BlockHeader.fromObject = function fromObject(object) {
                    if (object instanceof $root.getStatus.GetStatusResponse.State.BlockHeader)
                        return object;
                    var message = new $root.getStatus.GetStatusResponse.State.BlockHeader();
                    if (object.id != null)
                        message.id = String(object.id);
                    if (object.version != null)
                        message.version = object.version >>> 0;
                    if (object.timestamp != null)
                        message.timestamp = object.timestamp >>> 0;
                    if (object.previousBlock != null)
                        message.previousBlock = String(object.previousBlock);
                    if (object.height != null)
                        message.height = object.height >>> 0;
                    if (object.numberOfTransactions != null)
                        message.numberOfTransactions = object.numberOfTransactions >>> 0;
                    if (object.totalAmount != null)
                        message.totalAmount = String(object.totalAmount);
                    if (object.totalFee != null)
                        message.totalFee = String(object.totalFee);
                    if (object.reward != null)
                        message.reward = String(object.reward);
                    if (object.payloadLength != null)
                        message.payloadLength = object.payloadLength >>> 0;
                    if (object.payloadHash != null)
                        message.payloadHash = String(object.payloadHash);
                    if (object.generatorPublicKey != null)
                        message.generatorPublicKey = String(object.generatorPublicKey);
                    if (object.blockSignature != null)
                        message.blockSignature = String(object.blockSignature);
                    return message;
                };

                /**
                 * Creates a plain object from a BlockHeader message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {getStatus.GetStatusResponse.State.BlockHeader} message BlockHeader
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                BlockHeader.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.id = "";
                        object.version = 0;
                        object.timestamp = 0;
                        object.previousBlock = "";
                        object.height = 0;
                        object.numberOfTransactions = 0;
                        object.totalAmount = "";
                        object.totalFee = "";
                        object.reward = "";
                        object.payloadLength = 0;
                        object.payloadHash = "";
                        object.generatorPublicKey = "";
                        object.blockSignature = "";
                    }
                    if (message.id != null && message.hasOwnProperty("id"))
                        object.id = message.id;
                    if (message.version != null && message.hasOwnProperty("version"))
                        object.version = message.version;
                    if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                        object.timestamp = message.timestamp;
                    if (message.previousBlock != null && message.hasOwnProperty("previousBlock"))
                        object.previousBlock = message.previousBlock;
                    if (message.height != null && message.hasOwnProperty("height"))
                        object.height = message.height;
                    if (message.numberOfTransactions != null && message.hasOwnProperty("numberOfTransactions"))
                        object.numberOfTransactions = message.numberOfTransactions;
                    if (message.totalAmount != null && message.hasOwnProperty("totalAmount"))
                        object.totalAmount = message.totalAmount;
                    if (message.totalFee != null && message.hasOwnProperty("totalFee"))
                        object.totalFee = message.totalFee;
                    if (message.reward != null && message.hasOwnProperty("reward"))
                        object.reward = message.reward;
                    if (message.payloadLength != null && message.hasOwnProperty("payloadLength"))
                        object.payloadLength = message.payloadLength;
                    if (message.payloadHash != null && message.hasOwnProperty("payloadHash"))
                        object.payloadHash = message.payloadHash;
                    if (message.generatorPublicKey != null && message.hasOwnProperty("generatorPublicKey"))
                        object.generatorPublicKey = message.generatorPublicKey;
                    if (message.blockSignature != null && message.hasOwnProperty("blockSignature"))
                        object.blockSignature = message.blockSignature;
                    return object;
                };

                /**
                 * Converts this BlockHeader to JSON.
                 * @function toJSON
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                BlockHeader.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the default type url for BlockHeader
                 * @function getTypeUrl
                 * @memberof getStatus.GetStatusResponse.State.BlockHeader
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                BlockHeader.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/getStatus.GetStatusResponse.State.BlockHeader";
                };

                return BlockHeader;
            })();

            return State;
        })();

        GetStatusResponse.Config = (function() {

            /**
             * Properties of a Config.
             * @memberof getStatus.GetStatusResponse
             * @interface IConfig
             * @property {string|null} [version] Config version
             * @property {getStatus.GetStatusResponse.Config.INetwork|null} [network] Config network
             * @property {Object.<string,getStatus.GetStatusResponse.Config.IPlugin>|null} [plugins] Config plugins
             */

            /**
             * Constructs a new Config.
             * @memberof getStatus.GetStatusResponse
             * @classdesc Represents a Config.
             * @implements IConfig
             * @constructor
             * @param {getStatus.GetStatusResponse.IConfig=} [properties] Properties to set
             */
            function Config(properties) {
                this.plugins = {};
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Config version.
             * @member {string} version
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             */
            Config.prototype.version = "";

            /**
             * Config network.
             * @member {getStatus.GetStatusResponse.Config.INetwork|null|undefined} network
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             */
            Config.prototype.network = null;

            /**
             * Config plugins.
             * @member {Object.<string,getStatus.GetStatusResponse.Config.IPlugin>} plugins
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             */
            Config.prototype.plugins = $util.emptyObject;

            /**
             * Creates a new Config instance using the specified properties.
             * @function create
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.IConfig=} [properties] Properties to set
             * @returns {getStatus.GetStatusResponse.Config} Config instance
             */
            Config.create = function create(properties) {
                return new Config(properties);
            };

            /**
             * Encodes the specified Config message. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @function encode
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.IConfig} message Config message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Config.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.version);
                if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                    $root.getStatus.GetStatusResponse.Config.Network.encode(message.network, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.plugins != null && Object.hasOwnProperty.call(message, "plugins"))
                    for (var keys = Object.keys(message.plugins), i = 0; i < keys.length; ++i) {
                        writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                        $root.getStatus.GetStatusResponse.Config.Plugin.encode(message.plugins[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                    }
                return writer;
            };

            /**
             * Encodes the specified Config message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @function encodeDelimited
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.IConfig} message Config message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Config.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Config message from the specified reader or buffer.
             * @function decode
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {getStatus.GetStatusResponse.Config} Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Config.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse.Config(), key, value;
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.version = reader.string();
                            break;
                        }
                    case 2: {
                            message.network = $root.getStatus.GetStatusResponse.Config.Network.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            if (message.plugins === $util.emptyObject)
                                message.plugins = {};
                            var end2 = reader.uint32() + reader.pos;
                            key = "";
                            value = null;
                            while (reader.pos < end2) {
                                var tag2 = reader.uint32();
                                switch (tag2 >>> 3) {
                                case 1:
                                    key = reader.string();
                                    break;
                                case 2:
                                    value = $root.getStatus.GetStatusResponse.Config.Plugin.decode(reader, reader.uint32());
                                    break;
                                default:
                                    reader.skipType(tag2 & 7);
                                    break;
                                }
                            }
                            message.plugins[key] = value;
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Config message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {getStatus.GetStatusResponse.Config} Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Config.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Config message.
             * @function verify
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Config.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.version != null && message.hasOwnProperty("version"))
                    if (!$util.isString(message.version))
                        return "version: string expected";
                if (message.network != null && message.hasOwnProperty("network")) {
                    var error = $root.getStatus.GetStatusResponse.Config.Network.verify(message.network);
                    if (error)
                        return "network." + error;
                }
                if (message.plugins != null && message.hasOwnProperty("plugins")) {
                    if (!$util.isObject(message.plugins))
                        return "plugins: object expected";
                    var key = Object.keys(message.plugins);
                    for (var i = 0; i < key.length; ++i) {
                        var error = $root.getStatus.GetStatusResponse.Config.Plugin.verify(message.plugins[key[i]]);
                        if (error)
                            return "plugins." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a Config message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {getStatus.GetStatusResponse.Config} Config
             */
            Config.fromObject = function fromObject(object) {
                if (object instanceof $root.getStatus.GetStatusResponse.Config)
                    return object;
                var message = new $root.getStatus.GetStatusResponse.Config();
                if (object.version != null)
                    message.version = String(object.version);
                if (object.network != null) {
                    if (typeof object.network !== "object")
                        throw TypeError(".getStatus.GetStatusResponse.Config.network: object expected");
                    message.network = $root.getStatus.GetStatusResponse.Config.Network.fromObject(object.network);
                }
                if (object.plugins) {
                    if (typeof object.plugins !== "object")
                        throw TypeError(".getStatus.GetStatusResponse.Config.plugins: object expected");
                    message.plugins = {};
                    for (var keys = Object.keys(object.plugins), i = 0; i < keys.length; ++i) {
                        if (typeof object.plugins[keys[i]] !== "object")
                            throw TypeError(".getStatus.GetStatusResponse.Config.plugins: object expected");
                        message.plugins[keys[i]] = $root.getStatus.GetStatusResponse.Config.Plugin.fromObject(object.plugins[keys[i]]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from a Config message. Also converts values to other types if specified.
             * @function toObject
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.Config} message Config
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Config.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.objects || options.defaults)
                    object.plugins = {};
                if (options.defaults) {
                    object.version = "";
                    object.network = null;
                }
                if (message.version != null && message.hasOwnProperty("version"))
                    object.version = message.version;
                if (message.network != null && message.hasOwnProperty("network"))
                    object.network = $root.getStatus.GetStatusResponse.Config.Network.toObject(message.network, options);
                var keys2;
                if (message.plugins && (keys2 = Object.keys(message.plugins)).length) {
                    object.plugins = {};
                    for (var j = 0; j < keys2.length; ++j)
                        object.plugins[keys2[j]] = $root.getStatus.GetStatusResponse.Config.Plugin.toObject(message.plugins[keys2[j]], options);
                }
                return object;
            };

            /**
             * Converts this Config to JSON.
             * @function toJSON
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Config.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Config
             * @function getTypeUrl
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Config.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/getStatus.GetStatusResponse.Config";
            };

            Config.Network = (function() {

                /**
                 * Properties of a Network.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @interface INetwork
                 * @property {string|null} [name] Network name
                 * @property {string|null} [nethash] Network nethash
                 * @property {string|null} [explorer] Network explorer
                 * @property {getStatus.GetStatusResponse.Config.Network.IToken|null} [token] Network token
                 * @property {number|null} [version] Network version
                 */

                /**
                 * Constructs a new Network.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @classdesc Represents a Network.
                 * @implements INetwork
                 * @constructor
                 * @param {getStatus.GetStatusResponse.Config.INetwork=} [properties] Properties to set
                 */
                function Network(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Network name.
                 * @member {string} name
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @instance
                 */
                Network.prototype.name = "";

                /**
                 * Network nethash.
                 * @member {string} nethash
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @instance
                 */
                Network.prototype.nethash = "";

                /**
                 * Network explorer.
                 * @member {string} explorer
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @instance
                 */
                Network.prototype.explorer = "";

                /**
                 * Network token.
                 * @member {getStatus.GetStatusResponse.Config.Network.IToken|null|undefined} token
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @instance
                 */
                Network.prototype.token = null;

                /**
                 * Network version.
                 * @member {number} version
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @instance
                 */
                Network.prototype.version = 0;

                /**
                 * Creates a new Network instance using the specified properties.
                 * @function create
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.INetwork=} [properties] Properties to set
                 * @returns {getStatus.GetStatusResponse.Config.Network} Network instance
                 */
                Network.create = function create(properties) {
                    return new Network(properties);
                };

                /**
                 * Encodes the specified Network message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @function encode
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.INetwork} message Network message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Network.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                    if (message.nethash != null && Object.hasOwnProperty.call(message, "nethash"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.nethash);
                    if (message.explorer != null && Object.hasOwnProperty.call(message, "explorer"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.explorer);
                    if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                        $root.getStatus.GetStatusResponse.Config.Network.Token.encode(message.token, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.version);
                    return writer;
                };

                /**
                 * Encodes the specified Network message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.INetwork} message Network message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Network.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Network message from the specified reader or buffer.
                 * @function decode
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.Config.Network} Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Network.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse.Config.Network();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.name = reader.string();
                                break;
                            }
                        case 2: {
                                message.nethash = reader.string();
                                break;
                            }
                        case 3: {
                                message.explorer = reader.string();
                                break;
                            }
                        case 4: {
                                message.token = $root.getStatus.GetStatusResponse.Config.Network.Token.decode(reader, reader.uint32());
                                break;
                            }
                        case 5: {
                                message.version = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Network message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.Config.Network} Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Network.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Network message.
                 * @function verify
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Network.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.name != null && message.hasOwnProperty("name"))
                        if (!$util.isString(message.name))
                            return "name: string expected";
                    if (message.nethash != null && message.hasOwnProperty("nethash"))
                        if (!$util.isString(message.nethash))
                            return "nethash: string expected";
                    if (message.explorer != null && message.hasOwnProperty("explorer"))
                        if (!$util.isString(message.explorer))
                            return "explorer: string expected";
                    if (message.token != null && message.hasOwnProperty("token")) {
                        var error = $root.getStatus.GetStatusResponse.Config.Network.Token.verify(message.token);
                        if (error)
                            return "token." + error;
                    }
                    if (message.version != null && message.hasOwnProperty("version"))
                        if (!$util.isInteger(message.version))
                            return "version: integer expected";
                    return null;
                };

                /**
                 * Creates a Network message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {getStatus.GetStatusResponse.Config.Network} Network
                 */
                Network.fromObject = function fromObject(object) {
                    if (object instanceof $root.getStatus.GetStatusResponse.Config.Network)
                        return object;
                    var message = new $root.getStatus.GetStatusResponse.Config.Network();
                    if (object.name != null)
                        message.name = String(object.name);
                    if (object.nethash != null)
                        message.nethash = String(object.nethash);
                    if (object.explorer != null)
                        message.explorer = String(object.explorer);
                    if (object.token != null) {
                        if (typeof object.token !== "object")
                            throw TypeError(".getStatus.GetStatusResponse.Config.Network.token: object expected");
                        message.token = $root.getStatus.GetStatusResponse.Config.Network.Token.fromObject(object.token);
                    }
                    if (object.version != null)
                        message.version = object.version >>> 0;
                    return message;
                };

                /**
                 * Creates a plain object from a Network message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.Network} message Network
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Network.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.name = "";
                        object.nethash = "";
                        object.explorer = "";
                        object.token = null;
                        object.version = 0;
                    }
                    if (message.name != null && message.hasOwnProperty("name"))
                        object.name = message.name;
                    if (message.nethash != null && message.hasOwnProperty("nethash"))
                        object.nethash = message.nethash;
                    if (message.explorer != null && message.hasOwnProperty("explorer"))
                        object.explorer = message.explorer;
                    if (message.token != null && message.hasOwnProperty("token"))
                        object.token = $root.getStatus.GetStatusResponse.Config.Network.Token.toObject(message.token, options);
                    if (message.version != null && message.hasOwnProperty("version"))
                        object.version = message.version;
                    return object;
                };

                /**
                 * Converts this Network to JSON.
                 * @function toJSON
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Network.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the default type url for Network
                 * @function getTypeUrl
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Network.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/getStatus.GetStatusResponse.Config.Network";
                };

                Network.Token = (function() {

                    /**
                     * Properties of a Token.
                     * @memberof getStatus.GetStatusResponse.Config.Network
                     * @interface IToken
                     * @property {string|null} [name] Token name
                     * @property {string|null} [symbol] Token symbol
                     */

                    /**
                     * Constructs a new Token.
                     * @memberof getStatus.GetStatusResponse.Config.Network
                     * @classdesc Represents a Token.
                     * @implements IToken
                     * @constructor
                     * @param {getStatus.GetStatusResponse.Config.Network.IToken=} [properties] Properties to set
                     */
                    function Token(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }

                    /**
                     * Token name.
                     * @member {string} name
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @instance
                     */
                    Token.prototype.name = "";

                    /**
                     * Token symbol.
                     * @member {string} symbol
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @instance
                     */
                    Token.prototype.symbol = "";

                    /**
                     * Creates a new Token instance using the specified properties.
                     * @function create
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {getStatus.GetStatusResponse.Config.Network.IToken=} [properties] Properties to set
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token} Token instance
                     */
                    Token.create = function create(properties) {
                        return new Token(properties);
                    };

                    /**
                     * Encodes the specified Token message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @function encode
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {getStatus.GetStatusResponse.Config.Network.IToken} message Token message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Token.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                            writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                        if (message.symbol != null && Object.hasOwnProperty.call(message, "symbol"))
                            writer.uint32(/* id 2, wireType 2 =*/18).string(message.symbol);
                        return writer;
                    };

                    /**
                     * Encodes the specified Token message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {getStatus.GetStatusResponse.Config.Network.IToken} message Token message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Token.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };

                    /**
                     * Decodes a Token message from the specified reader or buffer.
                     * @function decode
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token} Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Token.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse.Config.Network.Token();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                            case 1: {
                                    message.name = reader.string();
                                    break;
                                }
                            case 2: {
                                    message.symbol = reader.string();
                                    break;
                                }
                            default:
                                reader.skipType(tag & 7);
                                break;
                            }
                        }
                        return message;
                    };

                    /**
                     * Decodes a Token message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token} Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Token.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };

                    /**
                     * Verifies a Token message.
                     * @function verify
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Token.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.name != null && message.hasOwnProperty("name"))
                            if (!$util.isString(message.name))
                                return "name: string expected";
                        if (message.symbol != null && message.hasOwnProperty("symbol"))
                            if (!$util.isString(message.symbol))
                                return "symbol: string expected";
                        return null;
                    };

                    /**
                     * Creates a Token message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token} Token
                     */
                    Token.fromObject = function fromObject(object) {
                        if (object instanceof $root.getStatus.GetStatusResponse.Config.Network.Token)
                            return object;
                        var message = new $root.getStatus.GetStatusResponse.Config.Network.Token();
                        if (object.name != null)
                            message.name = String(object.name);
                        if (object.symbol != null)
                            message.symbol = String(object.symbol);
                        return message;
                    };

                    /**
                     * Creates a plain object from a Token message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {getStatus.GetStatusResponse.Config.Network.Token} message Token
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Token.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.name = "";
                            object.symbol = "";
                        }
                        if (message.name != null && message.hasOwnProperty("name"))
                            object.name = message.name;
                        if (message.symbol != null && message.hasOwnProperty("symbol"))
                            object.symbol = message.symbol;
                        return object;
                    };

                    /**
                     * Converts this Token to JSON.
                     * @function toJSON
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Token.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    /**
                     * Gets the default type url for Token
                     * @function getTypeUrl
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Token.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/getStatus.GetStatusResponse.Config.Network.Token";
                    };

                    return Token;
                })();

                return Network;
            })();

            Config.Plugin = (function() {

                /**
                 * Properties of a Plugin.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @interface IPlugin
                 * @property {number|null} [port] Plugin port
                 * @property {boolean|null} [enabled] Plugin enabled
                 * @property {boolean|null} [estimateTotalCount] Plugin estimateTotalCount
                 */

                /**
                 * Constructs a new Plugin.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @classdesc Represents a Plugin.
                 * @implements IPlugin
                 * @constructor
                 * @param {getStatus.GetStatusResponse.Config.IPlugin=} [properties] Properties to set
                 */
                function Plugin(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Plugin port.
                 * @member {number} port
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @instance
                 */
                Plugin.prototype.port = 0;

                /**
                 * Plugin enabled.
                 * @member {boolean} enabled
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @instance
                 */
                Plugin.prototype.enabled = false;

                /**
                 * Plugin estimateTotalCount.
                 * @member {boolean} estimateTotalCount
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @instance
                 */
                Plugin.prototype.estimateTotalCount = false;

                /**
                 * Creates a new Plugin instance using the specified properties.
                 * @function create
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.IPlugin=} [properties] Properties to set
                 * @returns {getStatus.GetStatusResponse.Config.Plugin} Plugin instance
                 */
                Plugin.create = function create(properties) {
                    return new Plugin(properties);
                };

                /**
                 * Encodes the specified Plugin message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @function encode
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.IPlugin} message Plugin message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Plugin.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.port != null && Object.hasOwnProperty.call(message, "port"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.port);
                    if (message.enabled != null && Object.hasOwnProperty.call(message, "enabled"))
                        writer.uint32(/* id 2, wireType 0 =*/16).bool(message.enabled);
                    if (message.estimateTotalCount != null && Object.hasOwnProperty.call(message, "estimateTotalCount"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.estimateTotalCount);
                    return writer;
                };

                /**
                 * Encodes the specified Plugin message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.IPlugin} message Plugin message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Plugin.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Plugin message from the specified reader or buffer.
                 * @function decode
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.Config.Plugin} Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Plugin.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getStatus.GetStatusResponse.Config.Plugin();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.port = reader.uint32();
                                break;
                            }
                        case 2: {
                                message.enabled = reader.bool();
                                break;
                            }
                        case 3: {
                                message.estimateTotalCount = reader.bool();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Plugin message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.Config.Plugin} Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Plugin.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Plugin message.
                 * @function verify
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Plugin.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.port != null && message.hasOwnProperty("port"))
                        if (!$util.isInteger(message.port))
                            return "port: integer expected";
                    if (message.enabled != null && message.hasOwnProperty("enabled"))
                        if (typeof message.enabled !== "boolean")
                            return "enabled: boolean expected";
                    if (message.estimateTotalCount != null && message.hasOwnProperty("estimateTotalCount"))
                        if (typeof message.estimateTotalCount !== "boolean")
                            return "estimateTotalCount: boolean expected";
                    return null;
                };

                /**
                 * Creates a Plugin message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {getStatus.GetStatusResponse.Config.Plugin} Plugin
                 */
                Plugin.fromObject = function fromObject(object) {
                    if (object instanceof $root.getStatus.GetStatusResponse.Config.Plugin)
                        return object;
                    var message = new $root.getStatus.GetStatusResponse.Config.Plugin();
                    if (object.port != null)
                        message.port = object.port >>> 0;
                    if (object.enabled != null)
                        message.enabled = Boolean(object.enabled);
                    if (object.estimateTotalCount != null)
                        message.estimateTotalCount = Boolean(object.estimateTotalCount);
                    return message;
                };

                /**
                 * Creates a plain object from a Plugin message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.Plugin} message Plugin
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Plugin.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.port = 0;
                        object.enabled = false;
                        object.estimateTotalCount = false;
                    }
                    if (message.port != null && message.hasOwnProperty("port"))
                        object.port = message.port;
                    if (message.enabled != null && message.hasOwnProperty("enabled"))
                        object.enabled = message.enabled;
                    if (message.estimateTotalCount != null && message.hasOwnProperty("estimateTotalCount"))
                        object.estimateTotalCount = message.estimateTotalCount;
                    return object;
                };

                /**
                 * Converts this Plugin to JSON.
                 * @function toJSON
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Plugin.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the default type url for Plugin
                 * @function getTypeUrl
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Plugin.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/getStatus.GetStatusResponse.Config.Plugin";
                };

                return Plugin;
            })();

            return Config;
        })();

        return GetStatusResponse;
    })();

    return getStatus;
})();

$root.postPrecommit = (function() {

    /**
     * Namespace postPrecommit.
     * @exports postPrecommit
     * @namespace
     */
    var postPrecommit = {};

    postPrecommit.PostPrecommitRequest = (function() {

        /**
         * Properties of a PostPrecommitRequest.
         * @memberof postPrecommit
         * @interface IPostPrecommitRequest
         * @property {Uint8Array|null} [precommit] PostPrecommitRequest precommit
         * @property {shared.IHeaders|null} [headers] PostPrecommitRequest headers
         */

        /**
         * Constructs a new PostPrecommitRequest.
         * @memberof postPrecommit
         * @classdesc Represents a PostPrecommitRequest.
         * @implements IPostPrecommitRequest
         * @constructor
         * @param {postPrecommit.IPostPrecommitRequest=} [properties] Properties to set
         */
        function PostPrecommitRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostPrecommitRequest precommit.
         * @member {Uint8Array} precommit
         * @memberof postPrecommit.PostPrecommitRequest
         * @instance
         */
        PostPrecommitRequest.prototype.precommit = $util.newBuffer([]);

        /**
         * PostPrecommitRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postPrecommit.PostPrecommitRequest
         * @instance
         */
        PostPrecommitRequest.prototype.headers = null;

        /**
         * Creates a new PostPrecommitRequest instance using the specified properties.
         * @function create
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {postPrecommit.IPostPrecommitRequest=} [properties] Properties to set
         * @returns {postPrecommit.PostPrecommitRequest} PostPrecommitRequest instance
         */
        PostPrecommitRequest.create = function create(properties) {
            return new PostPrecommitRequest(properties);
        };

        /**
         * Encodes the specified PostPrecommitRequest message. Does not implicitly {@link postPrecommit.PostPrecommitRequest.verify|verify} messages.
         * @function encode
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {postPrecommit.IPostPrecommitRequest} message PostPrecommitRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrecommitRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.precommit != null && Object.hasOwnProperty.call(message, "precommit"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.precommit);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostPrecommitRequest message, length delimited. Does not implicitly {@link postPrecommit.PostPrecommitRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {postPrecommit.IPostPrecommitRequest} message PostPrecommitRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrecommitRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostPrecommitRequest message from the specified reader or buffer.
         * @function decode
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postPrecommit.PostPrecommitRequest} PostPrecommitRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrecommitRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postPrecommit.PostPrecommitRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.precommit = reader.bytes();
                        break;
                    }
                case 2: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostPrecommitRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postPrecommit.PostPrecommitRequest} PostPrecommitRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrecommitRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostPrecommitRequest message.
         * @function verify
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostPrecommitRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.precommit != null && message.hasOwnProperty("precommit"))
                if (!(message.precommit && typeof message.precommit.length === "number" || $util.isString(message.precommit)))
                    return "precommit: buffer expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostPrecommitRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postPrecommit.PostPrecommitRequest} PostPrecommitRequest
         */
        PostPrecommitRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.postPrecommit.PostPrecommitRequest)
                return object;
            var message = new $root.postPrecommit.PostPrecommitRequest();
            if (object.precommit != null)
                if (typeof object.precommit === "string")
                    $util.base64.decode(object.precommit, message.precommit = $util.newBuffer($util.base64.length(object.precommit)), 0);
                else if (object.precommit.length >= 0)
                    message.precommit = object.precommit;
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postPrecommit.PostPrecommitRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostPrecommitRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {postPrecommit.PostPrecommitRequest} message PostPrecommitRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostPrecommitRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.precommit = "";
                else {
                    object.precommit = [];
                    if (options.bytes !== Array)
                        object.precommit = $util.newBuffer(object.precommit);
                }
                object.headers = null;
            }
            if (message.precommit != null && message.hasOwnProperty("precommit"))
                object.precommit = options.bytes === String ? $util.base64.encode(message.precommit, 0, message.precommit.length) : options.bytes === Array ? Array.prototype.slice.call(message.precommit) : message.precommit;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostPrecommitRequest to JSON.
         * @function toJSON
         * @memberof postPrecommit.PostPrecommitRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostPrecommitRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostPrecommitRequest
         * @function getTypeUrl
         * @memberof postPrecommit.PostPrecommitRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostPrecommitRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postPrecommit.PostPrecommitRequest";
        };

        return PostPrecommitRequest;
    })();

    postPrecommit.PostPrecommitResponse = (function() {

        /**
         * Properties of a PostPrecommitResponse.
         * @memberof postPrecommit
         * @interface IPostPrecommitResponse
         * @property {shared.IHeaders|null} [headers] PostPrecommitResponse headers
         */

        /**
         * Constructs a new PostPrecommitResponse.
         * @memberof postPrecommit
         * @classdesc Represents a PostPrecommitResponse.
         * @implements IPostPrecommitResponse
         * @constructor
         * @param {postPrecommit.IPostPrecommitResponse=} [properties] Properties to set
         */
        function PostPrecommitResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostPrecommitResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postPrecommit.PostPrecommitResponse
         * @instance
         */
        PostPrecommitResponse.prototype.headers = null;

        /**
         * Creates a new PostPrecommitResponse instance using the specified properties.
         * @function create
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {postPrecommit.IPostPrecommitResponse=} [properties] Properties to set
         * @returns {postPrecommit.PostPrecommitResponse} PostPrecommitResponse instance
         */
        PostPrecommitResponse.create = function create(properties) {
            return new PostPrecommitResponse(properties);
        };

        /**
         * Encodes the specified PostPrecommitResponse message. Does not implicitly {@link postPrecommit.PostPrecommitResponse.verify|verify} messages.
         * @function encode
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {postPrecommit.IPostPrecommitResponse} message PostPrecommitResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrecommitResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostPrecommitResponse message, length delimited. Does not implicitly {@link postPrecommit.PostPrecommitResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {postPrecommit.IPostPrecommitResponse} message PostPrecommitResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrecommitResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostPrecommitResponse message from the specified reader or buffer.
         * @function decode
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postPrecommit.PostPrecommitResponse} PostPrecommitResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrecommitResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postPrecommit.PostPrecommitResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostPrecommitResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postPrecommit.PostPrecommitResponse} PostPrecommitResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrecommitResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostPrecommitResponse message.
         * @function verify
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostPrecommitResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostPrecommitResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postPrecommit.PostPrecommitResponse} PostPrecommitResponse
         */
        PostPrecommitResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.postPrecommit.PostPrecommitResponse)
                return object;
            var message = new $root.postPrecommit.PostPrecommitResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postPrecommit.PostPrecommitResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostPrecommitResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {postPrecommit.PostPrecommitResponse} message PostPrecommitResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostPrecommitResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostPrecommitResponse to JSON.
         * @function toJSON
         * @memberof postPrecommit.PostPrecommitResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostPrecommitResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostPrecommitResponse
         * @function getTypeUrl
         * @memberof postPrecommit.PostPrecommitResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostPrecommitResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postPrecommit.PostPrecommitResponse";
        };

        return PostPrecommitResponse;
    })();

    return postPrecommit;
})();

$root.postPrevote = (function() {

    /**
     * Namespace postPrevote.
     * @exports postPrevote
     * @namespace
     */
    var postPrevote = {};

    postPrevote.PostPrevoteRequest = (function() {

        /**
         * Properties of a PostPrevoteRequest.
         * @memberof postPrevote
         * @interface IPostPrevoteRequest
         * @property {Uint8Array|null} [prevote] PostPrevoteRequest prevote
         * @property {shared.IHeaders|null} [headers] PostPrevoteRequest headers
         */

        /**
         * Constructs a new PostPrevoteRequest.
         * @memberof postPrevote
         * @classdesc Represents a PostPrevoteRequest.
         * @implements IPostPrevoteRequest
         * @constructor
         * @param {postPrevote.IPostPrevoteRequest=} [properties] Properties to set
         */
        function PostPrevoteRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostPrevoteRequest prevote.
         * @member {Uint8Array} prevote
         * @memberof postPrevote.PostPrevoteRequest
         * @instance
         */
        PostPrevoteRequest.prototype.prevote = $util.newBuffer([]);

        /**
         * PostPrevoteRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postPrevote.PostPrevoteRequest
         * @instance
         */
        PostPrevoteRequest.prototype.headers = null;

        /**
         * Creates a new PostPrevoteRequest instance using the specified properties.
         * @function create
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {postPrevote.IPostPrevoteRequest=} [properties] Properties to set
         * @returns {postPrevote.PostPrevoteRequest} PostPrevoteRequest instance
         */
        PostPrevoteRequest.create = function create(properties) {
            return new PostPrevoteRequest(properties);
        };

        /**
         * Encodes the specified PostPrevoteRequest message. Does not implicitly {@link postPrevote.PostPrevoteRequest.verify|verify} messages.
         * @function encode
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {postPrevote.IPostPrevoteRequest} message PostPrevoteRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrevoteRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.prevote != null && Object.hasOwnProperty.call(message, "prevote"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.prevote);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostPrevoteRequest message, length delimited. Does not implicitly {@link postPrevote.PostPrevoteRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {postPrevote.IPostPrevoteRequest} message PostPrevoteRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrevoteRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostPrevoteRequest message from the specified reader or buffer.
         * @function decode
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postPrevote.PostPrevoteRequest} PostPrevoteRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrevoteRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postPrevote.PostPrevoteRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.prevote = reader.bytes();
                        break;
                    }
                case 2: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostPrevoteRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postPrevote.PostPrevoteRequest} PostPrevoteRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrevoteRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostPrevoteRequest message.
         * @function verify
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostPrevoteRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.prevote != null && message.hasOwnProperty("prevote"))
                if (!(message.prevote && typeof message.prevote.length === "number" || $util.isString(message.prevote)))
                    return "prevote: buffer expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostPrevoteRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postPrevote.PostPrevoteRequest} PostPrevoteRequest
         */
        PostPrevoteRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.postPrevote.PostPrevoteRequest)
                return object;
            var message = new $root.postPrevote.PostPrevoteRequest();
            if (object.prevote != null)
                if (typeof object.prevote === "string")
                    $util.base64.decode(object.prevote, message.prevote = $util.newBuffer($util.base64.length(object.prevote)), 0);
                else if (object.prevote.length >= 0)
                    message.prevote = object.prevote;
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postPrevote.PostPrevoteRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostPrevoteRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {postPrevote.PostPrevoteRequest} message PostPrevoteRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostPrevoteRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.prevote = "";
                else {
                    object.prevote = [];
                    if (options.bytes !== Array)
                        object.prevote = $util.newBuffer(object.prevote);
                }
                object.headers = null;
            }
            if (message.prevote != null && message.hasOwnProperty("prevote"))
                object.prevote = options.bytes === String ? $util.base64.encode(message.prevote, 0, message.prevote.length) : options.bytes === Array ? Array.prototype.slice.call(message.prevote) : message.prevote;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostPrevoteRequest to JSON.
         * @function toJSON
         * @memberof postPrevote.PostPrevoteRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostPrevoteRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostPrevoteRequest
         * @function getTypeUrl
         * @memberof postPrevote.PostPrevoteRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostPrevoteRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postPrevote.PostPrevoteRequest";
        };

        return PostPrevoteRequest;
    })();

    postPrevote.PostPrevoteResponse = (function() {

        /**
         * Properties of a PostPrevoteResponse.
         * @memberof postPrevote
         * @interface IPostPrevoteResponse
         * @property {shared.IHeaders|null} [headers] PostPrevoteResponse headers
         */

        /**
         * Constructs a new PostPrevoteResponse.
         * @memberof postPrevote
         * @classdesc Represents a PostPrevoteResponse.
         * @implements IPostPrevoteResponse
         * @constructor
         * @param {postPrevote.IPostPrevoteResponse=} [properties] Properties to set
         */
        function PostPrevoteResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostPrevoteResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postPrevote.PostPrevoteResponse
         * @instance
         */
        PostPrevoteResponse.prototype.headers = null;

        /**
         * Creates a new PostPrevoteResponse instance using the specified properties.
         * @function create
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {postPrevote.IPostPrevoteResponse=} [properties] Properties to set
         * @returns {postPrevote.PostPrevoteResponse} PostPrevoteResponse instance
         */
        PostPrevoteResponse.create = function create(properties) {
            return new PostPrevoteResponse(properties);
        };

        /**
         * Encodes the specified PostPrevoteResponse message. Does not implicitly {@link postPrevote.PostPrevoteResponse.verify|verify} messages.
         * @function encode
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {postPrevote.IPostPrevoteResponse} message PostPrevoteResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrevoteResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostPrevoteResponse message, length delimited. Does not implicitly {@link postPrevote.PostPrevoteResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {postPrevote.IPostPrevoteResponse} message PostPrevoteResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostPrevoteResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostPrevoteResponse message from the specified reader or buffer.
         * @function decode
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postPrevote.PostPrevoteResponse} PostPrevoteResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrevoteResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postPrevote.PostPrevoteResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostPrevoteResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postPrevote.PostPrevoteResponse} PostPrevoteResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostPrevoteResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostPrevoteResponse message.
         * @function verify
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostPrevoteResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostPrevoteResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postPrevote.PostPrevoteResponse} PostPrevoteResponse
         */
        PostPrevoteResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.postPrevote.PostPrevoteResponse)
                return object;
            var message = new $root.postPrevote.PostPrevoteResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postPrevote.PostPrevoteResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostPrevoteResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {postPrevote.PostPrevoteResponse} message PostPrevoteResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostPrevoteResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostPrevoteResponse to JSON.
         * @function toJSON
         * @memberof postPrevote.PostPrevoteResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostPrevoteResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostPrevoteResponse
         * @function getTypeUrl
         * @memberof postPrevote.PostPrevoteResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostPrevoteResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postPrevote.PostPrevoteResponse";
        };

        return PostPrevoteResponse;
    })();

    return postPrevote;
})();

$root.postProposal = (function() {

    /**
     * Namespace postProposal.
     * @exports postProposal
     * @namespace
     */
    var postProposal = {};

    postProposal.PostProposalRequest = (function() {

        /**
         * Properties of a PostProposalRequest.
         * @memberof postProposal
         * @interface IPostProposalRequest
         * @property {Uint8Array|null} [proposal] PostProposalRequest proposal
         * @property {shared.IHeaders|null} [headers] PostProposalRequest headers
         */

        /**
         * Constructs a new PostProposalRequest.
         * @memberof postProposal
         * @classdesc Represents a PostProposalRequest.
         * @implements IPostProposalRequest
         * @constructor
         * @param {postProposal.IPostProposalRequest=} [properties] Properties to set
         */
        function PostProposalRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostProposalRequest proposal.
         * @member {Uint8Array} proposal
         * @memberof postProposal.PostProposalRequest
         * @instance
         */
        PostProposalRequest.prototype.proposal = $util.newBuffer([]);

        /**
         * PostProposalRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postProposal.PostProposalRequest
         * @instance
         */
        PostProposalRequest.prototype.headers = null;

        /**
         * Creates a new PostProposalRequest instance using the specified properties.
         * @function create
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.IPostProposalRequest=} [properties] Properties to set
         * @returns {postProposal.PostProposalRequest} PostProposalRequest instance
         */
        PostProposalRequest.create = function create(properties) {
            return new PostProposalRequest(properties);
        };

        /**
         * Encodes the specified PostProposalRequest message. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @function encode
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.IPostProposalRequest} message PostProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.proposal != null && Object.hasOwnProperty.call(message, "proposal"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.proposal);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostProposalRequest message, length delimited. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.IPostProposalRequest} message PostProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer.
         * @function decode
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postProposal.PostProposalRequest} PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postProposal.PostProposalRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.proposal = reader.bytes();
                        break;
                    }
                case 2: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postProposal.PostProposalRequest} PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostProposalRequest message.
         * @function verify
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostProposalRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.proposal != null && message.hasOwnProperty("proposal"))
                if (!(message.proposal && typeof message.proposal.length === "number" || $util.isString(message.proposal)))
                    return "proposal: buffer expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostProposalRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postProposal.PostProposalRequest} PostProposalRequest
         */
        PostProposalRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.postProposal.PostProposalRequest)
                return object;
            var message = new $root.postProposal.PostProposalRequest();
            if (object.proposal != null)
                if (typeof object.proposal === "string")
                    $util.base64.decode(object.proposal, message.proposal = $util.newBuffer($util.base64.length(object.proposal)), 0);
                else if (object.proposal.length >= 0)
                    message.proposal = object.proposal;
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postProposal.PostProposalRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostProposalRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.PostProposalRequest} message PostProposalRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostProposalRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.proposal = "";
                else {
                    object.proposal = [];
                    if (options.bytes !== Array)
                        object.proposal = $util.newBuffer(object.proposal);
                }
                object.headers = null;
            }
            if (message.proposal != null && message.hasOwnProperty("proposal"))
                object.proposal = options.bytes === String ? $util.base64.encode(message.proposal, 0, message.proposal.length) : options.bytes === Array ? Array.prototype.slice.call(message.proposal) : message.proposal;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostProposalRequest to JSON.
         * @function toJSON
         * @memberof postProposal.PostProposalRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostProposalRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostProposalRequest
         * @function getTypeUrl
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostProposalRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postProposal.PostProposalRequest";
        };

        return PostProposalRequest;
    })();

    postProposal.PostProposalResponse = (function() {

        /**
         * Properties of a PostProposalResponse.
         * @memberof postProposal
         * @interface IPostProposalResponse
         * @property {shared.IHeaders|null} [headers] PostProposalResponse headers
         */

        /**
         * Constructs a new PostProposalResponse.
         * @memberof postProposal
         * @classdesc Represents a PostProposalResponse.
         * @implements IPostProposalResponse
         * @constructor
         * @param {postProposal.IPostProposalResponse=} [properties] Properties to set
         */
        function PostProposalResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostProposalResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postProposal.PostProposalResponse
         * @instance
         */
        PostProposalResponse.prototype.headers = null;

        /**
         * Creates a new PostProposalResponse instance using the specified properties.
         * @function create
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.IPostProposalResponse=} [properties] Properties to set
         * @returns {postProposal.PostProposalResponse} PostProposalResponse instance
         */
        PostProposalResponse.create = function create(properties) {
            return new PostProposalResponse(properties);
        };

        /**
         * Encodes the specified PostProposalResponse message. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @function encode
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.IPostProposalResponse} message PostProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostProposalResponse message, length delimited. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.IPostProposalResponse} message PostProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer.
         * @function decode
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postProposal.PostProposalResponse} PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postProposal.PostProposalResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postProposal.PostProposalResponse} PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostProposalResponse message.
         * @function verify
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostProposalResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostProposalResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postProposal.PostProposalResponse} PostProposalResponse
         */
        PostProposalResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.postProposal.PostProposalResponse)
                return object;
            var message = new $root.postProposal.PostProposalResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postProposal.PostProposalResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostProposalResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.PostProposalResponse} message PostProposalResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostProposalResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostProposalResponse to JSON.
         * @function toJSON
         * @memberof postProposal.PostProposalResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostProposalResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostProposalResponse
         * @function getTypeUrl
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostProposalResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postProposal.PostProposalResponse";
        };

        return PostProposalResponse;
    })();

    return postProposal;
})();

$root.postTransactions = (function() {

    /**
     * Namespace postTransactions.
     * @exports postTransactions
     * @namespace
     */
    var postTransactions = {};

    postTransactions.PostTransactionsRequest = (function() {

        /**
         * Properties of a PostTransactionsRequest.
         * @memberof postTransactions
         * @interface IPostTransactionsRequest
         * @property {Uint8Array|null} [transactions] PostTransactionsRequest transactions
         * @property {shared.IHeaders|null} [headers] PostTransactionsRequest headers
         */

        /**
         * Constructs a new PostTransactionsRequest.
         * @memberof postTransactions
         * @classdesc Represents a PostTransactionsRequest.
         * @implements IPostTransactionsRequest
         * @constructor
         * @param {postTransactions.IPostTransactionsRequest=} [properties] Properties to set
         */
        function PostTransactionsRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostTransactionsRequest transactions.
         * @member {Uint8Array} transactions
         * @memberof postTransactions.PostTransactionsRequest
         * @instance
         */
        PostTransactionsRequest.prototype.transactions = $util.newBuffer([]);

        /**
         * PostTransactionsRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postTransactions.PostTransactionsRequest
         * @instance
         */
        PostTransactionsRequest.prototype.headers = null;

        /**
         * Creates a new PostTransactionsRequest instance using the specified properties.
         * @function create
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {postTransactions.IPostTransactionsRequest=} [properties] Properties to set
         * @returns {postTransactions.PostTransactionsRequest} PostTransactionsRequest instance
         */
        PostTransactionsRequest.create = function create(properties) {
            return new PostTransactionsRequest(properties);
        };

        /**
         * Encodes the specified PostTransactionsRequest message. Does not implicitly {@link postTransactions.PostTransactionsRequest.verify|verify} messages.
         * @function encode
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {postTransactions.IPostTransactionsRequest} message PostTransactionsRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostTransactionsRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.transactions != null && Object.hasOwnProperty.call(message, "transactions"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.transactions);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PostTransactionsRequest message, length delimited. Does not implicitly {@link postTransactions.PostTransactionsRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {postTransactions.IPostTransactionsRequest} message PostTransactionsRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostTransactionsRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostTransactionsRequest message from the specified reader or buffer.
         * @function decode
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postTransactions.PostTransactionsRequest} PostTransactionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostTransactionsRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postTransactions.PostTransactionsRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.transactions = reader.bytes();
                        break;
                    }
                case 2: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostTransactionsRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postTransactions.PostTransactionsRequest} PostTransactionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostTransactionsRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostTransactionsRequest message.
         * @function verify
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostTransactionsRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.transactions != null && message.hasOwnProperty("transactions"))
                if (!(message.transactions && typeof message.transactions.length === "number" || $util.isString(message.transactions)))
                    return "transactions: buffer expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostTransactionsRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postTransactions.PostTransactionsRequest} PostTransactionsRequest
         */
        PostTransactionsRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.postTransactions.PostTransactionsRequest)
                return object;
            var message = new $root.postTransactions.PostTransactionsRequest();
            if (object.transactions != null)
                if (typeof object.transactions === "string")
                    $util.base64.decode(object.transactions, message.transactions = $util.newBuffer($util.base64.length(object.transactions)), 0);
                else if (object.transactions.length >= 0)
                    message.transactions = object.transactions;
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postTransactions.PostTransactionsRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostTransactionsRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {postTransactions.PostTransactionsRequest} message PostTransactionsRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostTransactionsRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.transactions = "";
                else {
                    object.transactions = [];
                    if (options.bytes !== Array)
                        object.transactions = $util.newBuffer(object.transactions);
                }
                object.headers = null;
            }
            if (message.transactions != null && message.hasOwnProperty("transactions"))
                object.transactions = options.bytes === String ? $util.base64.encode(message.transactions, 0, message.transactions.length) : options.bytes === Array ? Array.prototype.slice.call(message.transactions) : message.transactions;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this PostTransactionsRequest to JSON.
         * @function toJSON
         * @memberof postTransactions.PostTransactionsRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostTransactionsRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostTransactionsRequest
         * @function getTypeUrl
         * @memberof postTransactions.PostTransactionsRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostTransactionsRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postTransactions.PostTransactionsRequest";
        };

        return PostTransactionsRequest;
    })();

    postTransactions.PostTransactionsResponse = (function() {

        /**
         * Properties of a PostTransactionsResponse.
         * @memberof postTransactions
         * @interface IPostTransactionsResponse
         * @property {shared.IHeaders|null} [headers] PostTransactionsResponse headers
         * @property {Array.<string>|null} [accept] PostTransactionsResponse accept
         */

        /**
         * Constructs a new PostTransactionsResponse.
         * @memberof postTransactions
         * @classdesc Represents a PostTransactionsResponse.
         * @implements IPostTransactionsResponse
         * @constructor
         * @param {postTransactions.IPostTransactionsResponse=} [properties] Properties to set
         */
        function PostTransactionsResponse(properties) {
            this.accept = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PostTransactionsResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof postTransactions.PostTransactionsResponse
         * @instance
         */
        PostTransactionsResponse.prototype.headers = null;

        /**
         * PostTransactionsResponse accept.
         * @member {Array.<string>} accept
         * @memberof postTransactions.PostTransactionsResponse
         * @instance
         */
        PostTransactionsResponse.prototype.accept = $util.emptyArray;

        /**
         * Creates a new PostTransactionsResponse instance using the specified properties.
         * @function create
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {postTransactions.IPostTransactionsResponse=} [properties] Properties to set
         * @returns {postTransactions.PostTransactionsResponse} PostTransactionsResponse instance
         */
        PostTransactionsResponse.create = function create(properties) {
            return new PostTransactionsResponse(properties);
        };

        /**
         * Encodes the specified PostTransactionsResponse message. Does not implicitly {@link postTransactions.PostTransactionsResponse.verify|verify} messages.
         * @function encode
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {postTransactions.IPostTransactionsResponse} message PostTransactionsResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostTransactionsResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.accept != null && message.accept.length)
                for (var i = 0; i < message.accept.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.accept[i]);
            return writer;
        };

        /**
         * Encodes the specified PostTransactionsResponse message, length delimited. Does not implicitly {@link postTransactions.PostTransactionsResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {postTransactions.IPostTransactionsResponse} message PostTransactionsResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostTransactionsResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PostTransactionsResponse message from the specified reader or buffer.
         * @function decode
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postTransactions.PostTransactionsResponse} PostTransactionsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostTransactionsResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.postTransactions.PostTransactionsResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        if (!(message.accept && message.accept.length))
                            message.accept = [];
                        message.accept.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PostTransactionsResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postTransactions.PostTransactionsResponse} PostTransactionsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostTransactionsResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostTransactionsResponse message.
         * @function verify
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostTransactionsResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.accept != null && message.hasOwnProperty("accept")) {
                if (!Array.isArray(message.accept))
                    return "accept: array expected";
                for (var i = 0; i < message.accept.length; ++i)
                    if (!$util.isString(message.accept[i]))
                        return "accept: string[] expected";
            }
            return null;
        };

        /**
         * Creates a PostTransactionsResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postTransactions.PostTransactionsResponse} PostTransactionsResponse
         */
        PostTransactionsResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.postTransactions.PostTransactionsResponse)
                return object;
            var message = new $root.postTransactions.PostTransactionsResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".postTransactions.PostTransactionsResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.accept) {
                if (!Array.isArray(object.accept))
                    throw TypeError(".postTransactions.PostTransactionsResponse.accept: array expected");
                message.accept = [];
                for (var i = 0; i < object.accept.length; ++i)
                    message.accept[i] = String(object.accept[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostTransactionsResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {postTransactions.PostTransactionsResponse} message PostTransactionsResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostTransactionsResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.accept = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.accept && message.accept.length) {
                object.accept = [];
                for (var j = 0; j < message.accept.length; ++j)
                    object.accept[j] = message.accept[j];
            }
            return object;
        };

        /**
         * Converts this PostTransactionsResponse to JSON.
         * @function toJSON
         * @memberof postTransactions.PostTransactionsResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostTransactionsResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PostTransactionsResponse
         * @function getTypeUrl
         * @memberof postTransactions.PostTransactionsResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PostTransactionsResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/postTransactions.PostTransactionsResponse";
        };

        return PostTransactionsResponse;
    })();

    return postTransactions;
})();

$root.shared = (function() {

    /**
     * Namespace shared.
     * @exports shared
     * @namespace
     */
    var shared = {};

    shared.Headers = (function() {

        /**
         * Properties of a Headers.
         * @memberof shared
         * @interface IHeaders
         * @property {string|null} [version] Headers version
         * @property {number|null} [height] Headers height
         * @property {number|null} [round] Headers round
         * @property {number|null} [step] Headers step
         * @property {string|null} [proposedBlockId] Headers proposedBlockId
         * @property {Array.<boolean>|null} [validatorsSignedPrevote] Headers validatorsSignedPrevote
         * @property {Array.<boolean>|null} [validatorsSignedPrecommit] Headers validatorsSignedPrecommit
         */

        /**
         * Constructs a new Headers.
         * @memberof shared
         * @classdesc Represents a Headers.
         * @implements IHeaders
         * @constructor
         * @param {shared.IHeaders=} [properties] Properties to set
         */
        function Headers(properties) {
            this.validatorsSignedPrevote = [];
            this.validatorsSignedPrecommit = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Headers version.
         * @member {string} version
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.version = "";

        /**
         * Headers height.
         * @member {number} height
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.height = 0;

        /**
         * Headers round.
         * @member {number} round
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.round = 0;

        /**
         * Headers step.
         * @member {number} step
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.step = 0;

        /**
         * Headers proposedBlockId.
         * @member {string|null|undefined} proposedBlockId
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.proposedBlockId = null;

        /**
         * Headers validatorsSignedPrevote.
         * @member {Array.<boolean>} validatorsSignedPrevote
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.validatorsSignedPrevote = $util.emptyArray;

        /**
         * Headers validatorsSignedPrecommit.
         * @member {Array.<boolean>} validatorsSignedPrecommit
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.validatorsSignedPrecommit = $util.emptyArray;

        // OneOf field names bound to virtual getters and setters
        var $oneOfFields;

        /**
         * Headers _proposedBlockId.
         * @member {"proposedBlockId"|undefined} _proposedBlockId
         * @memberof shared.Headers
         * @instance
         */
        Object.defineProperty(Headers.prototype, "_proposedBlockId", {
            get: $util.oneOfGetter($oneOfFields = ["proposedBlockId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new Headers instance using the specified properties.
         * @function create
         * @memberof shared.Headers
         * @static
         * @param {shared.IHeaders=} [properties] Properties to set
         * @returns {shared.Headers} Headers instance
         */
        Headers.create = function create(properties) {
            return new Headers(properties);
        };

        /**
         * Encodes the specified Headers message. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @function encode
         * @memberof shared.Headers
         * @static
         * @param {shared.IHeaders} message Headers message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Headers.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.version);
            if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.height);
            if (message.round != null && Object.hasOwnProperty.call(message, "round"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.round);
            if (message.step != null && Object.hasOwnProperty.call(message, "step"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.step);
            if (message.proposedBlockId != null && Object.hasOwnProperty.call(message, "proposedBlockId"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.proposedBlockId);
            if (message.validatorsSignedPrevote != null && message.validatorsSignedPrevote.length) {
                writer.uint32(/* id 6, wireType 2 =*/50).fork();
                for (var i = 0; i < message.validatorsSignedPrevote.length; ++i)
                    writer.bool(message.validatorsSignedPrevote[i]);
                writer.ldelim();
            }
            if (message.validatorsSignedPrecommit != null && message.validatorsSignedPrecommit.length) {
                writer.uint32(/* id 7, wireType 2 =*/58).fork();
                for (var i = 0; i < message.validatorsSignedPrecommit.length; ++i)
                    writer.bool(message.validatorsSignedPrecommit[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified Headers message, length delimited. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @function encodeDelimited
         * @memberof shared.Headers
         * @static
         * @param {shared.IHeaders} message Headers message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Headers.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Headers message from the specified reader or buffer.
         * @function decode
         * @memberof shared.Headers
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {shared.Headers} Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Headers.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.shared.Headers();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.string();
                        break;
                    }
                case 2: {
                        message.height = reader.uint32();
                        break;
                    }
                case 3: {
                        message.round = reader.uint32();
                        break;
                    }
                case 4: {
                        message.step = reader.uint32();
                        break;
                    }
                case 5: {
                        message.proposedBlockId = reader.string();
                        break;
                    }
                case 6: {
                        if (!(message.validatorsSignedPrevote && message.validatorsSignedPrevote.length))
                            message.validatorsSignedPrevote = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorsSignedPrevote.push(reader.bool());
                        } else
                            message.validatorsSignedPrevote.push(reader.bool());
                        break;
                    }
                case 7: {
                        if (!(message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length))
                            message.validatorsSignedPrecommit = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorsSignedPrecommit.push(reader.bool());
                        } else
                            message.validatorsSignedPrecommit.push(reader.bool());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Headers message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof shared.Headers
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {shared.Headers} Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Headers.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Headers message.
         * @function verify
         * @memberof shared.Headers
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Headers.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            var properties = {};
            if (message.version != null && message.hasOwnProperty("version"))
                if (!$util.isString(message.version))
                    return "version: string expected";
            if (message.height != null && message.hasOwnProperty("height"))
                if (!$util.isInteger(message.height))
                    return "height: integer expected";
            if (message.round != null && message.hasOwnProperty("round"))
                if (!$util.isInteger(message.round))
                    return "round: integer expected";
            if (message.step != null && message.hasOwnProperty("step"))
                if (!$util.isInteger(message.step))
                    return "step: integer expected";
            if (message.proposedBlockId != null && message.hasOwnProperty("proposedBlockId")) {
                properties._proposedBlockId = 1;
                if (!$util.isString(message.proposedBlockId))
                    return "proposedBlockId: string expected";
            }
            if (message.validatorsSignedPrevote != null && message.hasOwnProperty("validatorsSignedPrevote")) {
                if (!Array.isArray(message.validatorsSignedPrevote))
                    return "validatorsSignedPrevote: array expected";
                for (var i = 0; i < message.validatorsSignedPrevote.length; ++i)
                    if (typeof message.validatorsSignedPrevote[i] !== "boolean")
                        return "validatorsSignedPrevote: boolean[] expected";
            }
            if (message.validatorsSignedPrecommit != null && message.hasOwnProperty("validatorsSignedPrecommit")) {
                if (!Array.isArray(message.validatorsSignedPrecommit))
                    return "validatorsSignedPrecommit: array expected";
                for (var i = 0; i < message.validatorsSignedPrecommit.length; ++i)
                    if (typeof message.validatorsSignedPrecommit[i] !== "boolean")
                        return "validatorsSignedPrecommit: boolean[] expected";
            }
            return null;
        };

        /**
         * Creates a Headers message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof shared.Headers
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {shared.Headers} Headers
         */
        Headers.fromObject = function fromObject(object) {
            if (object instanceof $root.shared.Headers)
                return object;
            var message = new $root.shared.Headers();
            if (object.version != null)
                message.version = String(object.version);
            if (object.height != null)
                message.height = object.height >>> 0;
            if (object.round != null)
                message.round = object.round >>> 0;
            if (object.step != null)
                message.step = object.step >>> 0;
            if (object.proposedBlockId != null)
                message.proposedBlockId = String(object.proposedBlockId);
            if (object.validatorsSignedPrevote) {
                if (!Array.isArray(object.validatorsSignedPrevote))
                    throw TypeError(".shared.Headers.validatorsSignedPrevote: array expected");
                message.validatorsSignedPrevote = [];
                for (var i = 0; i < object.validatorsSignedPrevote.length; ++i)
                    message.validatorsSignedPrevote[i] = Boolean(object.validatorsSignedPrevote[i]);
            }
            if (object.validatorsSignedPrecommit) {
                if (!Array.isArray(object.validatorsSignedPrecommit))
                    throw TypeError(".shared.Headers.validatorsSignedPrecommit: array expected");
                message.validatorsSignedPrecommit = [];
                for (var i = 0; i < object.validatorsSignedPrecommit.length; ++i)
                    message.validatorsSignedPrecommit[i] = Boolean(object.validatorsSignedPrecommit[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a Headers message. Also converts values to other types if specified.
         * @function toObject
         * @memberof shared.Headers
         * @static
         * @param {shared.Headers} message Headers
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Headers.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.validatorsSignedPrevote = [];
                object.validatorsSignedPrecommit = [];
            }
            if (options.defaults) {
                object.version = "";
                object.height = 0;
                object.round = 0;
                object.step = 0;
            }
            if (message.version != null && message.hasOwnProperty("version"))
                object.version = message.version;
            if (message.height != null && message.hasOwnProperty("height"))
                object.height = message.height;
            if (message.round != null && message.hasOwnProperty("round"))
                object.round = message.round;
            if (message.step != null && message.hasOwnProperty("step"))
                object.step = message.step;
            if (message.proposedBlockId != null && message.hasOwnProperty("proposedBlockId")) {
                object.proposedBlockId = message.proposedBlockId;
                if (options.oneofs)
                    object._proposedBlockId = "proposedBlockId";
            }
            if (message.validatorsSignedPrevote && message.validatorsSignedPrevote.length) {
                object.validatorsSignedPrevote = [];
                for (var j = 0; j < message.validatorsSignedPrevote.length; ++j)
                    object.validatorsSignedPrevote[j] = message.validatorsSignedPrevote[j];
            }
            if (message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length) {
                object.validatorsSignedPrecommit = [];
                for (var j = 0; j < message.validatorsSignedPrecommit.length; ++j)
                    object.validatorsSignedPrecommit[j] = message.validatorsSignedPrecommit[j];
            }
            return object;
        };

        /**
         * Converts this Headers to JSON.
         * @function toJSON
         * @memberof shared.Headers
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Headers.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Headers
         * @function getTypeUrl
         * @memberof shared.Headers
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Headers.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/shared.Headers";
        };

        return Headers;
    })();

    shared.PeerLike = (function() {

        /**
         * Properties of a PeerLike.
         * @memberof shared
         * @interface IPeerLike
         * @property {string|null} [ip] PeerLike ip
         * @property {number|null} [port] PeerLike port
         * @property {number|null} [protocol] PeerLike protocol
         */

        /**
         * Constructs a new PeerLike.
         * @memberof shared
         * @classdesc Represents a PeerLike.
         * @implements IPeerLike
         * @constructor
         * @param {shared.IPeerLike=} [properties] Properties to set
         */
        function PeerLike(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PeerLike ip.
         * @member {string} ip
         * @memberof shared.PeerLike
         * @instance
         */
        PeerLike.prototype.ip = "";

        /**
         * PeerLike port.
         * @member {number} port
         * @memberof shared.PeerLike
         * @instance
         */
        PeerLike.prototype.port = 0;

        /**
         * PeerLike protocol.
         * @member {number} protocol
         * @memberof shared.PeerLike
         * @instance
         */
        PeerLike.prototype.protocol = 0;

        /**
         * Creates a new PeerLike instance using the specified properties.
         * @function create
         * @memberof shared.PeerLike
         * @static
         * @param {shared.IPeerLike=} [properties] Properties to set
         * @returns {shared.PeerLike} PeerLike instance
         */
        PeerLike.create = function create(properties) {
            return new PeerLike(properties);
        };

        /**
         * Encodes the specified PeerLike message. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @function encode
         * @memberof shared.PeerLike
         * @static
         * @param {shared.IPeerLike} message PeerLike message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerLike.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.ip != null && Object.hasOwnProperty.call(message, "ip"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.ip);
            if (message.port != null && Object.hasOwnProperty.call(message, "port"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.port);
            if (message.protocol != null && Object.hasOwnProperty.call(message, "protocol"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.protocol);
            return writer;
        };

        /**
         * Encodes the specified PeerLike message, length delimited. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @function encodeDelimited
         * @memberof shared.PeerLike
         * @static
         * @param {shared.IPeerLike} message PeerLike message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerLike.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerLike message from the specified reader or buffer.
         * @function decode
         * @memberof shared.PeerLike
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {shared.PeerLike} PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerLike.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.shared.PeerLike();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.ip = reader.string();
                        break;
                    }
                case 2: {
                        message.port = reader.uint32();
                        break;
                    }
                case 3: {
                        message.protocol = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PeerLike message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof shared.PeerLike
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {shared.PeerLike} PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerLike.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PeerLike message.
         * @function verify
         * @memberof shared.PeerLike
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PeerLike.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.ip != null && message.hasOwnProperty("ip"))
                if (!$util.isString(message.ip))
                    return "ip: string expected";
            if (message.port != null && message.hasOwnProperty("port"))
                if (!$util.isInteger(message.port))
                    return "port: integer expected";
            if (message.protocol != null && message.hasOwnProperty("protocol"))
                if (!$util.isInteger(message.protocol))
                    return "protocol: integer expected";
            return null;
        };

        /**
         * Creates a PeerLike message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof shared.PeerLike
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {shared.PeerLike} PeerLike
         */
        PeerLike.fromObject = function fromObject(object) {
            if (object instanceof $root.shared.PeerLike)
                return object;
            var message = new $root.shared.PeerLike();
            if (object.ip != null)
                message.ip = String(object.ip);
            if (object.port != null)
                message.port = object.port >>> 0;
            if (object.protocol != null)
                message.protocol = object.protocol >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a PeerLike message. Also converts values to other types if specified.
         * @function toObject
         * @memberof shared.PeerLike
         * @static
         * @param {shared.PeerLike} message PeerLike
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PeerLike.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.ip = "";
                object.port = 0;
                object.protocol = 0;
            }
            if (message.ip != null && message.hasOwnProperty("ip"))
                object.ip = message.ip;
            if (message.port != null && message.hasOwnProperty("port"))
                object.port = message.port;
            if (message.protocol != null && message.hasOwnProperty("protocol"))
                object.protocol = message.protocol;
            return object;
        };

        /**
         * Converts this PeerLike to JSON.
         * @function toJSON
         * @memberof shared.PeerLike
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PeerLike.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PeerLike
         * @function getTypeUrl
         * @memberof shared.PeerLike
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PeerLike.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/shared.PeerLike";
        };

        return PeerLike;
    })();

    return shared;
})();

export default $root;
