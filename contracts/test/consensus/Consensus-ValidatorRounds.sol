// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, Round} from "@contracts/consensus/Consensus.sol";

contract ConsensusTest is Test {
    Consensus public consensus;

    function setUp() public {
        consensus = new Consensus();
    }

    function test_getValidatorRounds() public view {
        Round[] memory rounds = consensus.getValidatorRounds();
        assertEq(consensus.getValidatorRounds().length, 0);
    }
}
