from storage3 import AsyncStorageClient

from app.core.config import settings


def _get_storage_url() -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1"


def _get_auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_KEY,
    }


def get_storage_client() -> AsyncStorageClient:
    return AsyncStorageClient(url=_get_storage_url(), headers=_get_auth_headers())


async def create_signed_upload_url(path: str) -> dict[str, str]:
    """Create a signed upload URL for a given storage path.

    Parameters
    ----------
    path:
        Destination path inside the configured Supabase bucket
        (e.g. ``audio/1/uuid/file.mp3``).

    Returns
    -------
    dict with keys ``signed_url``, ``token``, and ``path``.

    Raises
    ------
    storage3.utils.StorageException
        If the Supabase Storage API returns an error.
    """
    client = get_storage_client()
    return await client.from_(settings.SUPABASE_BUCKET).create_signed_upload_url(path)


async def get_public_url(path: str) -> str:
    """Return the public URL for a file stored in the configured bucket.

    Parameters
    ----------
    path:
        Path of the file inside the configured Supabase bucket.

    Returns
    -------
    Fully-qualified public URL string.
    """
    client = get_storage_client()
    return await client.from_(settings.SUPABASE_BUCKET).get_public_url(path)
