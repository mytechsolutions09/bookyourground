import { Swords, Trophy, Users, BarChart3, PlayCircle } from 'lucide-react-native';

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Ladakh', 'Lakhshadweep', 'Puducherry', 'Andaman and Nicobar'
];

export const TABS = [
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'highlights', label: 'Highlights', icon: PlayCircle },
];

export const INITIAL_TEAMS_DATA = [];

export const TOURNAMENTS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47e',
    title: 'Pioneer Sports Park Practice Week',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=2000',
    status: 'Ongoing',
    location: 'Gurugram, Haryana',
    date: 'May 2024',
  }
];
