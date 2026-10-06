INSERT INTO users (id, email, password_hash, full_name, role)
VALUES
    ('8ca0465f-e154-4acd-9080-3b096b518f40', 'customer@example.com', 'pbkdf2_sha256$390000$custsalt123$3pcGvZQgiFxaws4M66hLTx22v53wQ_ciCcGHhnENX1o=', 'Priya Sharma', 'customer'),
    ('5bb65318-736e-4316-95a6-43fcbc90d2c1', 'restaurant@example.com', 'pbkdf2_sha256$390000$restsalt123$zWqQHemg9nQcrUg9b2xF8xpO73hXcjNxy_rnBQ7bDQo=', 'Ankit Rao', 'restaurant'),
    ('ef718518-cf6b-4c8d-96ea-e8f5bf14a08d', 'delivery@example.com', 'pbkdf2_sha256$390000$delisalt123$JFWuBU53pvCWMH8lPsil-k2qvE60ihD0TPVOCeTWNp4=', 'Ravi Kumar', 'delivery_partner')
ON CONFLICT (email) DO NOTHING;

INSERT INTO restaurants (id, owner_user_id, name, description, latitude, longitude)
VALUES (
    'f5f3a6c4-4daa-4cb0-a60c-8f56befd2ab6',
    '5bb65318-736e-4316-95a6-43fcbc90d2c1',
    'Copper Kadhai',
    'North Indian comfort food built for dispatch speed.',
    12.9719,
    77.6412
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, restaurant_id, name, description, price_minor, currency, available_inventory, is_available)
VALUES
    ('d0857943-a875-4882-8d90-5cb9d92cb1e5', 'f5f3a6c4-4daa-4cb0-a60c-8f56befd2ab6', 'Paneer Tikka Bowl', 'High-demand item for lock-contention demos.', 34900, 'INR', 5, TRUE),
    ('0cf1e5ab-b64e-4eb8-8d34-dd8b4d4f6478', 'f5f3a6c4-4daa-4cb0-a60c-8f56befd2ab6', 'Garlic Naan Set', 'Fast-prep side with smaller inventory.', 12900, 'INR', 8, TRUE),
    ('6eb26eaf-7e24-42d9-9a60-6799435bda25', 'f5f3a6c4-4daa-4cb0-a60c-8f56befd2ab6', 'Dal Makhani', 'Slow-cooked signature item.', 25900, 'INR', 6, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_partners (id, user_id, vehicle_type, is_available, current_latitude, current_longitude)
VALUES (
    'a7352b33-cc82-497f-923c-e9b4c767d86d',
    'ef718518-cf6b-4c8d-96ea-e8f5bf14a08d',
    'scooter',
    TRUE,
    12.9756,
    77.6387
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, role)
VALUES
    ('14ce0c00-0000-4000-8000-000000000001', 'customer2@example.com', 'pbkdf2_sha256$390000$custsalt123$3pcGvZQgiFxaws4M66hLTx22v53wQ_ciCcGHhnENX1o=', 'Aarav Menon', 'customer'),
    ('14ce0c00-0000-4000-8000-000000000002', 'customer3@example.com', 'pbkdf2_sha256$390000$custsalt123$3pcGvZQgiFxaws4M66hLTx22v53wQ_ciCcGHhnENX1o=', 'Meera Iyer', 'customer'),
    ('14ce0c00-0000-4000-8000-000000000003', 'customer4@example.com', 'pbkdf2_sha256$390000$custsalt123$3pcGvZQgiFxaws4M66hLTx22v53wQ_ciCcGHhnENX1o=', 'Kabir Rao', 'customer'),
    ('24ce0c00-0000-4000-8000-000000000001', 'restaurant2@example.com', 'pbkdf2_sha256$390000$restsalt123$zWqQHemg9nQcrUg9b2xF8xpO73hXcjNxy_rnBQ7bDQo=', 'Nisha Gowda', 'restaurant'),
    ('24ce0c00-0000-4000-8000-000000000002', 'restaurant3@example.com', 'pbkdf2_sha256$390000$restsalt123$zWqQHemg9nQcrUg9b2xF8xpO73hXcjNxy_rnBQ7bDQo=', 'Devika Nair', 'restaurant'),
    ('24ce0c00-0000-4000-8000-000000000003', 'restaurant4@example.com', 'pbkdf2_sha256$390000$restsalt123$zWqQHemg9nQcrUg9b2xF8xpO73hXcjNxy_rnBQ7bDQo=', 'Sanjay Kulkarni', 'restaurant'),
    ('24ce0c00-0000-4000-8000-000000000004', 'restaurant5@example.com', 'pbkdf2_sha256$390000$restsalt123$zWqQHemg9nQcrUg9b2xF8xpO73hXcjNxy_rnBQ7bDQo=', 'Farah Khan', 'restaurant'),
    ('34ce0c00-0000-4000-8000-000000000001', 'delivery2@example.com', 'pbkdf2_sha256$390000$delisalt123$JFWuBU53pvCWMH8lPsil-k2qvE60ihD0TPVOCeTWNp4=', 'Kiran Das', 'delivery_partner'),
    ('34ce0c00-0000-4000-8000-000000000002', 'delivery3@example.com', 'pbkdf2_sha256$390000$delisalt123$JFWuBU53pvCWMH8lPsil-k2qvE60ihD0TPVOCeTWNp4=', 'Neel Joseph', 'delivery_partner'),
    ('34ce0c00-0000-4000-8000-000000000003', 'delivery4@example.com', 'pbkdf2_sha256$390000$delisalt123$JFWuBU53pvCWMH8lPsil-k2qvE60ihD0TPVOCeTWNp4=', 'Sana Sheikh', 'delivery_partner'),
    ('34ce0c00-0000-4000-8000-000000000004', 'delivery5@example.com', 'pbkdf2_sha256$390000$delisalt123$JFWuBU53pvCWMH8lPsil-k2qvE60ihD0TPVOCeTWNp4=', 'Rohan Pillai', 'delivery_partner')
ON CONFLICT (email) DO NOTHING;

INSERT INTO restaurants (id, owner_user_id, name, description, latitude, longitude)
VALUES
    ('44ce0c00-0000-4000-8000-000000000001', '24ce0c00-0000-4000-8000-000000000001', 'Namma Dosa House', 'Crisp dosas and slow-ground chutneys from Bengaluru.', 12.9784, 77.6408),
    ('44ce0c00-0000-4000-8000-000000000002', '24ce0c00-0000-4000-8000-000000000002', 'Green Leaf Kitchen', 'Colourful vegetarian plates made fresh each day.', 12.9698, 77.6102),
    ('44ce0c00-0000-4000-8000-000000000003', '24ce0c00-0000-4000-8000-000000000003', 'Bengaluru Bowl Co.', 'Comforting rice bowls with a modern local twist.', 12.9611, 77.6387),
    ('44ce0c00-0000-4000-8000-000000000004', '24ce0c00-0000-4000-8000-000000000004', 'Little Italy Trattoria', 'Handmade pasta and wood-fired favourites.', 12.9850, 77.6050)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, restaurant_id, name, description, price_minor, currency, available_inventory, is_available)
VALUES
    ('54ce0c00-0000-4000-8000-000000000001', '44ce0c00-0000-4000-8000-000000000001', 'Masala Dosa', 'Golden fermented crepe with potato masala and coconut chutney.', 18900, 'INR', 18, TRUE),
    ('54ce0c00-0000-4000-8000-000000000002', '44ce0c00-0000-4000-8000-000000000001', 'Thatte Idli', 'Soft rice cakes with sambar and house-made podi.', 12900, 'INR', 20, TRUE),
    ('54ce0c00-0000-4000-8000-000000000003', '44ce0c00-0000-4000-8000-000000000001', 'Ghee Podi Pongal', 'Peppery lentil rice finished with warm ghee and cashews.', 16900, 'INR', 12, TRUE),
    ('54ce0c00-0000-4000-8000-000000000004', '44ce0c00-0000-4000-8000-000000000002', 'Garden Paneer Plate', 'Grilled paneer, seasonal greens, grains and mint dressing.', 32900, 'INR', 14, TRUE),
    ('54ce0c00-0000-4000-8000-000000000005', '44ce0c00-0000-4000-8000-000000000002', 'Avocado Millet Bowl', 'Millet, avocado, crunchy vegetables and lime tahini.', 35900, 'INR', 10, TRUE),
    ('54ce0c00-0000-4000-8000-000000000006', '44ce0c00-0000-4000-8000-000000000002', 'Coconut Vegetable Stew', 'Vegetables simmered gently in coconut milk with appam.', 27900, 'INR', 11, TRUE),
    ('54ce0c00-0000-4000-8000-000000000007', '44ce0c00-0000-4000-8000-000000000003', 'Pepper Chicken Bowl', 'Pepper roast chicken, rice, greens and cooling raita.', 34900, 'INR', 16, TRUE),
    ('54ce0c00-0000-4000-8000-000000000008', '44ce0c00-0000-4000-8000-000000000003', 'Paneer Tikka Rice Bowl', 'Smoky paneer, fragrant rice and a bright coriander salad.', 31900, 'INR', 15, TRUE),
    ('54ce0c00-0000-4000-8000-000000000009', '44ce0c00-0000-4000-8000-000000000003', 'Mango Lassi', 'Chilled yoghurt blended with ripe mango.', 9900, 'INR', 24, TRUE),
    ('54ce0c00-0000-4000-8000-000000000010', '44ce0c00-0000-4000-8000-000000000004', 'Roasted Tomato Rigatoni', 'Rigatoni tossed with slow-roasted tomato and basil.', 37900, 'INR', 13, TRUE),
    ('54ce0c00-0000-4000-8000-000000000011', '44ce0c00-0000-4000-8000-000000000004', 'Wild Mushroom Risotto', 'Creamy arborio rice with mushrooms and parmesan.', 42900, 'INR', 9, TRUE),
    ('54ce0c00-0000-4000-8000-000000000012', '44ce0c00-0000-4000-8000-000000000004', 'Burrata Garden Salad', 'Tomatoes, leaves, toasted sourdough and creamy burrata.', 39900, 'INR', 10, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_partners (id, user_id, vehicle_type, is_available, current_latitude, current_longitude)
VALUES
    ('64ce0c00-0000-4000-8000-000000000001', '34ce0c00-0000-4000-8000-000000000001', 'scooter', TRUE, 12.9791, 77.6354),
    ('64ce0c00-0000-4000-8000-000000000002', '34ce0c00-0000-4000-8000-000000000002', 'bicycle', TRUE, 12.9682, 77.6114),
    ('64ce0c00-0000-4000-8000-000000000003', '34ce0c00-0000-4000-8000-000000000003', 'scooter', TRUE, 12.9625, 77.6361),
    ('64ce0c00-0000-4000-8000-000000000004', '34ce0c00-0000-4000-8000-000000000004', 'motorcycle', TRUE, 12.9831, 77.6072)
ON CONFLICT (id) DO NOTHING;
