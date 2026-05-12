import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ---------- Types ----------
interface OwnerDetails {
  name: string;
  company: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  venueName: string;
}

interface PlatformComm {
  type: 'percent' | 'flat';
  value: string;
  gst: boolean;
}

// ---------- Signature Pad (Web only canvas) ----------
function SignaturePad({
  onSign,
  onClear,
  signed,
}: {
  onSign: (dataUrl: string) => void;
  onClear: () => void;
  signed: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: (e as TouchEvent).touches[0].clientX - rect.left,
        y: (e as TouchEvent).touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    };
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1a2e44';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const onDown = (e: MouseEvent | TouchEvent) => {
      drawing.current = true;
      lastPos.current = getPos(e, canvas);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current || !lastPos.current) return;
      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    };
    const onUp = () => {
      if (drawing.current) {
        drawing.current = false;
        lastPos.current = null;
        onSign(canvas.toDataURL());
      }
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [onSign]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={sigStyles.nativeBox}>
        <Text style={sigStyles.nativeText}>
          Signature pad is only available on the web version.
        </Text>
      </View>
    );
  }

  return (
    <View style={sigStyles.wrapper}>
      {/* @ts-ignore – canvas is web-only */}
      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        style={{
          border: '2px dashed #d1d5db',
          borderRadius: 12,
          background: signed ? '#f0fdf4' : '#fafafa',
          cursor: 'crosshair',
          width: '100%',
          maxWidth: 600,
          touchAction: 'none',
          display: 'block',
        }}
      />
      <View style={sigStyles.row}>
        <Text style={sigStyles.hint}>
          {signed ? '✅ Signature captured' : 'Draw your signature above'}
        </Text>
        <TouchableOpacity style={sigStyles.clearBtn} onPress={clearCanvas}>
          <Text style={sigStyles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sigStyles = StyleSheet.create({
  wrapper: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  hint: { fontSize: 13, color: '#6B7280' },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  clearBtnText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  nativeBox: {
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  nativeText: { color: '#6B7280', fontSize: 14 },
});

// ---------- Contract Text Component ----------
function Bullet({ text }: { text: string }) {
  return (
    <View style={ctStyles.bulletRow}>
      <Text style={ctStyles.bulletDot}>•</Text>
      <Text style={ctStyles.bulletText}>{text}</Text>
    </View>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={ctStyles.subSection}>
      <Text style={ctStyles.subSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ContractText({ d, comm }: { d: OwnerDetails; comm: PlatformComm }) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const blank = (val: string, placeholder: string) =>
    val.trim() ? val : `[${placeholder}]`;

  return (
    <View style={ctStyles.container}>
      {/* Title */}
      <Text style={ctStyles.title}>GROUND LISTING AND SERVICE AGREEMENT</Text>
      <Text style={ctStyles.website}>bookyourground.com</Text>
      <Text style={ctStyles.body}>
        This Ground Listing and Service Agreement ("Agreement") is made and entered into on this{' '}
        <Text style={ctStyles.bold}>{today}</Text> ("Effective Date").
      </Text>

      {/* Parties */}
      <Text style={ctStyles.byBetween}>BY AND BETWEEN</Text>

      <View style={ctStyles.partyBlock}>
        <Text style={ctStyles.partyName}>Purple Plus</Text>
        <Text style={ctStyles.partyDesc}>
          A sports venue booking platform operated by Purple Plus, having its registered office
          at Janak Puri, New Delhi{'\n'}
          (hereinafter referred to as the <Text style={ctStyles.bold}>"Platform"</Text> or <Text style={ctStyles.bold}>"Company"</Text>)
        </Text>
      </View>

      <Text style={ctStyles.andText}>AND</Text>

      <View style={ctStyles.partyBlock}>
        <Text style={ctStyles.partyName}>
          {blank(d.company || d.name, 'Venue Owner / Venue Name')}
        </Text>
        <Text style={ctStyles.partyDesc}>
          having its principal place of business at:{'\n'}
          {blank(d.address, 'Venue Address')}{d.city ? `, ${d.city}` : ''}{'\n'}
          (hereinafter referred to as the <Text style={ctStyles.bold}>"Venue Owner"</Text> or <Text style={ctStyles.bold}>"Partner"</Text>)
        </Text>
      </View>

      <Text style={ctStyles.body}>
        The Platform and the Partner shall collectively be referred to as the{' '}
        <Text style={ctStyles.bold}>"Parties"</Text>.
      </Text>

      {/* 1. Purpose */}
      <Text style={ctStyles.sectionTitle}>1. PURPOSE</Text>
      <Text style={ctStyles.body}>
        The purpose of this Agreement is to define the terms under which the Venue Owner agrees to
        list and make available its sports facility/facilities ("Venue") on the Purple Plus
        platform including website, mobile application, and associated digital services.
      </Text>

      {/* 2. Platform Services */}
      <Text style={ctStyles.sectionTitle}>2. PLATFORM SERVICES</Text>

      <SubSection title="2.1 Venue Listing">
        <Text style={ctStyles.body}>
          The Venue "<Text style={ctStyles.bold}>{blank(d.venueName, 'Venue Name')}</Text>" shall be displayed on the Platform with relevant information including:
        </Text>
        <Bullet text="Venue name & location" />
        <Bullet text="Photographs" />
        <Bullet text="Amenities" />
        <Bullet text="Pricing" />
        <Bullet text="Operating hours" />
        <Bullet text="Slot availability" />
      </SubSection>

      <SubSection title="2.2 Booking Management">
        <Text style={ctStyles.body}>The Platform shall provide:</Text>
        <Bullet text="Online booking functionality" />
        <Bullet text="Slot management" />
        <Bullet text="Payment collection" />
        <Bullet text="Booking confirmation system" />
      </SubSection>

      <SubSection title="2.3 Dashboard Access">
        <Text style={ctStyles.body}>The Partner shall receive access to a partner dashboard for:</Text>
        <Bullet text="Inventory management" />
        <Bullet text="Slot blocking" />
        <Bullet text="Booking tracking" />
        <Bullet text="Revenue monitoring" />
      </SubSection>

      <SubSection title="2.4 Promotions & Marketing">
        <Text style={ctStyles.body}>The Platform may promote the Venue through:</Text>
        <Bullet text="Social media" />
        <Bullet text="Paid advertisements" />
        <Bullet text="Email campaigns" />
        <Bullet text="In-app promotions" />
        <Bullet text="Influencer collaborations" />
      </SubSection>

      {/* 3. Ground Owner Obligations */}
      <Text style={ctStyles.sectionTitle}>3. VENUE OWNER OBLIGATIONS</Text>
      <Text style={ctStyles.body}>The Venue Owner agrees to:</Text>

      <SubSection title="3.1 Accurate Information">
        <Text style={ctStyles.body}>Provide complete and accurate information regarding:</Text>
        <Bullet text="Pricing" />
        <Bullet text="Facilities & dimensions" />
        <Bullet text="Images" />
        <Bullet text="Amenities" />
        <Bullet text="Operating hours" />
      </SubSection>

      <SubSection title="3.2 Availability Management">
        <Text style={ctStyles.body}>
          Maintain accurate slot availability at all times and immediately block slots booked
          through offline channels.
        </Text>
      </SubSection>

      <SubSection title="3.3 Honor Confirmed Bookings">
        <Text style={ctStyles.body}>
          Honor all bookings confirmed through the Platform without discrimination or additional
          unauthorized charges.
        </Text>
      </SubSection>

      <SubSection title="3.4 Venue Maintenance">
        <Text style={ctStyles.body}>
          Maintain the Venue in a safe, clean, operational, and playable condition.
        </Text>
      </SubSection>

      <SubSection title="3.5 User Experience">
        <Text style={ctStyles.body}>
          Ensure professional conduct toward all users booked through the Platform.
        </Text>
      </SubSection>

      {/* 4. Commercial Terms */}
      <Text style={ctStyles.sectionTitle}>4. COMMERCIAL TERMS</Text>

      <SubSection title="4.1 Commission">
        <Text style={ctStyles.body}>The Platform shall charge a commission of:</Text>
        <View style={ctStyles.highlightBox}>
          <Text style={ctStyles.highlightText}>
            {comm.type === 'percent'
              ? `${comm.value}% per successful booking`
              : `₹${comm.value} per team per booking`}
          </Text>
          {comm.gst && (
            <Text style={ctStyles.highlightSub}>+ GST applicable (exclusive of taxes)</Text>
          )}
        </View>
        <Text style={[ctStyles.body, { marginTop: 6 }]}>
          {comm.gst
            ? 'Exclusive of applicable taxes (GST extra) unless otherwise agreed between the Parties.'
            : 'Inclusive of applicable taxes unless otherwise agreed between the Parties.'}
        </Text>
      </SubSection>

      <SubSection title="4.2 Payments & Payouts">
        <Text style={ctStyles.body}>
          Payouts shall be processed on a Weekly / Bi-Weekly / Monthly basis after deduction of:
        </Text>
        <Bullet text="Commission" />
        <Bullet text="Taxes" />
        <Bullet text="Refunds" />
        <Bullet text="Applicable charges" />
        <Text style={[ctStyles.body, { marginTop: 6 }]}>
          Payments shall be made to the Partner's registered bank account.
        </Text>
      </SubSection>

      {/* 5. Cancellation & Refund Policy */}
      <Text style={ctStyles.sectionTitle}>5. CANCELLATION & REFUND POLICY</Text>

      <SubSection title="5.1 User Cancellation">
        <Text style={ctStyles.body}>
          User cancellations shall follow the Platform's standard cancellation policy.
        </Text>
      </SubSection>

      <SubSection title="5.2 Venue Cancellation">
        <Text style={ctStyles.body}>
          The Venue Owner shall not cancel confirmed bookings except in cases of:
        </Text>
        <Bullet text="Force majeure" />
        <Bullet text="Unsafe weather conditions" />
        <Bullet text="Technical failure" />
        <Bullet text="Government restrictions" />
        <Bullet text="Emergency maintenance" />
        <Text style={[ctStyles.body, { marginTop: 8 }]}>
          Repeated cancellations may result in:
        </Text>
        <Bullet text="Penalties" />
        <Bullet text="Temporary suspension" />
        <Bullet text="Permanent delisting" />
      </SubSection>

      {/* 6. Liability & Indemnity */}
      <Text style={ctStyles.sectionTitle}>6. LIABILITY & INDEMNITY</Text>

      <SubSection title="6.1 Venue Responsibility">
        <Text style={ctStyles.body}>The Venue Owner shall remain solely responsible for:</Text>
        <Bullet text="Venue operations" />
        <Bullet text="Player safety & on-ground incidents" />
        <Bullet text="Property management" />
      </SubSection>

      <SubSection title="6.2 Indemnification">
        <Text style={ctStyles.body}>
          The Partner agrees to indemnify and hold harmless Purple Plus against:
        </Text>
        <Bullet text="Legal claims" />
        <Bullet text="Injuries & damages" />
        <Bullet text="Disputes & losses arising at the Venue" />
      </SubSection>

      <SubSection title="6.3 Platform Role">
        <Text style={ctStyles.body}>
          The Platform acts solely as a technology intermediary facilitating bookings.
        </Text>
      </SubSection>

      {/* 7. Term & Termination */}
      <Text style={ctStyles.sectionTitle}>7. TERM & TERMINATION</Text>

      <SubSection title="7.1 Agreement Term">
        <Text style={ctStyles.body}>
          This Agreement shall remain valid for <Text style={ctStyles.bold}>1 Year</Text> from the
          Effective Date and auto-renew thereafter unless terminated.
        </Text>
      </SubSection>

      <SubSection title="7.2 Termination">
        <Text style={ctStyles.body}>
          Either Party may terminate this Agreement with <Text style={ctStyles.bold}>30 days written notice</Text>.
        </Text>
        <Text style={[ctStyles.body, { marginTop: 8 }]}>
          The Platform may immediately suspend or terminate the listing in case of:
        </Text>
        <Bullet text="Fraud" />
        <Bullet text="Repeated customer complaints" />
        <Bullet text="Denial of confirmed bookings" />
        <Bullet text="Breach of Agreement" />
      </SubSection>

      {/* 8. Intellectual Property */}
      <Text style={ctStyles.sectionTitle}>8. INTELLECTUAL PROPERTY</Text>
      <Text style={ctStyles.body}>
        The Partner grants Purple Plus the right to use:
      </Text>
      <Bullet text="Venue name & logos" />
      <Bullet text="Images" />
      <Bullet text="Promotional material" />
      <Text style={[ctStyles.body, { marginTop: 6 }]}>
        For marketing and platform display purposes during the Agreement period.
      </Text>

      {/* 9. Confidentiality */}
      <Text style={ctStyles.sectionTitle}>9. CONFIDENTIALITY</Text>
      <Text style={ctStyles.body}>
        Both Parties agree not to disclose confidential business information including:
      </Text>
      <Bullet text="Customer information" />
      <Bullet text="Operational data" />
      <Bullet text="Financial records" />
      <Text style={[ctStyles.body, { marginTop: 6 }]}>Without prior written consent.</Text>

      {/* 10. Governing Law */}
      <Text style={ctStyles.sectionTitle}>10. GOVERNING LAW</Text>
      <Text style={ctStyles.body}>
        This Agreement shall be governed under the laws of India. Any disputes arising under this
        Agreement shall be subject to the exclusive jurisdiction of the courts of{' '}
        <Text style={ctStyles.bold}>
          {blank(d.state, 'State')}, India
        </Text>.
      </Text>

      {/* 11. Force Majeure */}
      <Text style={ctStyles.sectionTitle}>11. FORCE MAJEURE</Text>
      <Text style={ctStyles.body}>
        Neither Party shall be liable for failure to perform obligations caused by:
      </Text>
      <Bullet text="Natural disasters" />
      <Bullet text="Pandemics" />
      <Bullet text="War or strikes" />
      <Bullet text="Governmental restrictions" />
      <Bullet text="Unavoidable technical failures" />
    </View>
  );
}

const ctStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFEF7',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#043529',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  website: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  byBetween: {
    fontSize: 12,
    fontWeight: '800',
    color: '#043529',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  andText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 8,
  },
  partyBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#00ea6b',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 4,
  },
  partyDesc: { fontSize: 12, color: '#374151', lineHeight: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#043529',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 0.6,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
    paddingBottom: 4,
  },
  subSection: { marginTop: 10, marginLeft: 4 },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  body: { fontSize: 12.5, color: '#374151', lineHeight: 19 },
  bold: { fontWeight: '700', color: '#111827' },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 3,
    marginLeft: 8,
  },
  bulletDot: {
    fontSize: 13,
    color: '#00ea6b',
    marginRight: 7,
    lineHeight: 19,
    fontWeight: '700',
  },
  bulletText: { fontSize: 12.5, color: '#374151', lineHeight: 19, flex: 1 },
  highlightBox: {
    marginTop: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00ea6b',
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  highlightSub: {
    fontSize: 12,
    color: '#059669',
    marginTop: 3,
  },
});

// ---------- Main Screen ----------
const STEPS = ['Your Details', 'Review Contract', 'Sign & Submit'];

export default function OwnerContractScreen() {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<OwnerDetails>({
    name: '',
    company: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    venueName: '',
  });
  const [platformComm, setPlatformComm] = useState<PlatformComm>({
    type: 'percent', value: '10', gst: true,
  });
  const [signatureData, setSignatureData] = useState<string>('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch commission config from platform_settings on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('key,value')
          .in('key', ['contract_commission_type', 'contract_commission_value', 'contract_commission_gst']);
        if (!data) return;
        const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
        setPlatformComm({
          type: map['contract_commission_type'] === 'flat' ? 'flat' : 'percent',
          value: String(map['contract_commission_value'] ?? '10'),
          gst: map['contract_commission_gst'] === true || map['contract_commission_gst'] === 'true',
        });
      } catch (e) { console.error(e); }
    })();
  }, []);

  const update = (field: keyof OwnerDetails) => (val: string) =>
    setDetails((prev) => ({ ...prev, [field]: val }));

  const canProceedStep0 =
    details.name.trim() &&
    details.email.trim() &&
    details.phone.trim() &&
    details.venueName.trim();

  const canSubmit = signatureData && agreed;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contract_submissions').insert({
        owner_name: details.name,
        company: details.company,
        venue_name: details.venueName,
        address: details.address,
        city: details.city,
        state: details.state,
        phone: details.phone,
        email: details.email,
        commission_type: platformComm.type === 'percent' ? '%' : '₹',
        commission_value: platformComm.value,
        gst_included: platformComm.gst,
        signature_data: signatureData,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.message ?? 'Submission failed. Please try again.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Partner Agreement</Text>
          <Text style={styles.headerSub}>
            Purple Plus · Venue Owner Contract
          </Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    i < step && styles.stepDone,
                    i === step && styles.stepActive,
                  ]}
                >
                  {i < step ? (
                    <Text style={styles.stepCheckText}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.stepNum,
                        i === step && styles.stepNumActive,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    i === step && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={[styles.stepLine, i < step && styles.stepLineDone]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── STEP 0: Owner Details ── */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Information</Text>
            <Text style={styles.cardSub}>
              Fill in your details. These will appear in the contract.
            </Text>

            <Field
              label="Full Name *"
              value={details.name}
              onChange={update('name')}
              placeholder="e.g. Rahul Sharma"
            />
            <Field
              label="Company / Venue Owner Name"
              value={details.company}
              onChange={update('company')}
              placeholder="e.g. Sharma Sports Pvt. Ltd."
            />
            <Field
              label="Venue / Ground Name *"
              value={details.venueName}
              onChange={update('venueName')}
              placeholder="e.g. Greenfield Cricket Academy"
            />
            <Field
              label="Address"
              value={details.address}
              onChange={update('address')}
              placeholder="Street / Locality"
            />
            <Field
              label="City"
              value={details.city}
              onChange={update('city')}
              placeholder="e.g. Hyderabad"
            />
            <StateSelect
              value={details.state}
              onChange={update('state')}
            />
            <Field
              label="Phone Number *"
              value={details.phone}
              onChange={update('phone')}
              placeholder="+91 9876543210"
              keyboardType="phone-pad"
            />
            <Field
              label="Email Address *"
              value={details.email}
              onChange={update('email')}
              placeholder="owner@example.com"
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, !canProceedStep0 && styles.btnDisabled]}
              onPress={() => canProceedStep0 && setStep(1)}
              disabled={!canProceedStep0}
            >
              <Text style={styles.primaryBtnText}>
                Continue to Review Contract
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 1: Review Contract ── */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Review Your Contract</Text>
            <Text style={styles.cardSub}>
              Read the full agreement below. Your details are pre-filled.
            </Text>
            <ContractText d={details} comm={platformComm} />
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => setStep(0)}
              >
                <Text style={styles.outlineBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setStep(2)}
              >
                <Text style={styles.primaryBtnText}>Proceed to Sign</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 2: Sign & Submit ── */}
        {step === 2 && !submitted && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign the Agreement</Text>
            <Text style={styles.cardSub}>
              Draw your signature below using your mouse or finger.
            </Text>

            {/* Owner signature */}
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>
                Your Signature — {details.name || 'Venue Owner'}
              </Text>
              <SignaturePad
                onSign={(data) => setSignatureData(data)}
                onClear={() => setSignatureData('')}
                signed={!!signatureData}
              />
            </View>

            {/* Agreement checkbox */}
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAgreed((v) => !v)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                I have read and agree to the Book Your Ground Listing and Service
                Agreement. I confirm that the information provided is accurate.
              </Text>
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => setStep(1)}
              >
                <Text style={styles.outlineBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !canSubmit && styles.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#043529" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── SUCCESS ── */}
        {submitted && (
          <View style={[styles.card, styles.successCard]}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Contract Signed!</Text>
            <Text style={styles.successSub}>
              Thank you, {details.name}. Your signed agreement has been received.
              Our team will review it and contact you at{' '}
              <Text style={{ fontWeight: '700' }}>{details.email}</Text> within
              24–48 hours.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 24 }]}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.primaryBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );

  return content;
}

// ---------- Field Helper ----------
function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          isFocused && { borderColor: '#00ea6b' }
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Lakshadweep', 'Puducherry', 'Jammu and Kashmir', 'Ladakh'
].sort();

function StateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (Platform.OS === 'web') {
    return (
      <View style={fieldStyles.wrapper}>
        <Text style={fieldStyles.label}>State *</Text>
        {/* @ts-ignore */}
        <div style={{ position: 'relative' }}>
          {/* @ts-ignore */}
          <select
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              width: '100%',
              border: '1.5px solid #D1D5DB',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '14px',
              color: value ? '#111827' : '#9CA3AF',
              backgroundColor: '#fff',
              outlineColor: '#00ea6b',
              appearance: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {/* @ts-ignore */}
            <option value="" disabled>Select a state</option>
            {INDIAN_STATES.map((state) => (
              /* @ts-ignore */
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {/* @ts-ignore */}
          <div style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>▼</Text>
          </div>
        </div>
      </View>
    );
  }

  return (
    <Field
      label="State *"
      value={value}
      onChange={onChange}
      placeholder="e.g. Maharashtra"
    />
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    // @ts-ignore web only
    outlineColor: '#00ea6b',
  },
});

// ---------- Commission Field Styles ----------
const commStyles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: '#043529' },
  toggleBtnText: { fontSize: 15, fontWeight: '700', color: '#9CA3AF' },
  toggleBtnTextActive: { color: '#fff' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    // @ts-ignore web only
    outlineColor: '#10b981',
  },
  prefix: { fontSize: 15, color: '#374151', fontWeight: '600', marginRight: 2 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
  },
  suffix: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxOn: { backgroundColor: '#00ea6b', borderColor: '#00ea6b' },
  checkMark: { color: '#043529', fontSize: 12, fontWeight: '800' },
  gstLabel: { fontSize: 13, color: '#374151' },
});


// ---------- Page Styles ----------
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 32 : 64,
    paddingBottom: 48,
    paddingHorizontal: 16,
  },

  // Header
  header: { alignItems: 'center', marginBottom: 28 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#043529',
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 0,
  },
  stepItem: { alignItems: 'center', minWidth: 90 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepActive: { backgroundColor: '#00ea6b' },
  stepDone: { backgroundColor: '#00ea6b' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  stepNumActive: { color: '#4B5563' },
  stepCheckText: { fontSize: 16, color: '#4B5563', fontWeight: '700' },
  stepLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  stepLabelActive: { color: '#4B5563', fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 22, maxWidth: 60 },
  stepLineDone: { backgroundColor: '#00ea6b' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSub: { fontSize: 14, color: '#6B7280', marginBottom: 20 },

  // Buttons
  primaryBtn: {
    backgroundColor: '#00ea6b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  primaryBtnText: { color: '#043529', fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  outlineBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  submitBtn: {
    backgroundColor: '#00ea6b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  submitBtnText: { color: '#043529', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },

  // Signature blocks
  sigBlock: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  sigLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00ea6b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  preSigned: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  preSignedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
    fontStyle: 'italic',
  },
  preSignedSub: { fontSize: 12, color: '#059669', marginTop: 4 },

  // Checkbox
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#00ea6b', borderColor: '#00ea6b' },
  checkMark: { color: '#043529', fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 13, color: '#374151', lineHeight: 20, flex: 1 },

  // Success
  successCard: { alignItems: 'center', paddingVertical: 48 },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#00ea6b',
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
});
