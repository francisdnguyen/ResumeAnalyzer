from urllib.parse import parse_qs, urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    clerk_secret_key: str
    clerk_jwks_url: str
    openai_api_key: str

    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    @property
    def async_database_url(self) -> str:
        # Neon and standard URLs both need the asyncpg driver prefix
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # asyncpg doesn't accept libpq-style "sslmode" as a connect kwarg —
        # strip it from the query string; SSL is configured separately via connect_args.
        parts = urlsplit(url)
        query = parse_qs(parts.query)
        query.pop("sslmode", None)
        new_query = "&".join(f"{k}={v[0]}" for k, v in query.items())
        return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))


settings = Settings()
