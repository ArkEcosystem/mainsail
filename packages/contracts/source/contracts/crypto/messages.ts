import { IBlock } from "./block";
import { IKeyPair } from "./identities";

export interface IProposalData {
	height: number;
	round: number;
	validRound?: number;
	block: { serialized: string };
	validatorIndex: number;
	signature: string;
}

export interface IProposal {
	height: number;
	round: number;
	validRound?: number;
	block: IBlock;
	validatorIndex: number;
	signature: string;
	toString(): string;
	// toData(): IProposalData;
}

export interface IPrevoteData {
	height: number;
	round: number;
	blockId?: string;
	validatorIndex: number;
	signature: string;
}

export interface IPrevote {
	height: number;
	round: number;
	blockId?: string;
	validatorIndex: number;
	signature: string;
	toString(): string;
	// toData(): IPrevoteData;
}

export interface IPrecommitData {
	height: number;
	round: number;
	blockId?: string;
	validatorIndex: number;
	signature: string;
}

export interface IPrecommit {
	height: number;
	round: number;
	blockId?: string;
	validatorIndex: number;
	signature: string;
	toString(): string;
	// toData(): IPrecommitData;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type IMakeProposalData = WithoutSignature<IProposalData & { block: IBlock }>;
export type IMakePrevoteData = WithoutSignature<IPrevoteData>;
export type IMakePrecommitData = WithoutSignature<IPrecommitData>;

export interface IMessageFactory {
	makeProposal(data: IMakeProposalData, keyPair: IKeyPair): Promise<IProposal>;
	makePrevote(data: IMakePrevoteData, keyPair: IKeyPair): Promise<IPrevote>;
	makePrecommit(data: IMakePrecommitData, keyPair: IKeyPair): Promise<IPrecommit>;
}

export interface IMessageSerializeOptions {
	excludeSignature?: boolean;
}
export interface IMessageSerializeProposalOptions extends IMessageSerializeOptions {}
export interface IMessageSerializePrevoteOptions extends IMessageSerializeOptions {}
export interface IMessageSerializePrecommitOptions extends IMessageSerializeOptions {}

export type IMessageSerializableProposal = OptionalSignature<IProposalData>;
export type IMessageSerializablePrevote = OptionalSignature<IPrevoteData>;
export type IMessageSerializablePrecommit = OptionalSignature<IPrecommitData>;

export interface IMessageSerializer {
	serializeProposal(
		proposal: IMessageSerializableProposal,
		options?: IMessageSerializeProposalOptions,
	): Promise<Buffer>;
	serializePrevote(prevote: IMessageSerializablePrevote, options?: IMessageSerializePrevoteOptions): Promise<Buffer>;
	serializePrecommit(
		precommit: IMessageSerializablePrecommit,
		options?: IMessageSerializePrecommitOptions,
	): Promise<Buffer>;
}

export interface IMessageDeserializer {
	deserializeProposal(serialized: Buffer): Promise<IProposalData>;
	deserializePrevote(serialized: Buffer): Promise<IPrevoteData>;
	deserializePrecommit(serialized: Buffer): Promise<IPrecommitData>;
}

export interface IMessageVerificationResult {
	verified: boolean;
	errors: string[];
}

export interface IMessageVerifier {
	verifyProposal(proposal: IProposalData): Promise<IMessageVerificationResult>;
	verifyPrevote(prevote: IPrevoteData): Promise<IMessageVerificationResult>;
	verifyPrecommit(precommit: IPrecommitData): Promise<IMessageVerificationResult>;
}
