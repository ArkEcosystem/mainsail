import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const blockData: Contracts.Crypto.IBlockData = {
    generatorPublicKey: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
    height: 2,
    id: "e6ece29ff55b818dd22f1c2b2c420b374d8b9ce4a9e602816cab6d08ee754ca7",
    numberOfTransactions: 0,
    payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    payloadLength: 0,
    previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
    reward: BigNumber.ZERO,
    timestamp: 0,
    totalAmount: BigNumber.ZERO,
    totalFee: BigNumber.ZERO,
    transactions: [],
    version: 1,
};

export const proposalData: Contracts.Crypto.IProposalData = {
    round: 1,
    validatorPublicKey: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
    signature: "b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
    height: 1,
    block: {
        header: { ...blockData, transactions: undefined },
        serialized: "",
        transactions: [],
        data: blockData,
    }
};

export const serializedProposal =
    "010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cbb22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03";

export const precommitData: Contracts.Crypto.IPrecommitData = {
    round: 1,
    validatorPublicKey: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
    signature: "b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
    height: 1,
    blockId: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34"
};

export const serializedPrecommit =
    "010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa0300000000000000000000000000000000";

export const prevoteData: Contracts.Crypto.IPrevoteData = {
    round: 1,
    validatorPublicKey: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
    signature: "b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
    height: 1,
    blockId: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34"
};

export const serializedPrevote =
    "010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa0300000000000000000000000000000000";
