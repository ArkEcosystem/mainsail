// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

contract MultiPayment {
    error RecipientsAndAmountsMismatch();
    error InvalidValue();

    event Payment(address indexed recipient, uint256 amount, bool success);

    // Gas costs for dynamic recipient gas stipend calculation
    uint256 private constant EVENT_COST = 2250;
    uint256 private constant LOOP_OVERHEAD = 1000;
    uint256 private constant SAFETY_MARGIN = 10000;

    function pay(address payable[] calldata recipients, uint256[] calldata amounts) external payable {
        if (recipients.length != amounts.length) {
            revert RecipientsAndAmountsMismatch();
        }

        // Ensure value sent is equal to the total amount to send
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (msg.value != total) {
            revert InvalidValue();
        }

        uint256 numRecipients = recipients.length;
        if (numRecipients == 0) {
            return;
        }

        uint256 availableGas = gasleft();

        // Calculate dynamic gas limit based on number of recipients
        uint256 operationBuffer = (EVENT_COST * numRecipients) + (LOOP_OVERHEAD * numRecipients) + SAFETY_MARGIN;
        uint256 effectiveAvailableGas = availableGas > operationBuffer ? availableGas - operationBuffer : availableGas;
        uint256 gasPerRecipient = effectiveAvailableGas / numRecipients;

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool sent,) = recipients[i].call{value: amounts[i], gas: gasPerRecipient}("");
            if (sent) {
                total -= amounts[i];
            }

            emit Payment(recipients[i], amounts[i], sent);
        }

        // Refund any remaining value due to partial payments
        if (total > 0) {
            (bool success,) = msg.sender.call{value: total}("");
            require(success, "Refund failed");
        }
    }
}
