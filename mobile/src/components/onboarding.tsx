import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Camera from '../../assets/figma/camera.svg';
import SearchIcon from '../../assets/figma/ai-search.svg';
import Chevron from '../../assets/figma/setup-chevron.svg';
import SplashMask from '../../assets/figma/onboarding/splash-mask.svg';
import SplashBody from '../../assets/figma/onboarding/splash-body.svg';
import SplashEarLeft from '../../assets/figma/onboarding/splash-head.svg';
import SplashEarRight from '../../assets/figma/onboarding/splash-ear-right.svg';
import SplashEyes from '../../assets/figma/onboarding/splash-mouth.svg';
import SplashHead from '../../assets/figma/onboarding/splash-eyes.svg';
import SplashMouth from '../../assets/figma/onboarding/splash-ear-left.svg';
import { HomeDog } from './home-dogs';
import { useCare } from '../lib/care-store';
import { emptyDate, months, parseDate, time24, type DateParts } from '../lib/dates';
import { cephalexinInformation, medicationCatalog } from '../lib/medication-catalog';
import { PopupSheet, popupSheetStyles } from './ui';

const Figma = {
  gray: '#D9D9D9',
  lightGray: '#F3F3F3',
  placeholder: '#878787',
  text: '#303030',
  secondary: '#505050',
  orange: '#E18F3F',
  peach: '#FFD6AE',
  border: '#AFAFAF',
  white: '#FFFFFF',
} as const;

const allerta = 'Allerta_400Regular';
const jakartaMedium = 'PlusJakartaSans_500Medium';
const jakartaBold = 'PlusJakartaSans_700Bold';

type RecipientDraft = {
  name: string;
  birth: DateParts;
  sex: string;
  pregnant: string;
  bloodType: string;
  height: string;
  weight: string;
  conditions: string[];
  allergies: string[];
};

type Step = 'splash' | 'recipient' | 'recipient-filled' | 'search' | 'match' | 'information' | 'administration' | 'prescription' | 'assign';

const recipientOptions = [
  { label: 'Female', value: 'Female' },
  { label: 'Male', value: 'Male' },
  { label: 'Other', value: 'Other' },
];
const pregnancyOptions = [
  { label: 'No', value: 'No' },
  { label: 'Yes', value: 'Yes' },
  { label: 'Not applicable', value: 'Not applicable' },
];
const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => ({ label: value, value }));
const monthOptions = months.map((label, index) => ({ label, value: String(index + 1) }));
const unitOptions = ['mg', 'mcg', 'g', 'mL', 'IU'].map((value) => ({ label: value, value }));

function Progress({ active }: { active: number }) {
  return <View pointerEvents="none" style={s.progress} accessibilityLabel={`Onboarding step ${active} of 5`}>
    {[0, 1, 2, 3, 4].map((index) => <View key={index} style={[s.progressBar, { backgroundColor: index < active ? Figma.peach : Figma.lightGray }]} />)}
  </View>;
}

function Frame({ children, progress, wide = false }: { children: ReactNode; progress?: number; wide?: boolean }) {
  return <KeyboardAvoidingView style={s.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scroll, wide ? s.scrollWide : null]}>
      <View style={wide ? s.wideContent : s.narrowContent}>{children}</View>
    </ScrollView>
    {progress !== undefined ? <Progress active={progress} /> : null}
  </KeyboardAvoidingView>;
}

function FigmaInput({ multiline = false, style, ...props }: ComponentProps<typeof TextInput> & { multiline?: boolean }) {
  return <TextInput
    {...props}
    multiline={multiline}
    placeholderTextColor={Figma.placeholder}
    style={[s.input, multiline ? s.multiline : null, style]}
  />;
}

function Button({ title, onPress, disabled = false, orange = false }: { title: string; onPress: () => void; disabled?: boolean; orange?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, orange ? s.orangeButton : null, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <Text style={s.buttonText}>{title}</Text>
  </Pressable>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text>{children}</View>;
}

function ReadOnlyField({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return <Field label={label}><View style={s.inputRow}><Text style={s.valueText}>{value}</Text>{suffix ? <Text style={s.suffix}>{suffix}</Text> : null}</View></Field>;
}

function TapSelect({ label, value, placeholder = 'Select an option', options, small = false, onChange }: { label: string; value: string; placeholder?: string; options: { label: string; value: string }[]; small?: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value)?.label;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected ?? placeholder}`} onPress={() => setOpen(true)} style={[s.select, small ? s.smallSelect : null]}>
      <Text numberOfLines={1} style={[s.selectText, value ? s.valueText : null]}>{selected ?? placeholder}</Text>
      <Chevron width={small ? 14 : 20} height={small ? 14 : 20} />
    </Pressable>
    <PopupSheet visible={open} onClose={() => setOpen(false)} accessibilityLabel={label}>
      <Text style={popupSheetStyles.label}>{label}</Text>
      <View style={s.optionList}>
        {options.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => { onChange(option.value); setOpen(false); }} style={s.optionRow}>
          <Text style={[s.sheetOption, option.value === value ? { color: Figma.orange } : null]}>{option.label}</Text>
        </Pressable>)}
      </View>
      <Button title="Done" onPress={() => setOpen(false)} />
    </PopupSheet>
  </>;
}

function DatePartsField({ label, value, onChange }: { label: string; value: DateParts; onChange: (value: DateParts) => void }) {
  return <Field label={label}><View style={s.dateRow}>
    <View style={s.monthPart}><TapSelect label={`${label} month`} value={value.month} placeholder="Month" options={monthOptions} onChange={(month) => onChange({ ...value, month })} /></View>
    <FigmaInput accessibilityLabel={`${label} day`} style={s.datePart} placeholder="Day" keyboardType="number-pad" maxLength={2} value={value.day} onChangeText={(day) => onChange({ ...value, day })} />
    <FigmaInput accessibilityLabel={`${label} year`} style={[s.datePart, s.lastDatePart]} placeholder="Year" keyboardType="number-pad" maxLength={4} value={value.year} onChangeText={(year) => onChange({ ...value, year })} />
  </View></Field>;
}

function Tags({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (values: string[]) => void }) {
  const [entry, setEntry] = useState('');
  const add = () => {
    const next = entry.trim();
    if (next && !values.includes(next)) onChange([...values, next]);
    setEntry('');
  };
  return <Field label={label}><View style={s.tagsBox}>
    <View style={s.tagsContent}>
      {values.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Remove ${value}`} onPress={() => onChange(values.filter((item) => item !== value))} style={s.tag}>
        <Text style={s.tagX}>×</Text><Text style={s.tagText}>{value}</Text>
      </Pressable>)}
      <FigmaInput accessibilityLabel={`Add ${label.toLowerCase()}`} placeholder={values.length ? `Add ${label.toLowerCase()}` : placeholder} value={entry} onChangeText={setEntry} onSubmitEditing={add} returnKeyType="done" style={s.tagInput} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`} hitSlop={10} onPress={add} style={s.plusButton}><Text style={s.plus}>+</Text></Pressable>
  </View></Field>;
}

function SplashDog() {
  return <View style={s.splashArt}>
    <SplashMask />
    <View style={[s.splashBody, { transform: [{ scaleX: -1 }] }]}><SplashBody /></View>
    <View style={[s.splashEarRight, { transform: [{ rotate: '139.77deg' }, { scaleY: -1 }] }]}><SplashEarRight /></View>
    <View style={[s.splashHead, { transform: [{ scaleX: -1 }] }]}><SplashHead /></View>
    <View style={[s.splashEarLeft, { transform: [{ rotate: '48.76deg' }] }]}><SplashEarLeft /></View>
    <View style={[s.splashEyes, { transform: [{ scaleX: -1 }] }]}><SplashEyes /></View>
    <View style={s.splashSnout}><View style={s.splashSnoutPatch} /><View style={[s.splashMouth, { transform: [{ scaleX: -1 }] }]}><SplashMouth /></View></View>
  </View>;
}

function CoachMark({ message }: { message: string }) {
  return <View pointerEvents="none" style={s.coachMark}>
    <View style={s.coachBubble}><Text style={s.coachText}>{message}</Text></View>
    <View style={s.coachDog}><HomeDog /></View>
  </View>;
}

function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => { const timer = setTimeout(onDone, 950); return () => clearTimeout(timer); }, [onDone]);
  return <Frame wide><View style={s.splashFrame}>
    <View style={s.splashLockup}><SplashDog /><Text style={s.logo}>WeCare</Text></View>
  </View></Frame>;
}

function RecipientForm({ draft, setDraft, filled, onSave, error, busy }: { draft: RecipientDraft; setDraft: (draft: RecipientDraft) => void; filled: boolean; onSave: () => void; error: string; busy?: boolean }) {
  const set = <K extends keyof RecipientDraft>(key: K, value: RecipientDraft[K]) => setDraft({ ...draft, [key]: value });
  return <Frame>
    <View style={s.recipientFrame}>
      <Camera />
      <View style={s.recipientForm}>
        {filled ? <ReadOnlyField label="Name" value={draft.name || 'Alexi Manning'} /> : <Field label="Name"><FigmaInput accessibilityLabel="Name" placeholder="Enter name" autoCapitalize="words" value={draft.name} onChangeText={(value) => set('name', value)} /></Field>}
        {filled ? <Field label="Date of Birth"><View style={s.dateRow}><View style={s.monthPart}><View style={s.select}><Text style={s.valueText}>December</Text><Chevron width={20} height={20} /></View></View><View style={s.readOnlyDatePart}><Text style={s.valueText}>22</Text></View><View style={[s.readOnlyDatePart, s.lastDatePart]}><Text style={s.valueText}>2005</Text></View></View></Field> : <DatePartsField label="Date of Birth" value={draft.birth} onChange={(birth) => set('birth', birth)} />}
        {filled ? <ReadOnlyField label="Sex" value={draft.sex || 'Female'} /> : <Field label="Sex"><TapSelect label="Sex" value={draft.sex} options={recipientOptions} onChange={(value) => set('sex', value)} /></Field>}
        <View style={s.pregnancyRow}><Text style={s.label}>Care recipient is pregnant?</Text>{filled ? <View style={[s.select, s.smallSelect]}><Text style={s.valueText}>{draft.pregnant || 'No'}</Text><Chevron width={14} height={14} /></View> : <TapSelect label="Pregnancy status" value={draft.pregnant} placeholder="Select" small options={pregnancyOptions} onChange={(value) => set('pregnant', value)} />}</View>
        {filled ? <ReadOnlyField label="Blood Type" value={draft.bloodType || 'O+'} /> : <Field label="Blood Type"><TapSelect label="Blood type" value={draft.bloodType} options={bloodTypeOptions} onChange={(value) => set('bloodType', value)} /></Field>}
        {filled ? <ReadOnlyField label="Height" value={draft.height || '160'} suffix="cm" /> : <Field label="Height"><View style={s.inputRow}><FigmaInput accessibilityLabel="Height in cm" placeholder="Enter height" keyboardType="decimal-pad" value={draft.height} onChangeText={(value) => set('height', value)} style={s.flexInput} /><Text style={s.suffix}>cm</Text></View></Field>}
        {filled ? <ReadOnlyField label="Weight" value={draft.weight || '80'} suffix="kg" /> : <Field label="Weight"><View style={s.inputRow}><FigmaInput accessibilityLabel="Weight in kg" placeholder="Enter weight" keyboardType="decimal-pad" value={draft.weight} onChangeText={(value) => set('weight', value)} style={s.flexInput} /><Text style={s.suffix}>kg</Text></View></Field>}
        {filled ? <FilledTags label="Conditions" values={draft.conditions.length ? draft.conditions : ['ADHD', 'High cholesterol']} /> : <Tags label="Conditions" placeholder="Add a condition" values={draft.conditions} onChange={(values) => set('conditions', values)} />}
        {filled ? <FilledTags label="Allergies" values={draft.allergies.length ? draft.allergies : ['Cephalexin', 'Tree nuts']} /> : <Tags label="Allergies" placeholder="Add an allergy" values={draft.allergies} onChange={(values) => set('allergies', values)} />}
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        <Button title="Save Care Recipient" disabled={busy} onPress={onSave} />
      </View>
    </View>
  </Frame>;
}

function FilledTags({ label, values }: { label: string; values: string[] }) {
  return <Field label={label}><View style={s.tagsBox}><View style={s.tagsContent}>{values.map((value) => <View key={value} style={s.tag}><Text style={s.tagX}>×</Text><Text style={s.tagText}>{value}</Text></View>)}</View><Text style={s.plus}>+</Text></View></Field>;
}

function SearchField({ value, editable, placeholder, onChangeText, onSubmit }: { value: string; editable?: boolean; placeholder?: string; onChangeText?: (value: string) => void; onSubmit?: () => void }) {
  return <View style={s.searchField}><FigmaInput accessibilityLabel="Search by medication name" editable={editable} placeholder={placeholder} value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" style={s.searchInput} /><Pressable accessibilityRole="button" accessibilityLabel="Search medications" onPress={onSubmit} hitSlop={8}><SearchIcon /></Pressable></View>;
}

function MedicationSearch({ query, setQuery, onSearch }: { query: string; setQuery: (value: string) => void; onSearch: () => void }) {
  return <Frame progress={0} wide><View style={s.medSearchFrame}>
    <View style={s.medSearchBox}><Text style={s.medTitle}>Add Medication</Text><SearchField value={query} placeholder="Search by medication name" onChangeText={setQuery} onSubmit={onSearch} /></View>
    <CoachMark message="Please search for the name of the medication that your care recipient is currently taking." />
  </View></Frame>;
}

function MedicationMatch({ query, onSelect }: { query: string; onSelect: (name: string) => void }) {
  const filtered = useMemo(() => medicationCatalog.filter((name) => name.toLowerCase().includes(query.toLowerCase())), [query]);
  const matches = filtered.length ? filtered : medicationCatalog;
  return <Frame progress={1} wide><View style={s.medSearchFrame}>
    <View style={s.medSearchBox}><Text style={s.medTitle}>Add Medication</Text><SearchField value={query || 'Cephalexin'} editable={false} /><View style={s.matchList}>{matches.map((name, index) => <Pressable key={name} accessibilityRole="button" onPress={() => onSelect(name)} style={[s.matchRow, index === matches.length - 1 ? s.lastMatchRow : null]}><Text style={s.matchText}>{name}</Text></Pressable>)}</View></View>
    <CoachMark message="Select the specific medication that your care recipient is currently taking." />
  </View></Frame>;
}

function MedicationInformation({ name, onContinue }: { name: string; onContinue: () => void }) {
  const information = name.toLowerCase().startsWith('cephalexin') ? cephalexinInformation : [];
  return <Frame progress={2}><View style={s.infoFrame}>
    <View style={s.infoHeader}><Text style={s.medTitle}>Add Medication</Text><SearchField value={name} editable={false} /></View>
    <View style={s.infoBody}>{information.map(({ title, text }) => <View key={title} style={s.infoItem}><Text style={s.infoTitle}>{title}</Text><Text style={s.infoText}>{text}</Text></View>)}</View>
    <Button orange title="Continue to Administration Instructions" onPress={onContinue} />
  </View></Frame>;
}

function MedicationAdministration({ name, dosage, setDosage, frequency, setFrequency, time, setTime, period, setPeriod, start, setStart, end, setEnd, instructions, setInstructions, onContinue }: { name: string; dosage: string; setDosage: (value: string) => void; frequency: string; setFrequency: (value: string) => void; time: string; setTime: (value: string) => void; period: string; setPeriod: (value: string) => void; start: DateParts; setStart: (value: DateParts) => void; end: DateParts; setEnd: (value: DateParts) => void; instructions: string; setInstructions: (value: string) => void; onContinue: () => void }) {
  return <Frame progress={3}><View style={s.detailFrame}>
    <Text style={s.detailTitle}>{name}</Text>
    <View style={s.detailFields}>
      <Field label="Dosage"><FigmaInput accessibilityLabel="Dosage" placeholder="Enter dosage" value={dosage} onChangeText={setDosage} /></Field>
      <Field label="Frequency"><FigmaInput accessibilityLabel="Frequency" placeholder="Enter frequency" value={frequency} onChangeText={setFrequency} /></Field>
      <Field label="Scheduled Time"><View style={s.timeStack}><View style={s.inputRow}><FigmaInput accessibilityLabel="Scheduled time" placeholder="12:00" value={time} onChangeText={setTime} style={s.flexInput} /><TapSelect label="Time period" value={period} options={[{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }]} small onChange={setPeriod} /></View><Button orange title="+ Add Scheduled Time" onPress={() => {}} /></View></Field>
      <DatePartsField label="Start Date" value={start} onChange={setStart} />
      <DatePartsField label="End Date" value={end} onChange={setEnd} />
      <Field label="Special Instructions"><FigmaInput accessibilityLabel="Special administration instructions" multiline placeholder="Enter any special administration instructions" value={instructions} onChangeText={setInstructions} /></Field>
    </View>
    <Button orange title="Continue to Medication Information" onPress={onContinue} />
  </View></Frame>;
}

function MedicationPrescription({ name, rx, setRx, strength, setStrength, unit, setUnit, refills, setRefills, expiry, setExpiry, notes, setNotes, onContinue }: { name: string; rx: string; setRx: (value: string) => void; strength: string; setStrength: (value: string) => void; unit: string; setUnit: (value: string) => void; refills: string; setRefills: (value: string) => void; expiry: DateParts; setExpiry: (value: DateParts) => void; notes: string; setNotes: (value: string) => void; onContinue: () => void }) {
  return <Frame progress={4}><View style={s.detailFrame}>
    <Text style={s.detailTitle}>{name}</Text>
    <View style={s.detailFields}>
      <Field label="Prescription/Rx Number"><FigmaInput accessibilityLabel="Prescription/Rx number" placeholder="Enter prescription/Rx number" value={rx} onChangeText={setRx} /></Field>
      <Field label="Strength"><View style={s.inputRow}><FigmaInput accessibilityLabel="Strength" placeholder="Enter strength" keyboardType="decimal-pad" value={strength} onChangeText={setStrength} style={s.flexInput} /><TapSelect label="Strength unit" value={unit} options={unitOptions} small onChange={setUnit} /></View></Field>
      <Field label="Number of Refills"><FigmaInput accessibilityLabel="Number of refills" placeholder="Enter number" keyboardType="number-pad" value={refills} onChangeText={setRefills} /></Field>
      <DatePartsField label="Expiry Date" value={expiry} onChange={setExpiry} />
      <Field label="Notes"><FigmaInput accessibilityLabel="Medication notes" multiline placeholder="Enter any notes about this medication" value={notes} onChangeText={setNotes} /></Field>
    </View>
    <Button orange title="Continue to Assign Recipients" onPress={onContinue} />
  </View></Frame>;
}

function AssignRecipient({ recipients, selected, setSelected, onSave, busy }: { recipients: { label: string; value: string }[]; selected: string; setSelected: (value: string) => void; onSave: () => void; busy?: boolean }) {
  return <Frame progress={5}><View style={s.assignFrame}>
    <Text style={s.detailTitle}>Cephalexin (Keflex)</Text>
    <Field label="Assign to Care Recipients"><TapSelect label="Care recipient(s)" value={selected} placeholder="Select care recipient(s)" options={recipients} onChange={setSelected} /></Field>
    <Button orange title="Save Medication" disabled={busy} onPress={onSave} />
  </View></Frame>;
}

function dateOrToday(value: DateParts) {
  const parsed = parseDate(value);
  if (parsed) return parsed;
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function OnboardingFlow() {
  const { saveRecipient, saveMedication, state } = useCare();
  const [step, setStep] = useState<Step>('splash');
  const [recipientId, setRecipientId] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [draft, setDraft] = useState<RecipientDraft>({ name: '', birth: emptyDate, sex: '', pregnant: '', bloodType: '', height: '', weight: '', conditions: [], allergies: [] });
  const [query, setQuery] = useState('');
  const [medicationName, setMedicationName] = useState('Cephalexin (Keflex)');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [time, setTime] = useState('12:00');
  const [period, setPeriod] = useState('AM');
  const [start, setStart] = useState<DateParts>(emptyDate);
  const [end, setEnd] = useState<DateParts>(emptyDate);
  const [instructions, setInstructions] = useState('');
  const [rx, setRx] = useState('');
  const [strength, setStrength] = useState('');
  const [unit, setUnit] = useState('mg');
  const [refills, setRefills] = useState('');
  const [expiry, setExpiry] = useState<DateParts>(emptyDate);
  const [notes, setNotes] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [busy, setBusy] = useState(false);

  const saveRecipientDraft = () => {
    if (!draft.name.trim()) { setRecipientError('Enter the care recipient’s name.'); return; }
    if (parseDate(draft.birth) === null) { setRecipientError('Enter a valid date of birth.'); return; }
    setRecipientError('');
    setStep('recipient-filled');
  };

  const confirmRecipient = async () => {
    setBusy(true);
    try {
      const id = await saveRecipient({ name: draft.name.trim(), birthDate: parseDate(draft.birth) ?? '', sex: draft.sex || 'Female', pregnant: draft.pregnant || 'No', bloodType: draft.bloodType || 'O+', height: draft.height || '160', weight: draft.weight || '80', conditions: draft.conditions.length ? draft.conditions : ['ADHD', 'High cholesterol'], allergies: draft.allergies.length ? draft.allergies : ['Cephalexin', 'Tree nuts'] });
      setRecipientId(id);
      setStep('search');
    } catch { Alert.alert('Unable to save', 'Please try again.'); } finally { setBusy(false); }
  };

  const saveMedicationDraft = async () => {
    const id = selectedRecipient || recipientId || state.recipients[0]?.id;
    if (!id) { Alert.alert('Choose a care recipient', 'Add a care recipient before saving medication.'); return; }
    setBusy(true);
    try {
      const scheduled = time24(time || '12:00', period) ?? '00:00';
      await saveMedication({ recipientId: id, name: medicationName, dosage: dosage || '1 capsule', frequency: frequency || 'Once daily', times: [scheduled], days: ['Every day'], rx: rx.trim(), strength: strength.trim() ? `${strength.trim()} ${unit}` : '', startDate: dateOrToday(start), endDate: parseDate(end) ?? '', expiryDate: dateOrToday(expiry), refills: refills.trim(), instructions: instructions.trim(), notes: notes.trim() });
      router.replace('/home');
    } catch { Alert.alert('Unable to save', 'Please try again.'); } finally { setBusy(false); }
  };

  if (step === 'splash') return <Splash onDone={() => setStep('recipient')} />;
  if (step === 'recipient') return <RecipientForm draft={draft} setDraft={setDraft} filled={false} onSave={saveRecipientDraft} error={recipientError} busy={busy} />;
  if (step === 'recipient-filled') return <RecipientForm draft={draft} setDraft={setDraft} filled onSave={confirmRecipient} error={recipientError} busy={busy} />;
  if (step === 'search') return <MedicationSearch query={query} setQuery={setQuery} onSearch={() => { if (query.trim()) setStep('match'); }} />;
  if (step === 'match') return <MedicationMatch query={query} onSelect={(name) => { setMedicationName(name); setStep('information'); }} />;
  if (step === 'information') return <MedicationInformation name={medicationName} onContinue={() => setStep('administration')} />;
  if (step === 'administration') return <MedicationAdministration name={medicationName} dosage={dosage} setDosage={setDosage} frequency={frequency} setFrequency={setFrequency} time={time} setTime={setTime} period={period} setPeriod={setPeriod} start={start} setStart={setStart} end={end} setEnd={setEnd} instructions={instructions} setInstructions={setInstructions} onContinue={() => setStep('prescription')} />;
  if (step === 'prescription') return <MedicationPrescription name={medicationName} rx={rx} setRx={setRx} strength={strength} setStrength={setStrength} unit={unit} setUnit={setUnit} refills={refills} setRefills={setRefills} expiry={expiry} setExpiry={setExpiry} notes={notes} setNotes={setNotes} onContinue={() => setStep('assign')} />;
  return <AssignRecipient recipients={state.recipients.map((recipient) => ({ label: recipient.name, value: recipient.id }))} selected={selectedRecipient} setSelected={setSelectedRecipient} onSave={saveMedicationDraft} busy={busy} />;
}

const s = StyleSheet.create({
  frame: { flex: 1, backgroundColor: Figma.white },
  scroll: { minHeight: 866, paddingHorizontal: 30, paddingBottom: 42 },
  scrollWide: { paddingHorizontal: 0 },
  narrowContent: { width: '100%', maxWidth: 342, alignSelf: 'center' },
  wideContent: { width: '100%', alignSelf: 'center' },
  progress: { position: 'absolute', top: 95, left: 30, right: 30, height: 6, flexDirection: 'row', gap: 4 },
  progressBar: { flex: 1, height: 6, borderRadius: 10 },
  input: { height: 36, paddingHorizontal: 10, paddingVertical: 0, borderRadius: 10, backgroundColor: Figma.gray, color: Figma.text, fontFamily: allerta, fontSize: 12 },
  multiline: { height: 63, paddingVertical: 10, textAlignVertical: 'top' },
  label: { color: '#000', fontFamily: allerta, fontSize: 14, lineHeight: 18 },
  valueText: { color: Figma.text, fontFamily: allerta, fontSize: 12 },
  field: { gap: 5 },
  button: { height: 36, borderRadius: 10, backgroundColor: Figma.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  orangeButton: { backgroundColor: Figma.orange },
  buttonText: { color: Figma.white, fontFamily: allerta, fontSize: 14, lineHeight: 18, textAlign: 'center' },
  select: { height: 36, borderRadius: 10, backgroundColor: Figma.gray, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  smallSelect: { width: 88, height: 24, borderRadius: 5, paddingHorizontal: 10 },
  selectText: { flex: 1, color: Figma.placeholder, fontFamily: allerta, fontSize: 12 },
  inputRow: { height: 36, borderRadius: 10, backgroundColor: Figma.gray, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flexInput: { flex: 1, backgroundColor: 'transparent' },
  suffix: { paddingRight: 10, color: Figma.secondary, fontFamily: allerta, fontSize: 12 },
  dateRow: { height: 36, borderRadius: 10, backgroundColor: Figma.gray, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  monthPart: { flex: 2 },
  datePart: { flex: 1, borderRadius: 0, borderLeftWidth: 1, borderRightWidth: 1, borderColor: Figma.border },
  lastDatePart: { borderRightWidth: 0 },
  readOnlyDatePart: { flex: 1, height: 36, justifyContent: 'center', paddingHorizontal: 10, borderLeftWidth: 1, borderColor: Figma.border },
  pregnancyRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tagsBox: { minHeight: 36, borderRadius: 10, backgroundColor: Figma.gray, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tagsContent: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  tag: { minHeight: 22, borderRadius: 5, backgroundColor: Figma.lightGray, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  tagX: { color: Figma.text, fontFamily: allerta, fontSize: 18, lineHeight: 18, transform: [{ rotate: '0deg' }] },
  tagText: { color: Figma.text, fontFamily: allerta, fontSize: 12, lineHeight: 16 },
  tagInput: { flex: 1, minWidth: 110, height: 24, paddingHorizontal: 0, backgroundColor: 'transparent' },
  plusButton: { width: 18, height: 24, alignItems: 'center', justifyContent: 'center' },
  plus: { color: Figma.text, fontFamily: allerta, fontSize: 22, lineHeight: 22 },
  error: { color: '#A12E24', fontFamily: allerta, fontSize: 12, lineHeight: 18 },
  optionList: { marginTop: 20, gap: 8, marginBottom: 20 },
  optionRow: { minHeight: 42, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  sheetOption: { color: Figma.text, fontFamily: allerta, fontSize: 14 },
  splashFrame: { flex: 1, minHeight: 866, alignItems: 'center' },
  splashLockup: { position: 'absolute', top: 345, width: 221, alignItems: 'center', gap: 20 },
  splashArt: { width: 161, height: 155.384, position: 'relative' },
  splashBody: { position: 'absolute', left: 3.46, top: 65.05, width: 138.489, height: 96.523 },
  splashEarRight: { position: 'absolute', left: 84.04, top: 0, width: 57.618, height: 37.796, alignItems: 'center', justifyContent: 'center' },
  splashHead: { position: 'absolute', left: 24.44, top: 4.2, width: 104.916, height: 86.031, alignItems: 'center', justifyContent: 'center' },
  splashEarLeft: { position: 'absolute', left: 0, top: 0, width: 66.404, height: 68.241, alignItems: 'center', justifyContent: 'center' },
  splashEyes: { position: 'absolute', left: 71.02, top: 36.38, width: 32.912, height: 8.228, alignItems: 'center', justifyContent: 'center' },
  splashSnout: { position: 'absolute', left: 66.4, top: 46.16, width: 44, height: 31.475 },
  splashSnoutPatch: { position: 'absolute', left: 0, top: 0, width: 44, height: 31.475, borderRadius: 28, backgroundColor: Figma.peach },
  splashMouth: { position: 'absolute', left: 20.63, top: 4.2, width: 15.044, height: 17.65, alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#000', fontFamily: jakartaBold, fontSize: 26, lineHeight: 32, textAlign: 'center' },
  recipientFrame: { paddingTop: 63, paddingBottom: 38, alignItems: 'center' },
  recipientForm: { width: '100%', marginTop: 36, gap: 20 },
  medSearchFrame: { minHeight: 866, position: 'relative', alignItems: 'center' },
  medSearchBox: { position: 'absolute', top: 262, width: 342, gap: 8 },
  medTitle: { color: '#000', fontFamily: allerta, fontSize: 32, lineHeight: 39, textAlign: 'center' },
  searchField: { height: 35, borderRadius: 10, backgroundColor: Figma.gray, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchInput: { flex: 1, height: 35, backgroundColor: 'transparent', paddingHorizontal: 0 },
  matchList: { paddingHorizontal: 10, overflow: 'hidden' },
  matchRow: { height: 36, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: Figma.lightGray, borderBottomWidth: 1, borderBottomColor: Figma.border },
  lastMatchRow: { borderBottomWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  matchText: { color: Figma.secondary, fontFamily: allerta, fontSize: 12 },
  coachMark: { position: 'absolute', top: 484, left: 0, width: '100%', height: 240 },
  coachBubble: { position: 'absolute', left: 67, top: 0, width: 268, height: 100, borderRadius: 21, backgroundColor: Figma.peach, padding: 22 },
  coachText: { color: '#000', fontFamily: jakartaMedium, fontSize: 14, lineHeight: 19 },
  coachDog: { position: 'absolute', left: 140, top: 127, transform: [{ scale: 1.55 }] },
  infoFrame: { paddingTop: 274, paddingBottom: 42, gap: 20 },
  infoHeader: { gap: 8 },
  infoBody: { gap: 8 },
  infoItem: { gap: 4 },
  infoTitle: { color: Figma.text, fontFamily: allerta, fontSize: 14, lineHeight: 18 },
  infoText: { color: Figma.secondary, fontFamily: allerta, fontSize: 12, lineHeight: 15 },
  detailFrame: { paddingTop: 136, paddingBottom: 42, gap: 20 },
  detailTitle: { color: '#000', fontFamily: allerta, fontSize: 32, lineHeight: 39 },
  detailFields: { gap: 20 },
  timeStack: { gap: 5 },
  assignFrame: { paddingTop: 314, paddingBottom: 42, gap: 20 },
});
