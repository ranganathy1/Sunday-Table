from app.models import OrderStatus
from app.services.delivery import ACTIVE_DELIVERY_STATUSES, haversine_km


def test_haversine_distance_is_reasonable() -> None:
    bengaluru_mg_road = (12.9756, 77.6050)
    indiranagar = (12.9784, 77.6408)
    distance = haversine_km(*bengaluru_mg_road, *indiranagar)
    assert 3.0 < distance < 5.0


def test_active_delivery_statuses_keep_assigned_partners_reserved() -> None:
    assert ACTIVE_DELIVERY_STATUSES == (
        OrderStatus.PLACED,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.OUT_FOR_DELIVERY,
    )
    assert OrderStatus.DELIVERED not in ACTIVE_DELIVERY_STATUSES
    assert OrderStatus.CANCELLED not in ACTIVE_DELIVERY_STATUSES
