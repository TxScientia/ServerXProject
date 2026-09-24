from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..crud import (
    accept_character_invite,
    accept_plot_link,
    can_edit_space,
    create_character_invite,
    create_plot_link,
    decline_character_invite,
    decline_plot_link,
    get_accepted_linked_spaces,
    get_character_invite,
    get_plot_link,
    get_pending_character_invites_for_character,
    get_pending_plot_links_for_space,
    get_storybook,
    send_system_message,
)
from ..database import get_db
from ..schemas import (
    CharacterInviteAction,
    CharacterInviteCreate,
    CharacterInviteRead,
    PlotLinkAction,
    PlotLinkCreate,
    PlotLinkRead,
)
from ..security import get_current_character, get_current_user

router = APIRouter()


# ===== CHARACTER INVITES =====


@router.post("/storybooks/{space_id}/invites/characters", response_model=CharacterInviteRead)
async def invite_character(
    space_id: str,
    invite_data: CharacterInviteCreate,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Invite a character to join a storybook. Requires admin/creator role."""
    space = get_storybook(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Storybook not found")

    if not can_edit_space(db, space_id, character["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to invite members")

    # Check if character already a member
    from .space import get_membership

    existing = get_membership(db, space_id, invite_data.character_id)
    if existing:
        raise HTTPException(status_code=400, detail="Character is already a member")

    # Create the invite
    invite = create_character_invite(
        db, invite_data.character_id, space_id, character["id"]
    )

    # Send system message to the invited character
    send_system_message(
        db,
        invite_data.character_id,
        f"You are invited to join {space.title}",
        system_type="character_invite",
        metadata={"invite_id": str(invite.id), "space_id": space_id},
    )

    return invite


@router.get("/invites/characters/pending", response_model=list[CharacterInviteRead])
async def get_pending_character_invites(
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Get all pending character invites for the current character."""
    return get_pending_character_invites_for_character(db, character["id"])


@router.post("/invites/characters/{invite_id}/accept")
async def accept_character_invite_endpoint(
    invite_id: str,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Accept a character invite to join a storybook."""
    invite = get_character_invite(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.character_id != character["id"]:
        raise HTTPException(status_code=403, detail="This invite is not for you")

    # Accept the invite
    invite = accept_character_invite(db, invite_id)

    # Create membership
    from ..models import Membership

    membership = Membership(
        space_id=invite.space_id, character_id=invite.character_id, role="member"
    )
    db.add(membership)
    db.commit()

    return {"status": "accepted"}


@router.post("/invites/characters/{invite_id}/decline")
async def decline_character_invite_endpoint(
    invite_id: str,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Decline and delete a character invite."""
    invite = get_character_invite(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.character_id != character["id"]:
        raise HTTPException(status_code=403, detail="This invite is not for you")

    decline_character_invite(db, invite_id)
    return {"status": "declined"}


# ===== PLOT LINKS =====


@router.post("/storybooks/{space_id}/linked-plots/invite", response_model=PlotLinkRead)
async def invite_plot_to_link(
    space_id: str,
    link_data: PlotLinkCreate,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Invite another plot to link worlds. Requires admin/creator role."""
    source_space = get_storybook(db, space_id)
    if not source_space:
        raise HTTPException(status_code=404, detail="Source storybook not found")

    if not can_edit_space(db, space_id, character["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to link plots")

    target_space = get_storybook(db, link_data.target_space_id)
    if not target_space:
        raise HTTPException(status_code=404, detail="Target storybook not found")

    if space_id == link_data.target_space_id:
        raise HTTPException(status_code=400, detail="Cannot link a plot to itself")

    # Create the plot link
    link = create_plot_link(db, space_id, link_data.target_space_id, character["id"])

    # Send system message to the target plot creator
    # Find the creator of the target plot
    from ..crud import get_membership

    creator_member = (
        db.query(get_membership)
        .filter_by(space_id=link_data.target_space_id, role="creator")
        .first()
    )
    if creator_member:
        send_system_message(
            db,
            creator_member.character_id,
            f"Plot '{source_space.title}' wants to link with your world '{target_space.title}'",
            system_type="plot_link",
            metadata={"link_id": str(link.id), "source_space_id": space_id},
        )

    return link


@router.get("/storybooks/{space_id}/linked-plots")
async def get_plot_links(
    space_id: str,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Get linked plots and pending plot link invitations."""
    space = get_storybook(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Storybook not found")

    # Check membership
    from ..crud import is_member

    if not is_member(db, space_id, character["id"]):
        raise HTTPException(status_code=403, detail="Not a member of this plot")

    linked_space_ids = get_accepted_linked_spaces(db, space_id)
    pending_links = get_pending_plot_links_for_space(db, space_id)

    # Fetch linked space details
    linked_spaces = []
    for linked_id in linked_space_ids:
        linked_space = get_storybook(db, linked_id)
        if linked_space:
            linked_spaces.append(
                {
                    "id": linked_space.id,
                    "title": linked_space.title,
                    "description": linked_space.description,
                }
            )

    return {
        "linked_spaces": linked_spaces,
        "pending_invitations": [
            {
                "id": link.id,
                "source_space_id": link.source_space_id,
                "source_title": get_storybook(db, link.source_space_id).title,
                "status": link.status,
            }
            for link in pending_links
        ],
    }


@router.post("/linked-plots/{link_id}/accept")
async def accept_plot_link_endpoint(
    link_id: str,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Accept a plot link invitation."""
    link = get_plot_link(db, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Plot link not found")

    # Verify the character is the creator of the target space
    if not can_edit_space(db, link.target_space_id, character["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to accept this link")

    accept_plot_link(db, link_id)
    return {"status": "accepted"}


@router.post("/linked-plots/{link_id}/decline")
async def decline_plot_link_endpoint(
    link_id: str,
    character: dict = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Decline and delete a plot link invitation."""
    link = get_plot_link(db, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Plot link not found")

    # Verify the character is the creator of the target space
    if not can_edit_space(db, link.target_space_id, character["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to decline this link")

    decline_plot_link(db, link_id)
    return {"status": "declined"}
