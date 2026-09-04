from ..models import Character


def create_character(db, account_id, name, race, specification, gender):
    character = Character(
        account_id=account_id,
        name=name,
        race=race,
        specification=specification,
        gender=gender,
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return character
