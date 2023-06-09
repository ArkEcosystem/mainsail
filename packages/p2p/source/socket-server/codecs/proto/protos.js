/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

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
         * @property {Array.<string>|null} [blocks] GetBlocksResponse blocks
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
         * @member {Array.<string>} blocks
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
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.blocks[i]);
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
                        message.blocks.push(reader.string());
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
                    if (!$util.isString(message.blocks[i]))
                        return "blocks: string[] expected";
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
                    message.blocks[i] = String(object.blocks[i]);
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
                    object.blocks[j] = message.blocks[j];
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

$root.getCommonBlocks = (function() {

    /**
     * Namespace getCommonBlocks.
     * @exports getCommonBlocks
     * @namespace
     */
    var getCommonBlocks = {};

    getCommonBlocks.GetCommonBlocksRequest = (function() {

        /**
         * Properties of a GetCommonBlocksRequest.
         * @memberof getCommonBlocks
         * @interface IGetCommonBlocksRequest
         * @property {Array.<string>|null} [ids] GetCommonBlocksRequest ids
         * @property {shared.IHeaders|null} [headers] GetCommonBlocksRequest headers
         */

        /**
         * Constructs a new GetCommonBlocksRequest.
         * @memberof getCommonBlocks
         * @classdesc Represents a GetCommonBlocksRequest.
         * @implements IGetCommonBlocksRequest
         * @constructor
         * @param {getCommonBlocks.IGetCommonBlocksRequest=} [properties] Properties to set
         */
        function GetCommonBlocksRequest(properties) {
            this.ids = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetCommonBlocksRequest ids.
         * @member {Array.<string>} ids
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @instance
         */
        GetCommonBlocksRequest.prototype.ids = $util.emptyArray;

        /**
         * GetCommonBlocksRequest headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @instance
         */
        GetCommonBlocksRequest.prototype.headers = null;

        /**
         * Creates a new GetCommonBlocksRequest instance using the specified properties.
         * @function create
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {getCommonBlocks.IGetCommonBlocksRequest=} [properties] Properties to set
         * @returns {getCommonBlocks.GetCommonBlocksRequest} GetCommonBlocksRequest instance
         */
        GetCommonBlocksRequest.create = function create(properties) {
            return new GetCommonBlocksRequest(properties);
        };

        /**
         * Encodes the specified GetCommonBlocksRequest message. Does not implicitly {@link getCommonBlocks.GetCommonBlocksRequest.verify|verify} messages.
         * @function encode
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {getCommonBlocks.IGetCommonBlocksRequest} message GetCommonBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetCommonBlocksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.ids != null && message.ids.length)
                for (var i = 0; i < message.ids.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.ids[i]);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetCommonBlocksRequest message, length delimited. Does not implicitly {@link getCommonBlocks.GetCommonBlocksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {getCommonBlocks.IGetCommonBlocksRequest} message GetCommonBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetCommonBlocksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetCommonBlocksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getCommonBlocks.GetCommonBlocksRequest} GetCommonBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetCommonBlocksRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getCommonBlocks.GetCommonBlocksRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.ids && message.ids.length))
                            message.ids = [];
                        message.ids.push(reader.string());
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
         * Decodes a GetCommonBlocksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getCommonBlocks.GetCommonBlocksRequest} GetCommonBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetCommonBlocksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetCommonBlocksRequest message.
         * @function verify
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetCommonBlocksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.ids != null && message.hasOwnProperty("ids")) {
                if (!Array.isArray(message.ids))
                    return "ids: array expected";
                for (var i = 0; i < message.ids.length; ++i)
                    if (!$util.isString(message.ids[i]))
                        return "ids: string[] expected";
            }
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a GetCommonBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getCommonBlocks.GetCommonBlocksRequest} GetCommonBlocksRequest
         */
        GetCommonBlocksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.getCommonBlocks.GetCommonBlocksRequest)
                return object;
            var message = new $root.getCommonBlocks.GetCommonBlocksRequest();
            if (object.ids) {
                if (!Array.isArray(object.ids))
                    throw TypeError(".getCommonBlocks.GetCommonBlocksRequest.ids: array expected");
                message.ids = [];
                for (var i = 0; i < object.ids.length; ++i)
                    message.ids[i] = String(object.ids[i]);
            }
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getCommonBlocks.GetCommonBlocksRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetCommonBlocksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {getCommonBlocks.GetCommonBlocksRequest} message GetCommonBlocksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetCommonBlocksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.ids = [];
            if (options.defaults)
                object.headers = null;
            if (message.ids && message.ids.length) {
                object.ids = [];
                for (var j = 0; j < message.ids.length; ++j)
                    object.ids[j] = message.ids[j];
            }
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            return object;
        };

        /**
         * Converts this GetCommonBlocksRequest to JSON.
         * @function toJSON
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetCommonBlocksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetCommonBlocksRequest
         * @function getTypeUrl
         * @memberof getCommonBlocks.GetCommonBlocksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetCommonBlocksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getCommonBlocks.GetCommonBlocksRequest";
        };

        return GetCommonBlocksRequest;
    })();

    getCommonBlocks.GetCommonBlocksResponse = (function() {

        /**
         * Properties of a GetCommonBlocksResponse.
         * @memberof getCommonBlocks
         * @interface IGetCommonBlocksResponse
         * @property {shared.IHeaders|null} [headers] GetCommonBlocksResponse headers
         * @property {getCommonBlocks.GetCommonBlocksResponse.ICommon|null} [common] GetCommonBlocksResponse common
         */

        /**
         * Constructs a new GetCommonBlocksResponse.
         * @memberof getCommonBlocks
         * @classdesc Represents a GetCommonBlocksResponse.
         * @implements IGetCommonBlocksResponse
         * @constructor
         * @param {getCommonBlocks.IGetCommonBlocksResponse=} [properties] Properties to set
         */
        function GetCommonBlocksResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetCommonBlocksResponse headers.
         * @member {shared.IHeaders|null|undefined} headers
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @instance
         */
        GetCommonBlocksResponse.prototype.headers = null;

        /**
         * GetCommonBlocksResponse common.
         * @member {getCommonBlocks.GetCommonBlocksResponse.ICommon|null|undefined} common
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @instance
         */
        GetCommonBlocksResponse.prototype.common = null;

        /**
         * Creates a new GetCommonBlocksResponse instance using the specified properties.
         * @function create
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {getCommonBlocks.IGetCommonBlocksResponse=} [properties] Properties to set
         * @returns {getCommonBlocks.GetCommonBlocksResponse} GetCommonBlocksResponse instance
         */
        GetCommonBlocksResponse.create = function create(properties) {
            return new GetCommonBlocksResponse(properties);
        };

        /**
         * Encodes the specified GetCommonBlocksResponse message. Does not implicitly {@link getCommonBlocks.GetCommonBlocksResponse.verify|verify} messages.
         * @function encode
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {getCommonBlocks.IGetCommonBlocksResponse} message GetCommonBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetCommonBlocksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.common != null && Object.hasOwnProperty.call(message, "common"))
                $root.getCommonBlocks.GetCommonBlocksResponse.Common.encode(message.common, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetCommonBlocksResponse message, length delimited. Does not implicitly {@link getCommonBlocks.GetCommonBlocksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {getCommonBlocks.IGetCommonBlocksResponse} message GetCommonBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetCommonBlocksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetCommonBlocksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getCommonBlocks.GetCommonBlocksResponse} GetCommonBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetCommonBlocksResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getCommonBlocks.GetCommonBlocksResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.common = $root.getCommonBlocks.GetCommonBlocksResponse.Common.decode(reader, reader.uint32());
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
         * Decodes a GetCommonBlocksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getCommonBlocks.GetCommonBlocksResponse} GetCommonBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetCommonBlocksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetCommonBlocksResponse message.
         * @function verify
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetCommonBlocksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                var error = $root.shared.Headers.verify(message.headers);
                if (error)
                    return "headers." + error;
            }
            if (message.common != null && message.hasOwnProperty("common")) {
                var error = $root.getCommonBlocks.GetCommonBlocksResponse.Common.verify(message.common);
                if (error)
                    return "common." + error;
            }
            return null;
        };

        /**
         * Creates a GetCommonBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getCommonBlocks.GetCommonBlocksResponse} GetCommonBlocksResponse
         */
        GetCommonBlocksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.getCommonBlocks.GetCommonBlocksResponse)
                return object;
            var message = new $root.getCommonBlocks.GetCommonBlocksResponse();
            if (object.headers != null) {
                if (typeof object.headers !== "object")
                    throw TypeError(".getCommonBlocks.GetCommonBlocksResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers);
            }
            if (object.common != null) {
                if (typeof object.common !== "object")
                    throw TypeError(".getCommonBlocks.GetCommonBlocksResponse.common: object expected");
                message.common = $root.getCommonBlocks.GetCommonBlocksResponse.Common.fromObject(object.common);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetCommonBlocksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {getCommonBlocks.GetCommonBlocksResponse} message GetCommonBlocksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetCommonBlocksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.headers = null;
                object.common = null;
            }
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.common != null && message.hasOwnProperty("common"))
                object.common = $root.getCommonBlocks.GetCommonBlocksResponse.Common.toObject(message.common, options);
            return object;
        };

        /**
         * Converts this GetCommonBlocksResponse to JSON.
         * @function toJSON
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetCommonBlocksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetCommonBlocksResponse
         * @function getTypeUrl
         * @memberof getCommonBlocks.GetCommonBlocksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetCommonBlocksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/getCommonBlocks.GetCommonBlocksResponse";
        };

        GetCommonBlocksResponse.Common = (function() {

            /**
             * Properties of a Common.
             * @memberof getCommonBlocks.GetCommonBlocksResponse
             * @interface ICommon
             * @property {number|null} [height] Common height
             * @property {string|null} [id] Common id
             */

            /**
             * Constructs a new Common.
             * @memberof getCommonBlocks.GetCommonBlocksResponse
             * @classdesc Represents a Common.
             * @implements ICommon
             * @constructor
             * @param {getCommonBlocks.GetCommonBlocksResponse.ICommon=} [properties] Properties to set
             */
            function Common(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Common height.
             * @member {number} height
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @instance
             */
            Common.prototype.height = 0;

            /**
             * Common id.
             * @member {string} id
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @instance
             */
            Common.prototype.id = "";

            /**
             * Creates a new Common instance using the specified properties.
             * @function create
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {getCommonBlocks.GetCommonBlocksResponse.ICommon=} [properties] Properties to set
             * @returns {getCommonBlocks.GetCommonBlocksResponse.Common} Common instance
             */
            Common.create = function create(properties) {
                return new Common(properties);
            };

            /**
             * Encodes the specified Common message. Does not implicitly {@link getCommonBlocks.GetCommonBlocksResponse.Common.verify|verify} messages.
             * @function encode
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {getCommonBlocks.GetCommonBlocksResponse.ICommon} message Common message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Common.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.height);
                if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.id);
                return writer;
            };

            /**
             * Encodes the specified Common message, length delimited. Does not implicitly {@link getCommonBlocks.GetCommonBlocksResponse.Common.verify|verify} messages.
             * @function encodeDelimited
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {getCommonBlocks.GetCommonBlocksResponse.ICommon} message Common message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Common.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Common message from the specified reader or buffer.
             * @function decode
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {getCommonBlocks.GetCommonBlocksResponse.Common} Common
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Common.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getCommonBlocks.GetCommonBlocksResponse.Common();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.height = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.id = reader.string();
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
             * Decodes a Common message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {getCommonBlocks.GetCommonBlocksResponse.Common} Common
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Common.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Common message.
             * @function verify
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Common.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.height != null && message.hasOwnProperty("height"))
                    if (!$util.isInteger(message.height))
                        return "height: integer expected";
                if (message.id != null && message.hasOwnProperty("id"))
                    if (!$util.isString(message.id))
                        return "id: string expected";
                return null;
            };

            /**
             * Creates a Common message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {getCommonBlocks.GetCommonBlocksResponse.Common} Common
             */
            Common.fromObject = function fromObject(object) {
                if (object instanceof $root.getCommonBlocks.GetCommonBlocksResponse.Common)
                    return object;
                var message = new $root.getCommonBlocks.GetCommonBlocksResponse.Common();
                if (object.height != null)
                    message.height = object.height >>> 0;
                if (object.id != null)
                    message.id = String(object.id);
                return message;
            };

            /**
             * Creates a plain object from a Common message. Also converts values to other types if specified.
             * @function toObject
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {getCommonBlocks.GetCommonBlocksResponse.Common} message Common
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Common.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.height = 0;
                    object.id = "";
                }
                if (message.height != null && message.hasOwnProperty("height"))
                    object.height = message.height;
                if (message.id != null && message.hasOwnProperty("id"))
                    object.id = message.id;
                return object;
            };

            /**
             * Converts this Common to JSON.
             * @function toJSON
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Common.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Common
             * @function getTypeUrl
             * @memberof getCommonBlocks.GetCommonBlocksResponse.Common
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Common.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/getCommonBlocks.GetCommonBlocksResponse.Common";
            };

            return Common;
        })();

        return GetCommonBlocksResponse;
    })();

    return getCommonBlocks;
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
         * @property {Array.<string>|null} [prevotes] GetMessagesResponse prevotes
         * @property {Array.<string>|null} [precommits] GetMessagesResponse precommits
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
         * @member {Array.<string>} prevotes
         * @memberof getMessages.GetMessagesResponse
         * @instance
         */
        GetMessagesResponse.prototype.prevotes = $util.emptyArray;

        /**
         * GetMessagesResponse precommits.
         * @member {Array.<string>} precommits
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
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.prevotes[i]);
            if (message.precommits != null && message.precommits.length)
                for (var i = 0; i < message.precommits.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.precommits[i]);
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
                        message.prevotes.push(reader.string());
                        break;
                    }
                case 3: {
                        if (!(message.precommits && message.precommits.length))
                            message.precommits = [];
                        message.precommits.push(reader.string());
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
                    if (!$util.isString(message.prevotes[i]))
                        return "prevotes: string[] expected";
            }
            if (message.precommits != null && message.hasOwnProperty("precommits")) {
                if (!Array.isArray(message.precommits))
                    return "precommits: array expected";
                for (var i = 0; i < message.precommits.length; ++i)
                    if (!$util.isString(message.precommits[i]))
                        return "precommits: string[] expected";
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
                    message.prevotes[i] = String(object.prevotes[i]);
            }
            if (object.precommits) {
                if (!Array.isArray(object.precommits))
                    throw TypeError(".getMessages.GetMessagesResponse.precommits: array expected");
                message.precommits = [];
                for (var i = 0; i < object.precommits.length; ++i)
                    message.precommits[i] = String(object.precommits[i]);
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
                    object.prevotes[j] = message.prevotes[j];
            }
            if (message.precommits && message.precommits.length) {
                object.precommits = [];
                for (var j = 0; j < message.precommits.length; ++j)
                    object.precommits[j] = message.precommits[j];
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
         * @property {Array.<getPeers.GetPeersResponse.IPeer>|null} [peers] GetPeersResponse peers
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
         * @member {Array.<getPeers.GetPeersResponse.IPeer>} peers
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
                    $root.getPeers.GetPeersResponse.Peer.encode(message.peers[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
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
                        message.peers.push($root.getPeers.GetPeersResponse.Peer.decode(reader, reader.uint32()));
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
                    var error = $root.getPeers.GetPeersResponse.Peer.verify(message.peers[i]);
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
                    message.peers[i] = $root.getPeers.GetPeersResponse.Peer.fromObject(object.peers[i]);
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
                    object.peers[j] = $root.getPeers.GetPeersResponse.Peer.toObject(message.peers[j], options);
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

        GetPeersResponse.Peer = (function() {

            /**
             * Properties of a Peer.
             * @memberof getPeers.GetPeersResponse
             * @interface IPeer
             * @property {string|null} [ip] Peer ip
             * @property {number|null} [port] Peer port
             */

            /**
             * Constructs a new Peer.
             * @memberof getPeers.GetPeersResponse
             * @classdesc Represents a Peer.
             * @implements IPeer
             * @constructor
             * @param {getPeers.GetPeersResponse.IPeer=} [properties] Properties to set
             */
            function Peer(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Peer ip.
             * @member {string} ip
             * @memberof getPeers.GetPeersResponse.Peer
             * @instance
             */
            Peer.prototype.ip = "";

            /**
             * Peer port.
             * @member {number} port
             * @memberof getPeers.GetPeersResponse.Peer
             * @instance
             */
            Peer.prototype.port = 0;

            /**
             * Creates a new Peer instance using the specified properties.
             * @function create
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {getPeers.GetPeersResponse.IPeer=} [properties] Properties to set
             * @returns {getPeers.GetPeersResponse.Peer} Peer instance
             */
            Peer.create = function create(properties) {
                return new Peer(properties);
            };

            /**
             * Encodes the specified Peer message. Does not implicitly {@link getPeers.GetPeersResponse.Peer.verify|verify} messages.
             * @function encode
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {getPeers.GetPeersResponse.IPeer} message Peer message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Peer.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.ip != null && Object.hasOwnProperty.call(message, "ip"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.ip);
                if (message.port != null && Object.hasOwnProperty.call(message, "port"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.port);
                return writer;
            };

            /**
             * Encodes the specified Peer message, length delimited. Does not implicitly {@link getPeers.GetPeersResponse.Peer.verify|verify} messages.
             * @function encodeDelimited
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {getPeers.GetPeersResponse.IPeer} message Peer message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Peer.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Peer message from the specified reader or buffer.
             * @function decode
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {getPeers.GetPeersResponse.Peer} Peer
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Peer.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.getPeers.GetPeersResponse.Peer();
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
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Peer message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {getPeers.GetPeersResponse.Peer} Peer
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Peer.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Peer message.
             * @function verify
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Peer.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.ip != null && message.hasOwnProperty("ip"))
                    if (!$util.isString(message.ip))
                        return "ip: string expected";
                if (message.port != null && message.hasOwnProperty("port"))
                    if (!$util.isInteger(message.port))
                        return "port: integer expected";
                return null;
            };

            /**
             * Creates a Peer message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {getPeers.GetPeersResponse.Peer} Peer
             */
            Peer.fromObject = function fromObject(object) {
                if (object instanceof $root.getPeers.GetPeersResponse.Peer)
                    return object;
                var message = new $root.getPeers.GetPeersResponse.Peer();
                if (object.ip != null)
                    message.ip = String(object.ip);
                if (object.port != null)
                    message.port = object.port >>> 0;
                return message;
            };

            /**
             * Creates a plain object from a Peer message. Also converts values to other types if specified.
             * @function toObject
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {getPeers.GetPeersResponse.Peer} message Peer
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Peer.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.ip = "";
                    object.port = 0;
                }
                if (message.ip != null && message.hasOwnProperty("ip"))
                    object.ip = message.ip;
                if (message.port != null && message.hasOwnProperty("port"))
                    object.port = message.port;
                return object;
            };

            /**
             * Converts this Peer to JSON.
             * @function toJSON
             * @memberof getPeers.GetPeersResponse.Peer
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Peer.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Peer
             * @function getTypeUrl
             * @memberof getPeers.GetPeersResponse.Peer
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Peer.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/getPeers.GetPeersResponse.Peer";
            };

            return Peer;
        })();

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
         * @property {string|null} [proposal] GetProposalResponse proposal
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
         * @member {string} proposal
         * @memberof getProposal.GetProposalResponse
         * @instance
         */
        GetProposalResponse.prototype.proposal = "";

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
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.proposal);
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
                        message.proposal = reader.string();
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
                if (!$util.isString(message.proposal))
                    return "proposal: string expected";
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
                message.proposal = String(object.proposal);
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
                object.proposal = "";
            }
            if (message.headers != null && message.hasOwnProperty("headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options);
            if (message.proposal != null && message.hasOwnProperty("proposal"))
                object.proposal = message.proposal;
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

    return shared;
})();

module.exports = $root;
