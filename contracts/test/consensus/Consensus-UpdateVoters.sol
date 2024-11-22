// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1, ValidatorData, Validator, Unvoted, Voted} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusTest is Base {
    function test_updateVoters_should_allow_only_caller() public {
        address addr = address(1);
        vm.startPrank(addr);
        address[] memory voters = new address[](0);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.updateVoters(voters);
    }
}
