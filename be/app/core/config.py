import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY: str = os.environ["SECRET_KEY"]
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
