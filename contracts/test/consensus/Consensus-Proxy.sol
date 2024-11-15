// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1, ValidatorData, Validator, CallerIsNotOwner} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract ConsensusVTest is ConsensusV1 {
    function versionv2() external pure returns (uint256) {
        return 99;
    }
}

contract ConsensusTest is Base {
    ConsensusV1 public consensus;

    function setUp() public {
        bytes memory data = abi.encode(ConsensusV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new ConsensusV1()), data));
        consensus = ConsensusV1(proxy);
    }

    function test_initialize_should_revert() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        consensus.initialize();
    }

    function test_proxy_should_update() public {
        assertEq(consensus.version(), 1);
        consensus.upgradeToAndCall(address(new ConsensusVTest()), bytes(""));

        // Cast proxy to new contract
        ConsensusVTest consensusNew = ConsensusVTest(address(consensus));
        assertEq(consensusNew.versionv2(), 99);

        // Should keep old data
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        consensusNew.initialize();
    }
}
