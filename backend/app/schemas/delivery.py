from pydantic import BaseModel, Field


class DeliveryPartnerLocationUpdateRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    is_available: bool | None = None


class DeliveryAvailabilityResponse(BaseModel):
    available_partners: int = Field(ge=0)
