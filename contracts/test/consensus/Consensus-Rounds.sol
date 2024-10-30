// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, Round} from "@contracts/consensus/Consensus.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    Consensus public consensus;

    function setUp() public {
        consensus = new Consensus();
    }

    function test_should_return_empty() public view {
        assertEq(consensus.getRoundsCount(), 0);
        assertEq(consensus.getRounds(0, 10).length, 0);
    }

    function test_should_return_round_with_one_validator() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));
        vm.stopPrank();

        consensus.calculateTopValidators(1);

        assertEq(consensus.getRoundsCount(), 1);
        Round[] memory rounds = consensus.getRounds(0, 10);
        assertEq(rounds.length, 1);
        assertEq(rounds[0].round, 1);
        assertEq(rounds[0].validators.length, 1);
        assertEq(rounds[0].validators[0].addr, addr);
    }
}
