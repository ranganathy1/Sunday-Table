import uuid

import pytest
from pydantic import ValidationError

from app.schemas.delivery import DeliveryPartnerLocationUpdateRequest
from app.schemas.order import OrderCreateRequest


def test_order_request_accepts_geographic_coordinate_boundaries() -> None:
    payload = OrderCreateRequest(
        restaurant_id=uuid.uuid4(),
        delivery_address="12 Example Street, Bengaluru",
        delivery_latitude=90,
        delivery_longitude=-180,
        items=[{"menu_item_id": uuid.uuid4(), "quantity": 1}],
    )

    assert payload.delivery_latitude == 90
    assert payload.delivery_longitude == -180


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(91, 0), (-91, 0), (0, 181), (0, -181)],
)
def test_order_request_rejects_invalid_coordinates(latitude: float, longitude: float) -> None:
    with pytest.raises(ValidationError):
        OrderCreateRequest(
            restaurant_id=uuid.uuid4(),
            delivery_address="12 Example Street, Bengaluru",
            delivery_latitude=latitude,
            delivery_longitude=longitude,
            items=[{"menu_item_id": uuid.uuid4(), "quantity": 1}],
        )


def test_delivery_location_rejects_invalid_coordinates() -> None:
    with pytest.raises(ValidationError):
        DeliveryPartnerLocationUpdateRequest(latitude=0, longitude=200)
