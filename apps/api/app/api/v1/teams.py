from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schema_models import User, Team, TeamMember
from app.schemas.all_schemas import TeamCreateRequest, TeamMemberAddRequest, TeamRevenueRuleUpdate

router = APIRouter(prefix="/teams", tags=["Teams & Collaboration"])

@router.post("/")
async def create_team(
    req: TeamCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    team = Team(
        name=req.name,
        owner_id=current_user.id,
        description=req.description
    )
    db.add(team)
    await db.flush()

    # Owner gets initial member record
    owner_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="OWNER",
        revenue_share_percent=100.0
    )
    db.add(owner_member)
    await db.commit()
    await db.refresh(team)

    return {"id": team.id, "name": team.name, "description": team.description}

@router.get("/")
async def list_my_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Team).join(TeamMember, Team.id == TeamMember.team_id).where(
        TeamMember.user_id == current_user.id
    )
    res = await db.execute(stmt)
    teams = res.scalars().all()
    return [{"id": t.id, "name": t.name, "description": t.description} for t in teams]

@router.post("/{team_id}/members")
async def add_team_member(
    team_id: str,
    req: TeamMemberAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    team_stmt = select(Team).where(Team.id == team_id)
    team_res = await db.execute(team_stmt)
    team = team_res.scalar_one_or_none()

    if not team or team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team owner can invite members")

    user_stmt = select(User).where(User.email == req.email.lower())
    u_res = await db.execute(user_stmt)
    invited_user = u_res.scalar_one_or_none()

    if not invited_user:
        raise HTTPException(status_code=404, detail="No RAGE Cloud user found with this email")

    # Check already member
    mem_stmt = select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == invited_user.id)
    if (await db.execute(mem_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already in this team")

    # Validate total revenue share <= 100%
    curr_members_stmt = select(TeamMember).where(TeamMember.team_id == team_id)
    curr_members = (await db.execute(curr_members_stmt)).scalars().all()
    current_total = sum(m.revenue_share_percent for m in curr_members)

    if current_total + req.revenue_share_percent > 100.0:
        raise HTTPException(
            status_code=400,
            detail=f"Total team revenue split cannot exceed 100%. (Currently allocated: {current_total}%)"
        )

    new_member = TeamMember(
        team_id=team_id,
        user_id=invited_user.id,
        role=req.role,
        revenue_share_percent=req.revenue_share_percent
    )
    db.add(new_member)
    await db.commit()
    return {"message": "Member added successfully", "user_id": invited_user.id}

@router.put("/{team_id}/revenue-split")
async def update_team_revenue_split(
    team_id: str,
    req: TeamRevenueRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    team_stmt = select(Team).where(Team.id == team_id)
    team = (await db.execute(team_stmt)).scalar_one_or_none()

    if not team or team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team owner can configure revenue splits")

    total_split = sum(item["percent"] for item in req.members_split)
    if total_split > 100.0:
        raise HTTPException(
            status_code=400,
            detail=f"Total revenue share cannot exceed 100%. Provided: {total_split}%"
        )

    for item in req.members_split:
        m_stmt = select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == item["user_id"])
        member = (await db.execute(m_stmt)).scalar_one_or_none()
        if member:
            member.revenue_share_percent = item["percent"]

    await db.commit()
    return {"message": "Revenue rules updated successfully", "total_allocated": total_split}
