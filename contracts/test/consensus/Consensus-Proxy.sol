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

    function test_shoudl_have_valid_UPGRADE_INTERFACE_VERSION() public {
        assertEq(consensus.UPGRADE_INTERFACE_VERSION(), "5.0.0");
    }

    function test_proxy_should_update() public {
        assertEq(consensus.version(), 1);
        assertEq(consensus.UPGRADE_INTERFACE_VERSION(), "5.0.0");
        consensus.upgradeToAndCall(address(new ConsensusVTest()), bytes(""));

        // Cast proxy to new contract
        ConsensusVTest consensusNew = ConsensusVTest(address(consensus));
        assertEq(consensusNew.versionv2(), 99);

        // Should keep old data
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        consensusNew.initialize();
    }

    function test_proxy_should_update_and_perserve_variables() public {
        assertEq(consensus.version(), 1);

        // Register valdiators
        vm.startPrank(address(1));
        consensus.registerValidator(prepareBLSKey(address(1)));
        vm.startPrank(address(2));
        consensus.registerValidator(prepareBLSKey(address(2)));
        vm.startPrank(address(3));
        consensus.registerValidator(prepareBLSKey(address(3)));

        // Resign valdiator
        consensus.resignValidator();

        // Vote
        address voterAddr = address(4);
        vm.deal(voterAddr, 100 ether);
        vm.startPrank(voterAddr);
        consensus.vote(address(1));

        vm.stopPrank();
        consensus.calculateActiveValidators(2);

        assertEq(consensus.version(), 1);
        assertEq(consensus.registeredValidatorsCount(), 3);
        assertEq(consensus.resignedValidatorsCount(), 1);
        assertEq(consensus.activeValidatorsCount(), 2);
        assertEq(consensus.getVotesCount(), 1);
        assertEq(consensus.getActiveValidators().length, 2);
        Validator[] memory validatorsBefore = consensus.getAllValidators();
        assertEq(validatorsBefore.length, 3);

        // Upgrade
        consensus.upgradeToAndCall(address(new ConsensusVTest()), bytes(""));

        // Cast proxy to new contract
        ConsensusVTest consensusNew = ConsensusVTest(address(consensus));
        assertEq(consensusNew.versionv2(), 99);
        assertEq(consensusNew.version(), 1);
        assertEq(consensusNew.registeredValidatorsCount(), 3);
        assertEq(consensusNew.resignedValidatorsCount(), 1);
        assertEq(consensusNew.activeValidatorsCount(), 2);
        assertEq(consensusNew.getVotesCount(), 1);
        assertEq(consensus.getActiveValidators().length, 2);
        Validator[] memory validatorsAfter = consensusNew.getAllValidators();
        assertEq(validatorsAfter.length, 3);

        // Compare valdiators
        for (uint256 i = 0; i < validatorsBefore.length; i++) {
            assertEq(validatorsBefore[i].addr, validatorsAfter[i].addr);
            assertEq(validatorsBefore[i].data.votersCount, validatorsAfter[i].data.votersCount);
            assertEq(validatorsBefore[i].data.voteBalance, validatorsAfter[i].data.voteBalance);
            assertEq(validatorsBefore[i].data.isResigned, validatorsAfter[i].data.isResigned);
            assertEq(validatorsBefore[i].data.blsPublicKey, validatorsAfter[i].data.blsPublicKey);
        }
    }
}
