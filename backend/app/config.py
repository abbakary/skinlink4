from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SkinLink API"
    secret_key: str = "skinlink-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    database_path: str = "data/skinlink_db.json"
    upload_dir: str = "uploads"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://10.0.2.2:8000",
    ]
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_temperature: float = 0.2

    class Config:
        env_file = ".env"


settings = Settings()
