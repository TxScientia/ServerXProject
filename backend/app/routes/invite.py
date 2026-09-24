import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character
from ..crud import (
    can_edit_space,
    create_character_invite,
    create_plot_link,
    get_accepted_linked_spaces,
    get_membership,
    get_pending_plot_links_for_space,
    get_space_creator,
    get_storybook,
    is_member,
    list_members,
    send_system_message,
)
from ..database import get_db
from ..models import Character
from ..schemas import (
    CharacterInviteCreate,
    CharacterInviteRead,
    PlotLinkCreate,
    PlotLinkRead,
)

router = APIRouter()


# ===== MEMBERS =====


@router.get("/storybooks/{space_id}/members")
def get_members(
    space_id: str,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """List members of a storybook. Any member may view."""
    space = get_storybook(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Storybook not found")
    if not is_member(db, space_id, character.id):
        raise HTTPException(status_code=403, detail="Not a member of this plot")

    return [
        {
            "character_id": str(m.character_id),
            "name": m.character.name,
            "role": m.role,
        }
        for m in list_members(db, space_id)
    ]


# ===== CHARACTER INVITES =====


@router.post("/storybooks/{space_id}/invites/characters", response_model=CharacterInviteRead)
def invite_character(
    space_id: str,
    invite_data: CharacterInviteCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Invite a character to join a storybook. Requires creator/editor role."""
    space = get_storybook(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Storybook not found")
    if not can_edit_space(db, space_id, character.id):
        raise HTTPException(status_code=403, detail="Not authorized to invite members")

    target = db.query(Character).filter(Character.id == invite_data.character_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Character not found")
    if get_membership(db, space_id, invite_data.character_id):
        raise HTTPException(status_code=400, detail="Character is already a member")

    invite = create_character_invite(db, invite_data.character_id, space_id, character.id)

    # Notify the invited character's account via the system-message inbox.
    send_system_message(
        db,
        from_account_id=character.account_id,
        to_account_id=target.account_id,
        type_="invite",
        content=f"{character.name} lädt {target.name} ein, '{space.title}' beizutreten.",
        data={"invite_id": str(invite.id), "space_id": str(space_id)},
        action_required=True,
    )
    return invite


# ===== PLOT LINKS =====


@router.post("/storybooks/{space_id}/linked-plots/invite", response_model=PlotLinkRead)
def invite_plot_to_link(
    space_id: str,
    link_data: PlotLinkCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Invite another plot to link worlds. Requires creator/editor role on the source."""
    source_space = get_storybook(db, space_id)
    if not source_space:
        raise HTTPException(status_code=404, detail="Source storybook not found")
    if not can_edit_space(db, space_id, character.id):
        raise HTTPException(status_code=403, detail="Not authorized to link plots")

    target_space = get_storybook(db, link_data.target_space_id)
    if not target_space:
        raise HTTPException(status_code=404, detail="Target storybook not found")
    if str(space_id) == str(link_data.target_space_id):
        raise HTTPException(status_code=400, detail="Cannot link a plot to itself")

    link = create_plot_link(db, space_id, link_data.target_space_id, character.id)

    # The link invite goes to the TARGET plot's creator.
    creator = get_space_creator(db, link_data.target_space_id)
    if creator:
        creator_char = (
            db.query(Character).filter(Character.id == creator.character_id).first()
        )
        if creator_char:
            send_system_message(
                db,
                from_account_id=character.account_id,
                to_account_id=creator_char.account_id,
                type_="plot_link",
                content=(
                    f"'{source_space.title}' möchte sich mit deiner Welt "
                    f"'{target_space.title}' verbinden."
                ),
                data={"link_id": str(link.id), "source_space_id": str(space_id)},
                action_required=True,
            )
    return link


@router.get("/storybooks/{space_id}/linked-plots")
def get_plot_links(
    space_id: str,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Accepted linked plots + pending link invitations for this space."""
    space = get_storybook(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Storybook not found")
    if not is_member(db, space_id, character.id):
        raise HTTPException(status_code=403, detail="Not a member of this plot")

    linked_spaces = []
    for linked_id in get_accepted_linked_spaces(db, space_id):
        linked = get_storybook(db, linked_id)
        if linked:
            linked_spaces.append(
                {
                    "id": str(linked.id),
                    "title": linked.title,
                    "description": linked.description,
                }
            )

    pending = []
    for link in get_pending_plot_links_for_space(db, space_id):
        source = get_storybook(db, link.source_space_id)
        pending.append(
            {
                "id": str(link.id),
                "source_space_id": str(link.source_space_id),
                "source_title": source.title if source else "?",
            }
        )

    return {"linked_spaces": linked_spaces, "pending_invitations": pending}
