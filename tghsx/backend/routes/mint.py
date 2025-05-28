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
        # Insert into Supabase mint_requests table
        response = (
            supabase
            .table("mint_requests")
            .insert({
                "wallet": req.wallet,
                "amount": req.amount,
                "kyc_level": req.kyc_level
            })
            .execute()
        )

        # In newer supabase-py versions, check for errors differently
        # The response object has data and count attributes directly
        if hasattr(response, 'data') and response.data is not None:
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