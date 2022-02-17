import * as $protobuf from "protobufjs";
/** Namespace blocks. */
export namespace blocks {
	/** Properties of a PostBlockRequest. */
	interface IPostBlockRequest {
		/** PostBlockRequest block */
		block?: Uint8Array | null;

		/** PostBlockRequest headers */
		headers?: shared.IHeaders | null;
	}

	/** Represents a PostBlockRequest. */
	class PostBlockRequest implements IPostBlockRequest {
		constructor(properties?: blocks.IPostBlockRequest);

		/** PostBlockRequest block. */
		public block: Uint8Array;

		/** PostBlockRequest headers. */
		public headers?: shared.IHeaders | null;

		public static create(properties?: blocks.IPostBlockRequest): blocks.PostBlockRequest;

		public static encode(message: blocks.IPostBlockRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: blocks.IPostBlockRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): blocks.PostBlockRequest;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): blocks.PostBlockRequest;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): blocks.PostBlockRequest;

		public static toObject(
			message: blocks.PostBlockRequest,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a PostBlockResponse. */
	interface IPostBlockResponse {
		/** PostBlockResponse status */
		status?: boolean | null;

		/** PostBlockResponse height */
		height?: number | null;
	}

	/** Represents a PostBlockResponse. */
	class PostBlockResponse implements IPostBlockResponse {
		constructor(properties?: blocks.IPostBlockResponse);

		/** PostBlockResponse status. */
		public status: boolean;

		/** PostBlockResponse height. */
		public height: number;

		public static create(properties?: blocks.IPostBlockResponse): blocks.PostBlockResponse;

		public static encode(message: blocks.IPostBlockResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: blocks.IPostBlockResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): blocks.PostBlockResponse;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): blocks.PostBlockResponse;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): blocks.PostBlockResponse;

		public static toObject(
			message: blocks.PostBlockResponse,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a GetBlocksRequest. */
	interface IGetBlocksRequest {
		/** GetBlocksRequest lastBlockHeight */
		lastBlockHeight?: number | null;

		/** GetBlocksRequest blockLimit */
		blockLimit?: number | null;

		/** GetBlocksRequest headersOnly */
		headersOnly?: boolean | null;

		/** GetBlocksRequest serialized */
		serialized?: boolean | null;

		/** GetBlocksRequest headers */
		headers?: shared.IHeaders | null;
	}

	/** Represents a GetBlocksRequest. */
	class GetBlocksRequest implements IGetBlocksRequest {
		constructor(properties?: blocks.IGetBlocksRequest);

		/** GetBlocksRequest lastBlockHeight. */
		public lastBlockHeight: number;

		/** GetBlocksRequest blockLimit. */
		public blockLimit: number;

		/** GetBlocksRequest headersOnly. */
		public headersOnly: boolean;

		/** GetBlocksRequest serialized. */
		public serialized: boolean;

		/** GetBlocksRequest headers. */
		public headers?: shared.IHeaders | null;

		public static create(properties?: blocks.IGetBlocksRequest): blocks.GetBlocksRequest;

		public static encode(message: blocks.IGetBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: blocks.IGetBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): blocks.GetBlocksRequest;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): blocks.GetBlocksRequest;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): blocks.GetBlocksRequest;

		public static toObject(
			message: blocks.GetBlocksRequest,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a GetBlocksResponse. */
	interface IGetBlocksResponse {
		/** GetBlocksResponse blocks */
		blocks?: Uint8Array | null;
	}

	/** Represents a GetBlocksResponse. */
	class GetBlocksResponse implements IGetBlocksResponse {
		constructor(properties?: blocks.IGetBlocksResponse);

		/** GetBlocksResponse blocks. */
		public blocks: Uint8Array;

		public static create(properties?: blocks.IGetBlocksResponse): blocks.GetBlocksResponse;

		public static encode(message: blocks.IGetBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: blocks.IGetBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): blocks.GetBlocksResponse;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): blocks.GetBlocksResponse;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): blocks.GetBlocksResponse;

		public static toObject(
			message: blocks.GetBlocksResponse,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	namespace GetBlocksResponse {
		/** Properties of a BlockHeader. */
		interface IBlockHeader {
			/** BlockHeader id */
			id?: string | null;

			/** BlockHeader idHex */
			idHex?: string | null;

			/** BlockHeader version */
			version?: number | null;

			/** BlockHeader timestamp */
			timestamp?: number | null;

			/** BlockHeader previousBlock */
			previousBlock?: string | null;

			/** BlockHeader previousBlockHex */
			previousBlockHex?: string | null;

			/** BlockHeader height */
			height?: number | null;

			/** BlockHeader numberOfTransactions */
			numberOfTransactions?: number | null;

			/** BlockHeader totalAmount */
			totalAmount?: string | null;

			/** BlockHeader totalFee */
			totalFee?: string | null;

			/** BlockHeader reward */
			reward?: string | null;

			/** BlockHeader payloadLength */
			payloadLength?: number | null;

			/** BlockHeader payloadHash */
			payloadHash?: string | null;

			/** BlockHeader generatorPublicKey */
			generatorPublicKey?: string | null;

			/** BlockHeader blockSignature */
			blockSignature?: string | null;

			/** BlockHeader transactions */
			transactions?: Uint8Array | null;
		}

		/** Represents a BlockHeader. */
		class BlockHeader implements IBlockHeader {
			constructor(properties?: blocks.GetBlocksResponse.IBlockHeader);

			/** BlockHeader id. */
			public id: string;

			/** BlockHeader idHex. */
			public idHex: string;

			/** BlockHeader version. */
			public version: number;

			/** BlockHeader timestamp. */
			public timestamp: number;

			/** BlockHeader previousBlock. */
			public previousBlock: string;

			/** BlockHeader previousBlockHex. */
			public previousBlockHex: string;

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

			/** BlockHeader transactions. */
			public transactions: Uint8Array;

			public static create(
				properties?: blocks.GetBlocksResponse.IBlockHeader,
			): blocks.GetBlocksResponse.BlockHeader;

			public static encode(
				message: blocks.GetBlocksResponse.IBlockHeader,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static encodeDelimited(
				message: blocks.GetBlocksResponse.IBlockHeader,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static decode(
				reader: $protobuf.Reader | Uint8Array,
				length?: number,
			): blocks.GetBlocksResponse.BlockHeader;

			public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): blocks.GetBlocksResponse.BlockHeader;

			public static verify(message: { [k: string]: any }): string | null;

			public static fromObject(object: { [k: string]: any }): blocks.GetBlocksResponse.BlockHeader;

			public static toObject(
				message: blocks.GetBlocksResponse.BlockHeader,
				options?: $protobuf.IConversionOptions,
			): { [k: string]: any };

			public toJSON(): { [k: string]: any };
		}
	}
}

/** Namespace peer. */
export namespace peer {
	/** Properties of a GetPeersRequest. */
	interface IGetPeersRequest {
		/** GetPeersRequest headers */
		headers?: shared.IHeaders | null;
	}

	/** Represents a GetPeersRequest. */
	class GetPeersRequest implements IGetPeersRequest {
		constructor(properties?: peer.IGetPeersRequest);

		/** GetPeersRequest headers. */
		public headers?: shared.IHeaders | null;

		public static create(properties?: peer.IGetPeersRequest): peer.GetPeersRequest;

		public static encode(message: peer.IGetPeersRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: peer.IGetPeersRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetPeersRequest;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetPeersRequest;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): peer.GetPeersRequest;

		public static toObject(
			message: peer.GetPeersRequest,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a GetPeersResponse. */
	interface IGetPeersResponse {
		/** GetPeersResponse peers */
		peers?: peer.GetPeersResponse.IPeer[] | null;
	}

	/** Represents a GetPeersResponse. */
	class GetPeersResponse implements IGetPeersResponse {
		constructor(properties?: peer.IGetPeersResponse);

		/** GetPeersResponse peers. */
		public peers: peer.GetPeersResponse.IPeer[];

		public static create(properties?: peer.IGetPeersResponse): peer.GetPeersResponse;

		public static encode(message: peer.IGetPeersResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: peer.IGetPeersResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetPeersResponse;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetPeersResponse;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): peer.GetPeersResponse;

		public static toObject(
			message: peer.GetPeersResponse,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	namespace GetPeersResponse {
		/** Properties of a Peer. */
		interface IPeer {
			/** Peer ip */
			ip?: string | null;

			/** Peer port */
			port?: number | null;
		}

		/** Represents a Peer. */
		class Peer implements IPeer {
			constructor(properties?: peer.GetPeersResponse.IPeer);

			/** Peer ip. */
			public ip: string;

			/** Peer port. */
			public port: number;

			public static create(properties?: peer.GetPeersResponse.IPeer): peer.GetPeersResponse.Peer;

			public static encode(message: peer.GetPeersResponse.IPeer, writer?: $protobuf.Writer): $protobuf.Writer;

			public static encodeDelimited(
				message: peer.GetPeersResponse.IPeer,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetPeersResponse.Peer;

			public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetPeersResponse.Peer;

			public static verify(message: { [k: string]: any }): string | null;

			public static fromObject(object: { [k: string]: any }): peer.GetPeersResponse.Peer;

			public static toObject(
				message: peer.GetPeersResponse.Peer,
				options?: $protobuf.IConversionOptions,
			): { [k: string]: any };

			public toJSON(): { [k: string]: any };
		}
	}

	/** Properties of a GetCommonBlocksRequest. */
	interface IGetCommonBlocksRequest {
		/** GetCommonBlocksRequest ids */
		ids?: string[] | null;

		/** GetCommonBlocksRequest headers */
		headers?: shared.IHeaders | null;
	}

	/** Represents a GetCommonBlocksRequest. */
	class GetCommonBlocksRequest implements IGetCommonBlocksRequest {
		constructor(properties?: peer.IGetCommonBlocksRequest);

		/** GetCommonBlocksRequest ids. */
		public ids: string[];

		/** GetCommonBlocksRequest headers. */
		public headers?: shared.IHeaders | null;

		public static create(properties?: peer.IGetCommonBlocksRequest): peer.GetCommonBlocksRequest;

		public static encode(message: peer.IGetCommonBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(
			message: peer.IGetCommonBlocksRequest,
			writer?: $protobuf.Writer,
		): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetCommonBlocksRequest;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetCommonBlocksRequest;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): peer.GetCommonBlocksRequest;

		public static toObject(
			message: peer.GetCommonBlocksRequest,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a GetCommonBlocksResponse. */
	interface IGetCommonBlocksResponse {
		/** GetCommonBlocksResponse common */
		common?: peer.GetCommonBlocksResponse.ICommon | null;
	}

	/** Represents a GetCommonBlocksResponse. */
	class GetCommonBlocksResponse implements IGetCommonBlocksResponse {
		constructor(properties?: peer.IGetCommonBlocksResponse);

		/** GetCommonBlocksResponse common. */
		public common?: peer.GetCommonBlocksResponse.ICommon | null;

		public static create(properties?: peer.IGetCommonBlocksResponse): peer.GetCommonBlocksResponse;

		public static encode(message: peer.IGetCommonBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(
			message: peer.IGetCommonBlocksResponse,
			writer?: $protobuf.Writer,
		): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetCommonBlocksResponse;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetCommonBlocksResponse;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): peer.GetCommonBlocksResponse;

		public static toObject(
			message: peer.GetCommonBlocksResponse,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	namespace GetCommonBlocksResponse {
		/** Properties of a Common. */
		interface ICommon {
			/** Common height */
			height?: number | null;

			/** Common id */
			id?: string | null;
		}

		/** Represents a Common. */
		class Common implements ICommon {
			constructor(properties?: peer.GetCommonBlocksResponse.ICommon);

			/** Common height. */
			public height: number;

			/** Common id. */
			public id: string;

			public static create(
				properties?: peer.GetCommonBlocksResponse.ICommon,
			): peer.GetCommonBlocksResponse.Common;

			public static encode(
				message: peer.GetCommonBlocksResponse.ICommon,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static encodeDelimited(
				message: peer.GetCommonBlocksResponse.ICommon,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static decode(
				reader: $protobuf.Reader | Uint8Array,
				length?: number,
			): peer.GetCommonBlocksResponse.Common;

			public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetCommonBlocksResponse.Common;

			public static verify(message: { [k: string]: any }): string | null;

			public static fromObject(object: { [k: string]: any }): peer.GetCommonBlocksResponse.Common;

			public static toObject(
				message: peer.GetCommonBlocksResponse.Common,
				options?: $protobuf.IConversionOptions,
			): { [k: string]: any };

			public toJSON(): { [k: string]: any };
		}
	}

	/** Properties of a GetStatusRequest. */
	interface IGetStatusRequest {
		/** GetStatusRequest headers */
		headers?: shared.IHeaders | null;
	}

	/** Represents a GetStatusRequest. */
	class GetStatusRequest implements IGetStatusRequest {
		constructor(properties?: peer.IGetStatusRequest);

		/** GetStatusRequest headers. */
		public headers?: shared.IHeaders | null;

		public static create(properties?: peer.IGetStatusRequest): peer.GetStatusRequest;

		public static encode(message: peer.IGetStatusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: peer.IGetStatusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetStatusRequest;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetStatusRequest;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): peer.GetStatusRequest;

		public static toObject(
			message: peer.GetStatusRequest,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a GetStatusResponse. */
	interface IGetStatusResponse {
		/** GetStatusResponse state */
		state?: peer.GetStatusResponse.IState | null;

		/** GetStatusResponse config */
		config?: peer.GetStatusResponse.IConfig | null;
	}

	/** Represents a GetStatusResponse. */
	class GetStatusResponse implements IGetStatusResponse {
		constructor(properties?: peer.IGetStatusResponse);

		/** GetStatusResponse state. */
		public state?: peer.GetStatusResponse.IState | null;

		/** GetStatusResponse config. */
		public config?: peer.GetStatusResponse.IConfig | null;

		public static create(properties?: peer.IGetStatusResponse): peer.GetStatusResponse;

		public static encode(message: peer.IGetStatusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: peer.IGetStatusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetStatusResponse;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetStatusResponse;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse;

		public static toObject(
			message: peer.GetStatusResponse,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	namespace GetStatusResponse {
		/** Properties of a State. */
		interface IState {
			/** State height */
			height?: number | null;

			/** State forgingAllowed */
			forgingAllowed?: boolean | null;

			/** State currentSlot */
			currentSlot?: number | null;

			/** State header */
			header?: peer.GetStatusResponse.State.IBlockHeader | null;
		}

		/** Represents a State. */
		class State implements IState {
			constructor(properties?: peer.GetStatusResponse.IState);

			/** State height. */
			public height: number;

			/** State forgingAllowed. */
			public forgingAllowed: boolean;

			/** State currentSlot. */
			public currentSlot: number;

			/** State header. */
			public header?: peer.GetStatusResponse.State.IBlockHeader | null;

			public static create(properties?: peer.GetStatusResponse.IState): peer.GetStatusResponse.State;

			public static encode(message: peer.GetStatusResponse.IState, writer?: $protobuf.Writer): $protobuf.Writer;

			public static encodeDelimited(
				message: peer.GetStatusResponse.IState,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetStatusResponse.State;

			public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetStatusResponse.State;

			public static verify(message: { [k: string]: any }): string | null;

			public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse.State;

			public static toObject(
				message: peer.GetStatusResponse.State,
				options?: $protobuf.IConversionOptions,
			): { [k: string]: any };

			public toJSON(): { [k: string]: any };
		}

		namespace State {
			/** Properties of a BlockHeader. */
			interface IBlockHeader {
				/** BlockHeader id */
				id?: string | null;

				/** BlockHeader idHex */
				idHex?: string | null;

				/** BlockHeader version */
				version?: number | null;

				/** BlockHeader timestamp */
				timestamp?: number | null;

				/** BlockHeader previousBlock */
				previousBlock?: string | null;

				/** BlockHeader previousBlockHex */
				previousBlockHex?: string | null;

				/** BlockHeader height */
				height?: number | null;

				/** BlockHeader numberOfTransactions */
				numberOfTransactions?: number | null;

				/** BlockHeader totalAmount */
				totalAmount?: string | null;

				/** BlockHeader totalFee */
				totalFee?: string | null;

				/** BlockHeader reward */
				reward?: string | null;

				/** BlockHeader payloadLength */
				payloadLength?: number | null;

				/** BlockHeader payloadHash */
				payloadHash?: string | null;

				/** BlockHeader generatorPublicKey */
				generatorPublicKey?: string | null;

				/** BlockHeader blockSignature */
				blockSignature?: string | null;
			}

			/** Represents a BlockHeader. */
			class BlockHeader implements IBlockHeader {
				constructor(properties?: peer.GetStatusResponse.State.IBlockHeader);

				/** BlockHeader id. */
				public id: string;

				/** BlockHeader idHex. */
				public idHex: string;

				/** BlockHeader version. */
				public version: number;

				/** BlockHeader timestamp. */
				public timestamp: number;

				/** BlockHeader previousBlock. */
				public previousBlock: string;

				/** BlockHeader previousBlockHex. */
				public previousBlockHex: string;

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

				public static create(
					properties?: peer.GetStatusResponse.State.IBlockHeader,
				): peer.GetStatusResponse.State.BlockHeader;

				public static encode(
					message: peer.GetStatusResponse.State.IBlockHeader,
					writer?: $protobuf.Writer,
				): $protobuf.Writer;

				public static encodeDelimited(
					message: peer.GetStatusResponse.State.IBlockHeader,
					writer?: $protobuf.Writer,
				): $protobuf.Writer;

				public static decode(
					reader: $protobuf.Reader | Uint8Array,
					length?: number,
				): peer.GetStatusResponse.State.BlockHeader;

				public static decodeDelimited(
					reader: $protobuf.Reader | Uint8Array,
				): peer.GetStatusResponse.State.BlockHeader;

				public static verify(message: { [k: string]: any }): string | null;

				public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse.State.BlockHeader;

				public static toObject(
					message: peer.GetStatusResponse.State.BlockHeader,
					options?: $protobuf.IConversionOptions,
				): { [k: string]: any };

				public toJSON(): { [k: string]: any };
			}
		}

		/** Properties of a Config. */
		interface IConfig {
			/** Config version */
			version?: string | null;

			/** Config network */
			network?: peer.GetStatusResponse.Config.INetwork | null;

			/** Config plugins */
			plugins?: { [k: string]: peer.GetStatusResponse.Config.IPlugin } | null;
		}

		/** Represents a Config. */
		class Config implements IConfig {
			constructor(properties?: peer.GetStatusResponse.IConfig);

			/** Config version. */
			public version: string;

			/** Config network. */
			public network?: peer.GetStatusResponse.Config.INetwork | null;

			/** Config plugins. */
			public plugins: { [k: string]: peer.GetStatusResponse.Config.IPlugin };

			public static create(properties?: peer.GetStatusResponse.IConfig): peer.GetStatusResponse.Config;

			public static encode(message: peer.GetStatusResponse.IConfig, writer?: $protobuf.Writer): $protobuf.Writer;

			public static encodeDelimited(
				message: peer.GetStatusResponse.IConfig,
				writer?: $protobuf.Writer,
			): $protobuf.Writer;

			public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): peer.GetStatusResponse.Config;

			public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): peer.GetStatusResponse.Config;

			public static verify(message: { [k: string]: any }): string | null;

			public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse.Config;

			public static toObject(
				message: peer.GetStatusResponse.Config,
				options?: $protobuf.IConversionOptions,
			): { [k: string]: any };

			public toJSON(): { [k: string]: any };
		}

		namespace Config {
			/** Properties of a Network. */
			interface INetwork {
				/** Network name */
				name?: string | null;

				/** Network nethash */
				nethash?: string | null;

				/** Network explorer */
				explorer?: string | null;

				/** Network token */
				token?: peer.GetStatusResponse.Config.Network.IToken | null;

				/** Network version */
				version?: number | null;
			}

			/** Represents a Network. */
			class Network implements INetwork {
				constructor(properties?: peer.GetStatusResponse.Config.INetwork);

				/** Network name. */
				public name: string;

				/** Network nethash. */
				public nethash: string;

				/** Network explorer. */
				public explorer: string;

				/** Network token. */
				public token?: peer.GetStatusResponse.Config.Network.IToken | null;

				/** Network version. */
				public version: number;

				public static create(
					properties?: peer.GetStatusResponse.Config.INetwork,
				): peer.GetStatusResponse.Config.Network;

				public static encode(
					message: peer.GetStatusResponse.Config.INetwork,
					writer?: $protobuf.Writer,
				): $protobuf.Writer;

				public static encodeDelimited(
					message: peer.GetStatusResponse.Config.INetwork,
					writer?: $protobuf.Writer,
				): $protobuf.Writer;

				public static decode(
					reader: $protobuf.Reader | Uint8Array,
					length?: number,
				): peer.GetStatusResponse.Config.Network;

				public static decodeDelimited(
					reader: $protobuf.Reader | Uint8Array,
				): peer.GetStatusResponse.Config.Network;

				public static verify(message: { [k: string]: any }): string | null;

				public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse.Config.Network;

				public static toObject(
					message: peer.GetStatusResponse.Config.Network,
					options?: $protobuf.IConversionOptions,
				): { [k: string]: any };

				public toJSON(): { [k: string]: any };
			}

			namespace Network {
				/** Properties of a Token. */
				interface IToken {
					/** Token name */
					name?: string | null;

					/** Token symbol */
					symbol?: string | null;
				}

				/** Represents a Token. */
				class Token implements IToken {
					constructor(properties?: peer.GetStatusResponse.Config.Network.IToken);

					/** Token name. */
					public name: string;

					/** Token symbol. */
					public symbol: string;

					public static create(
						properties?: peer.GetStatusResponse.Config.Network.IToken,
					): peer.GetStatusResponse.Config.Network.Token;

					public static encode(
						message: peer.GetStatusResponse.Config.Network.IToken,
						writer?: $protobuf.Writer,
					): $protobuf.Writer;

					public static encodeDelimited(
						message: peer.GetStatusResponse.Config.Network.IToken,
						writer?: $protobuf.Writer,
					): $protobuf.Writer;

					public static decode(
						reader: $protobuf.Reader | Uint8Array,
						length?: number,
					): peer.GetStatusResponse.Config.Network.Token;

					public static decodeDelimited(
						reader: $protobuf.Reader | Uint8Array,
					): peer.GetStatusResponse.Config.Network.Token;

					public static verify(message: { [k: string]: any }): string | null;

					public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse.Config.Network.Token;

					public static toObject(
						message: peer.GetStatusResponse.Config.Network.Token,
						options?: $protobuf.IConversionOptions,
					): { [k: string]: any };

					public toJSON(): { [k: string]: any };
				}
			}

			/** Properties of a Plugin. */
			interface IPlugin {
				/** Plugin port */
				port?: number | null;

				/** Plugin enabled */
				enabled?: boolean | null;

				/** Plugin estimateTotalCount */
				estimateTotalCount?: boolean | null;
			}

			/** Represents a Plugin. */
			class Plugin implements IPlugin {
				constructor(properties?: peer.GetStatusResponse.Config.IPlugin);

				/** Plugin port. */
				public port: number;

				/** Plugin enabled. */
				public enabled: boolean;

				/** Plugin estimateTotalCount. */
				public estimateTotalCount: boolean;

				public static create(
					properties?: peer.GetStatusResponse.Config.IPlugin,
				): peer.GetStatusResponse.Config.Plugin;

				public static encode(
					message: peer.GetStatusResponse.Config.IPlugin,
					writer?: $protobuf.Writer,
				): $protobuf.Writer;

				public static encodeDelimited(
					message: peer.GetStatusResponse.Config.IPlugin,
					writer?: $protobuf.Writer,
				): $protobuf.Writer;

				public static decode(
					reader: $protobuf.Reader | Uint8Array,
					length?: number,
				): peer.GetStatusResponse.Config.Plugin;

				public static decodeDelimited(
					reader: $protobuf.Reader | Uint8Array,
				): peer.GetStatusResponse.Config.Plugin;

				public static verify(message: { [k: string]: any }): string | null;

				public static fromObject(object: { [k: string]: any }): peer.GetStatusResponse.Config.Plugin;

				public static toObject(
					message: peer.GetStatusResponse.Config.Plugin,
					options?: $protobuf.IConversionOptions,
				): { [k: string]: any };

				public toJSON(): { [k: string]: any };
			}
		}
	}
}

/** Namespace shared. */
export namespace shared {
	/** Properties of a Headers. */
	interface IHeaders {
		/** Headers version */
		version?: string | null;
	}

	/** Represents a Headers. */
	class Headers implements IHeaders {
		constructor(properties?: shared.IHeaders);

		/** Headers version. */
		public version: string;

		public static create(properties?: shared.IHeaders): shared.Headers;

		public static encode(message: shared.IHeaders, writer?: $protobuf.Writer): $protobuf.Writer;

		public static encodeDelimited(message: shared.IHeaders, writer?: $protobuf.Writer): $protobuf.Writer;

		public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): shared.Headers;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): shared.Headers;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): shared.Headers;

		public static toObject(message: shared.Headers, options?: $protobuf.IConversionOptions): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}
}

/** Namespace transactions. */
export namespace transactions {
	/** Properties of a PostTransactionsRequest. */
	interface IPostTransactionsRequest {
		/** PostTransactionsRequest transactions */
		transactions?: Uint8Array | null;

		/** PostTransactionsRequest headers */
		headers?: shared.IHeaders | null;
	}

	/** Represents a PostTransactionsRequest. */
	class PostTransactionsRequest implements IPostTransactionsRequest {
		constructor(properties?: transactions.IPostTransactionsRequest);

		/** PostTransactionsRequest transactions. */
		public transactions: Uint8Array;

		/** PostTransactionsRequest headers. */
		public headers?: shared.IHeaders | null;

		public static create(properties?: transactions.IPostTransactionsRequest): transactions.PostTransactionsRequest;

		public static encode(
			message: transactions.IPostTransactionsRequest,
			writer?: $protobuf.Writer,
		): $protobuf.Writer;

		public static encodeDelimited(
			message: transactions.IPostTransactionsRequest,
			writer?: $protobuf.Writer,
		): $protobuf.Writer;

		public static decode(
			reader: $protobuf.Reader | Uint8Array,
			length?: number,
		): transactions.PostTransactionsRequest;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): transactions.PostTransactionsRequest;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): transactions.PostTransactionsRequest;

		public static toObject(
			message: transactions.PostTransactionsRequest,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}

	/** Properties of a PostTransactionsResponse. */
	interface IPostTransactionsResponse {
		/** PostTransactionsResponse accept */
		accept?: string[] | null;
	}

	/** Represents a PostTransactionsResponse. */
	class PostTransactionsResponse implements IPostTransactionsResponse {
		constructor(properties?: transactions.IPostTransactionsResponse);

		/** PostTransactionsResponse accept. */
		public accept: string[];

		public static create(
			properties?: transactions.IPostTransactionsResponse,
		): transactions.PostTransactionsResponse;

		public static encode(
			message: transactions.IPostTransactionsResponse,
			writer?: $protobuf.Writer,
		): $protobuf.Writer;

		public static encodeDelimited(
			message: transactions.IPostTransactionsResponse,
			writer?: $protobuf.Writer,
		): $protobuf.Writer;

		public static decode(
			reader: $protobuf.Reader | Uint8Array,
			length?: number,
		): transactions.PostTransactionsResponse;

		public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): transactions.PostTransactionsResponse;

		public static verify(message: { [k: string]: any }): string | null;

		public static fromObject(object: { [k: string]: any }): transactions.PostTransactionsResponse;

		public static toObject(
			message: transactions.PostTransactionsResponse,
			options?: $protobuf.IConversionOptions,
		): { [k: string]: any };

		public toJSON(): { [k: string]: any };
	}
}
