from pydantic import BaseModel, Field
from typing import Optional


class ProjectSource(BaseModel):
    file_name: str
    page: Optional[int] = None


class Coordinate(BaseModel):
    latitude: float
    longitude: float


class UtilityProject(BaseModel):
    project_name: str

    aliases: list[str] = Field(default_factory=list)

    project_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

    location: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None

    coordinates: list[Coordinate] = Field(default_factory=list)

    start_date: Optional[str] = None
    end_date: Optional[str] = None

    estimated_cost: Optional[str] = None

    sources: list[ProjectSource] = Field(default_factory=list)


class CompanyDataset(BaseModel):
    company_name: str
    projects: list[UtilityProject] = Field(default_factory=list)