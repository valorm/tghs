from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
from backend.utils.supabase_client import supabase

router = APIRouter()

class UnlockRequest(BaseModel):
    wallet: str
    amount: float  # in GHS
    asset: str     # 'ETH' or 'USDT'

    @validator('asset')
    def validate_asset(cls, v):
        if v not in ["ETH", "USDT"]:
            raise ValueError("asset must be 'ETH' or 'USDT'")
        return v

@router.post("/unlock-request")
def create_unlock_request(req: UnlockRequest):
    try:
        # Insert into unlock_requests table
        response = (
            supabase
            .table("unlock_requests")
            .insert({
                "wallet": req.wallet,
                "amount": req.amount,
                "asset": req.asset,
                "status": "pending"
            })
            .execute()
        )

        if hasattr(response, "data") and response.data is not None:
            return {
                "message": "Unlock request submitted",
                "data": response.data
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to submit unlock request")

    except Exception as e:
        print(f"Unlock error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
