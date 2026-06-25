/*
  Seed grounds from the uploaded spreadsheet.
  All grounds inserted as approved=true, active=true.
  owner_id = super_admin (invirtualcoin@gmail.com).

  Grounds from the sheet (read from image):
  1.  Ambala Cricket Ground
  2.  DPGITM Sports Complex
  3.  Hare Knoll Cricket Ground (Sector 72)
  4.  Worldplex Sports Ground
  5.  Sturgeon Rain Barn Cricket Ground
  6.  Ilog Sports Cricket Ground (CSBT Road)
  7.  Academy Sound Cricket Ground
  8.  Boundary Box Cricket Arena
  9.  Blue Parlor Box Cricket
  10. Sun Tags Cricket Ground
  11. Strike Ani Strike Cricket Ground
  12. JetStar Cricket Ground
  13. CHC Town Cricket Ground (Bengaluru)
  14. India Agencia Sports Ground
  15. Bells Of DunDablian Box Cricket
  16. Kraft DrinkPole Star Cricket Ground
  17. Staffora Caresema Cricket Ground
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
    -- 1. Ambala Cricket Ground
    ('Ambala Cricket Ground', 'Professional cricket ground for league and practice matches.', 'Ambala, Haryana', 'Ambala', 'Haryana', '133001', 30.3752::decimal(10,8), 76.7821::decimal(11,8), 1200::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    -- 2. DPGITM Sports Complex
    ('DPGITM Sports Complex', 'Sports complex with outdoor cricket facilities.', 'DPGITM Campus, Gurugram', 'Gurugram', 'Haryana', '122006', 28.4089::decimal(10,8), 76.9726::decimal(11,8), 900::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    -- 3. Hare Knoll Cricket Ground
    ('Hare Knoll Cricket Ground', 'Premium cricket ground in Sector 72.', 'Sector 72, Gurugram', 'Gurugram', 'Haryana', '122101', 28.4200::decimal(10,8), 77.0620::decimal(11,8), 1100::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    -- 4. Worldplex Sports Ground
    ('Worldplex Sports Ground', 'Multi-sport facility with top-notch cricket turf.', 'Worldplex, Gurugram', 'Gurugram', 'Haryana', '122016', 28.4597::decimal(10,8), 77.0898::decimal(11,8), 1050::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, false, true, true, true, true),
    -- 5. Sturgeon Rain Barn
    ('Sturgeon Rain Barn Cricket Ground', 'Outdoor turf with pavilion for team events.', 'Chlorum, Gurugram', 'Gurugram', 'Haryana', '122001', 28.4700::decimal(10,8), 77.0300::decimal(11,8), 1150::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    -- 6. Ilog Sports
    ('Ilog Sports Cricket Ground', 'Popular cricket ground near CSBT Road.', 'CSBT Road, Gurugram', 'Gurugram', 'Haryana', '122006', 28.4800::decimal(10,8), 77.0550::decimal(11,8), 1000::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    -- 7. Academy Sound
    ('Academy Sound Cricket Ground', 'Well-maintained cricket ground for all formats.', 'Academy Road, Gurugram', 'Gurugram', 'Haryana', '122002', 28.4620::decimal(10,8), 77.0720::decimal(11,8), 950::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, false, true, true, false, true, true, true),
    -- 8. Boundary Box Cricket
    ('Boundary Box Cricket Arena', 'Indoor box cricket with premium turf and lighting.', 'Boundary Complex, Gurugram', 'Gurugram', 'Haryana', '122018', 28.4500::decimal(10,8), 77.0400::decimal(11,8), 800::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, false, true, true, true),
    -- 9. Blue Parlor Box Cricket
    ('Blue Parlor Box Cricket', 'Indoor box cricket near Bellowfarm area.', 'Bellowfarm Road, Gurugram', 'Gurugram', 'Haryana', '122003', 28.4900::decimal(10,8), 77.0150::decimal(11,8), 750::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, true, true, true, true),
    -- 10. Sun Tags Cricket Ground
    ('Sun Tags Cricket Ground', 'Open-air cricket facility for evening matches.', 'Sector S3, Gurugram', 'Gurugram', 'Haryana', '122051', 28.4650::decimal(10,8), 76.9800::decimal(11,8), 1080::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, false, true, true, true, true),
    -- 11. Strike Ani Strike
    ('Strike Ani Strike Cricket Ground', 'Full-size turf ground for tournaments and league play.', 'Strike Complex, Gurugram', 'Gurugram', 'Haryana', '122022', 28.4958::decimal(10,8), 77.0402::decimal(11,8), 1200::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    -- 12. JetStar Cricket Ground
    ('JetStar Cricket Ground', 'Spacious ground with parking and changing rooms.', 'JetStar Complex, Gurugram', 'Gurugram', 'Haryana', '122001', 28.4595::decimal(10,8), 77.0266::decimal(11,8), 1150::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    -- 13. CHC Town Cricket Ground
    ('CHC Town Cricket Ground', 'Cricket ground in Bengaluru with full facilities.', 'CHC Town, Bengaluru', 'Bengaluru', 'Karnataka', '560001', 12.9716::decimal(10,8), 77.5946::decimal(11,8), 1300::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true),
    -- 14. India Agencia Sports Ground
    ('India Agencia Sports Ground', 'Well-equipped sports ground near Bengaluru centre.', 'India Agencia, Bengaluru', 'Bengaluru', 'Karnataka', '560002', 12.9720::decimal(10,8), 77.5950::decimal(11,8), 1100::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, false, true, true, true, true),
    -- 15. Bells Of DunDablian
    ('Bells Of DunDablian Box Cricket', 'Indoor box cricket in DunDablian area.', 'DunDablian Road, Gurugram', 'Gurugram', 'Haryana', '122004', 28.4700::decimal(10,8), 77.0600::decimal(11,8), 780::decimal(10,2), 'Box Cricket', 'Box', 6::int, false, false, true, false, true, true, true),
    -- 16. Kraft DrinkPole Star
    ('Kraft DrinkPole Star Cricket Ground', 'Premium cricket facility with floodlights.', 'Pole Star, Gurugram', 'Gurugram', 'Haryana', '122009', 28.4850::decimal(10,8), 77.0850::decimal(11,8), 1050::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, false, true, true, true),
    -- 17. Staffora Caresema
    ('Staffora Caresema Cricket Ground', 'Ground with pavilion for league and friendly matches.', 'Caresema, Gurugram', 'Gurugram', 'Haryana', '122007', 28.4400::decimal(10,8), 77.0200::decimal(11,8), 990::decimal(10,2), 'Cricket Ground', 'Standard', 22::int, true, true, true, true, true, true, true)
) as g(
  name, description, address, city, state, pincode,
  latitude, longitude, base_price_per_hour,
  pitch_type, ground_size, capacity,
  has_floodlights, has_parking, has_changing_rooms, has_pavilion,
  verified, approved, active
)
on conflict do nothing;
