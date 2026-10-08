from abc import ABC, abstractmethod
from typing import Dict, Any

class PayoutService(ABC):
    @abstractmethod
    async def process_payout(self, withdrawal_id: str, amount: float, payout_method: str, details: Dict[str, Any]) -> Dict[str, Any]:
        pass

class ManualPayoutService(PayoutService):
    """
    MVP Payout Service: Queues payouts for administrator audit and manual bank/UPI transfer.
    Prevents automatic leakage before KYC, tax compliance, and fraud review.
    """
    async def process_payout(self, withdrawal_id: str, amount: float, payout_method: str, details: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "payout_id": f"manual_batch_{withdrawal_id[:8]}",
            "status": "QUEUED_FOR_MANUAL_TRANSFER",
            "instructions": f"Admin: Dispatch {amount} INR via {payout_method} to {details}"
        }
