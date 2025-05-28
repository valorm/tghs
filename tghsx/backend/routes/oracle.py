from fastapi import APIRouter, HTTPException
from web3 import Web3
from backend.utils.constants import GHS_FEED_ADDRESS, GHS_FEED_ABI, RPC_URL

router = APIRouter()

@router.get("/ghs-price")
def get_ghs_price():
    try:
        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        feed = w3.eth.contract(address=GHS_FEED_ADDRESS, abi=GHS_FEED_ABI)

        _, answer, _, updated_at, _ = feed.functions.latestRoundData().call()

        return {
            "price_usd": int(answer) / 1e8,
            "updated_at": updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
