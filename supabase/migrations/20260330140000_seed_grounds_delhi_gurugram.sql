/*
  Seed sample grounds for:
  - New Delhi: 5 Cricket Ground + 5 Box Cricket
  - Gurugram:  5 Cricket Ground + 5 Box Cricket

  Total: 20 rows

  Notes:
  - approved=true, active=true so they are visible in the app.
  - owner_id is assigned to the preferred admin profile if present,
    otherwise any super_admin profile.
*/

with owner as (
  select p.id as owner_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = 'invirtualcoin@gmail.com' or p.role = 'super_admin'
  order by (lower(u.email) = 'invirtualcoin@gmail.com') desc
  limit 1
)
insert into public.grounds (
  owner_id,
  name,
  description,
  address,
  city,
  state,
  pincode,
  latitude,
  longitude,
  base_price_per_hour,
  pitch_type,
  ground_size,
  capacity,
  has_floodlights,
  has_parking,
  has_changing_rooms,
  has_pavilion,
  verified,
  approved,
  active
)
select
  o.owner_id,
  g.name,
  g.description,
  g.address,
  g.city,
  g.state,
  g.pincode,
  g.latitude,
  g.longitude,
  g.base_price_per_hour,
  g.pitch_type,
  g.ground_size,
  g.capacity,
  g.has_floodlights,
  g.has_parking,
  g.has_changing_rooms,
  g.has_pavilion,
  g.verified,
  g.approved,
  g.active
from owner o
cross join (
  values
    -- New Delhi - Cricket Ground (5)
    ('ND Cricket Ground 1', 'Outdoor turf ground for league matches.', 'Connaught Place Road 1', 'New Delhi', 'Delhi', '110001', 28.6300, 77.2167, 1200::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    ('ND Cricket Ground 2', 'Floodlit ground for evening bookings.', 'Saket Lane 2', 'New Delhi', 'Delhi', '110017', 28.5299, 77.2153, 1150::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    ('ND Cricket Ground 3', 'All-weather ground with easy parking.', 'Dwarka Sector 3 Road 3', 'New Delhi', 'Delhi', '110078', 28.5614, 77.0450, 1300::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, false, true, true, true, true),
    ('ND Cricket Ground 4', 'Quality turf with changing room available.', 'Rohini Sector 8 Street 4', 'New Delhi', 'Delhi', '110085', 28.7341, 77.1415, 1250::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    ('ND Cricket Ground 5', 'Prime location ground for friendly matches.', 'Vasant Kunj Avenue 5', 'New Delhi', 'Delhi', '110070', 28.5279, 77.1556, 1180::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, false, true, true, true, true, true),

    -- Gurugram - Cricket Ground (5)
    ('Gurugram Cricket Ground 1', 'Outdoor ground for team practices.', 'Golf Course Road 1', 'Gurugram', 'Haryana', '122001', 28.4595, 77.0266, 1050::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, false, true, true, true, true),
    ('Gurugram Cricket Ground 2', 'Evening friendly floodlit turf.', 'Cyber City Lane 2', 'Gurugram', 'Haryana', '122022', 28.4958, 77.0402, 1100::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    ('Gurugram Cricket Ground 3', 'Ground with pavilion seating.', 'Udyog Vihar Road 3', 'Gurugram', 'Haryana', '122016', 28.4407, 77.0880, 1200::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    ('Gurugram Cricket Ground 4', 'Well maintained ground for weekends.', 'Sushant Lok Street 4', 'Gurugram', 'Haryana', '122002', 28.4646, 77.1090, 1150::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, false, true, true, true, true, true),
    ('Gurugram Cricket Ground 5', 'Practice ground with parking access.', 'Sector 57 Road 5', 'Gurugram', 'Haryana', '122050', 28.4415, 77.1026, 1080::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, false, false, true, true, true),

    -- New Delhi - Box Cricket (5)
    ('ND Box Cricket 1', 'Indoor box cricket for quick sessions.', 'Connaught Place Box 1', 'New Delhi', 'Delhi', '110001', 28.6300, 77.2167, 800::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, false, true, true, true),
    ('ND Box Cricket 2', 'Protected indoor setup with changing room.', 'Saket Box Lane 2', 'New Delhi', 'Delhi', '110017', 28.5299, 77.2153, 780::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, true, true, true, true),
    ('ND Box Cricket 3', 'Indoor turf box with easy booking.', 'Dwarka Box Road 3', 'New Delhi', 'Delhi', '110078', 28.5614, 77.0450, 820::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, false, true, true, true, true),
    ('ND Box Cricket 4', 'Box cricket with pavilion seating.', 'Rohini Box Street 4', 'New Delhi', 'Delhi', '110085', 28.7341, 77.1415, 790::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, true, true, true, true),
    ('ND Box Cricket 5', 'Compact indoor box for friends.', 'Vasant Kunj Box 5', 'New Delhi', 'Delhi', '110070', 28.5279, 77.1556, 760::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, false, false, true, true, true),

    -- Gurugram - Box Cricket (5)
    ('Gurugram Box Cricket 1', 'Indoor box cricket with quick access.', 'Golf Course Box 1', 'Gurugram', 'Haryana', '122001', 28.4595, 77.0266, 750::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, false, true, true, true),
    ('Gurugram Box Cricket 2', 'Indoor box with changing rooms.', 'Cyber Box Lane 2', 'Gurugram', 'Haryana', '122022', 28.4958, 77.0402, 770::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, true, true, true, true),
    ('Gurugram Box Cricket 3', 'Indoor box with pavilion seating.', 'Udyog Vihar Box 3', 'Gurugram', 'Haryana', '122016', 28.4407, 77.0880, 790::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, false, true, true, true, true),
    ('Gurugram Box Cricket 4', 'Box cricket for regular practice.', 'Sushant Lok Box 4', 'Gurugram', 'Haryana', '122002', 28.4646, 77.1090, 760::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, false, true, true, true),
    ('Gurugram Box Cricket 5', 'Compact indoor box for groups.', 'Sector 57 Box 5', 'Gurugram', 'Haryana', '122050', 28.4415, 77.1026, 740::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, false, true, true, true, true)
 ) as g(
    name,
    description,
    address,
    city,
    state,
    pincode,
    latitude,
    longitude,
    base_price_per_hour,
    pitch_type,
    ground_size,
    capacity,
    has_floodlights,
    has_parking,
    has_changing_rooms,
    has_pavilion,
    verified,
    approved,
    active
  )
;

