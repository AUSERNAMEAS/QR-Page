import uuid

from sqlalchemy import Boolean, Column, String

from database import Base


class Codigo(Base):
    __tablename__ = "codigos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    registrado = Column(Boolean, nullable=False, default=False)
