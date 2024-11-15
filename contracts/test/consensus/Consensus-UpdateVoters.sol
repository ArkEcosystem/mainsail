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
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Test {
    ConsensusV1 public consensus;

    function setUp() public {
        bytes memory data = abi.encode(ConsensusV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new ConsensusV1()), data));
        consensus = ConsensusV1(proxy);
    }

    function test_updateVoters_should_allow_only_caller() public {
        address addr = address(1);
        vm.startPrank(addr);
        address[] memory voters = new address[](0);
        vm.expectRevert(CallerIsNotOwner.selector);
        consensus.updateVoters(voters);
    }
}
