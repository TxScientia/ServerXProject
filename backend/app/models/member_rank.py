from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from ..database import Base
from ..types import GUID


class MembershipRank(Base):
    """Optional display rank assigned to a character inside a space."""

    __tablename__ = "membership_ranks"

    space_id = Column(GUID(), ForeignKey("spaces.id"), primary_key=True)
    character_id = Column(GUID(), ForeignKey("characters.id"), primary_key=True)
    rank_id = Column(GUID(), ForeignKey("ranks.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("space_id", "character_id", name="uq_membership_rank_space_character"),
    )

    rank = relationship("Rank")
