
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Trophy, 
  Calendar as CalendarIcon, 
  MapPin, 
  FileText, 
  DollarSign,
  Image as ImageIcon,
  Check
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateTournament() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    entry_fee: '',
    prize_pool: '',
    max_teams: '16',
    banner_url: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg',
    rules: ''
  });

  const handleCreate = async () => {
    // Validation
    if (!formData.name || !formData.location || !formData.start_date || !formData.end_date) {
      Alert.alert('Missing Fields', 'Please fill in all required fields (Name, Location, Dates)');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a tournament');
        return;
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description,
          location: formData.location,
          start_date: formData.start_date,
          end_date: formData.end_date,
          entry_fee: parseFloat(formData.entry_fee) || 0,
          prize_pool: formData.prize_pool,
          max_teams: parseInt(formData.max_teams) || 16,
          banner_url: formData.banner_url,
          rules: formData.rules,
          organizer_id: user.id,
          status: 'upcoming'
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Tournament created successfully!', [
        { text: 'View Tournament', onPress: () => router.push(`/cricket-tournament/${data.id}`) }
      ]);
    } catch (error) {
      console.error('Error creating tournament:', error);
      Alert.alert('Error', 'Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, icon: Icon, keyboardType = 'default', multiline = false }: any) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, multiline && styles.multilineContainer]}>
        {Icon && <Icon size={20} color="#64748B" style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host Tournament</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.bannerPreviewContainer}>
          <Text style={styles.label}>Tournament Banner</Text>
          <View style={styles.bannerPreview}>
            <Trophy size={48} color="#E2E8F0" />
            <Text style={styles.bannerHint}>Using default banner</Text>
          </View>
        </View>

        <InputField 
          label="Tournament Name *" 
          value={formData.name} 
          onChangeText={(text: string) => setFormData({...formData, name: text})}
          placeholder="e.g. Summer Championship 2026"
          icon={Trophy}
        />

        <InputField 
          label="Location *" 
          value={formData.location} 
          onChangeText={(text: string) => setFormData({...formData, location: text})}
          placeholder="e.g. Gurugram, Sector 45"
          icon={MapPin}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField 
              label="Start Date *" 
              value={formData.start_date} 
              onChangeText={(text: string) => setFormData({...formData, start_date: text})}
              placeholder="YYYY-MM-DD"
              icon={CalendarIcon}
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={{ flex: 1 }}>
            <InputField 
              label="End Date *" 
              value={formData.end_date} 
              onChangeText={(text: string) => setFormData({...formData, end_date: text})}
              placeholder="YYYY-MM-DD"
              icon={CalendarIcon}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField 
              label="Entry Fee (₹)" 
              value={formData.entry_fee} 
              onChangeText={(text: string) => setFormData({...formData, entry_fee: text})}
              placeholder="e.g. 5000"
              icon={DollarSign}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={{ flex: 1 }}>
            <InputField 
              label="Max Teams" 
              value={formData.max_teams} 
              onChangeText={(text: string) => setFormData({...formData, max_teams: text})}
              placeholder="16"
              icon={Users}
              keyboardType="numeric"
            />
          </View>
        </View>

        <InputField 
          label="Prize Pool" 
          value={formData.prize_pool} 
          onChangeText={(text: string) => setFormData({...formData, prize_pool: text})}
          placeholder="e.g. ₹50,000 + Trophies"
          icon={Trophy}
        />

        <InputField 
          label="Description" 
          value={formData.description} 
          onChangeText={(text: string) => setFormData({...formData, description: text})}
          placeholder="Describe your tournament..."
          icon={FileText}
          multiline
        />

        <InputField 
          label="Rules & Regulations" 
          value={formData.rules} 
          onChangeText={(text: string) => setFormData({...formData, rules: text})}
          placeholder="List tournament rules..."
          icon={FileText}
          multiline
        />

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Check size={20} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.submitBtnText}>Create Tournament</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  bannerPreviewContainer: {
    marginBottom: 24,
  },
  bannerPreview: {
    height: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  bannerHint: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  multilineContainer: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#01b854',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
