// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {
    ConsensusV1,
    ValidatorData,
    Validator,
    Unvoted,
    Voted,
    CallerIsNotOwner
} from "@contracts/consensus/ConsensusV1.sol";

contract ConsensusTest is Test {
    ConsensusV1 public consensus;

    function setUp() public {
        consensus = new ConsensusV1();
    }

    function test_updateVoters_should_allow_only_caller() public {
        address addr = address(1);
        vm.startPrank(addr);
        address[] memory voters = new address[](0);
        vm.expectRevert(CallerIsNotOwner.selector);
        consensus.updateVoters(voters);
    }
}
