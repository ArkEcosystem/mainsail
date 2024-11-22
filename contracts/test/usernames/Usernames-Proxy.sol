// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {
    UsernamesV1,
    InvalidUsername,
    TakenUsername,
    UsernameNotRegistered,
    UsernameRegistered,
    UsernameResigned
} from "@contracts/usernames/UsernamesV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract UsernamesVTest is UsernamesV1 {
    function versionv2() external pure returns (uint256) {
        return 99;
    }
}

contract ProxyTest is Test {
    UsernamesV1 public usernames;

    function setUp() public {
        bytes memory data = abi.encode(UsernamesV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new UsernamesV1()), data));
        usernames = UsernamesV1(proxy);
    }

    function test_initialize_should_revert() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        usernames.initialize();
    }

    function test_shoudl_have_valid_UPGRADE_INTERFACE_VERSION() public view {
        assertEq(usernames.UPGRADE_INTERFACE_VERSION(), "5.0.0");
    }

    function test_proxy_should_update() public {
        assertEq(usernames.version(), 1);
        assertEq(usernames.UPGRADE_INTERFACE_VERSION(), "5.0.0");
        usernames.upgradeToAndCall(address(new UsernamesVTest()), bytes(""));

        // Cast proxy to new contract
        UsernamesVTest usernamesNew = UsernamesVTest(address(usernames));
        assertEq(usernamesNew.versionv2(), 99);

        // Should keep old data
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        usernamesNew.initialize();
    }

    function test_proxy_should_update_and_perserve_variables() public {
        assertEq(usernames.version(), 1);

        // Register valdiators
        usernames.addUsername(address(1), "test");
        usernames.addUsername(address(2), "test2");

        // Assert
        assertEq(usernames.getUsername(address(1)), "test");
        assertEq(usernames.getUsername(address(2)), "test2");
        assertTrue(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("test2"));

        // Upgrade
        usernames.upgradeToAndCall(address(new UsernamesVTest()), bytes(""));

        // Cast proxy to new contract
        UsernamesVTest usernamesNew = UsernamesVTest(address(usernames));
        assertEq(usernamesNew.versionv2(), 99);
        assertEq(usernamesNew.version(), 1);

        // Assert
        assertEq(usernamesNew.getUsername(address(1)), "test");
        assertEq(usernamesNew.getUsername(address(2)), "test2");
        assertTrue(usernamesNew.isUsernameRegistered("test"));
        assertTrue(usernamesNew.isUsernameRegistered("test2"));
    }
}
