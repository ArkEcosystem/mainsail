import type { Contracts } from "@mainsail/contracts";

import { blockHeader, serializedBlock, blockData } from "./block.js";
import { serializedLockProof } from "./lock-proof.js";

// Scenarios:
// 1. Proposal without valid round
// 2. Proposal with valid round
// 3. Proposal without valid round, with lock proof
// 4. Proposal with valid round, with lock proof

// Names:
// 1. serializedProposal
// 2. serializedProposalWithValidRound
// 3. serializedProposalWithLockProof
// 4. serializedProposalWithValidRoundWithLockProof


// PROPOSAL WITHOUT VALID ROUND

export const proposedData: Contracts.Crypto.ProposedData = {
	block: {
		serialized: serializedBlock,
	},
	lockProof: undefined,
}

export const proposedDataSerialized = "00" + serializedBlock;

export const proposalDataUnsigned: Contracts.Crypto.SerializableProposalData = {
	data: {
		serialized: proposedDataSerialized,
	},
	round: 1,
	signature:
		"b7010f03f72afb5437da8f7ee039a7fee75d6e9c7b02e1b9cbd4ce844cdc0e81233fd312cdd493e4ef2c2a6ac3c9fc8a1967f06a1a205c3daf369ac77f0a895717c520af5e341a3925d23b126d847a6fd1e194a010b89082039e1e5b44352616",
	validRound: undefined,
	validatorIndex: 0,
};

export const proposalData: Contracts.Crypto.ProposalData = {
	blockHeader,
	data: {
		serialized: serializedBlock,
	},
	lockProof: undefined,
	round: 1,
	signature:
		"b7010f03f72afb5437da8f7ee039a7fee75d6e9c7b02e1b9cbd4ce844cdc0e81233fd312cdd493e4ef2c2a6ac3c9fc8a1967f06a1a205c3daf369ac77f0a895717c520af5e341a3925d23b126d847a6fd1e194a010b89082039e1e5b44352616",
	validRound: undefined,
	validatorIndex: 0,
};

export const serialized =
	"0100000000b0020000" + serializedBlock + "00b7010f03f72afb5437da8f7ee039a7fee75d6e9c7b02e1b9cbd4ce844cdc0e81233fd312cdd493e4ef2c2a6ac3c9fc8a1967f06a1a205c3daf369ac77f0a895717c520af5e341a3925d23b126d847a6fd1e194a010b89082039e1e5b44352616";

export const serializedUnsigned =
	"0100000000b0020000" + serializedBlock + "00";
