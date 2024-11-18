// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {
    ConsensusV1,
    ValidatorData,
    Validator,
    Unvoted,
    Voted,
    CallerIsNotOwner
} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    function test_updateVoters_should_allow_only_caller() public {
        address addr = address(1);
        vm.startPrank(addr);
        address[] memory voters = new address[](0);
        vm.expectRevert(CallerIsNotOwner.selector);
        consensus.updateVoters(voters);
    }
}
