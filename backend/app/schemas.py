from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class StatusUpdate(BaseModel):
    status: str

class SkillSuggestRequest(BaseModel):
    description: str

class JDMatchRequest(BaseModel):
    job_title: str
    company: str
    job_description: str
    apply_url: Optional[str] = ""
    save_to_board: bool = False