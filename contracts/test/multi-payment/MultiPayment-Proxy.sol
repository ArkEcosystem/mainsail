// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {MultiPaymentV1} from "@contracts/multi-payment/MultiPaymentV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract MultiPaymentV2Test is MultiPaymentV1 {
    function versionv2() external pure returns (uint256) {
        return 2;
    }
}

contract ProxyTest is Test {
    MultiPaymentV1 public multiPayment;

    function setUp() public {
        bytes memory data = abi.encode(MultiPaymentV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new MultiPaymentV1()), data));
        multiPayment = MultiPaymentV1(proxy);
    }

    function test_initialize_should_revert() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        multiPayment.initialize();
    }

    function test_should_have_valid_UPGRADE_INTERFACE_VERSION() public view {
        assertEq(multiPayment.UPGRADE_INTERFACE_VERSION(), "5.0.0");
    }

    function test_proxy_should_update() public {
        assertEq(multiPayment.version(), 1);
        assertEq(multiPayment.UPGRADE_INTERFACE_VERSION(), "5.0.0");
        multiPayment.upgradeToAndCall(address(new MultiPaymentV2Test()), bytes(""));

        // Cast proxy to new contract
        MultiPaymentV2Test multiPaymentNew = MultiPaymentV2Test(address(multiPayment));
        assertEq(multiPaymentNew.versionv2(), 2);

        // Should keep old data
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        multiPaymentNew.initialize();
    }
}
