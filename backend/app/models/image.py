import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer

from ..database import Base
from ..types import GUID


class ImageAsset(Base):
    __tablename__ = 'image_assets'

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    account_id = Column(GUID(), ForeignKey('accounts.id'), nullable=False, index=True)
    size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
