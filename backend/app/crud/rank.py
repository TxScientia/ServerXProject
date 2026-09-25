from sqlalchemy.orm import Session

from ..models import MembershipRank, Rank


def list_ranks(db: Session, space_id):
    return (
        db.query(Rank)
        .filter(Rank.space_id == space_id)
        .order_by(Rank.weight, Rank.created_at)
        .all()
    )


def get_rank(db: Session, rank_id):
    return db.query(Rank).filter(Rank.id == rank_id).first()


def create_rank(db: Session, space_id, name: str, weight: int):
    rank = Rank(space_id=space_id, name=name, weight=weight)
    db.add(rank)
    db.commit()
    db.refresh(rank)
    return rank


def update_rank(db: Session, rank: Rank, *, name=None, weight=None):
    if name is not None:
        rank.name = name
    if weight is not None:
        rank.weight = weight
    db.commit()
    db.refresh(rank)
    return rank


def delete_rank(db: Session, rank: Rank):
    db.query(MembershipRank).filter(MembershipRank.rank_id == rank.id).delete()
    db.delete(rank)
    db.commit()
