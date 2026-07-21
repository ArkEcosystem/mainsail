// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {Vm} from "@forge-std/Vm.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusTest is Base {
    function test_default_fee() public view {
        assertEq(consensus.fee(), 0);
    }

    function test_default_fee_custom() public {
        uint256 initialFee = 10;
        bytes memory data = abi.encodeWithSelector(ConsensusV1.initialize.selector, initialFee);
        address proxy = address(new ERC1967Proxy(address(new ConsensusV1()), data));
        ConsensusV1 consensusCustom = ConsensusV1(proxy);

        assertEq(consensusCustom.fee(), initialFee);
    }

    function test_default_fee_should_be_adjustable() public {
        assertEq(consensus.fee(), 0);

        uint128 newFee = 1000;
        vm.expectEmit(address(consensus));
        emit ConsensusV1.FeeUpdated(newFee);
        consensus.setFee(newFee);

        assertEq(consensus.fee(), newFee);
    }

    function test_set_fee_same_value_is_noop() public {
        uint128 newFee = 1000;

        // Establish a non-zero fee.
        vm.expectEmit(address(consensus));
        emit ConsensusV1.FeeUpdated(newFee);
        consensus.setFee(newFee);
        assertEq(consensus.fee(), newFee);

        // Setting the same value again changes nothing and emits no event.
        vm.recordLogs();
        consensus.setFee(newFee);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 0);
        assertEq(consensus.fee(), newFee);
    }

    function test_set_fee_same_as_default_is_noop() public {
        // Default fee is 0; setting it to 0 again is a no-op (no event, no change).
        assertEq(consensus.fee(), 0);

        vm.recordLogs();
        consensus.setFee(0);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 0);
        assertEq(consensus.fee(), 0);
    }

    function test_set_fee_still_updates_after_noop() public {
        uint128 firstFee = 1000;
        consensus.setFee(firstFee);

        // A repeated value is skipped...
        vm.recordLogs();
        consensus.setFee(firstFee);
        assertEq(vm.getRecordedLogs().length, 0);

        // ...but a different value still updates and emits (guard is strictly equality).
        uint128 secondFee = 2000;
        vm.expectEmit(address(consensus));
        emit ConsensusV1.FeeUpdated(secondFee);
        consensus.setFee(secondFee);

        assertEq(consensus.fee(), secondFee);
    }
}
