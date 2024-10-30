// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorRound, ValidatorRoundValidator} from "@contracts/consensus/Consensus.sol";

contract ConsensusTest is Test {
    Consensus public consensus;

    function setUp() public {
        consensus = new Consensus();
    }

    function test_getValidatorRounds() public view {
        ValidatorRound[] memory validatorRounds = new ValidatorRound[](0);

        validatorRounds = consensus.getValidatorRounds();

        assertEq(validatorRounds.length, 0);
    }
}
