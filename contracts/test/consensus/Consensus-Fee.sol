// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
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
}
