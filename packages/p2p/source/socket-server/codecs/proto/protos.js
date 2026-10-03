/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $TypeError = $util.global.TypeError, $String = $util.global.String, $Array = $util.global.Array, $Number = $util.global.Number, $Boolean = $util.global.Boolean;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const getApiNodes = $root.getApiNodes = (() => {

    /**
     * Namespace getApiNodes.
     * @exports getApiNodes
     * @namespace
     */
    const getApiNodes = {};

    getApiNodes.ApiNode = (function() {

        /**
         * Properties of an ApiNode.
         * @typedef {Object} getApiNodes.ApiNode.$Properties
         * @property {string|null} [url] ApiNode url
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an ApiNode.
         * @memberof getApiNodes
         * @interface IApiNode
         * @augments getApiNodes.ApiNode.$Properties
         * @deprecated Use getApiNodes.ApiNode.$Properties instead.
         */

        /**
         * Shape of an ApiNode.
         * @typedef {getApiNodes.ApiNode.$Properties} getApiNodes.ApiNode.$Shape
         */

        /**
         * Constructs a new ApiNode.
         * @memberof getApiNodes
         * @classdesc Represents an ApiNode.
         * @constructor
         * @param {getApiNodes.ApiNode.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ApiNode = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ApiNode url.
         * @member {string} url
         * @memberof getApiNodes.ApiNode
         * @instance
         */
        ApiNode.prototype.url = "";

        /**
         * Creates a new ApiNode instance using the specified properties.
         * @function create
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {getApiNodes.ApiNode.$Properties=} [properties] Properties to set
         * @returns {getApiNodes.ApiNode} ApiNode instance
         * @type {{
         *   (properties: getApiNodes.ApiNode.$Shape): getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape;
         *   (properties?: getApiNodes.ApiNode.$Properties): getApiNodes.ApiNode;
         * }}
         */
        ApiNode.create = function(properties) {
            return new ApiNode(properties);
        };

        /**
         * Encodes the specified ApiNode message. Does not implicitly {@link getApiNodes.ApiNode.verify|verify} messages.
         * @function encode
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {getApiNodes.ApiNode.$Properties} message ApiNode message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ApiNode.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.url != null && $Object.hasOwnProperty.call(message, "url"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.url);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ApiNode message, length delimited. Does not implicitly {@link getApiNodes.ApiNode.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {getApiNodes.ApiNode.$Properties} message ApiNode message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ApiNode.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an ApiNode message from the specified reader or buffer.
         * @function decode
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape} ApiNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ApiNode.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getApiNodes.ApiNode(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.url = value;
                        else
                            delete message.url;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an ApiNode message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getApiNodes.ApiNode & getApiNodes.ApiNode.$Shape} ApiNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ApiNode.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ApiNode message.
         * @function verify
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ApiNode.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.url != null && $Object.hasOwnProperty.call(message, "url"))
                if (!$util.isString(message.url))
                    return "url: string expected";
            return null;
        };

        /**
         * Creates an ApiNode message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getApiNodes.ApiNode} ApiNode
         */
        ApiNode.fromObject = function (object, _depth) {
            if (object instanceof $root.getApiNodes.ApiNode)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getApiNodes.ApiNode: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getApiNodes.ApiNode();
            if (object.url != null)
                if (typeof object.url !== "string" || object.url.length)
                    message.url = $String(object.url);
            return message;
        };

        /**
         * Creates a plain object from an ApiNode message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {getApiNodes.ApiNode} message ApiNode
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ApiNode.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.url = "";
            if (message.url != null && $Object.hasOwnProperty.call(message, "url"))
                object.url = message.url;
            return object;
        };

        /**
         * Converts this ApiNode to JSON.
         * @function toJSON
         * @memberof getApiNodes.ApiNode
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ApiNode.prototype.toJSON = function() {
            return ApiNode.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ApiNode
         * @function getTypeUrl
         * @memberof getApiNodes.ApiNode
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ApiNode.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getApiNodes.ApiNode";
        };

        return ApiNode;
    })();

    getApiNodes.GetApiNodesRequest = (function() {

        /**
         * Properties of a GetApiNodesRequest.
         * @typedef {Object} getApiNodes.GetApiNodesRequest.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetApiNodesRequest headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetApiNodesRequest.
         * @memberof getApiNodes
         * @interface IGetApiNodesRequest
         * @augments getApiNodes.GetApiNodesRequest.$Properties
         * @deprecated Use getApiNodes.GetApiNodesRequest.$Properties instead.
         */

        /**
         * Shape of a GetApiNodesRequest.
         * @typedef {getApiNodes.GetApiNodesRequest.$Properties} getApiNodes.GetApiNodesRequest.$Shape
         */

        /**
         * Constructs a new GetApiNodesRequest.
         * @memberof getApiNodes
         * @classdesc Represents a GetApiNodesRequest.
         * @constructor
         * @param {getApiNodes.GetApiNodesRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetApiNodesRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetApiNodesRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getApiNodes.GetApiNodesRequest
         * @instance
         */
        GetApiNodesRequest.prototype.headers = null;

        /**
         * Creates a new GetApiNodesRequest instance using the specified properties.
         * @function create
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.GetApiNodesRequest.$Properties=} [properties] Properties to set
         * @returns {getApiNodes.GetApiNodesRequest} GetApiNodesRequest instance
         * @type {{
         *   (properties: getApiNodes.GetApiNodesRequest.$Shape): getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape;
         *   (properties?: getApiNodes.GetApiNodesRequest.$Properties): getApiNodes.GetApiNodesRequest;
         * }}
         */
        GetApiNodesRequest.create = function(properties) {
            return new GetApiNodesRequest(properties);
        };

        /**
         * Encodes the specified GetApiNodesRequest message. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @function encode
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.GetApiNodesRequest.$Properties} message GetApiNodesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetApiNodesRequest message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {getApiNodes.GetApiNodesRequest.$Properties} message GetApiNodesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape} GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getApiNodes.GetApiNodesRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetApiNodesRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getApiNodes.GetApiNodesRequest & getApiNodes.GetApiNodesRequest.$Shape} GetApiNodesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesRequest.decodeDelimited = function(reader) {
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
        GetApiNodesRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
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
        GetApiNodesRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.getApiNodes.GetApiNodesRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getApiNodes.GetApiNodesRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getApiNodes.GetApiNodesRequest();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getApiNodes.GetApiNodesRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
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
        GetApiNodesRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetApiNodesRequest to JSON.
         * @function toJSON
         * @memberof getApiNodes.GetApiNodesRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetApiNodesRequest.prototype.toJSON = function() {
            return GetApiNodesRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetApiNodesRequest
         * @function getTypeUrl
         * @memberof getApiNodes.GetApiNodesRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetApiNodesRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getApiNodes.GetApiNodesRequest";
        };

        return GetApiNodesRequest;
    })();

    getApiNodes.GetApiNodesResponse = (function() {

        /**
         * Properties of a GetApiNodesResponse.
         * @typedef {Object} getApiNodes.GetApiNodesResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetApiNodesResponse headers
         * @property {Array.<getApiNodes.ApiNode.$Properties>|null} [apiNodes] GetApiNodesResponse apiNodes
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetApiNodesResponse.
         * @memberof getApiNodes
         * @interface IGetApiNodesResponse
         * @augments getApiNodes.GetApiNodesResponse.$Properties
         * @deprecated Use getApiNodes.GetApiNodesResponse.$Properties instead.
         */

        /**
         * Shape of a GetApiNodesResponse.
         * @typedef {getApiNodes.GetApiNodesResponse.$Properties} getApiNodes.GetApiNodesResponse.$Shape
         */

        /**
         * Constructs a new GetApiNodesResponse.
         * @memberof getApiNodes
         * @classdesc Represents a GetApiNodesResponse.
         * @constructor
         * @param {getApiNodes.GetApiNodesResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetApiNodesResponse = function (properties) {
            this.apiNodes = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetApiNodesResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getApiNodes.GetApiNodesResponse
         * @instance
         */
        GetApiNodesResponse.prototype.headers = null;

        /**
         * GetApiNodesResponse apiNodes.
         * @member {Array.<getApiNodes.ApiNode.$Properties>} apiNodes
         * @memberof getApiNodes.GetApiNodesResponse
         * @instance
         */
        GetApiNodesResponse.prototype.apiNodes = $util.emptyArray;

        /**
         * Creates a new GetApiNodesResponse instance using the specified properties.
         * @function create
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.GetApiNodesResponse.$Properties=} [properties] Properties to set
         * @returns {getApiNodes.GetApiNodesResponse} GetApiNodesResponse instance
         * @type {{
         *   (properties: getApiNodes.GetApiNodesResponse.$Shape): getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape;
         *   (properties?: getApiNodes.GetApiNodesResponse.$Properties): getApiNodes.GetApiNodesResponse;
         * }}
         */
        GetApiNodesResponse.create = function(properties) {
            return new GetApiNodesResponse(properties);
        };

        /**
         * Encodes the specified GetApiNodesResponse message. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @function encode
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.GetApiNodesResponse.$Properties} message GetApiNodesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.apiNodes != null && message.apiNodes.length)
                for (let i = 0; i < message.apiNodes.length; ++i)
                    $root.getApiNodes.ApiNode.encode(message.apiNodes[i], writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetApiNodesResponse message, length delimited. Does not implicitly {@link getApiNodes.GetApiNodesResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {getApiNodes.GetApiNodesResponse.$Properties} message GetApiNodesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetApiNodesResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape} GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getApiNodes.GetApiNodesResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if (!(message.apiNodes && message.apiNodes.length))
                            message.apiNodes = [];
                        message.apiNodes.push($root.getApiNodes.ApiNode.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetApiNodesResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getApiNodes.GetApiNodesResponse & getApiNodes.GetApiNodesResponse.$Shape} GetApiNodesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetApiNodesResponse.decodeDelimited = function(reader) {
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
        GetApiNodesResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.apiNodes != null && $Object.hasOwnProperty.call(message, "apiNodes")) {
                if (!$Array.isArray(message.apiNodes))
                    return "apiNodes: array expected";
                for (let i = 0; i < message.apiNodes.length; ++i) {
                    let error = $root.getApiNodes.ApiNode.verify(message.apiNodes[i], _depth + 1);
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
        GetApiNodesResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.getApiNodes.GetApiNodesResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getApiNodes.GetApiNodesResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getApiNodes.GetApiNodesResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getApiNodes.GetApiNodesResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.apiNodes) {
                if (!$Array.isArray(object.apiNodes))
                    throw $TypeError(".getApiNodes.GetApiNodesResponse.apiNodes: array expected");
                message.apiNodes = $Array(object.apiNodes.length);
                for (let i = 0; i < object.apiNodes.length; ++i) {
                    if (!$util.isObject(object.apiNodes[i]))
                        throw $TypeError(".getApiNodes.GetApiNodesResponse.apiNodes: object expected");
                    message.apiNodes[i] = $root.getApiNodes.ApiNode.fromObject(object.apiNodes[i], _depth + 1);
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
        GetApiNodesResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.apiNodes = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.apiNodes && message.apiNodes.length) {
                object.apiNodes = $Array(message.apiNodes.length);
                for (let j = 0; j < message.apiNodes.length; ++j)
                    object.apiNodes[j] = $root.getApiNodes.ApiNode.toObject(message.apiNodes[j], options, _depth + 1);
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
        GetApiNodesResponse.prototype.toJSON = function() {
            return GetApiNodesResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetApiNodesResponse
         * @function getTypeUrl
         * @memberof getApiNodes.GetApiNodesResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetApiNodesResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getApiNodes.GetApiNodesResponse";
        };

        return GetApiNodesResponse;
    })();

    return getApiNodes;
})();

export const shared = $root.shared = (() => {

    /**
     * Namespace shared.
     * @exports shared
     * @namespace
     */
    const shared = {};

    shared.Headers = (function() {

        /**
         * Properties of a Headers.
         * @typedef {Object} shared.Headers.$Properties
         * @property {string|null} [version] Headers version
         * @property {number|null} [blockNumber] Headers blockNumber
         * @property {number|null} [round] Headers round
         * @property {number|null} [step] Headers step
         * @property {string|null} [proposedBlockHash] Headers proposedBlockHash
         * @property {Array.<boolean>|null} [validatorsSignedPrevote] Headers validatorsSignedPrevote
         * @property {Array.<boolean>|null} [validatorsSignedPrecommit] Headers validatorsSignedPrecommit
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Headers.
         * @memberof shared
         * @interface IHeaders
         * @augments shared.Headers.$Properties
         * @deprecated Use shared.Headers.$Properties instead.
         */

        /**
         * Shape of a Headers.
         * @typedef {shared.Headers.$Properties} shared.Headers.$Shape
         */

        /**
         * Constructs a new Headers.
         * @memberof shared
         * @classdesc Represents a Headers.
         * @constructor
         * @param {shared.Headers.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Headers = function (properties) {
            this.validatorsSignedPrevote = [];
            this.validatorsSignedPrecommit = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Headers version.
         * @member {string} version
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.version = "";

        /**
         * Headers blockNumber.
         * @member {number} blockNumber
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.blockNumber = 0;

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
         * Headers proposedBlockHash.
         * @member {string|null|undefined} proposedBlockHash
         * @memberof shared.Headers
         * @instance
         */
        Headers.prototype.proposedBlockHash = null;

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
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(Headers.prototype, "_proposedBlockHash", {
            get: $util.oneOfGetter($oneOfFields = ["proposedBlockHash"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new Headers instance using the specified properties.
         * @function create
         * @memberof shared.Headers
         * @static
         * @param {shared.Headers.$Properties=} [properties] Properties to set
         * @returns {shared.Headers} Headers instance
         * @type {{
         *   (properties: shared.Headers.$Shape): shared.Headers & shared.Headers.$Shape;
         *   (properties?: shared.Headers.$Properties): shared.Headers;
         * }}
         */
        Headers.create = function(properties) {
            return new Headers(properties);
        };

        /**
         * Encodes the specified Headers message. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @function encode
         * @memberof shared.Headers
         * @static
         * @param {shared.Headers.$Properties} message Headers message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Headers.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.version);
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.blockNumber);
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.round);
            if (message.step != null && $Object.hasOwnProperty.call(message, "step"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.step);
            if (message.proposedBlockHash != null && $Object.hasOwnProperty.call(message, "proposedBlockHash"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.proposedBlockHash);
            if (message.validatorsSignedPrevote != null && message.validatorsSignedPrevote.length) {
                writer.uint32(/* id 6, wireType 2 =*/50).fork();
                for (let i = 0; i < message.validatorsSignedPrevote.length; ++i)
                    writer.bool(message.validatorsSignedPrevote[i]);
                writer.ldelim();
            }
            if (message.validatorsSignedPrecommit != null && message.validatorsSignedPrecommit.length) {
                writer.uint32(/* id 7, wireType 2 =*/58).fork();
                for (let i = 0; i < message.validatorsSignedPrecommit.length; ++i)
                    writer.bool(message.validatorsSignedPrecommit[i]);
                writer.ldelim();
            }
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Headers message, length delimited. Does not implicitly {@link shared.Headers.verify|verify} messages.
         * @function encodeDelimited
         * @memberof shared.Headers
         * @static
         * @param {shared.Headers.$Properties} message Headers message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Headers.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Headers message from the specified reader or buffer.
         * @function decode
         * @memberof shared.Headers
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {shared.Headers & shared.Headers.$Shape} Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Headers.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.shared.Headers(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.version = value;
                        else
                            delete message.version;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.blockNumber = value;
                        else
                            delete message.blockNumber;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.round = value;
                        else
                            delete message.round;
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.step = value;
                        else
                            delete message.step;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.proposedBlockHash = reader.stringVerify();
                        message._proposedBlockHash = "proposedBlockHash";
                        continue;
                    }
                case 6: {
                        if (wireType === 2) {
                            if (!(message.validatorsSignedPrevote && message.validatorsSignedPrevote.length))
                                message.validatorsSignedPrevote = [];
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorsSignedPrevote.push(reader.bool());
                            continue;
                        }
                        if (wireType !== 0)
                            break;
                        if (!(message.validatorsSignedPrevote && message.validatorsSignedPrevote.length))
                            message.validatorsSignedPrevote = [];
                        message.validatorsSignedPrevote.push(reader.bool());
                        continue;
                    }
                case 7: {
                        if (wireType === 2) {
                            if (!(message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length))
                                message.validatorsSignedPrecommit = [];
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorsSignedPrecommit.push(reader.bool());
                            continue;
                        }
                        if (wireType !== 0)
                            break;
                        if (!(message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length))
                            message.validatorsSignedPrecommit = [];
                        message.validatorsSignedPrecommit.push(reader.bool());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Headers message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof shared.Headers
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {shared.Headers & shared.Headers.$Shape} Headers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Headers.decodeDelimited = function(reader) {
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
        Headers.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                if (!$util.isString(message.version))
                    return "version: string expected";
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                if (!$util.isInteger(message.blockNumber))
                    return "blockNumber: integer expected";
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                if (!$util.isInteger(message.round))
                    return "round: integer expected";
            if (message.step != null && $Object.hasOwnProperty.call(message, "step"))
                if (!$util.isInteger(message.step))
                    return "step: integer expected";
            if (message.proposedBlockHash != null && $Object.hasOwnProperty.call(message, "proposedBlockHash")) {
                properties._proposedBlockHash = 1;
                if (!$util.isString(message.proposedBlockHash))
                    return "proposedBlockHash: string expected";
            }
            if (message.validatorsSignedPrevote != null && $Object.hasOwnProperty.call(message, "validatorsSignedPrevote")) {
                if (!$Array.isArray(message.validatorsSignedPrevote))
                    return "validatorsSignedPrevote: array expected";
                for (let i = 0; i < message.validatorsSignedPrevote.length; ++i)
                    if (typeof message.validatorsSignedPrevote[i] !== "boolean")
                        return "validatorsSignedPrevote: boolean[] expected";
            }
            if (message.validatorsSignedPrecommit != null && $Object.hasOwnProperty.call(message, "validatorsSignedPrecommit")) {
                if (!$Array.isArray(message.validatorsSignedPrecommit))
                    return "validatorsSignedPrecommit: array expected";
                for (let i = 0; i < message.validatorsSignedPrecommit.length; ++i)
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
        Headers.fromObject = function (object, _depth) {
            if (object instanceof $root.shared.Headers)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".shared.Headers: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.shared.Headers();
            if (object.version != null)
                if (typeof object.version !== "string" || object.version.length)
                    message.version = $String(object.version);
            if (object.blockNumber != null)
                if ($Number(object.blockNumber) !== 0)
                    message.blockNumber = object.blockNumber >>> 0;
            if (object.round != null)
                if ($Number(object.round) !== 0)
                    message.round = object.round >>> 0;
            if (object.step != null)
                if ($Number(object.step) !== 0)
                    message.step = object.step >>> 0;
            if (object.proposedBlockHash != null)
                message.proposedBlockHash = $String(object.proposedBlockHash);
            if (object.validatorsSignedPrevote) {
                if (!$Array.isArray(object.validatorsSignedPrevote))
                    throw $TypeError(".shared.Headers.validatorsSignedPrevote: array expected");
                message.validatorsSignedPrevote = $Array(object.validatorsSignedPrevote.length);
                for (let i = 0; i < object.validatorsSignedPrevote.length; ++i)
                    message.validatorsSignedPrevote[i] = $Boolean(object.validatorsSignedPrevote[i]);
            }
            if (object.validatorsSignedPrecommit) {
                if (!$Array.isArray(object.validatorsSignedPrecommit))
                    throw $TypeError(".shared.Headers.validatorsSignedPrecommit: array expected");
                message.validatorsSignedPrecommit = $Array(object.validatorsSignedPrecommit.length);
                for (let i = 0; i < object.validatorsSignedPrecommit.length; ++i)
                    message.validatorsSignedPrecommit[i] = $Boolean(object.validatorsSignedPrecommit[i]);
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
        Headers.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults) {
                object.validatorsSignedPrevote = [];
                object.validatorsSignedPrecommit = [];
            }
            if (options.defaults) {
                object.version = "";
                object.blockNumber = 0;
                object.round = 0;
                object.step = 0;
            }
            if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                object.version = message.version;
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                object.blockNumber = message.blockNumber;
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                object.round = message.round;
            if (message.step != null && $Object.hasOwnProperty.call(message, "step"))
                object.step = message.step;
            if (message.proposedBlockHash != null && $Object.hasOwnProperty.call(message, "proposedBlockHash"))
                object.proposedBlockHash = message.proposedBlockHash;
            if (message.validatorsSignedPrevote && message.validatorsSignedPrevote.length) {
                object.validatorsSignedPrevote = $Array(message.validatorsSignedPrevote.length);
                for (let j = 0; j < message.validatorsSignedPrevote.length; ++j)
                    object.validatorsSignedPrevote[j] = message.validatorsSignedPrevote[j];
            }
            if (message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length) {
                object.validatorsSignedPrecommit = $Array(message.validatorsSignedPrecommit.length);
                for (let j = 0; j < message.validatorsSignedPrecommit.length; ++j)
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
        Headers.prototype.toJSON = function() {
            return Headers.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Headers
         * @function getTypeUrl
         * @memberof shared.Headers
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Headers.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/shared.Headers";
        };

        return Headers;
    })();

    shared.PeerLike = (function() {

        /**
         * Properties of a PeerLike.
         * @typedef {Object} shared.PeerLike.$Properties
         * @property {string|null} [ip] PeerLike ip
         * @property {number|null} [port] PeerLike port
         * @property {number|null} [protocol] PeerLike protocol
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PeerLike.
         * @memberof shared
         * @interface IPeerLike
         * @augments shared.PeerLike.$Properties
         * @deprecated Use shared.PeerLike.$Properties instead.
         */

        /**
         * Shape of a PeerLike.
         * @typedef {shared.PeerLike.$Properties} shared.PeerLike.$Shape
         */

        /**
         * Constructs a new PeerLike.
         * @memberof shared
         * @classdesc Represents a PeerLike.
         * @constructor
         * @param {shared.PeerLike.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PeerLike = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

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
         * @param {shared.PeerLike.$Properties=} [properties] Properties to set
         * @returns {shared.PeerLike} PeerLike instance
         * @type {{
         *   (properties: shared.PeerLike.$Shape): shared.PeerLike & shared.PeerLike.$Shape;
         *   (properties?: shared.PeerLike.$Properties): shared.PeerLike;
         * }}
         */
        PeerLike.create = function(properties) {
            return new PeerLike(properties);
        };

        /**
         * Encodes the specified PeerLike message. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @function encode
         * @memberof shared.PeerLike
         * @static
         * @param {shared.PeerLike.$Properties} message PeerLike message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerLike.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.ip != null && $Object.hasOwnProperty.call(message, "ip"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.ip);
            if (message.port != null && $Object.hasOwnProperty.call(message, "port"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.port);
            if (message.protocol != null && $Object.hasOwnProperty.call(message, "protocol"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.protocol);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PeerLike message, length delimited. Does not implicitly {@link shared.PeerLike.verify|verify} messages.
         * @function encodeDelimited
         * @memberof shared.PeerLike
         * @static
         * @param {shared.PeerLike.$Properties} message PeerLike message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerLike.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a PeerLike message from the specified reader or buffer.
         * @function decode
         * @memberof shared.PeerLike
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {shared.PeerLike & shared.PeerLike.$Shape} PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerLike.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.shared.PeerLike(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.ip = value;
                        else
                            delete message.ip;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.port = value;
                        else
                            delete message.port;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocol = value;
                        else
                            delete message.protocol;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PeerLike message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof shared.PeerLike
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {shared.PeerLike & shared.PeerLike.$Shape} PeerLike
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerLike.decodeDelimited = function(reader) {
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
        PeerLike.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.ip != null && $Object.hasOwnProperty.call(message, "ip"))
                if (!$util.isString(message.ip))
                    return "ip: string expected";
            if (message.port != null && $Object.hasOwnProperty.call(message, "port"))
                if (!$util.isInteger(message.port))
                    return "port: integer expected";
            if (message.protocol != null && $Object.hasOwnProperty.call(message, "protocol"))
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
        PeerLike.fromObject = function (object, _depth) {
            if (object instanceof $root.shared.PeerLike)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".shared.PeerLike: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.shared.PeerLike();
            if (object.ip != null)
                if (typeof object.ip !== "string" || object.ip.length)
                    message.ip = $String(object.ip);
            if (object.port != null)
                if ($Number(object.port) !== 0)
                    message.port = object.port >>> 0;
            if (object.protocol != null)
                if ($Number(object.protocol) !== 0)
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
        PeerLike.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.ip = "";
                object.port = 0;
                object.protocol = 0;
            }
            if (message.ip != null && $Object.hasOwnProperty.call(message, "ip"))
                object.ip = message.ip;
            if (message.port != null && $Object.hasOwnProperty.call(message, "port"))
                object.port = message.port;
            if (message.protocol != null && $Object.hasOwnProperty.call(message, "protocol"))
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
        PeerLike.prototype.toJSON = function() {
            return PeerLike.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PeerLike
         * @function getTypeUrl
         * @memberof shared.PeerLike
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PeerLike.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/shared.PeerLike";
        };

        return PeerLike;
    })();

    return shared;
})();

export const getBlocks = $root.getBlocks = (() => {

    /**
     * Namespace getBlocks.
     * @exports getBlocks
     * @namespace
     */
    const getBlocks = {};

    getBlocks.GetBlocksRequest = (function() {

        /**
         * Properties of a GetBlocksRequest.
         * @typedef {Object} getBlocks.GetBlocksRequest.$Properties
         * @property {number|null} [fromBlockNumber] GetBlocksRequest fromBlockNumber
         * @property {number|null} [limit] GetBlocksRequest limit
         * @property {shared.Headers.$Properties|null} [headers] GetBlocksRequest headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetBlocksRequest.
         * @memberof getBlocks
         * @interface IGetBlocksRequest
         * @augments getBlocks.GetBlocksRequest.$Properties
         * @deprecated Use getBlocks.GetBlocksRequest.$Properties instead.
         */

        /**
         * Shape of a GetBlocksRequest.
         * @typedef {getBlocks.GetBlocksRequest.$Properties} getBlocks.GetBlocksRequest.$Shape
         */

        /**
         * Constructs a new GetBlocksRequest.
         * @memberof getBlocks
         * @classdesc Represents a GetBlocksRequest.
         * @constructor
         * @param {getBlocks.GetBlocksRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetBlocksRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetBlocksRequest fromBlockNumber.
         * @member {number} fromBlockNumber
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         */
        GetBlocksRequest.prototype.fromBlockNumber = 0;

        /**
         * GetBlocksRequest limit.
         * @member {number} limit
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         */
        GetBlocksRequest.prototype.limit = 0;

        /**
         * GetBlocksRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         */
        GetBlocksRequest.prototype.headers = null;

        /**
         * Creates a new GetBlocksRequest instance using the specified properties.
         * @function create
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.GetBlocksRequest.$Properties=} [properties] Properties to set
         * @returns {getBlocks.GetBlocksRequest} GetBlocksRequest instance
         * @type {{
         *   (properties: getBlocks.GetBlocksRequest.$Shape): getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape;
         *   (properties?: getBlocks.GetBlocksRequest.$Properties): getBlocks.GetBlocksRequest;
         * }}
         */
        GetBlocksRequest.create = function(properties) {
            return new GetBlocksRequest(properties);
        };

        /**
         * Encodes the specified GetBlocksRequest message. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @function encode
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.GetBlocksRequest.$Properties} message GetBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.fromBlockNumber != null && $Object.hasOwnProperty.call(message, "fromBlockNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.fromBlockNumber);
            if (message.limit != null && $Object.hasOwnProperty.call(message, "limit"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.limit);
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetBlocksRequest message, length delimited. Does not implicitly {@link getBlocks.GetBlocksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {getBlocks.GetBlocksRequest.$Properties} message GetBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape} GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getBlocks.GetBlocksRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.fromBlockNumber = value;
                        else
                            delete message.fromBlockNumber;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.limit = value;
                        else
                            delete message.limit;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetBlocksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getBlocks.GetBlocksRequest & getBlocks.GetBlocksRequest.$Shape} GetBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksRequest.decodeDelimited = function(reader) {
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
        GetBlocksRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.fromBlockNumber != null && $Object.hasOwnProperty.call(message, "fromBlockNumber"))
                if (!$util.isInteger(message.fromBlockNumber))
                    return "fromBlockNumber: integer expected";
            if (message.limit != null && $Object.hasOwnProperty.call(message, "limit"))
                if (!$util.isInteger(message.limit))
                    return "limit: integer expected";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
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
        GetBlocksRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.getBlocks.GetBlocksRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getBlocks.GetBlocksRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getBlocks.GetBlocksRequest();
            if (object.fromBlockNumber != null)
                if ($Number(object.fromBlockNumber) !== 0)
                    message.fromBlockNumber = object.fromBlockNumber >>> 0;
            if (object.limit != null)
                if ($Number(object.limit) !== 0)
                    message.limit = object.limit >>> 0;
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getBlocks.GetBlocksRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
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
        GetBlocksRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.fromBlockNumber = 0;
                object.limit = 0;
                object.headers = null;
            }
            if (message.fromBlockNumber != null && $Object.hasOwnProperty.call(message, "fromBlockNumber"))
                object.fromBlockNumber = message.fromBlockNumber;
            if (message.limit != null && $Object.hasOwnProperty.call(message, "limit"))
                object.limit = message.limit;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetBlocksRequest to JSON.
         * @function toJSON
         * @memberof getBlocks.GetBlocksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetBlocksRequest.prototype.toJSON = function() {
            return GetBlocksRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetBlocksRequest
         * @function getTypeUrl
         * @memberof getBlocks.GetBlocksRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetBlocksRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getBlocks.GetBlocksRequest";
        };

        return GetBlocksRequest;
    })();

    getBlocks.GetBlocksResponse = (function() {

        /**
         * Properties of a GetBlocksResponse.
         * @typedef {Object} getBlocks.GetBlocksResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetBlocksResponse headers
         * @property {Array.<Uint8Array>|null} [blocks] GetBlocksResponse blocks
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetBlocksResponse.
         * @memberof getBlocks
         * @interface IGetBlocksResponse
         * @augments getBlocks.GetBlocksResponse.$Properties
         * @deprecated Use getBlocks.GetBlocksResponse.$Properties instead.
         */

        /**
         * Shape of a GetBlocksResponse.
         * @typedef {getBlocks.GetBlocksResponse.$Properties} getBlocks.GetBlocksResponse.$Shape
         */

        /**
         * Constructs a new GetBlocksResponse.
         * @memberof getBlocks
         * @classdesc Represents a GetBlocksResponse.
         * @constructor
         * @param {getBlocks.GetBlocksResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetBlocksResponse = function (properties) {
            this.blocks = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetBlocksResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
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
         * @param {getBlocks.GetBlocksResponse.$Properties=} [properties] Properties to set
         * @returns {getBlocks.GetBlocksResponse} GetBlocksResponse instance
         * @type {{
         *   (properties: getBlocks.GetBlocksResponse.$Shape): getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape;
         *   (properties?: getBlocks.GetBlocksResponse.$Properties): getBlocks.GetBlocksResponse;
         * }}
         */
        GetBlocksResponse.create = function(properties) {
            return new GetBlocksResponse(properties);
        };

        /**
         * Encodes the specified GetBlocksResponse message. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @function encode
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {getBlocks.GetBlocksResponse.$Properties} message GetBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.blocks != null && message.blocks.length)
                for (let i = 0; i < message.blocks.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.blocks[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetBlocksResponse message, length delimited. Does not implicitly {@link getBlocks.GetBlocksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {getBlocks.GetBlocksResponse.$Properties} message GetBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetBlocksResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape} GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getBlocks.GetBlocksResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if (!(message.blocks && message.blocks.length))
                            message.blocks = [];
                        message.blocks.push(reader.bytes());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetBlocksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getBlocks.GetBlocksResponse & getBlocks.GetBlocksResponse.$Shape} GetBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetBlocksResponse.decodeDelimited = function(reader) {
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
        GetBlocksResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.blocks != null && $Object.hasOwnProperty.call(message, "blocks")) {
                if (!$Array.isArray(message.blocks))
                    return "blocks: array expected";
                for (let i = 0; i < message.blocks.length; ++i)
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
        GetBlocksResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.getBlocks.GetBlocksResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getBlocks.GetBlocksResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getBlocks.GetBlocksResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getBlocks.GetBlocksResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.blocks) {
                if (!$Array.isArray(object.blocks))
                    throw $TypeError(".getBlocks.GetBlocksResponse.blocks: array expected");
                message.blocks = $Array(object.blocks.length);
                for (let i = 0; i < object.blocks.length; ++i)
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
        GetBlocksResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.blocks = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.blocks && message.blocks.length) {
                object.blocks = $Array(message.blocks.length);
                for (let j = 0; j < message.blocks.length; ++j)
                    object.blocks[j] = options.bytes === $String ? $util.base64.encode(message.blocks[j], 0, message.blocks[j].length) : options.bytes === $Array ? $Array.prototype.slice.call(message.blocks[j]) : message.blocks[j];
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
        GetBlocksResponse.prototype.toJSON = function() {
            return GetBlocksResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetBlocksResponse
         * @function getTypeUrl
         * @memberof getBlocks.GetBlocksResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetBlocksResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getBlocks.GetBlocksResponse";
        };

        return GetBlocksResponse;
    })();

    return getBlocks;
})();

export const getMessages = $root.getMessages = (() => {

    /**
     * Namespace getMessages.
     * @exports getMessages
     * @namespace
     */
    const getMessages = {};

    getMessages.GetMessagesQuery = (function() {

        /**
         * Properties of a GetMessagesQuery.
         * @typedef {Object} getMessages.GetMessagesQuery.$Properties
         * @property {number|null} [blockNumber] GetMessagesQuery blockNumber
         * @property {number|null} [round] GetMessagesQuery round
         * @property {Array.<boolean>|null} [validatorsSignedPrevote] GetMessagesQuery validatorsSignedPrevote
         * @property {Array.<boolean>|null} [validatorsSignedPrecommit] GetMessagesQuery validatorsSignedPrecommit
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetMessagesQuery.
         * @memberof getMessages
         * @interface IGetMessagesQuery
         * @augments getMessages.GetMessagesQuery.$Properties
         * @deprecated Use getMessages.GetMessagesQuery.$Properties instead.
         */

        /**
         * Shape of a GetMessagesQuery.
         * @typedef {getMessages.GetMessagesQuery.$Properties} getMessages.GetMessagesQuery.$Shape
         */

        /**
         * Constructs a new GetMessagesQuery.
         * @memberof getMessages
         * @classdesc Represents a GetMessagesQuery.
         * @constructor
         * @param {getMessages.GetMessagesQuery.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetMessagesQuery = function (properties) {
            this.validatorsSignedPrevote = [];
            this.validatorsSignedPrecommit = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetMessagesQuery blockNumber.
         * @member {number} blockNumber
         * @memberof getMessages.GetMessagesQuery
         * @instance
         */
        GetMessagesQuery.prototype.blockNumber = 0;

        /**
         * GetMessagesQuery round.
         * @member {number} round
         * @memberof getMessages.GetMessagesQuery
         * @instance
         */
        GetMessagesQuery.prototype.round = 0;

        /**
         * GetMessagesQuery validatorsSignedPrevote.
         * @member {Array.<boolean>} validatorsSignedPrevote
         * @memberof getMessages.GetMessagesQuery
         * @instance
         */
        GetMessagesQuery.prototype.validatorsSignedPrevote = $util.emptyArray;

        /**
         * GetMessagesQuery validatorsSignedPrecommit.
         * @member {Array.<boolean>} validatorsSignedPrecommit
         * @memberof getMessages.GetMessagesQuery
         * @instance
         */
        GetMessagesQuery.prototype.validatorsSignedPrecommit = $util.emptyArray;

        /**
         * Creates a new GetMessagesQuery instance using the specified properties.
         * @function create
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {getMessages.GetMessagesQuery.$Properties=} [properties] Properties to set
         * @returns {getMessages.GetMessagesQuery} GetMessagesQuery instance
         * @type {{
         *   (properties: getMessages.GetMessagesQuery.$Shape): getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape;
         *   (properties?: getMessages.GetMessagesQuery.$Properties): getMessages.GetMessagesQuery;
         * }}
         */
        GetMessagesQuery.create = function(properties) {
            return new GetMessagesQuery(properties);
        };

        /**
         * Encodes the specified GetMessagesQuery message. Does not implicitly {@link getMessages.GetMessagesQuery.verify|verify} messages.
         * @function encode
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {getMessages.GetMessagesQuery.$Properties} message GetMessagesQuery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesQuery.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.blockNumber);
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.round);
            if (message.validatorsSignedPrevote != null && message.validatorsSignedPrevote.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (let i = 0; i < message.validatorsSignedPrevote.length; ++i)
                    writer.bool(message.validatorsSignedPrevote[i]);
                writer.ldelim();
            }
            if (message.validatorsSignedPrecommit != null && message.validatorsSignedPrecommit.length) {
                writer.uint32(/* id 4, wireType 2 =*/34).fork();
                for (let i = 0; i < message.validatorsSignedPrecommit.length; ++i)
                    writer.bool(message.validatorsSignedPrecommit[i]);
                writer.ldelim();
            }
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetMessagesQuery message, length delimited. Does not implicitly {@link getMessages.GetMessagesQuery.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {getMessages.GetMessagesQuery.$Properties} message GetMessagesQuery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesQuery.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetMessagesQuery message from the specified reader or buffer.
         * @function decode
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape} GetMessagesQuery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesQuery.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getMessages.GetMessagesQuery(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.blockNumber = value;
                        else
                            delete message.blockNumber;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.round = value;
                        else
                            delete message.round;
                        continue;
                    }
                case 3: {
                        if (wireType === 2) {
                            if (!(message.validatorsSignedPrevote && message.validatorsSignedPrevote.length))
                                message.validatorsSignedPrevote = [];
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorsSignedPrevote.push(reader.bool());
                            continue;
                        }
                        if (wireType !== 0)
                            break;
                        if (!(message.validatorsSignedPrevote && message.validatorsSignedPrevote.length))
                            message.validatorsSignedPrevote = [];
                        message.validatorsSignedPrevote.push(reader.bool());
                        continue;
                    }
                case 4: {
                        if (wireType === 2) {
                            if (!(message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length))
                                message.validatorsSignedPrecommit = [];
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorsSignedPrecommit.push(reader.bool());
                            continue;
                        }
                        if (wireType !== 0)
                            break;
                        if (!(message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length))
                            message.validatorsSignedPrecommit = [];
                        message.validatorsSignedPrecommit.push(reader.bool());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetMessagesQuery message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesQuery & getMessages.GetMessagesQuery.$Shape} GetMessagesQuery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesQuery.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetMessagesQuery message.
         * @function verify
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetMessagesQuery.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                if (!$util.isInteger(message.blockNumber))
                    return "blockNumber: integer expected";
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                if (!$util.isInteger(message.round))
                    return "round: integer expected";
            if (message.validatorsSignedPrevote != null && $Object.hasOwnProperty.call(message, "validatorsSignedPrevote")) {
                if (!$Array.isArray(message.validatorsSignedPrevote))
                    return "validatorsSignedPrevote: array expected";
                for (let i = 0; i < message.validatorsSignedPrevote.length; ++i)
                    if (typeof message.validatorsSignedPrevote[i] !== "boolean")
                        return "validatorsSignedPrevote: boolean[] expected";
            }
            if (message.validatorsSignedPrecommit != null && $Object.hasOwnProperty.call(message, "validatorsSignedPrecommit")) {
                if (!$Array.isArray(message.validatorsSignedPrecommit))
                    return "validatorsSignedPrecommit: array expected";
                for (let i = 0; i < message.validatorsSignedPrecommit.length; ++i)
                    if (typeof message.validatorsSignedPrecommit[i] !== "boolean")
                        return "validatorsSignedPrecommit: boolean[] expected";
            }
            return null;
        };

        /**
         * Creates a GetMessagesQuery message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getMessages.GetMessagesQuery} GetMessagesQuery
         */
        GetMessagesQuery.fromObject = function (object, _depth) {
            if (object instanceof $root.getMessages.GetMessagesQuery)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getMessages.GetMessagesQuery: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getMessages.GetMessagesQuery();
            if (object.blockNumber != null)
                if ($Number(object.blockNumber) !== 0)
                    message.blockNumber = object.blockNumber >>> 0;
            if (object.round != null)
                if ($Number(object.round) !== 0)
                    message.round = object.round >>> 0;
            if (object.validatorsSignedPrevote) {
                if (!$Array.isArray(object.validatorsSignedPrevote))
                    throw $TypeError(".getMessages.GetMessagesQuery.validatorsSignedPrevote: array expected");
                message.validatorsSignedPrevote = $Array(object.validatorsSignedPrevote.length);
                for (let i = 0; i < object.validatorsSignedPrevote.length; ++i)
                    message.validatorsSignedPrevote[i] = $Boolean(object.validatorsSignedPrevote[i]);
            }
            if (object.validatorsSignedPrecommit) {
                if (!$Array.isArray(object.validatorsSignedPrecommit))
                    throw $TypeError(".getMessages.GetMessagesQuery.validatorsSignedPrecommit: array expected");
                message.validatorsSignedPrecommit = $Array(object.validatorsSignedPrecommit.length);
                for (let i = 0; i < object.validatorsSignedPrecommit.length; ++i)
                    message.validatorsSignedPrecommit[i] = $Boolean(object.validatorsSignedPrecommit[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetMessagesQuery message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {getMessages.GetMessagesQuery} message GetMessagesQuery
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetMessagesQuery.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults) {
                object.validatorsSignedPrevote = [];
                object.validatorsSignedPrecommit = [];
            }
            if (options.defaults) {
                object.blockNumber = 0;
                object.round = 0;
            }
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                object.blockNumber = message.blockNumber;
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                object.round = message.round;
            if (message.validatorsSignedPrevote && message.validatorsSignedPrevote.length) {
                object.validatorsSignedPrevote = $Array(message.validatorsSignedPrevote.length);
                for (let j = 0; j < message.validatorsSignedPrevote.length; ++j)
                    object.validatorsSignedPrevote[j] = message.validatorsSignedPrevote[j];
            }
            if (message.validatorsSignedPrecommit && message.validatorsSignedPrecommit.length) {
                object.validatorsSignedPrecommit = $Array(message.validatorsSignedPrecommit.length);
                for (let j = 0; j < message.validatorsSignedPrecommit.length; ++j)
                    object.validatorsSignedPrecommit[j] = message.validatorsSignedPrecommit[j];
            }
            return object;
        };

        /**
         * Converts this GetMessagesQuery to JSON.
         * @function toJSON
         * @memberof getMessages.GetMessagesQuery
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetMessagesQuery.prototype.toJSON = function() {
            return GetMessagesQuery.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetMessagesQuery
         * @function getTypeUrl
         * @memberof getMessages.GetMessagesQuery
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetMessagesQuery.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getMessages.GetMessagesQuery";
        };

        return GetMessagesQuery;
    })();

    getMessages.GetMessagesRequest = (function() {

        /**
         * Properties of a GetMessagesRequest.
         * @typedef {Object} getMessages.GetMessagesRequest.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetMessagesRequest headers
         * @property {getMessages.GetMessagesQuery.$Properties|null} [query] GetMessagesRequest query
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetMessagesRequest.
         * @memberof getMessages
         * @interface IGetMessagesRequest
         * @augments getMessages.GetMessagesRequest.$Properties
         * @deprecated Use getMessages.GetMessagesRequest.$Properties instead.
         */

        /**
         * Shape of a GetMessagesRequest.
         * @typedef {getMessages.GetMessagesRequest.$Properties} getMessages.GetMessagesRequest.$Shape
         */

        /**
         * Constructs a new GetMessagesRequest.
         * @memberof getMessages
         * @classdesc Represents a GetMessagesRequest.
         * @constructor
         * @param {getMessages.GetMessagesRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetMessagesRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetMessagesRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getMessages.GetMessagesRequest
         * @instance
         */
        GetMessagesRequest.prototype.headers = null;

        /**
         * GetMessagesRequest query.
         * @member {getMessages.GetMessagesQuery.$Properties|null|undefined} query
         * @memberof getMessages.GetMessagesRequest
         * @instance
         */
        GetMessagesRequest.prototype.query = null;

        /**
         * Creates a new GetMessagesRequest instance using the specified properties.
         * @function create
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.GetMessagesRequest.$Properties=} [properties] Properties to set
         * @returns {getMessages.GetMessagesRequest} GetMessagesRequest instance
         * @type {{
         *   (properties: getMessages.GetMessagesRequest.$Shape): getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape;
         *   (properties?: getMessages.GetMessagesRequest.$Properties): getMessages.GetMessagesRequest;
         * }}
         */
        GetMessagesRequest.create = function(properties) {
            return new GetMessagesRequest(properties);
        };

        /**
         * Encodes the specified GetMessagesRequest message. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @function encode
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.GetMessagesRequest.$Properties} message GetMessagesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.query != null && $Object.hasOwnProperty.call(message, "query"))
                $root.getMessages.GetMessagesQuery.encode(message.query, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetMessagesRequest message, length delimited. Does not implicitly {@link getMessages.GetMessagesRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {getMessages.GetMessagesRequest.$Properties} message GetMessagesRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape} GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getMessages.GetMessagesRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.query = $root.getMessages.GetMessagesQuery.decode(reader, reader.uint32(), $undefined, _depth + 1, message.query);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetMessagesRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesRequest & getMessages.GetMessagesRequest.$Shape} GetMessagesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesRequest.decodeDelimited = function(reader) {
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
        GetMessagesRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.query != null && $Object.hasOwnProperty.call(message, "query")) {
                let error = $root.getMessages.GetMessagesQuery.verify(message.query, _depth + 1);
                if (error)
                    return "query." + error;
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
        GetMessagesRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.getMessages.GetMessagesRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getMessages.GetMessagesRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getMessages.GetMessagesRequest();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getMessages.GetMessagesRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.query != null) {
                if (!$util.isObject(object.query))
                    throw $TypeError(".getMessages.GetMessagesRequest.query: object expected");
                message.query = $root.getMessages.GetMessagesQuery.fromObject(object.query, _depth + 1);
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
        GetMessagesRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.headers = null;
                object.query = null;
            }
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.query != null && $Object.hasOwnProperty.call(message, "query"))
                object.query = $root.getMessages.GetMessagesQuery.toObject(message.query, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetMessagesRequest to JSON.
         * @function toJSON
         * @memberof getMessages.GetMessagesRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetMessagesRequest.prototype.toJSON = function() {
            return GetMessagesRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetMessagesRequest
         * @function getTypeUrl
         * @memberof getMessages.GetMessagesRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetMessagesRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getMessages.GetMessagesRequest";
        };

        return GetMessagesRequest;
    })();

    getMessages.GetMessagesResponse = (function() {

        /**
         * Properties of a GetMessagesResponse.
         * @typedef {Object} getMessages.GetMessagesResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetMessagesResponse headers
         * @property {Array.<Uint8Array>|null} [prevotes] GetMessagesResponse prevotes
         * @property {Array.<Uint8Array>|null} [precommits] GetMessagesResponse precommits
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetMessagesResponse.
         * @memberof getMessages
         * @interface IGetMessagesResponse
         * @augments getMessages.GetMessagesResponse.$Properties
         * @deprecated Use getMessages.GetMessagesResponse.$Properties instead.
         */

        /**
         * Shape of a GetMessagesResponse.
         * @typedef {getMessages.GetMessagesResponse.$Properties} getMessages.GetMessagesResponse.$Shape
         */

        /**
         * Constructs a new GetMessagesResponse.
         * @memberof getMessages
         * @classdesc Represents a GetMessagesResponse.
         * @constructor
         * @param {getMessages.GetMessagesResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetMessagesResponse = function (properties) {
            this.prevotes = [];
            this.precommits = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetMessagesResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
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
         * @param {getMessages.GetMessagesResponse.$Properties=} [properties] Properties to set
         * @returns {getMessages.GetMessagesResponse} GetMessagesResponse instance
         * @type {{
         *   (properties: getMessages.GetMessagesResponse.$Shape): getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape;
         *   (properties?: getMessages.GetMessagesResponse.$Properties): getMessages.GetMessagesResponse;
         * }}
         */
        GetMessagesResponse.create = function(properties) {
            return new GetMessagesResponse(properties);
        };

        /**
         * Encodes the specified GetMessagesResponse message. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @function encode
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {getMessages.GetMessagesResponse.$Properties} message GetMessagesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.prevotes != null && message.prevotes.length)
                for (let i = 0; i < message.prevotes.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.prevotes[i]);
            if (message.precommits != null && message.precommits.length)
                for (let i = 0; i < message.precommits.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.precommits[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetMessagesResponse message, length delimited. Does not implicitly {@link getMessages.GetMessagesResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {getMessages.GetMessagesResponse.$Properties} message GetMessagesResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetMessagesResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape} GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getMessages.GetMessagesResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if (!(message.prevotes && message.prevotes.length))
                            message.prevotes = [];
                        message.prevotes.push(reader.bytes());
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if (!(message.precommits && message.precommits.length))
                            message.precommits = [];
                        message.precommits.push(reader.bytes());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetMessagesResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getMessages.GetMessagesResponse & getMessages.GetMessagesResponse.$Shape} GetMessagesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetMessagesResponse.decodeDelimited = function(reader) {
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
        GetMessagesResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.prevotes != null && $Object.hasOwnProperty.call(message, "prevotes")) {
                if (!$Array.isArray(message.prevotes))
                    return "prevotes: array expected";
                for (let i = 0; i < message.prevotes.length; ++i)
                    if (!(message.prevotes[i] && typeof message.prevotes[i].length === "number" || $util.isString(message.prevotes[i])))
                        return "prevotes: buffer[] expected";
            }
            if (message.precommits != null && $Object.hasOwnProperty.call(message, "precommits")) {
                if (!$Array.isArray(message.precommits))
                    return "precommits: array expected";
                for (let i = 0; i < message.precommits.length; ++i)
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
        GetMessagesResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.getMessages.GetMessagesResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getMessages.GetMessagesResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getMessages.GetMessagesResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getMessages.GetMessagesResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.prevotes) {
                if (!$Array.isArray(object.prevotes))
                    throw $TypeError(".getMessages.GetMessagesResponse.prevotes: array expected");
                message.prevotes = $Array(object.prevotes.length);
                for (let i = 0; i < object.prevotes.length; ++i)
                    if (typeof object.prevotes[i] === "string")
                        $util.base64.decode(object.prevotes[i], message.prevotes[i] = $util.newBuffer($util.base64.length(object.prevotes[i])), 0);
                    else if (object.prevotes[i].length >= 0)
                        message.prevotes[i] = object.prevotes[i];
            }
            if (object.precommits) {
                if (!$Array.isArray(object.precommits))
                    throw $TypeError(".getMessages.GetMessagesResponse.precommits: array expected");
                message.precommits = $Array(object.precommits.length);
                for (let i = 0; i < object.precommits.length; ++i)
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
        GetMessagesResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults) {
                object.prevotes = [];
                object.precommits = [];
            }
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.prevotes && message.prevotes.length) {
                object.prevotes = $Array(message.prevotes.length);
                for (let j = 0; j < message.prevotes.length; ++j)
                    object.prevotes[j] = options.bytes === $String ? $util.base64.encode(message.prevotes[j], 0, message.prevotes[j].length) : options.bytes === $Array ? $Array.prototype.slice.call(message.prevotes[j]) : message.prevotes[j];
            }
            if (message.precommits && message.precommits.length) {
                object.precommits = $Array(message.precommits.length);
                for (let j = 0; j < message.precommits.length; ++j)
                    object.precommits[j] = options.bytes === $String ? $util.base64.encode(message.precommits[j], 0, message.precommits[j].length) : options.bytes === $Array ? $Array.prototype.slice.call(message.precommits[j]) : message.precommits[j];
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
        GetMessagesResponse.prototype.toJSON = function() {
            return GetMessagesResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetMessagesResponse
         * @function getTypeUrl
         * @memberof getMessages.GetMessagesResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetMessagesResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getMessages.GetMessagesResponse";
        };

        return GetMessagesResponse;
    })();

    return getMessages;
})();

export const getPeers = $root.getPeers = (() => {

    /**
     * Namespace getPeers.
     * @exports getPeers
     * @namespace
     */
    const getPeers = {};

    getPeers.GetPeersRequest = (function() {

        /**
         * Properties of a GetPeersRequest.
         * @typedef {Object} getPeers.GetPeersRequest.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetPeersRequest headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetPeersRequest.
         * @memberof getPeers
         * @interface IGetPeersRequest
         * @augments getPeers.GetPeersRequest.$Properties
         * @deprecated Use getPeers.GetPeersRequest.$Properties instead.
         */

        /**
         * Shape of a GetPeersRequest.
         * @typedef {getPeers.GetPeersRequest.$Properties} getPeers.GetPeersRequest.$Shape
         */

        /**
         * Constructs a new GetPeersRequest.
         * @memberof getPeers
         * @classdesc Represents a GetPeersRequest.
         * @constructor
         * @param {getPeers.GetPeersRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetPeersRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetPeersRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getPeers.GetPeersRequest
         * @instance
         */
        GetPeersRequest.prototype.headers = null;

        /**
         * Creates a new GetPeersRequest instance using the specified properties.
         * @function create
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.GetPeersRequest.$Properties=} [properties] Properties to set
         * @returns {getPeers.GetPeersRequest} GetPeersRequest instance
         * @type {{
         *   (properties: getPeers.GetPeersRequest.$Shape): getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape;
         *   (properties?: getPeers.GetPeersRequest.$Properties): getPeers.GetPeersRequest;
         * }}
         */
        GetPeersRequest.create = function(properties) {
            return new GetPeersRequest(properties);
        };

        /**
         * Encodes the specified GetPeersRequest message. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @function encode
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.GetPeersRequest.$Properties} message GetPeersRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetPeersRequest message, length delimited. Does not implicitly {@link getPeers.GetPeersRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {getPeers.GetPeersRequest.$Properties} message GetPeersRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape} GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getPeers.GetPeersRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetPeersRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getPeers.GetPeersRequest & getPeers.GetPeersRequest.$Shape} GetPeersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersRequest.decodeDelimited = function(reader) {
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
        GetPeersRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
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
        GetPeersRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.getPeers.GetPeersRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getPeers.GetPeersRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getPeers.GetPeersRequest();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getPeers.GetPeersRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
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
        GetPeersRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetPeersRequest to JSON.
         * @function toJSON
         * @memberof getPeers.GetPeersRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetPeersRequest.prototype.toJSON = function() {
            return GetPeersRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetPeersRequest
         * @function getTypeUrl
         * @memberof getPeers.GetPeersRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetPeersRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getPeers.GetPeersRequest";
        };

        return GetPeersRequest;
    })();

    getPeers.GetPeersResponse = (function() {

        /**
         * Properties of a GetPeersResponse.
         * @typedef {Object} getPeers.GetPeersResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetPeersResponse headers
         * @property {Array.<shared.PeerLike.$Properties>|null} [peers] GetPeersResponse peers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetPeersResponse.
         * @memberof getPeers
         * @interface IGetPeersResponse
         * @augments getPeers.GetPeersResponse.$Properties
         * @deprecated Use getPeers.GetPeersResponse.$Properties instead.
         */

        /**
         * Shape of a GetPeersResponse.
         * @typedef {getPeers.GetPeersResponse.$Properties} getPeers.GetPeersResponse.$Shape
         */

        /**
         * Constructs a new GetPeersResponse.
         * @memberof getPeers
         * @classdesc Represents a GetPeersResponse.
         * @constructor
         * @param {getPeers.GetPeersResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetPeersResponse = function (properties) {
            this.peers = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetPeersResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getPeers.GetPeersResponse
         * @instance
         */
        GetPeersResponse.prototype.headers = null;

        /**
         * GetPeersResponse peers.
         * @member {Array.<shared.PeerLike.$Properties>} peers
         * @memberof getPeers.GetPeersResponse
         * @instance
         */
        GetPeersResponse.prototype.peers = $util.emptyArray;

        /**
         * Creates a new GetPeersResponse instance using the specified properties.
         * @function create
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.GetPeersResponse.$Properties=} [properties] Properties to set
         * @returns {getPeers.GetPeersResponse} GetPeersResponse instance
         * @type {{
         *   (properties: getPeers.GetPeersResponse.$Shape): getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape;
         *   (properties?: getPeers.GetPeersResponse.$Properties): getPeers.GetPeersResponse;
         * }}
         */
        GetPeersResponse.create = function(properties) {
            return new GetPeersResponse(properties);
        };

        /**
         * Encodes the specified GetPeersResponse message. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @function encode
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.GetPeersResponse.$Properties} message GetPeersResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.peers != null && message.peers.length)
                for (let i = 0; i < message.peers.length; ++i)
                    $root.shared.PeerLike.encode(message.peers[i], writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetPeersResponse message, length delimited. Does not implicitly {@link getPeers.GetPeersResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {getPeers.GetPeersResponse.$Properties} message GetPeersResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPeersResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape} GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getPeers.GetPeersResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if (!(message.peers && message.peers.length))
                            message.peers = [];
                        message.peers.push($root.shared.PeerLike.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetPeersResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getPeers.GetPeersResponse & getPeers.GetPeersResponse.$Shape} GetPeersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPeersResponse.decodeDelimited = function(reader) {
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
        GetPeersResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.peers != null && $Object.hasOwnProperty.call(message, "peers")) {
                if (!$Array.isArray(message.peers))
                    return "peers: array expected";
                for (let i = 0; i < message.peers.length; ++i) {
                    let error = $root.shared.PeerLike.verify(message.peers[i], _depth + 1);
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
        GetPeersResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.getPeers.GetPeersResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getPeers.GetPeersResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getPeers.GetPeersResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getPeers.GetPeersResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.peers) {
                if (!$Array.isArray(object.peers))
                    throw $TypeError(".getPeers.GetPeersResponse.peers: array expected");
                message.peers = $Array(object.peers.length);
                for (let i = 0; i < object.peers.length; ++i) {
                    if (!$util.isObject(object.peers[i]))
                        throw $TypeError(".getPeers.GetPeersResponse.peers: object expected");
                    message.peers[i] = $root.shared.PeerLike.fromObject(object.peers[i], _depth + 1);
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
        GetPeersResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.peers = [];
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.peers && message.peers.length) {
                object.peers = $Array(message.peers.length);
                for (let j = 0; j < message.peers.length; ++j)
                    object.peers[j] = $root.shared.PeerLike.toObject(message.peers[j], options, _depth + 1);
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
        GetPeersResponse.prototype.toJSON = function() {
            return GetPeersResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetPeersResponse
         * @function getTypeUrl
         * @memberof getPeers.GetPeersResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetPeersResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getPeers.GetPeersResponse";
        };

        return GetPeersResponse;
    })();

    return getPeers;
})();

export const getProposal = $root.getProposal = (() => {

    /**
     * Namespace getProposal.
     * @exports getProposal
     * @namespace
     */
    const getProposal = {};

    getProposal.GetProposalQuery = (function() {

        /**
         * Properties of a GetProposalQuery.
         * @typedef {Object} getProposal.GetProposalQuery.$Properties
         * @property {number|null} [blockNumber] GetProposalQuery blockNumber
         * @property {number|null} [round] GetProposalQuery round
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetProposalQuery.
         * @memberof getProposal
         * @interface IGetProposalQuery
         * @augments getProposal.GetProposalQuery.$Properties
         * @deprecated Use getProposal.GetProposalQuery.$Properties instead.
         */

        /**
         * Shape of a GetProposalQuery.
         * @typedef {getProposal.GetProposalQuery.$Properties} getProposal.GetProposalQuery.$Shape
         */

        /**
         * Constructs a new GetProposalQuery.
         * @memberof getProposal
         * @classdesc Represents a GetProposalQuery.
         * @constructor
         * @param {getProposal.GetProposalQuery.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetProposalQuery = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetProposalQuery blockNumber.
         * @member {number} blockNumber
         * @memberof getProposal.GetProposalQuery
         * @instance
         */
        GetProposalQuery.prototype.blockNumber = 0;

        /**
         * GetProposalQuery round.
         * @member {number} round
         * @memberof getProposal.GetProposalQuery
         * @instance
         */
        GetProposalQuery.prototype.round = 0;

        /**
         * Creates a new GetProposalQuery instance using the specified properties.
         * @function create
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {getProposal.GetProposalQuery.$Properties=} [properties] Properties to set
         * @returns {getProposal.GetProposalQuery} GetProposalQuery instance
         * @type {{
         *   (properties: getProposal.GetProposalQuery.$Shape): getProposal.GetProposalQuery & getProposal.GetProposalQuery.$Shape;
         *   (properties?: getProposal.GetProposalQuery.$Properties): getProposal.GetProposalQuery;
         * }}
         */
        GetProposalQuery.create = function(properties) {
            return new GetProposalQuery(properties);
        };

        /**
         * Encodes the specified GetProposalQuery message. Does not implicitly {@link getProposal.GetProposalQuery.verify|verify} messages.
         * @function encode
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {getProposal.GetProposalQuery.$Properties} message GetProposalQuery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalQuery.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.blockNumber);
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.round);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetProposalQuery message, length delimited. Does not implicitly {@link getProposal.GetProposalQuery.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {getProposal.GetProposalQuery.$Properties} message GetProposalQuery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalQuery.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetProposalQuery message from the specified reader or buffer.
         * @function decode
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getProposal.GetProposalQuery & getProposal.GetProposalQuery.$Shape} GetProposalQuery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalQuery.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getProposal.GetProposalQuery(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.blockNumber = value;
                        else
                            delete message.blockNumber;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.round = value;
                        else
                            delete message.round;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetProposalQuery message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalQuery & getProposal.GetProposalQuery.$Shape} GetProposalQuery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalQuery.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetProposalQuery message.
         * @function verify
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetProposalQuery.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                if (!$util.isInteger(message.blockNumber))
                    return "blockNumber: integer expected";
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                if (!$util.isInteger(message.round))
                    return "round: integer expected";
            return null;
        };

        /**
         * Creates a GetProposalQuery message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {getProposal.GetProposalQuery} GetProposalQuery
         */
        GetProposalQuery.fromObject = function (object, _depth) {
            if (object instanceof $root.getProposal.GetProposalQuery)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getProposal.GetProposalQuery: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getProposal.GetProposalQuery();
            if (object.blockNumber != null)
                if ($Number(object.blockNumber) !== 0)
                    message.blockNumber = object.blockNumber >>> 0;
            if (object.round != null)
                if ($Number(object.round) !== 0)
                    message.round = object.round >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a GetProposalQuery message. Also converts values to other types if specified.
         * @function toObject
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {getProposal.GetProposalQuery} message GetProposalQuery
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetProposalQuery.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.blockNumber = 0;
                object.round = 0;
            }
            if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                object.blockNumber = message.blockNumber;
            if (message.round != null && $Object.hasOwnProperty.call(message, "round"))
                object.round = message.round;
            return object;
        };

        /**
         * Converts this GetProposalQuery to JSON.
         * @function toJSON
         * @memberof getProposal.GetProposalQuery
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetProposalQuery.prototype.toJSON = function() {
            return GetProposalQuery.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetProposalQuery
         * @function getTypeUrl
         * @memberof getProposal.GetProposalQuery
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetProposalQuery.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getProposal.GetProposalQuery";
        };

        return GetProposalQuery;
    })();

    getProposal.GetProposalRequest = (function() {

        /**
         * Properties of a GetProposalRequest.
         * @typedef {Object} getProposal.GetProposalRequest.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetProposalRequest headers
         * @property {getProposal.GetProposalQuery.$Properties|null} [query] GetProposalRequest query
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetProposalRequest.
         * @memberof getProposal
         * @interface IGetProposalRequest
         * @augments getProposal.GetProposalRequest.$Properties
         * @deprecated Use getProposal.GetProposalRequest.$Properties instead.
         */

        /**
         * Shape of a GetProposalRequest.
         * @typedef {getProposal.GetProposalRequest.$Properties} getProposal.GetProposalRequest.$Shape
         */

        /**
         * Constructs a new GetProposalRequest.
         * @memberof getProposal
         * @classdesc Represents a GetProposalRequest.
         * @constructor
         * @param {getProposal.GetProposalRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetProposalRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetProposalRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getProposal.GetProposalRequest
         * @instance
         */
        GetProposalRequest.prototype.headers = null;

        /**
         * GetProposalRequest query.
         * @member {getProposal.GetProposalQuery.$Properties|null|undefined} query
         * @memberof getProposal.GetProposalRequest
         * @instance
         */
        GetProposalRequest.prototype.query = null;

        /**
         * Creates a new GetProposalRequest instance using the specified properties.
         * @function create
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.GetProposalRequest.$Properties=} [properties] Properties to set
         * @returns {getProposal.GetProposalRequest} GetProposalRequest instance
         * @type {{
         *   (properties: getProposal.GetProposalRequest.$Shape): getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape;
         *   (properties?: getProposal.GetProposalRequest.$Properties): getProposal.GetProposalRequest;
         * }}
         */
        GetProposalRequest.create = function(properties) {
            return new GetProposalRequest(properties);
        };

        /**
         * Encodes the specified GetProposalRequest message. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @function encode
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.GetProposalRequest.$Properties} message GetProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.query != null && $Object.hasOwnProperty.call(message, "query"))
                $root.getProposal.GetProposalQuery.encode(message.query, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetProposalRequest message, length delimited. Does not implicitly {@link getProposal.GetProposalRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {getProposal.GetProposalRequest.$Properties} message GetProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape} GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getProposal.GetProposalRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.query = $root.getProposal.GetProposalQuery.decode(reader, reader.uint32(), $undefined, _depth + 1, message.query);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetProposalRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalRequest & getProposal.GetProposalRequest.$Shape} GetProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalRequest.decodeDelimited = function(reader) {
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
        GetProposalRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.query != null && $Object.hasOwnProperty.call(message, "query")) {
                let error = $root.getProposal.GetProposalQuery.verify(message.query, _depth + 1);
                if (error)
                    return "query." + error;
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
        GetProposalRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.getProposal.GetProposalRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getProposal.GetProposalRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getProposal.GetProposalRequest();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getProposal.GetProposalRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.query != null) {
                if (!$util.isObject(object.query))
                    throw $TypeError(".getProposal.GetProposalRequest.query: object expected");
                message.query = $root.getProposal.GetProposalQuery.fromObject(object.query, _depth + 1);
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
        GetProposalRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.headers = null;
                object.query = null;
            }
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.query != null && $Object.hasOwnProperty.call(message, "query"))
                object.query = $root.getProposal.GetProposalQuery.toObject(message.query, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetProposalRequest to JSON.
         * @function toJSON
         * @memberof getProposal.GetProposalRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetProposalRequest.prototype.toJSON = function() {
            return GetProposalRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetProposalRequest
         * @function getTypeUrl
         * @memberof getProposal.GetProposalRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetProposalRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getProposal.GetProposalRequest";
        };

        return GetProposalRequest;
    })();

    getProposal.GetProposalResponse = (function() {

        /**
         * Properties of a GetProposalResponse.
         * @typedef {Object} getProposal.GetProposalResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetProposalResponse headers
         * @property {Uint8Array|null} [proposal] GetProposalResponse proposal
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetProposalResponse.
         * @memberof getProposal
         * @interface IGetProposalResponse
         * @augments getProposal.GetProposalResponse.$Properties
         * @deprecated Use getProposal.GetProposalResponse.$Properties instead.
         */

        /**
         * Shape of a GetProposalResponse.
         * @typedef {getProposal.GetProposalResponse.$Properties} getProposal.GetProposalResponse.$Shape
         */

        /**
         * Constructs a new GetProposalResponse.
         * @memberof getProposal
         * @classdesc Represents a GetProposalResponse.
         * @constructor
         * @param {getProposal.GetProposalResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetProposalResponse = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetProposalResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
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
         * @param {getProposal.GetProposalResponse.$Properties=} [properties] Properties to set
         * @returns {getProposal.GetProposalResponse} GetProposalResponse instance
         * @type {{
         *   (properties: getProposal.GetProposalResponse.$Shape): getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape;
         *   (properties?: getProposal.GetProposalResponse.$Properties): getProposal.GetProposalResponse;
         * }}
         */
        GetProposalResponse.create = function(properties) {
            return new GetProposalResponse(properties);
        };

        /**
         * Encodes the specified GetProposalResponse message. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @function encode
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {getProposal.GetProposalResponse.$Properties} message GetProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.proposal != null && $Object.hasOwnProperty.call(message, "proposal"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.proposal);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetProposalResponse message, length delimited. Does not implicitly {@link getProposal.GetProposalResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {getProposal.GetProposalResponse.$Properties} message GetProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetProposalResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape} GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getProposal.GetProposalResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.proposal = value;
                        else
                            delete message.proposal;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetProposalResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getProposal.GetProposalResponse & getProposal.GetProposalResponse.$Shape} GetProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetProposalResponse.decodeDelimited = function(reader) {
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
        GetProposalResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.proposal != null && $Object.hasOwnProperty.call(message, "proposal"))
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
        GetProposalResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.getProposal.GetProposalResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getProposal.GetProposalResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getProposal.GetProposalResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getProposal.GetProposalResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.proposal != null)
                if (object.proposal.length)
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
        GetProposalResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.headers = null;
                if (options.bytes === $String)
                    object.proposal = "";
                else {
                    object.proposal = [];
                    if (options.bytes !== $Array)
                        object.proposal = $util.newBuffer(object.proposal);
                }
            }
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.proposal != null && $Object.hasOwnProperty.call(message, "proposal"))
                object.proposal = options.bytes === $String ? $util.base64.encode(message.proposal, 0, message.proposal.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.proposal) : message.proposal;
            return object;
        };

        /**
         * Converts this GetProposalResponse to JSON.
         * @function toJSON
         * @memberof getProposal.GetProposalResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetProposalResponse.prototype.toJSON = function() {
            return GetProposalResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetProposalResponse
         * @function getTypeUrl
         * @memberof getProposal.GetProposalResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetProposalResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getProposal.GetProposalResponse";
        };

        return GetProposalResponse;
    })();

    return getProposal;
})();

export const getStatus = $root.getStatus = (() => {

    /**
     * Namespace getStatus.
     * @exports getStatus
     * @namespace
     */
    const getStatus = {};

    getStatus.GetStatusRequest = (function() {

        /**
         * Properties of a GetStatusRequest.
         * @typedef {Object} getStatus.GetStatusRequest.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetStatusRequest headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetStatusRequest.
         * @memberof getStatus
         * @interface IGetStatusRequest
         * @augments getStatus.GetStatusRequest.$Properties
         * @deprecated Use getStatus.GetStatusRequest.$Properties instead.
         */

        /**
         * Shape of a GetStatusRequest.
         * @typedef {getStatus.GetStatusRequest.$Properties} getStatus.GetStatusRequest.$Shape
         */

        /**
         * Constructs a new GetStatusRequest.
         * @memberof getStatus
         * @classdesc Represents a GetStatusRequest.
         * @constructor
         * @param {getStatus.GetStatusRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetStatusRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetStatusRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getStatus.GetStatusRequest
         * @instance
         */
        GetStatusRequest.prototype.headers = null;

        /**
         * Creates a new GetStatusRequest instance using the specified properties.
         * @function create
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.GetStatusRequest.$Properties=} [properties] Properties to set
         * @returns {getStatus.GetStatusRequest} GetStatusRequest instance
         * @type {{
         *   (properties: getStatus.GetStatusRequest.$Shape): getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape;
         *   (properties?: getStatus.GetStatusRequest.$Properties): getStatus.GetStatusRequest;
         * }}
         */
        GetStatusRequest.create = function(properties) {
            return new GetStatusRequest(properties);
        };

        /**
         * Encodes the specified GetStatusRequest message. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @function encode
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.GetStatusRequest.$Properties} message GetStatusRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetStatusRequest message, length delimited. Does not implicitly {@link getStatus.GetStatusRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {getStatus.GetStatusRequest.$Properties} message GetStatusRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer.
         * @function decode
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape} GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetStatusRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getStatus.GetStatusRequest & getStatus.GetStatusRequest.$Shape} GetStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusRequest.decodeDelimited = function(reader) {
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
        GetStatusRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
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
        GetStatusRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.getStatus.GetStatusRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getStatus.GetStatusRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getStatus.GetStatusRequest();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getStatus.GetStatusRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
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
        GetStatusRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetStatusRequest to JSON.
         * @function toJSON
         * @memberof getStatus.GetStatusRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetStatusRequest.prototype.toJSON = function() {
            return GetStatusRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetStatusRequest
         * @function getTypeUrl
         * @memberof getStatus.GetStatusRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetStatusRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getStatus.GetStatusRequest";
        };

        return GetStatusRequest;
    })();

    getStatus.GetStatusResponse = (function() {

        /**
         * Properties of a GetStatusResponse.
         * @typedef {Object} getStatus.GetStatusResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] GetStatusResponse headers
         * @property {getStatus.GetStatusResponse.State.$Properties|null} [state] GetStatusResponse state
         * @property {getStatus.GetStatusResponse.Config.$Properties|null} [config] GetStatusResponse config
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GetStatusResponse.
         * @memberof getStatus
         * @interface IGetStatusResponse
         * @augments getStatus.GetStatusResponse.$Properties
         * @deprecated Use getStatus.GetStatusResponse.$Properties instead.
         */

        /**
         * Shape of a GetStatusResponse.
         * @typedef {getStatus.GetStatusResponse.$Properties} getStatus.GetStatusResponse.$Shape
         */

        /**
         * Constructs a new GetStatusResponse.
         * @memberof getStatus
         * @classdesc Represents a GetStatusResponse.
         * @constructor
         * @param {getStatus.GetStatusResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GetStatusResponse = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GetStatusResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof getStatus.GetStatusResponse
         * @instance
         */
        GetStatusResponse.prototype.headers = null;

        /**
         * GetStatusResponse state.
         * @member {getStatus.GetStatusResponse.State.$Properties|null|undefined} state
         * @memberof getStatus.GetStatusResponse
         * @instance
         */
        GetStatusResponse.prototype.state = null;

        /**
         * GetStatusResponse config.
         * @member {getStatus.GetStatusResponse.Config.$Properties|null|undefined} config
         * @memberof getStatus.GetStatusResponse
         * @instance
         */
        GetStatusResponse.prototype.config = null;

        /**
         * Creates a new GetStatusResponse instance using the specified properties.
         * @function create
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.GetStatusResponse.$Properties=} [properties] Properties to set
         * @returns {getStatus.GetStatusResponse} GetStatusResponse instance
         * @type {{
         *   (properties: getStatus.GetStatusResponse.$Shape): getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape;
         *   (properties?: getStatus.GetStatusResponse.$Properties): getStatus.GetStatusResponse;
         * }}
         */
        GetStatusResponse.create = function(properties) {
            return new GetStatusResponse(properties);
        };

        /**
         * Encodes the specified GetStatusResponse message. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @function encode
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.GetStatusResponse.$Properties} message GetStatusResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.state != null && $Object.hasOwnProperty.call(message, "state"))
                $root.getStatus.GetStatusResponse.State.encode(message.state, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.config != null && $Object.hasOwnProperty.call(message, "config"))
                $root.getStatus.GetStatusResponse.Config.encode(message.config, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GetStatusResponse message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {getStatus.GetStatusResponse.$Properties} message GetStatusResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetStatusResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer.
         * @function decode
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape} GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.state = $root.getStatus.GetStatusResponse.State.decode(reader, reader.uint32(), $undefined, _depth + 1, message.state);
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.config = $root.getStatus.GetStatusResponse.Config.decode(reader, reader.uint32(), $undefined, _depth + 1, message.config);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GetStatusResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {getStatus.GetStatusResponse & getStatus.GetStatusResponse.$Shape} GetStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetStatusResponse.decodeDelimited = function(reader) {
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
        GetStatusResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            if (message.state != null && $Object.hasOwnProperty.call(message, "state")) {
                let error = $root.getStatus.GetStatusResponse.State.verify(message.state, _depth + 1);
                if (error)
                    return "state." + error;
            }
            if (message.config != null && $Object.hasOwnProperty.call(message, "config")) {
                let error = $root.getStatus.GetStatusResponse.Config.verify(message.config, _depth + 1);
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
        GetStatusResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.getStatus.GetStatusResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".getStatus.GetStatusResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.getStatus.GetStatusResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".getStatus.GetStatusResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            if (object.state != null) {
                if (!$util.isObject(object.state))
                    throw $TypeError(".getStatus.GetStatusResponse.state: object expected");
                message.state = $root.getStatus.GetStatusResponse.State.fromObject(object.state, _depth + 1);
            }
            if (object.config != null) {
                if (!$util.isObject(object.config))
                    throw $TypeError(".getStatus.GetStatusResponse.config: object expected");
                message.config = $root.getStatus.GetStatusResponse.Config.fromObject(object.config, _depth + 1);
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
        GetStatusResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.headers = null;
                object.state = null;
                object.config = null;
            }
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            if (message.state != null && $Object.hasOwnProperty.call(message, "state"))
                object.state = $root.getStatus.GetStatusResponse.State.toObject(message.state, options, _depth + 1);
            if (message.config != null && $Object.hasOwnProperty.call(message, "config"))
                object.config = $root.getStatus.GetStatusResponse.Config.toObject(message.config, options, _depth + 1);
            return object;
        };

        /**
         * Converts this GetStatusResponse to JSON.
         * @function toJSON
         * @memberof getStatus.GetStatusResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetStatusResponse.prototype.toJSON = function() {
            return GetStatusResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GetStatusResponse
         * @function getTypeUrl
         * @memberof getStatus.GetStatusResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GetStatusResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/getStatus.GetStatusResponse";
        };

        GetStatusResponse.State = (function() {

            /**
             * Properties of a State.
             * @typedef {Object} getStatus.GetStatusResponse.State.$Properties
             * @property {number|null} [blockNumber] State blockNumber
             * @property {string|null} [blockHash] State blockHash
             * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
             */

            /**
             * Properties of a State.
             * @memberof getStatus.GetStatusResponse
             * @interface IState
             * @augments getStatus.GetStatusResponse.State.$Properties
             * @deprecated Use getStatus.GetStatusResponse.State.$Properties instead.
             */

            /**
             * Shape of a State.
             * @typedef {getStatus.GetStatusResponse.State.$Properties} getStatus.GetStatusResponse.State.$Shape
             */

            /**
             * Constructs a new State.
             * @memberof getStatus.GetStatusResponse
             * @classdesc Represents a State.
             * @constructor
             * @param {getStatus.GetStatusResponse.State.$Properties=} [properties] Properties to set
             * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
             */
            const State = function (properties) {
                if (properties)
                    for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            };

            /**
             * State blockNumber.
             * @member {number} blockNumber
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             */
            State.prototype.blockNumber = 0;

            /**
             * State blockHash.
             * @member {string} blockHash
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             */
            State.prototype.blockHash = "";

            /**
             * Creates a new State instance using the specified properties.
             * @function create
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.State.$Properties=} [properties] Properties to set
             * @returns {getStatus.GetStatusResponse.State} State instance
             * @type {{
             *   (properties: getStatus.GetStatusResponse.State.$Shape): getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape;
             *   (properties?: getStatus.GetStatusResponse.State.$Properties): getStatus.GetStatusResponse.State;
             * }}
             */
            State.create = function(properties) {
                return new State(properties);
            };

            /**
             * Encodes the specified State message. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @function encode
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.State.$Properties} message State message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            State.encode = function (message, writer, _depth) {
                if (!writer)
                    writer = $Writer.create();
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.blockNumber);
                if (message.blockHash != null && $Object.hasOwnProperty.call(message, "blockHash"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.blockHash);
                if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                    for (let i = 0; i < message.$unknowns.length; ++i)
                        writer.raw(message.$unknowns[i]);
                return writer;
            };

            /**
             * Encodes the specified State message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.State.verify|verify} messages.
             * @function encodeDelimited
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {getStatus.GetStatusResponse.State.$Properties} message State message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            State.encodeDelimited = function(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a State message from the specified reader or buffer.
             * @function decode
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape} State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            State.decode = function (reader, length, _end, _depth, _target) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $Reader.recursionLimit)
                    throw $Error("max depth exceeded");
                let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusResponse.State(), value;
                while (reader.pos < end) {
                    let start = reader.pos;
                    let tag = reader.tag();
                    if (tag === _end) {
                        _end = $undefined;
                        break;
                    }
                    let wireType = tag & 7;
                    switch (tag >>>= 3) {
                    case 1: {
                            if (wireType !== 0)
                                break;
                            if (value = reader.uint32())
                                message.blockNumber = value;
                            else
                                delete message.blockNumber;
                            continue;
                        }
                    case 2: {
                            if (wireType !== 2)
                                break;
                            if ((value = reader.stringVerify()).length)
                                message.blockHash = value;
                            else
                                delete message.blockHash;
                            continue;
                        }
                    }
                    reader.skipType(wireType, _depth, tag);
                    if (!reader.discardUnknown) {
                        $util.makeProp(message, "$unknowns", false);
                        (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                    }
                }
                if (_end !== $undefined)
                    throw $Error("missing end group");
                return message;
            };

            /**
             * Decodes a State message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {getStatus.GetStatusResponse.State & getStatus.GetStatusResponse.State.$Shape} State
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            State.decodeDelimited = function(reader) {
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
            State.verify = function (message, _depth) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    return "max depth exceeded";
                if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                    if (!$util.isInteger(message.blockNumber))
                        return "blockNumber: integer expected";
                if (message.blockHash != null && $Object.hasOwnProperty.call(message, "blockHash"))
                    if (!$util.isString(message.blockHash))
                        return "blockHash: string expected";
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
            State.fromObject = function (object, _depth) {
                if (object instanceof $root.getStatus.GetStatusResponse.State)
                    return object;
                if (!$util.isObject(object))
                    throw $TypeError(".getStatus.GetStatusResponse.State: object expected");
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                let message = new $root.getStatus.GetStatusResponse.State();
                if (object.blockNumber != null)
                    if ($Number(object.blockNumber) !== 0)
                        message.blockNumber = object.blockNumber >>> 0;
                if (object.blockHash != null)
                    if (typeof object.blockHash !== "string" || object.blockHash.length)
                        message.blockHash = $String(object.blockHash);
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
            State.toObject = function (message, options, _depth) {
                if (!options)
                    options = {};
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                let object = {};
                if (options.defaults) {
                    object.blockNumber = 0;
                    object.blockHash = "";
                }
                if (message.blockNumber != null && $Object.hasOwnProperty.call(message, "blockNumber"))
                    object.blockNumber = message.blockNumber;
                if (message.blockHash != null && $Object.hasOwnProperty.call(message, "blockHash"))
                    object.blockHash = message.blockHash;
                return object;
            };

            /**
             * Converts this State to JSON.
             * @function toJSON
             * @memberof getStatus.GetStatusResponse.State
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            State.prototype.toJSON = function() {
                return State.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the type url for State
             * @function getTypeUrl
             * @memberof getStatus.GetStatusResponse.State
             * @static
             * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns {string} The type url
             */
            State.getTypeUrl = function(prefix) {
                if (prefix === $undefined)
                    prefix = "type.googleapis.com";
                return prefix + "/getStatus.GetStatusResponse.State";
            };

            return State;
        })();

        GetStatusResponse.Config = (function() {

            /**
             * Properties of a Config.
             * @typedef {Object} getStatus.GetStatusResponse.Config.$Properties
             * @property {string|null} [version] Config version
             * @property {getStatus.GetStatusResponse.Config.Network.$Properties|null} [network] Config network
             * @property {Object.<string,getStatus.GetStatusResponse.Config.Plugin.$Properties>|null} [plugins] Config plugins
             * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
             */

            /**
             * Properties of a Config.
             * @memberof getStatus.GetStatusResponse
             * @interface IConfig
             * @augments getStatus.GetStatusResponse.Config.$Properties
             * @deprecated Use getStatus.GetStatusResponse.Config.$Properties instead.
             */

            /**
             * Shape of a Config.
             * @typedef {getStatus.GetStatusResponse.Config.$Properties} getStatus.GetStatusResponse.Config.$Shape
             */

            /**
             * Constructs a new Config.
             * @memberof getStatus.GetStatusResponse
             * @classdesc Represents a Config.
             * @constructor
             * @param {getStatus.GetStatusResponse.Config.$Properties=} [properties] Properties to set
             * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
             */
            const Config = function (properties) {
                this.plugins = {};
                if (properties)
                    for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            };

            /**
             * Config version.
             * @member {string} version
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             */
            Config.prototype.version = "";

            /**
             * Config network.
             * @member {getStatus.GetStatusResponse.Config.Network.$Properties|null|undefined} network
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             */
            Config.prototype.network = null;

            /**
             * Config plugins.
             * @member {Object.<string,getStatus.GetStatusResponse.Config.Plugin.$Properties>} plugins
             * @memberof getStatus.GetStatusResponse.Config
             * @instance
             */
            Config.prototype.plugins = $util.emptyObject;

            /**
             * Creates a new Config instance using the specified properties.
             * @function create
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.Config.$Properties=} [properties] Properties to set
             * @returns {getStatus.GetStatusResponse.Config} Config instance
             * @type {{
             *   (properties: getStatus.GetStatusResponse.Config.$Shape): getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape;
             *   (properties?: getStatus.GetStatusResponse.Config.$Properties): getStatus.GetStatusResponse.Config;
             * }}
             */
            Config.create = function(properties) {
                return new Config(properties);
            };

            /**
             * Encodes the specified Config message. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @function encode
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.Config.$Properties} message Config message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Config.encode = function (message, writer, _depth) {
                if (!writer)
                    writer = $Writer.create();
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.version);
                if (message.network != null && $Object.hasOwnProperty.call(message, "network"))
                    $root.getStatus.GetStatusResponse.Config.Network.encode(message.network, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
                if (message.plugins != null && $Object.hasOwnProperty.call(message, "plugins"))
                    for (let keys = $Object.keys(message.plugins), i = 0; i < keys.length; ++i) {
                        writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                        $root.getStatus.GetStatusResponse.Config.Plugin.encode(message.plugins[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim().ldelim();
                    }
                if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                    for (let i = 0; i < message.$unknowns.length; ++i)
                        writer.raw(message.$unknowns[i]);
                return writer;
            };

            /**
             * Encodes the specified Config message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.verify|verify} messages.
             * @function encodeDelimited
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {getStatus.GetStatusResponse.Config.$Properties} message Config message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Config.encodeDelimited = function(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a Config message from the specified reader or buffer.
             * @function decode
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape} Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Config.decode = function (reader, length, _end, _depth, _target) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $Reader.recursionLimit)
                    throw $Error("max depth exceeded");
                let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusResponse.Config(), key, value;
                while (reader.pos < end) {
                    let start = reader.pos;
                    let tag = reader.tag();
                    if (tag === _end) {
                        _end = $undefined;
                        break;
                    }
                    let wireType = tag & 7;
                    switch (tag >>>= 3) {
                    case 1: {
                            if (wireType !== 2)
                                break;
                            if ((value = reader.stringVerify()).length)
                                message.version = value;
                            else
                                delete message.version;
                            continue;
                        }
                    case 2: {
                            if (wireType !== 2)
                                break;
                            message.network = $root.getStatus.GetStatusResponse.Config.Network.decode(reader, reader.uint32(), $undefined, _depth + 1, message.network);
                            continue;
                        }
                    case 3: {
                            if (wireType !== 2)
                                break;
                            if (message.plugins === $util.emptyObject)
                                message.plugins = {};
                            let end2 = reader.uint32() + reader.pos;
                            key = "";
                            value = null;
                            while (reader.pos < end2) {
                                let tag2 = reader.tag();
                                wireType = tag2 & 7;
                                switch (tag2 >>>= 3) {
                                case 1:
                                    if (wireType !== 2)
                                        break;
                                    key = reader.stringVerify();
                                    continue;
                                case 2:
                                    if (wireType !== 2)
                                        break;
                                    value = $root.getStatus.GetStatusResponse.Config.Plugin.decode(reader, reader.uint32(), $undefined, _depth + 1);
                                    continue;
                                }
                                reader.skipType(wireType, _depth, tag2);
                            }
                            if (key === "__proto__")
                                $util.makeProp(message.plugins, key);
                            message.plugins[key] = value || new $root.getStatus.GetStatusResponse.Config.Plugin();
                            continue;
                        }
                    }
                    reader.skipType(wireType, _depth, tag);
                    if (!reader.discardUnknown) {
                        $util.makeProp(message, "$unknowns", false);
                        (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                    }
                }
                if (_end !== $undefined)
                    throw $Error("missing end group");
                return message;
            };

            /**
             * Decodes a Config message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {getStatus.GetStatusResponse.Config & getStatus.GetStatusResponse.Config.$Shape} Config
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Config.decodeDelimited = function(reader) {
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
            Config.verify = function (message, _depth) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    return "max depth exceeded";
                if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                    if (!$util.isString(message.version))
                        return "version: string expected";
                if (message.network != null && $Object.hasOwnProperty.call(message, "network")) {
                    let error = $root.getStatus.GetStatusResponse.Config.Network.verify(message.network, _depth + 1);
                    if (error)
                        return "network." + error;
                }
                if (message.plugins != null && $Object.hasOwnProperty.call(message, "plugins")) {
                    if (!$util.isObject(message.plugins))
                        return "plugins: object expected";
                    let key = $Object.keys(message.plugins);
                    for (let i = 0; i < key.length; ++i) {
                        let error = $root.getStatus.GetStatusResponse.Config.Plugin.verify(message.plugins[key[i]], _depth + 1);
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
            Config.fromObject = function (object, _depth) {
                if (object instanceof $root.getStatus.GetStatusResponse.Config)
                    return object;
                if (!$util.isObject(object))
                    throw $TypeError(".getStatus.GetStatusResponse.Config: object expected");
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                let message = new $root.getStatus.GetStatusResponse.Config();
                if (object.version != null)
                    if (typeof object.version !== "string" || object.version.length)
                        message.version = $String(object.version);
                if (object.network != null) {
                    if (!$util.isObject(object.network))
                        throw $TypeError(".getStatus.GetStatusResponse.Config.network: object expected");
                    message.network = $root.getStatus.GetStatusResponse.Config.Network.fromObject(object.network, _depth + 1);
                }
                if (object.plugins) {
                    if (!$util.isObject(object.plugins))
                        throw $TypeError(".getStatus.GetStatusResponse.Config.plugins: object expected");
                    message.plugins = {};
                    for (let keys = $Object.keys(object.plugins), i = 0; i < keys.length; ++i) {
                        if (keys[i] === "__proto__")
                            $util.makeProp(message.plugins, keys[i]);
                        if (!$util.isObject(object.plugins[keys[i]]))
                            throw $TypeError(".getStatus.GetStatusResponse.Config.plugins: object expected");
                        message.plugins[keys[i]] = $root.getStatus.GetStatusResponse.Config.Plugin.fromObject(object.plugins[keys[i]], _depth + 1);
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
            Config.toObject = function (message, options, _depth) {
                if (!options)
                    options = {};
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                let object = {};
                if (options.objects || options.defaults)
                    object.plugins = {};
                if (options.defaults) {
                    object.version = "";
                    object.network = null;
                }
                if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                    object.version = message.version;
                if (message.network != null && $Object.hasOwnProperty.call(message, "network"))
                    object.network = $root.getStatus.GetStatusResponse.Config.Network.toObject(message.network, options, _depth + 1);
                let keys2;
                if (message.plugins && (keys2 = $Object.keys(message.plugins)).length) {
                    object.plugins = {};
                    for (let j = 0; j < keys2.length; ++j) {
                        if (keys2[j] === "__proto__")
                            $util.makeProp(object.plugins, keys2[j]);
                        object.plugins[keys2[j]] = $root.getStatus.GetStatusResponse.Config.Plugin.toObject(message.plugins[keys2[j]], options, _depth + 1);
                    }
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
            Config.prototype.toJSON = function() {
                return Config.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the type url for Config
             * @function getTypeUrl
             * @memberof getStatus.GetStatusResponse.Config
             * @static
             * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns {string} The type url
             */
            Config.getTypeUrl = function(prefix) {
                if (prefix === $undefined)
                    prefix = "type.googleapis.com";
                return prefix + "/getStatus.GetStatusResponse.Config";
            };

            Config.Network = (function() {

                /**
                 * Properties of a Network.
                 * @typedef {Object} getStatus.GetStatusResponse.Config.Network.$Properties
                 * @property {string|null} [name] Network name
                 * @property {string|null} [nethash] Network nethash
                 * @property {string|null} [explorer] Network explorer
                 * @property {getStatus.GetStatusResponse.Config.Network.Token.$Properties|null} [token] Network token
                 * @property {number|null} [version] Network version
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a Network.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @interface INetwork
                 * @augments getStatus.GetStatusResponse.Config.Network.$Properties
                 * @deprecated Use getStatus.GetStatusResponse.Config.Network.$Properties instead.
                 */

                /**
                 * Shape of a Network.
                 * @typedef {getStatus.GetStatusResponse.Config.Network.$Properties} getStatus.GetStatusResponse.Config.Network.$Shape
                 */

                /**
                 * Constructs a new Network.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @classdesc Represents a Network.
                 * @constructor
                 * @param {getStatus.GetStatusResponse.Config.Network.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const Network = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

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
                 * @member {getStatus.GetStatusResponse.Config.Network.Token.$Properties|null|undefined} token
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
                 * @param {getStatus.GetStatusResponse.Config.Network.$Properties=} [properties] Properties to set
                 * @returns {getStatus.GetStatusResponse.Config.Network} Network instance
                 * @type {{
                 *   (properties: getStatus.GetStatusResponse.Config.Network.$Shape): getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape;
                 *   (properties?: getStatus.GetStatusResponse.Config.Network.$Properties): getStatus.GetStatusResponse.Config.Network;
                 * }}
                 */
                Network.create = function(properties) {
                    return new Network(properties);
                };

                /**
                 * Encodes the specified Network message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @function encode
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.Network.$Properties} message Network message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Network.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                    if (message.nethash != null && $Object.hasOwnProperty.call(message, "nethash"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.nethash);
                    if (message.explorer != null && $Object.hasOwnProperty.call(message, "explorer"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.explorer);
                    if (message.token != null && $Object.hasOwnProperty.call(message, "token"))
                        $root.getStatus.GetStatusResponse.Config.Network.Token.encode(message.token, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.version);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified Network message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.Network.$Properties} message Network message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Network.encodeDelimited = function(message, writer) {
                    return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
                };

                /**
                 * Decodes a Network message from the specified reader or buffer.
                 * @function decode
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape} Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Network.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusResponse.Config.Network(), value;
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.name = value;
                                else
                                    delete message.name;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.nethash = value;
                                else
                                    delete message.nethash;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.explorer = value;
                                else
                                    delete message.explorer;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.token = $root.getStatus.GetStatusResponse.Config.Network.Token.decode(reader, reader.uint32(), $undefined, _depth + 1, message.token);
                                continue;
                            }
                        case 5: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.version = value;
                                else
                                    delete message.version;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a Network message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.Config.Network & getStatus.GetStatusResponse.Config.Network.$Shape} Network
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Network.decodeDelimited = function(reader) {
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
                Network.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        if (!$util.isString(message.name))
                            return "name: string expected";
                    if (message.nethash != null && $Object.hasOwnProperty.call(message, "nethash"))
                        if (!$util.isString(message.nethash))
                            return "nethash: string expected";
                    if (message.explorer != null && $Object.hasOwnProperty.call(message, "explorer"))
                        if (!$util.isString(message.explorer))
                            return "explorer: string expected";
                    if (message.token != null && $Object.hasOwnProperty.call(message, "token")) {
                        let error = $root.getStatus.GetStatusResponse.Config.Network.Token.verify(message.token, _depth + 1);
                        if (error)
                            return "token." + error;
                    }
                    if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
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
                Network.fromObject = function (object, _depth) {
                    if (object instanceof $root.getStatus.GetStatusResponse.Config.Network)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".getStatus.GetStatusResponse.Config.Network: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.getStatus.GetStatusResponse.Config.Network();
                    if (object.name != null)
                        if (typeof object.name !== "string" || object.name.length)
                            message.name = $String(object.name);
                    if (object.nethash != null)
                        if (typeof object.nethash !== "string" || object.nethash.length)
                            message.nethash = $String(object.nethash);
                    if (object.explorer != null)
                        if (typeof object.explorer !== "string" || object.explorer.length)
                            message.explorer = $String(object.explorer);
                    if (object.token != null) {
                        if (!$util.isObject(object.token))
                            throw $TypeError(".getStatus.GetStatusResponse.Config.Network.token: object expected");
                        message.token = $root.getStatus.GetStatusResponse.Config.Network.Token.fromObject(object.token, _depth + 1);
                    }
                    if (object.version != null)
                        if ($Number(object.version) !== 0)
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
                Network.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.name = "";
                        object.nethash = "";
                        object.explorer = "";
                        object.token = null;
                        object.version = 0;
                    }
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        object.name = message.name;
                    if (message.nethash != null && $Object.hasOwnProperty.call(message, "nethash"))
                        object.nethash = message.nethash;
                    if (message.explorer != null && $Object.hasOwnProperty.call(message, "explorer"))
                        object.explorer = message.explorer;
                    if (message.token != null && $Object.hasOwnProperty.call(message, "token"))
                        object.token = $root.getStatus.GetStatusResponse.Config.Network.Token.toObject(message.token, options, _depth + 1);
                    if (message.version != null && $Object.hasOwnProperty.call(message, "version"))
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
                Network.prototype.toJSON = function() {
                    return Network.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the type url for Network
                 * @function getTypeUrl
                 * @memberof getStatus.GetStatusResponse.Config.Network
                 * @static
                 * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns {string} The type url
                 */
                Network.getTypeUrl = function(prefix) {
                    if (prefix === $undefined)
                        prefix = "type.googleapis.com";
                    return prefix + "/getStatus.GetStatusResponse.Config.Network";
                };

                Network.Token = (function() {

                    /**
                     * Properties of a Token.
                     * @typedef {Object} getStatus.GetStatusResponse.Config.Network.Token.$Properties
                     * @property {string|null} [name] Token name
                     * @property {string|null} [symbol] Token symbol
                     * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                     */

                    /**
                     * Properties of a Token.
                     * @memberof getStatus.GetStatusResponse.Config.Network
                     * @interface IToken
                     * @augments getStatus.GetStatusResponse.Config.Network.Token.$Properties
                     * @deprecated Use getStatus.GetStatusResponse.Config.Network.Token.$Properties instead.
                     */

                    /**
                     * Shape of a Token.
                     * @typedef {getStatus.GetStatusResponse.Config.Network.Token.$Properties} getStatus.GetStatusResponse.Config.Network.Token.$Shape
                     */

                    /**
                     * Constructs a new Token.
                     * @memberof getStatus.GetStatusResponse.Config.Network
                     * @classdesc Represents a Token.
                     * @constructor
                     * @param {getStatus.GetStatusResponse.Config.Network.Token.$Properties=} [properties] Properties to set
                     * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                     */
                    const Token = function (properties) {
                        if (properties)
                            for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                    this[keys[i]] = properties[keys[i]];
                    };

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
                     * @param {getStatus.GetStatusResponse.Config.Network.Token.$Properties=} [properties] Properties to set
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token} Token instance
                     * @type {{
                     *   (properties: getStatus.GetStatusResponse.Config.Network.Token.$Shape): getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape;
                     *   (properties?: getStatus.GetStatusResponse.Config.Network.Token.$Properties): getStatus.GetStatusResponse.Config.Network.Token;
                     * }}
                     */
                    Token.create = function(properties) {
                        return new Token(properties);
                    };

                    /**
                     * Encodes the specified Token message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @function encode
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {getStatus.GetStatusResponse.Config.Network.Token.$Properties} message Token message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Token.encode = function (message, writer, _depth) {
                        if (!writer)
                            writer = $Writer.create();
                        if (_depth === $undefined)
                            _depth = 0;
                        if (_depth > $util.recursionLimit)
                            throw $Error("max depth exceeded");
                        if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                            writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                        if (message.symbol != null && $Object.hasOwnProperty.call(message, "symbol"))
                            writer.uint32(/* id 2, wireType 2 =*/18).string(message.symbol);
                        if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                            for (let i = 0; i < message.$unknowns.length; ++i)
                                writer.raw(message.$unknowns[i]);
                        return writer;
                    };

                    /**
                     * Encodes the specified Token message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Network.Token.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {getStatus.GetStatusResponse.Config.Network.Token.$Properties} message Token message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Token.encodeDelimited = function(message, writer) {
                        return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
                    };

                    /**
                     * Decodes a Token message from the specified reader or buffer.
                     * @function decode
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape} Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Token.decode = function (reader, length, _end, _depth, _target) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        if (_depth === $undefined)
                            _depth = 0;
                        if (_depth > $Reader.recursionLimit)
                            throw $Error("max depth exceeded");
                        let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusResponse.Config.Network.Token(), value;
                        while (reader.pos < end) {
                            let start = reader.pos;
                            let tag = reader.tag();
                            if (tag === _end) {
                                _end = $undefined;
                                break;
                            }
                            let wireType = tag & 7;
                            switch (tag >>>= 3) {
                            case 1: {
                                    if (wireType !== 2)
                                        break;
                                    if ((value = reader.stringVerify()).length)
                                        message.name = value;
                                    else
                                        delete message.name;
                                    continue;
                                }
                            case 2: {
                                    if (wireType !== 2)
                                        break;
                                    if ((value = reader.stringVerify()).length)
                                        message.symbol = value;
                                    else
                                        delete message.symbol;
                                    continue;
                                }
                            }
                            reader.skipType(wireType, _depth, tag);
                            if (!reader.discardUnknown) {
                                $util.makeProp(message, "$unknowns", false);
                                (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                            }
                        }
                        if (_end !== $undefined)
                            throw $Error("missing end group");
                        return message;
                    };

                    /**
                     * Decodes a Token message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {getStatus.GetStatusResponse.Config.Network.Token & getStatus.GetStatusResponse.Config.Network.Token.$Shape} Token
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Token.decodeDelimited = function(reader) {
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
                    Token.verify = function (message, _depth) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (_depth === $undefined)
                            _depth = 0;
                        if (_depth > $util.recursionLimit)
                            return "max depth exceeded";
                        if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                            if (!$util.isString(message.name))
                                return "name: string expected";
                        if (message.symbol != null && $Object.hasOwnProperty.call(message, "symbol"))
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
                    Token.fromObject = function (object, _depth) {
                        if (object instanceof $root.getStatus.GetStatusResponse.Config.Network.Token)
                            return object;
                        if (!$util.isObject(object))
                            throw $TypeError(".getStatus.GetStatusResponse.Config.Network.Token: object expected");
                        if (_depth === $undefined)
                            _depth = 0;
                        if (_depth > $util.recursionLimit)
                            throw $Error("max depth exceeded");
                        let message = new $root.getStatus.GetStatusResponse.Config.Network.Token();
                        if (object.name != null)
                            if (typeof object.name !== "string" || object.name.length)
                                message.name = $String(object.name);
                        if (object.symbol != null)
                            if (typeof object.symbol !== "string" || object.symbol.length)
                                message.symbol = $String(object.symbol);
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
                    Token.toObject = function (message, options, _depth) {
                        if (!options)
                            options = {};
                        if (_depth === $undefined)
                            _depth = 0;
                        if (_depth > $util.recursionLimit)
                            throw $Error("max depth exceeded");
                        let object = {};
                        if (options.defaults) {
                            object.name = "";
                            object.symbol = "";
                        }
                        if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                            object.name = message.name;
                        if (message.symbol != null && $Object.hasOwnProperty.call(message, "symbol"))
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
                    Token.prototype.toJSON = function() {
                        return Token.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    /**
                     * Gets the type url for Token
                     * @function getTypeUrl
                     * @memberof getStatus.GetStatusResponse.Config.Network.Token
                     * @static
                     * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                     * @returns {string} The type url
                     */
                    Token.getTypeUrl = function(prefix) {
                        if (prefix === $undefined)
                            prefix = "type.googleapis.com";
                        return prefix + "/getStatus.GetStatusResponse.Config.Network.Token";
                    };

                    return Token;
                })();

                return Network;
            })();

            Config.Plugin = (function() {

                /**
                 * Properties of a Plugin.
                 * @typedef {Object} getStatus.GetStatusResponse.Config.Plugin.$Properties
                 * @property {number|null} [port] Plugin port
                 * @property {boolean|null} [enabled] Plugin enabled
                 * @property {boolean|null} [estimateTotalCount] Plugin estimateTotalCount
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a Plugin.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @interface IPlugin
                 * @augments getStatus.GetStatusResponse.Config.Plugin.$Properties
                 * @deprecated Use getStatus.GetStatusResponse.Config.Plugin.$Properties instead.
                 */

                /**
                 * Shape of a Plugin.
                 * @typedef {getStatus.GetStatusResponse.Config.Plugin.$Properties} getStatus.GetStatusResponse.Config.Plugin.$Shape
                 */

                /**
                 * Constructs a new Plugin.
                 * @memberof getStatus.GetStatusResponse.Config
                 * @classdesc Represents a Plugin.
                 * @constructor
                 * @param {getStatus.GetStatusResponse.Config.Plugin.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const Plugin = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

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
                 * @param {getStatus.GetStatusResponse.Config.Plugin.$Properties=} [properties] Properties to set
                 * @returns {getStatus.GetStatusResponse.Config.Plugin} Plugin instance
                 * @type {{
                 *   (properties: getStatus.GetStatusResponse.Config.Plugin.$Shape): getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape;
                 *   (properties?: getStatus.GetStatusResponse.Config.Plugin.$Properties): getStatus.GetStatusResponse.Config.Plugin;
                 * }}
                 */
                Plugin.create = function(properties) {
                    return new Plugin(properties);
                };

                /**
                 * Encodes the specified Plugin message. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @function encode
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.Plugin.$Properties} message Plugin message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Plugin.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.port != null && $Object.hasOwnProperty.call(message, "port"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.port);
                    if (message.enabled != null && $Object.hasOwnProperty.call(message, "enabled"))
                        writer.uint32(/* id 2, wireType 0 =*/16).bool(message.enabled);
                    if (message.estimateTotalCount != null && $Object.hasOwnProperty.call(message, "estimateTotalCount"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.estimateTotalCount);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified Plugin message, length delimited. Does not implicitly {@link getStatus.GetStatusResponse.Config.Plugin.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {getStatus.GetStatusResponse.Config.Plugin.$Properties} message Plugin message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Plugin.encodeDelimited = function(message, writer) {
                    return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
                };

                /**
                 * Decodes a Plugin message from the specified reader or buffer.
                 * @function decode
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape} Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Plugin.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.getStatus.GetStatusResponse.Config.Plugin(), value;
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.port = value;
                                else
                                    delete message.port;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.bool())
                                    message.enabled = value;
                                else
                                    delete message.enabled;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.bool())
                                    message.estimateTotalCount = value;
                                else
                                    delete message.estimateTotalCount;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a Plugin message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {getStatus.GetStatusResponse.Config.Plugin & getStatus.GetStatusResponse.Config.Plugin.$Shape} Plugin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Plugin.decodeDelimited = function(reader) {
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
                Plugin.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.port != null && $Object.hasOwnProperty.call(message, "port"))
                        if (!$util.isInteger(message.port))
                            return "port: integer expected";
                    if (message.enabled != null && $Object.hasOwnProperty.call(message, "enabled"))
                        if (typeof message.enabled !== "boolean")
                            return "enabled: boolean expected";
                    if (message.estimateTotalCount != null && $Object.hasOwnProperty.call(message, "estimateTotalCount"))
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
                Plugin.fromObject = function (object, _depth) {
                    if (object instanceof $root.getStatus.GetStatusResponse.Config.Plugin)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".getStatus.GetStatusResponse.Config.Plugin: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.getStatus.GetStatusResponse.Config.Plugin();
                    if (object.port != null)
                        if ($Number(object.port) !== 0)
                            message.port = object.port >>> 0;
                    if (object.enabled != null)
                        if (object.enabled)
                            message.enabled = $Boolean(object.enabled);
                    if (object.estimateTotalCount != null)
                        if (object.estimateTotalCount)
                            message.estimateTotalCount = $Boolean(object.estimateTotalCount);
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
                Plugin.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.port = 0;
                        object.enabled = false;
                        object.estimateTotalCount = false;
                    }
                    if (message.port != null && $Object.hasOwnProperty.call(message, "port"))
                        object.port = message.port;
                    if (message.enabled != null && $Object.hasOwnProperty.call(message, "enabled"))
                        object.enabled = message.enabled;
                    if (message.estimateTotalCount != null && $Object.hasOwnProperty.call(message, "estimateTotalCount"))
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
                Plugin.prototype.toJSON = function() {
                    return Plugin.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the type url for Plugin
                 * @function getTypeUrl
                 * @memberof getStatus.GetStatusResponse.Config.Plugin
                 * @static
                 * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns {string} The type url
                 */
                Plugin.getTypeUrl = function(prefix) {
                    if (prefix === $undefined)
                        prefix = "type.googleapis.com";
                    return prefix + "/getStatus.GetStatusResponse.Config.Plugin";
                };

                return Plugin;
            })();

            return Config;
        })();

        return GetStatusResponse;
    })();

    return getStatus;
})();

export const postMessage = $root.postMessage = (() => {

    /**
     * Namespace postMessage.
     * @exports postMessage
     * @namespace
     */
    const postMessage = {};

    postMessage.PostMessageRequest = (function() {

        /**
         * Properties of a PostMessageRequest.
         * @typedef {Object} postMessage.PostMessageRequest.$Properties
         * @property {Uint8Array|null} [message] PostMessageRequest message
         * @property {shared.Headers.$Properties|null} [headers] PostMessageRequest headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PostMessageRequest.
         * @memberof postMessage
         * @interface IPostMessageRequest
         * @augments postMessage.PostMessageRequest.$Properties
         * @deprecated Use postMessage.PostMessageRequest.$Properties instead.
         */

        /**
         * Shape of a PostMessageRequest.
         * @typedef {postMessage.PostMessageRequest.$Properties} postMessage.PostMessageRequest.$Shape
         */

        /**
         * Constructs a new PostMessageRequest.
         * @memberof postMessage
         * @classdesc Represents a PostMessageRequest.
         * @constructor
         * @param {postMessage.PostMessageRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PostMessageRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PostMessageRequest message.
         * @member {Uint8Array} message
         * @memberof postMessage.PostMessageRequest
         * @instance
         */
        PostMessageRequest.prototype.message = $util.newBuffer([]);

        /**
         * PostMessageRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof postMessage.PostMessageRequest
         * @instance
         */
        PostMessageRequest.prototype.headers = null;

        /**
         * Creates a new PostMessageRequest instance using the specified properties.
         * @function create
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {postMessage.PostMessageRequest.$Properties=} [properties] Properties to set
         * @returns {postMessage.PostMessageRequest} PostMessageRequest instance
         * @type {{
         *   (properties: postMessage.PostMessageRequest.$Shape): postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape;
         *   (properties?: postMessage.PostMessageRequest.$Properties): postMessage.PostMessageRequest;
         * }}
         */
        PostMessageRequest.create = function(properties) {
            return new PostMessageRequest(properties);
        };

        /**
         * Encodes the specified PostMessageRequest message. Does not implicitly {@link postMessage.PostMessageRequest.verify|verify} messages.
         * @function encode
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {postMessage.PostMessageRequest.$Properties} message PostMessageRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostMessageRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.message);
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PostMessageRequest message, length delimited. Does not implicitly {@link postMessage.PostMessageRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {postMessage.PostMessageRequest.$Properties} message PostMessageRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostMessageRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a PostMessageRequest message from the specified reader or buffer.
         * @function decode
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape} PostMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostMessageRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.postMessage.PostMessageRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.message = value;
                        else
                            delete message.message;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PostMessageRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postMessage.PostMessageRequest & postMessage.PostMessageRequest.$Shape} PostMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostMessageRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostMessageRequest message.
         * @function verify
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostMessageRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                if (!(message.message && typeof message.message.length === "number" || $util.isString(message.message)))
                    return "message: buffer expected";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostMessageRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postMessage.PostMessageRequest} PostMessageRequest
         */
        PostMessageRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.postMessage.PostMessageRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".postMessage.PostMessageRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.postMessage.PostMessageRequest();
            if (object.message != null)
                if (object.message.length)
                    if (typeof object.message === "string")
                        $util.base64.decode(object.message, message.message = $util.newBuffer($util.base64.length(object.message)), 0);
                    else if (object.message.length >= 0)
                        message.message = object.message;
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".postMessage.PostMessageRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostMessageRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {postMessage.PostMessageRequest} message PostMessageRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostMessageRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if (options.bytes === $String)
                    object.message = "";
                else {
                    object.message = [];
                    if (options.bytes !== $Array)
                        object.message = $util.newBuffer(object.message);
                }
                object.headers = null;
            }
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                object.message = options.bytes === $String ? $util.base64.encode(message.message, 0, message.message.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.message) : message.message;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this PostMessageRequest to JSON.
         * @function toJSON
         * @memberof postMessage.PostMessageRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostMessageRequest.prototype.toJSON = function() {
            return PostMessageRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PostMessageRequest
         * @function getTypeUrl
         * @memberof postMessage.PostMessageRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PostMessageRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/postMessage.PostMessageRequest";
        };

        return PostMessageRequest;
    })();

    postMessage.PostMessageResponse = (function() {

        /**
         * Properties of a PostMessageResponse.
         * @typedef {Object} postMessage.PostMessageResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] PostMessageResponse headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PostMessageResponse.
         * @memberof postMessage
         * @interface IPostMessageResponse
         * @augments postMessage.PostMessageResponse.$Properties
         * @deprecated Use postMessage.PostMessageResponse.$Properties instead.
         */

        /**
         * Shape of a PostMessageResponse.
         * @typedef {postMessage.PostMessageResponse.$Properties} postMessage.PostMessageResponse.$Shape
         */

        /**
         * Constructs a new PostMessageResponse.
         * @memberof postMessage
         * @classdesc Represents a PostMessageResponse.
         * @constructor
         * @param {postMessage.PostMessageResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PostMessageResponse = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PostMessageResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof postMessage.PostMessageResponse
         * @instance
         */
        PostMessageResponse.prototype.headers = null;

        /**
         * Creates a new PostMessageResponse instance using the specified properties.
         * @function create
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {postMessage.PostMessageResponse.$Properties=} [properties] Properties to set
         * @returns {postMessage.PostMessageResponse} PostMessageResponse instance
         * @type {{
         *   (properties: postMessage.PostMessageResponse.$Shape): postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape;
         *   (properties?: postMessage.PostMessageResponse.$Properties): postMessage.PostMessageResponse;
         * }}
         */
        PostMessageResponse.create = function(properties) {
            return new PostMessageResponse(properties);
        };

        /**
         * Encodes the specified PostMessageResponse message. Does not implicitly {@link postMessage.PostMessageResponse.verify|verify} messages.
         * @function encode
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {postMessage.PostMessageResponse.$Properties} message PostMessageResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostMessageResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PostMessageResponse message, length delimited. Does not implicitly {@link postMessage.PostMessageResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {postMessage.PostMessageResponse.$Properties} message PostMessageResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostMessageResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a PostMessageResponse message from the specified reader or buffer.
         * @function decode
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape} PostMessageResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostMessageResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.postMessage.PostMessageResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PostMessageResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postMessage.PostMessageResponse & postMessage.PostMessageResponse.$Shape} PostMessageResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostMessageResponse.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PostMessageResponse message.
         * @function verify
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PostMessageResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
                if (error)
                    return "headers." + error;
            }
            return null;
        };

        /**
         * Creates a PostMessageResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {postMessage.PostMessageResponse} PostMessageResponse
         */
        PostMessageResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.postMessage.PostMessageResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".postMessage.PostMessageResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.postMessage.PostMessageResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".postMessage.PostMessageResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a PostMessageResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {postMessage.PostMessageResponse} message PostMessageResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PostMessageResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this PostMessageResponse to JSON.
         * @function toJSON
         * @memberof postMessage.PostMessageResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostMessageResponse.prototype.toJSON = function() {
            return PostMessageResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PostMessageResponse
         * @function getTypeUrl
         * @memberof postMessage.PostMessageResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PostMessageResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/postMessage.PostMessageResponse";
        };

        return PostMessageResponse;
    })();

    return postMessage;
})();

export const postProposal = $root.postProposal = (() => {

    /**
     * Namespace postProposal.
     * @exports postProposal
     * @namespace
     */
    const postProposal = {};

    postProposal.PostProposalRequest = (function() {

        /**
         * Properties of a PostProposalRequest.
         * @typedef {Object} postProposal.PostProposalRequest.$Properties
         * @property {Uint8Array|null} [proposal] PostProposalRequest proposal
         * @property {shared.Headers.$Properties|null} [headers] PostProposalRequest headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PostProposalRequest.
         * @memberof postProposal
         * @interface IPostProposalRequest
         * @augments postProposal.PostProposalRequest.$Properties
         * @deprecated Use postProposal.PostProposalRequest.$Properties instead.
         */

        /**
         * Shape of a PostProposalRequest.
         * @typedef {postProposal.PostProposalRequest.$Properties} postProposal.PostProposalRequest.$Shape
         */

        /**
         * Constructs a new PostProposalRequest.
         * @memberof postProposal
         * @classdesc Represents a PostProposalRequest.
         * @constructor
         * @param {postProposal.PostProposalRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PostProposalRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PostProposalRequest proposal.
         * @member {Uint8Array} proposal
         * @memberof postProposal.PostProposalRequest
         * @instance
         */
        PostProposalRequest.prototype.proposal = $util.newBuffer([]);

        /**
         * PostProposalRequest headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof postProposal.PostProposalRequest
         * @instance
         */
        PostProposalRequest.prototype.headers = null;

        /**
         * Creates a new PostProposalRequest instance using the specified properties.
         * @function create
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.PostProposalRequest.$Properties=} [properties] Properties to set
         * @returns {postProposal.PostProposalRequest} PostProposalRequest instance
         * @type {{
         *   (properties: postProposal.PostProposalRequest.$Shape): postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape;
         *   (properties?: postProposal.PostProposalRequest.$Properties): postProposal.PostProposalRequest;
         * }}
         */
        PostProposalRequest.create = function(properties) {
            return new PostProposalRequest(properties);
        };

        /**
         * Encodes the specified PostProposalRequest message. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @function encode
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.PostProposalRequest.$Properties} message PostProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.proposal != null && $Object.hasOwnProperty.call(message, "proposal"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.proposal);
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PostProposalRequest message, length delimited. Does not implicitly {@link postProposal.PostProposalRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {postProposal.PostProposalRequest.$Properties} message PostProposalRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer.
         * @function decode
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape} PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.postProposal.PostProposalRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.proposal = value;
                        else
                            delete message.proposal;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PostProposalRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postProposal.PostProposalRequest & postProposal.PostProposalRequest.$Shape} PostProposalRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalRequest.decodeDelimited = function(reader) {
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
        PostProposalRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.proposal != null && $Object.hasOwnProperty.call(message, "proposal"))
                if (!(message.proposal && typeof message.proposal.length === "number" || $util.isString(message.proposal)))
                    return "proposal: buffer expected";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
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
        PostProposalRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.postProposal.PostProposalRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".postProposal.PostProposalRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.postProposal.PostProposalRequest();
            if (object.proposal != null)
                if (object.proposal.length)
                    if (typeof object.proposal === "string")
                        $util.base64.decode(object.proposal, message.proposal = $util.newBuffer($util.base64.length(object.proposal)), 0);
                    else if (object.proposal.length >= 0)
                        message.proposal = object.proposal;
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".postProposal.PostProposalRequest.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
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
        PostProposalRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if (options.bytes === $String)
                    object.proposal = "";
                else {
                    object.proposal = [];
                    if (options.bytes !== $Array)
                        object.proposal = $util.newBuffer(object.proposal);
                }
                object.headers = null;
            }
            if (message.proposal != null && $Object.hasOwnProperty.call(message, "proposal"))
                object.proposal = options.bytes === $String ? $util.base64.encode(message.proposal, 0, message.proposal.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.proposal) : message.proposal;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this PostProposalRequest to JSON.
         * @function toJSON
         * @memberof postProposal.PostProposalRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostProposalRequest.prototype.toJSON = function() {
            return PostProposalRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PostProposalRequest
         * @function getTypeUrl
         * @memberof postProposal.PostProposalRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PostProposalRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/postProposal.PostProposalRequest";
        };

        return PostProposalRequest;
    })();

    postProposal.PostProposalResponse = (function() {

        /**
         * Properties of a PostProposalResponse.
         * @typedef {Object} postProposal.PostProposalResponse.$Properties
         * @property {shared.Headers.$Properties|null} [headers] PostProposalResponse headers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PostProposalResponse.
         * @memberof postProposal
         * @interface IPostProposalResponse
         * @augments postProposal.PostProposalResponse.$Properties
         * @deprecated Use postProposal.PostProposalResponse.$Properties instead.
         */

        /**
         * Shape of a PostProposalResponse.
         * @typedef {postProposal.PostProposalResponse.$Properties} postProposal.PostProposalResponse.$Shape
         */

        /**
         * Constructs a new PostProposalResponse.
         * @memberof postProposal
         * @classdesc Represents a PostProposalResponse.
         * @constructor
         * @param {postProposal.PostProposalResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PostProposalResponse = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PostProposalResponse headers.
         * @member {shared.Headers.$Properties|null|undefined} headers
         * @memberof postProposal.PostProposalResponse
         * @instance
         */
        PostProposalResponse.prototype.headers = null;

        /**
         * Creates a new PostProposalResponse instance using the specified properties.
         * @function create
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.PostProposalResponse.$Properties=} [properties] Properties to set
         * @returns {postProposal.PostProposalResponse} PostProposalResponse instance
         * @type {{
         *   (properties: postProposal.PostProposalResponse.$Shape): postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape;
         *   (properties?: postProposal.PostProposalResponse.$Properties): postProposal.PostProposalResponse;
         * }}
         */
        PostProposalResponse.create = function(properties) {
            return new PostProposalResponse(properties);
        };

        /**
         * Encodes the specified PostProposalResponse message. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @function encode
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.PostProposalResponse.$Properties} message PostProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                $root.shared.Headers.encode(message.headers, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PostProposalResponse message, length delimited. Does not implicitly {@link postProposal.PostProposalResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {postProposal.PostProposalResponse.$Properties} message PostProposalResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PostProposalResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer.
         * @function decode
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape} PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.postProposal.PostProposalResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.headers = $root.shared.Headers.decode(reader, reader.uint32(), $undefined, _depth + 1, message.headers);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PostProposalResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {postProposal.PostProposalResponse & postProposal.PostProposalResponse.$Shape} PostProposalResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PostProposalResponse.decodeDelimited = function(reader) {
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
        PostProposalResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers")) {
                let error = $root.shared.Headers.verify(message.headers, _depth + 1);
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
        PostProposalResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.postProposal.PostProposalResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".postProposal.PostProposalResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.postProposal.PostProposalResponse();
            if (object.headers != null) {
                if (!$util.isObject(object.headers))
                    throw $TypeError(".postProposal.PostProposalResponse.headers: object expected");
                message.headers = $root.shared.Headers.fromObject(object.headers, _depth + 1);
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
        PostProposalResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.headers = null;
            if (message.headers != null && $Object.hasOwnProperty.call(message, "headers"))
                object.headers = $root.shared.Headers.toObject(message.headers, options, _depth + 1);
            return object;
        };

        /**
         * Converts this PostProposalResponse to JSON.
         * @function toJSON
         * @memberof postProposal.PostProposalResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PostProposalResponse.prototype.toJSON = function() {
            return PostProposalResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PostProposalResponse
         * @function getTypeUrl
         * @memberof postProposal.PostProposalResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PostProposalResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/postProposal.PostProposalResponse";
        };

        return PostProposalResponse;
    })();

    return postProposal;
})();

export {
  $root as default
};
