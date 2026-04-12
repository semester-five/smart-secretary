from fastapi import FastAPI
from app.core.database import engine, Base
from app.api import users

# Dòng này tự động tạo bảng vào database dựa trên các file models (Tạm thời dùng cho dev)
from app.models import user
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Secretary API")

# Đăng ký các router
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Secretary Backend"}