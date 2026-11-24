// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

interface IConsensusV1 {
    function registerValidator(bytes calldata blsPublicKey, bytes calldata proofOfPossession) external payable;

    function resignValidator() external;

    function vote(address addr) external;
}

contract ValidatorController {
    IConsensusV1 private immutable consensus;

    constructor(IConsensusV1 consensusV1) {
        consensus = consensusV1;
    }

    receive() external payable {}

    fallback() external payable {}

    function registerAndResign(bytes calldata blsPublicKey, bytes calldata proofOfPossession, uint256 fee) external {
        consensus.registerValidator{value: fee}(blsPublicKey, proofOfPossession);
        consensus.resignValidator();
    }

    function vote(address validator) external payable {
        consensus.vote(validator);
    }
}
