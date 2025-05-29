from fastapi import FastAPI
from backend.routes import mint, oracle, submit
from backend.routes import mint, unlock
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(mint.router)
app.include_router(oracle.router)
app.include_router(submit.router) 
app.include_router(unlock.router) 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict to http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )