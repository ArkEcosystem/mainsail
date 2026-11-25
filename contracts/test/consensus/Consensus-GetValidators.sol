// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    function test_getValidators_should_return_empty_without_validators() public view {
        assertEq(consensus.getValidators(0, 10).length, 0);
        assertEq(consensus.getValidators(5, 10).length, 0);
    }

    function test_getValidators_should_return_pages_in_registration_order() public {
        for (uint256 i = 1; i <= 5; i++) {
            registerValidator(address(uint160(i)));
        }

        ConsensusV1.Validator[] memory first = consensus.getValidators(0, 2);
        assertEq(first.length, 2);
        assertEq(first[0].addr, address(1));
        assertEq(first[1].addr, address(2));

        ConsensusV1.Validator[] memory second = consensus.getValidators(2, 2);
        assertEq(second.length, 2);
        assertEq(second[0].addr, address(3));
        assertEq(second[1].addr, address(4));

        ConsensusV1.Validator[] memory last = consensus.getValidators(4, 2);
        assertEq(last.length, 1);
        assertEq(last[0].addr, address(5));
        assertEq(last[0].data.blsPublicKey, prepareBLSKey(address(5)));
    }

    function test_getValidators_should_return_empty_past_the_end() public {
        registerValidator(address(1));
        registerValidator(address(2));

        assertEq(consensus.getValidators(2, 10).length, 0);
        assertEq(consensus.getValidators(type(uint256).max, type(uint256).max).length, 0);
    }

    function test_getValidators_should_return_empty_for_zero_count() public {
        registerValidator(address(1));

        assertEq(consensus.getValidators(0, 0).length, 0);
    }

    function test_getValidators_should_clamp_a_large_count() public {
        registerValidator(address(1));
        registerValidator(address(2));

        assertEq(consensus.getValidators(1, type(uint256).max).length, 1);
    }

    function test_getValidators_should_include_resigned_and_imported_validators() public {
        consensus.addValidator(address(1), true);
        registerValidator(address(2));
        registerValidator(address(3));
        resignValidator(address(3));

        ConsensusV1.Validator[] memory validators = consensus.getValidators(0, 10);
        assertEq(validators.length, 3);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.isResigned, true);
        assertEq(validators[0].data.blsPublicKey, bytes(""));
        assertEq(validators[1].addr, address(2));
        assertEq(validators[1].data.isResigned, false);
        assertEq(validators[2].addr, address(3));
        assertEq(validators[2].data.isResigned, true);
    }

    function test_getValidators_should_return_a_page_of_1000_validators() public {
        vm.pauseGasMetering();
        uint256 n = 1000;
        for (uint256 i = 1; i <= n; i++) {
            registerValidator(address(uint160(i)));
        }
        vm.resumeGasMetering();

        ConsensusV1.Validator[] memory validators = consensus.getValidators(0, n);
        assertEq(validators.length, n);
        assertEq(validators[n - 1].addr, address(uint160(n)));
    }

    function test_getValidators_should_page_through_all_validators() public {
        vm.pauseGasMetering();
        uint256 n = 25;
        for (uint256 i = 1; i <= n; i++) {
            registerValidator(address(uint160(i)));
        }
        vm.resumeGasMetering();

        uint256 seen = 0;
        for (uint256 offset = 0;; offset += 7) {
            ConsensusV1.Validator[] memory page = consensus.getValidators(offset, 7);
            if (page.length == 0) {
                break;
            }

            for (uint256 i = 0; i < page.length; i++) {
                assertEq(page[i].addr, address(uint160(offset + i + 1)));
            }
            seen += page.length;
        }

        assertEq(seen, n);
    }
}
