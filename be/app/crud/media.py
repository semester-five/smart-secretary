from fastcrud import FastCRUD

from app.models.media import Media
from app.schemas.media import MediaCreate, MediaUpdate

media_crud: FastCRUD[Media, MediaCreate, MediaUpdate, MediaUpdate, None, None] = FastCRUD(Media)
