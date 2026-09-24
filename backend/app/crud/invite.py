from datetime import datetime

from sqlalchemy.orm import Session

from ..models import CharacterInvite, PlotLink


def create_character_invite(
    db: Session, character_id: str, space_id: str, invited_by: str
) -> CharacterInvite:
    """Create a character invite to a space."""
    invite = CharacterInvite(
        character_id=character_id,
        space_id=space_id,
        invited_by=invited_by,
        status="pending",
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def get_character_invite(db: Session, invite_id: str) -> CharacterInvite | None:
    """Get a character invite by ID."""
    return db.query(CharacterInvite).filter(CharacterInvite.id == invite_id).first()


def get_pending_character_invites_for_character(
    db: Session, character_id: str
) -> list[CharacterInvite]:
    """Get all pending character invites for a character."""
    return (
        db.query(CharacterInvite)
        .filter(CharacterInvite.character_id == character_id, CharacterInvite.status == "pending")
        .all()
    )


def accept_character_invite(db: Session, invite_id: str) -> CharacterInvite:
    """Accept a character invite."""
    invite = db.query(CharacterInvite).filter(CharacterInvite.id == invite_id).first()
    if invite:
        invite.status = "accepted"
        invite.responded_at = datetime.utcnow()
        db.commit()
        db.refresh(invite)
    return invite


def decline_character_invite(db: Session, invite_id: str) -> None:
    """Decline and delete a character invite."""
    invite = db.query(CharacterInvite).filter(CharacterInvite.id == invite_id).first()
    if invite:
        db.delete(invite)
        db.commit()


def create_plot_link(db: Session, source_space_id: str, target_space_id: str, created_by: str) -> PlotLink:
    """Create a plot link invitation."""
    link = PlotLink(
        source_space_id=source_space_id,
        target_space_id=target_space_id,
        created_by=created_by,
        status="pending",
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def get_plot_link(db: Session, link_id: str) -> PlotLink | None:
    """Get a plot link by ID."""
    return db.query(PlotLink).filter(PlotLink.id == link_id).first()


def get_pending_plot_links_for_space(db: Session, space_id: str) -> list[PlotLink]:
    """Get all pending plot links where this space is the target (invitations sent to it)."""
    return (
        db.query(PlotLink)
        .filter(PlotLink.target_space_id == space_id, PlotLink.status == "pending")
        .all()
    )


def get_accepted_linked_spaces(db: Session, space_id: str) -> list[str]:
    """Get all spaces linked to this one (bidirectional)."""
    linked = (
        db.query(PlotLink)
        .filter(
            ((PlotLink.source_space_id == space_id) | (PlotLink.target_space_id == space_id)),
            PlotLink.status == "accepted",
        )
        .all()
    )
    linked_ids = set()
    for link in linked:
        if link.source_space_id == space_id:
            linked_ids.add(link.target_space_id)
        else:
            linked_ids.add(link.source_space_id)
    return list(linked_ids)


def accept_plot_link(db: Session, link_id: str) -> PlotLink:
    """Accept a plot link."""
    link = db.query(PlotLink).filter(PlotLink.id == link_id).first()
    if link:
        link.status = "accepted"
        link.responded_at = datetime.utcnow()
        db.commit()
        db.refresh(link)
    return link


def decline_plot_link(db: Session, link_id: str) -> None:
    """Decline and delete a plot link."""
    link = db.query(PlotLink).filter(PlotLink.id == link_id).first()
    if link:
        db.delete(link)
        db.commit()
