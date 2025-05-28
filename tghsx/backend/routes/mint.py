from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.utils.supabase_client import supabase

router = APIRouter()

class MintRequest(BaseModel):
    wallet: str
    amount: float
    kyc_level: int

@router.post("/mint-request")
def create_mint_request(req: MintRequest):
    try:
        # Insert into Supabase mint_requests table with pending status
        response = (
            supabase
            .table("mint_requests")
            .insert({
                "wallet": req.wallet,
                "amount": req.amount,
                "kyc_level": req.kyc_level,
                "status": "pending"
            })
            .execute()
        )

        # Newer supabase-py returns data attribute
        if hasattr(response, "data") and response.data is not None:
            return {
                "message": "Mint request logged",
                "data": response.data
            }
        else:
            # If no data returned, there might be an error
            raise HTTPException(status_code=500, detail="Failed to insert mint request")

    except Exception as e:
        # Log the actual error for debugging
        print(f"Error in mint request: {str(e)}")
        print(f"Error type: {type(e)}")
        raise HTTPException(status_code=500, detail=str(e))
