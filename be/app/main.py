from fastapi import FastAPI
from app.core.database import engine, Base
from app.api import auth, users

from app.models import user
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Secretary API")

app.include_router(auth.router)
app.include_router(users.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Secretary Backend"}