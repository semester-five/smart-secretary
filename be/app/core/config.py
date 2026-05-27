from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DB_URL: str | None = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USERNAME: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_DATABASE: str = "smart_secretary"

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET: str = "media"

    # AI Config
    HF_TOKEN: str | None = None

    def _database_url(self, drivername: str) -> str:
        if self.DB_URL:
            return make_url(self.DB_URL).set(drivername=drivername).render_as_string(hide_password=False)

        return (
            f"{drivername}://{self.DB_USERNAME}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"
        )

    @property
    def async_database_url(self) -> str:
        return self._database_url("postgresql+asyncpg")

    @property
    def sync_database_url(self) -> str:
        return self._database_url("postgresql+psycopg2")


settings = Settings()
