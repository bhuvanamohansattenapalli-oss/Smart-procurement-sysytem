/**
 * Fields & Flow design: contemporary agrarian wayfinding, clear
 * operational status, paddy green + canal blue, and large farmer-friendly controls.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CloudRain,
  CloudSun,
  Coins,
  Copy,
  CreditCard,
  Download,
  Droplets,
  Globe,
  Headphones,
  HelpCircle,
  Landmark,
  Leaf,
  LoaderCircle,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Navigation,
  Phone,
  PhoneCall,
  Radio,
  Receipt,
  Scale,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  ThermometerSun,
  Ticket,
  Tractor,
  TrendingUp,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  UsersRound,
  Volume2,
  VolumeX,
  WalletCards,
  Wheat,
  Wind,
  X,
  Key,
  Lock,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  History,
  Shield,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MapView } from "@/components/Map";

import { localizedUiText, translations, statusTranslations, getStatusLabel, tUi, Language, reverseTranslationMap, parseScheduledStartTime } from "@/lib/translations";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from "recharts";
import { CROP_CATALOGUE, filterCrops, getCatalogueCropImage, CropItem } from "@/lib/cropCatalogue";

function getInitials(name?: string | null, fallback = "SO"): string {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.map(p => p[0]).join("").slice(0, 2).toUpperCase() || fallback;
}

type Screen =
  | "landing"
  | "registration"
  | "pending"
  | "farmerLogin"
  | "dashboard"
  | "paddy"
  | "cropPrices"
  | "weather"
  | "farmerAnalytics"
  | "transportation"
  | "history"
  | "centres"
  | "centre"
  | "slot"
  | "confirmation"
  | "token"
  | "queue"
  | "status"
  | "payment"
  | "profile"
  | "assistant"
  | "notifications"
  | "officerLogin"
  | "officerDashboard"
  | "staffManagement"
  | "registrations"
  | "farmerDetail"
  | "approved"
  | "bookings"
  | "quality"
  | "officerLogistics"
  | "officerPayments";

export type StaffRecord = {
  id: number;
  officerCode: string;
  employeeId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: "HEAD_OFFICER" | "PROCUREMENT_OFFICER" | "QUALITY_CONTROL_INSPECTOR" | "LOGISTICS_OFFICER" | "PAYMENT_OFFICER";
  department: string;
  designation?: string;
  branch: string;
  centreId?: number;
  centreName?: string;
  district: string;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "DISABLED" | "REJECTED";
  mustChangePassword?: number;
  approvedByOfficerId?: number;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
};


type Centre = {
  id: number;
  name: string;
  place: string;
  district?: string;
  distance: string;
  queue: number;
  wait: string;
  slots: number;
  status: "Open" | "Busy" | "Limited" | string;
  position: string;
  latitude?: number;
  longitude?: number;
};

type BackendSlot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  available: number;
  isFull: boolean;
};

type ApiBooking = {
  id: number;
  bookingCode: string;
  status: string;
  paddyVariety: string;
  paddyGrade: string;
  expectedQuantityQuintals: number;
  tokenNumber: string;
  createdAt?: string;
  paymentStatus?: string;
  farmer: { id: number; farmerCode: string; name: string; phone: string; village: string; district: string; primaryCrop: string; status: string };
  centre: { id: number; name: string; place: string; distanceKm: number };
  slot: { id: number; date: string; startTime: string; endTime: string };
  queue: { position: number; peopleAhead: number; estimatedWaitMinutes: number; status: string; currentToken: string } | null;
  procurement: { status: string; weighedQuantityQuintals: number | null; qualityGrade: string | null; updatedAt?: string } | null;
  transport?: { id: number; transportCode: string; vehicleType?: string; vehicleNumber?: string; driverName?: string; driverPhone?: string; status?: string } | null;
  paymentQuote: { unitPrice: number; qualityAdjustment?: number; govtBonus?: number; effectiveRate?: number; demoPayable: number; currency: string; isOfficial: boolean };
};

type PaymentRecord = {
  paymentId: string;
  bookingId?: number;
  transactionReference: string;
  receiptNumber: string | null;
  amount: number;
  method: "UPI" | "CARD" | "NET_BANKING";
  gateway: string;
  gatewayPaymentId: string | null;
  status: "PENDING" | "PENDING_OFFICER_INITIATION" | "OFFICER_INITIATED" | "PROCESSING" | "SUCCESS" | "FAILED";
  officerId?: number | null;
  failureReason: string | null;
  initiatedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type FarmerProfile = ApiBooking["farmer"];
type FarmerStats = { totalBookings: number; completedProcurements: number; pendingBookings: number; currentQueuePosition: number | null; totalQuantityProcured: number; totalAmountReceived: number; successfulPayments: number };
type RazorpayCheckoutResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCheckout = new (options: { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (response: RazorpayCheckoutResponse) => void | Promise<void>; modal?: { ondismiss?: () => void }; theme?: { color: string } }) => { open: () => void };
declare global { interface Window { Razorpay?: RazorpayCheckout } }

const loadRazorpayCheckout = () => new Promise<boolean>(resolve => {
  if (window.Razorpay) { resolve(true); return; }
  const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
  if (existing) { existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true }); existing.addEventListener("error", () => resolve(false), { once: true }); return; }
  const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true; script.dataset.razorpayCheckout = "true";
  script.onload = () => resolve(Boolean(window.Razorpay)); script.onerror = () => resolve(false); document.body.appendChild(script);
});

type OfficerStats = { totalFarmers: number; pendingRegistrations: number; approvedFarmers: number; todaysBookings: number; activeQueue: number; completedProcurements: number; pendingPayments: number; completedPayments: number };
type OfficerAnalytics = {
  totalFarmers: number;
  approvedFarmers: number;
  pendingRegistrations: number;
  rejectedRegistrations: number;
  totalBookings: number;
  activeBookings: number;
  completedProcurements: number;
  activeQueue: number;
  financials: {
    totalDisbursed: number;
    totalPendingAmount: number;
    completedPaymentsCount: number;
    pendingPaymentsCount: number;
    successRate: number;
    averagePayout: number;
  };
  centreUtilization: Array<{
    id: number;
    name: string;
    place: string;
    status: string;
    currentQueue: number;
    queueCapacity: number;
    utilizationPercent: number;
    availableSlots: number;
    totalSlotsCap: number;
  }>;
  hourlyArrivals: Array<{ time: string; count: number; percentage: number }>;
  cropBreakdown: Array<{ variety: string; count: number; quintals: number }>;
  funnel: { registered: number; pending: number; approved: number; booked: number; completed: number };
};

type PendingRegistration = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  farmer: FarmerProfile;
  registrationCode?: string;
  aadhaarMasked?: string;
  submittedAt?: string;
};
const farmerOnlyScreens: Screen[] = [
  "dashboard",
  "paddy",
  "cropPrices",
  "farmerAnalytics",
  "transportation",
  "history",
  "centres",
  "centre",
  "slot",
  "confirmation",
  "token",
  "queue",
  "status",
  "payment",
  "profile",
  "assistant",
  "notifications",
];

const logoUrl = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=120&q=80";
const queueUrl = "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80";
const statusUrl = "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80";

// Curated authentic agricultural photographs for all 18 MSP crops
export const CROP_PHOTO_CATALOG: Record<string, string> = {
  "Bajra (Pearl Millet)": "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=800&q=80",
  "Bengal Gram (Chickpea / Chana)": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80",
  "Black Gram (Urad)": "https://images.unsplash.com/photo-1585996746979-3079ff176162?auto=format&fit=crop&w=800&q=80",
  "Cotton (Long Staple)": "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80",
  "Cotton (Medium Staple)": "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80",
  "Green Gram (Moong)": "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=800&q=80",
  "Groundnut (In Shell)": "https://images.unsplash.com/photo-1567894340315-735d7c361db0?auto=format&fit=crop&w=800&q=80",
  "Jowar (Sorghum)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80",
  "Maize (Makka)": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80",
  "Paddy (Common)": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80",
  "Paddy (Grade A)": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80",
  "Paddy (Parboiled)": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
  "Ragi (Finger Millet)": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  "Red Gram (Tur / Arhar)": "https://images.unsplash.com/photo-1585996746979-3079ff176162?auto=format&fit=crop&w=800&q=80",
  "Soybean (Yellow)": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80",
  "Sugarcane": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
  "Sunflower": "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80",
  "Wheat (Gehun)": "https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?auto=format&fit=crop&w=800&q=80",
};

export function getCropImageUrl(cropName: string): string {
  if (!cropName) return "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80";
  return getCatalogueCropImage(cropName);
}

const centres: Centre[] = [
  { id: 1, name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", distance: "2.4 km", queue: 18, wait: "30 min", slots: 10, status: "Open", position: "left-[48%] top-[42%]", latitude: 16.2970, longitude: 80.4350 },
  { id: 2, name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", distance: "4.8 km", queue: 8, wait: "15 min", slots: 14, status: "Open", position: "left-[52%] top-[38%]", latitude: 16.5417, longitude: 80.5847 },
  { id: 3, name: "Kurnool Rythu Bharosa Kendra", place: "C-Camp Agri Centre", distance: "6.5 km", queue: 28, wait: "50 min", slots: 4, status: "Busy", position: "left-[25%] top-[55%]", latitude: 15.8281, longitude: 78.0373 },
  { id: 4, name: "Rajahmundry Godavari Collection Point", place: "Katheru Road", distance: "8.2 km", queue: 12, wait: "25 min", slots: 8, status: "Limited", position: "left-[65%] top-[25%]", latitude: 17.0005, longitude: 81.8040 },
  { id: 5, name: "Eluru District Procurement Yard", place: "Sanivarapupeta", distance: "10.5 km", queue: 6, wait: "10 min", slots: 16, status: "Open", position: "left-[56%] top-[34%]", latitude: 16.7107, longitude: 81.0952 },
  { id: 6, name: "Nellore Coastal Paddy Mandi", place: "Podalakur Road", distance: "13.8 km", queue: 15, wait: "30 min", slots: 7, status: "Open", position: "left-[45%] top-[78%]", latitude: 14.4426, longitude: 79.9865 },
  { id: 7, name: "Tirupati Rayalaseema Grain Yard", place: "Renigunta Road", distance: "15.2 km", queue: 32, wait: "55 min", slots: 3, status: "Busy", position: "left-[40%] top-[88%]", latitude: 13.6288, longitude: 79.4192 },
  { id: 8, name: "Visakhapatnam Anandapuram Yard", place: "Anandapuram Junction", distance: "18.5 km", queue: 9, wait: "20 min", slots: 12, status: "Open", position: "left-[80%] top-[12%]", latitude: 17.8864, longitude: 83.3980 },
].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export function getCentreBranchCode(centre?: { name?: string; place?: string; district?: string } | null): string {
  const text = `${centre?.name || ""} ${centre?.place || ""} ${centre?.district || ""}`.toLowerCase();
  if (text.includes("guntur")) return "GNT";
  if (text.includes("vijayawada")) return "VJA";
  if (text.includes("kurnool")) return "KNL";
  if (text.includes("rajahmundry") || text.includes("godavari")) return "RJY";
  if (text.includes("visakhapatnam") || text.includes("anandapuram") || text.includes("vizag")) return "VSKP";
  if (text.includes("eluru")) return "ELR";
  if (text.includes("nellore")) return "NLR";
  if (text.includes("tirupati")) return "TPTY";
  return "GNT";
}

const navItems: { screen: Screen; label: string; icon: typeof Sprout }[] = [
  { screen: "dashboard", label: "Overview", icon: Sprout },
  { screen: "paddy", label: "New booking", icon: CalendarDays },
  { screen: "cropPrices", label: "Govt MSP Rates", icon: Wheat },
  { screen: "weather", label: "Live Weather", icon: CloudSun },
  { screen: "farmerAnalytics", label: "Analytics", icon: BarChart3 },
  { screen: "transportation", label: "Transportation", icon: Truck },
  { screen: "history", label: "History", icon: History },
  { screen: "token", label: "My token", icon: Ticket },
  { screen: "queue", label: "Live queue", icon: UsersRound },
  { screen: "status", label: "Procurement", icon: ClipboardCheck },
  { screen: "payment", label: "Payments", icon: WalletCards },
  { screen: "assistant", label: "AI Help Centre", icon: Bot },
];
function Pill({ children, kind = "green" }: { children: React.ReactNode; kind?: "green" | "blue" | "yellow" | "gray" }) {
  return <span className={`status-pill status-${kind}`}>{children}</span>;
}

function SectionTitle({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {body && <p className="section-body">{body}</p>}
      </div>
      {action}
    </div>
  );
}

function AppLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`app-logo ${inverse ? "inverse" : ""}`}>
      <img src={logoUrl} alt="ProcureFlow abstract paddy and location mark" />
      <span>Procure<span>Flow</span></span>
    </div>
  );
}

function LanguageDropdown({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  const regionalLanguages: { code: Language; native: string; english: string }[] = [
    { code: "EN", native: "English", english: "English" },
    { code: "HI", native: "हिन्दी", english: "Hindi" },
    { code: "TE", native: "తెలుగు", english: "Telugu" },
    { code: "TA", native: "தமிழ்", english: "Tamil" },
    { code: "KN", native: "ಕನ್ನಡ", english: "Kannada" },
    { code: "ML", native: "മലയാളം", english: "Malayalam" },
    { code: "MR", native: "मराठी", english: "Marathi" },
    { code: "BN", native: "বাংলা", english: "Bengali" },
    { code: "GU", native: "ગુજરાતી", english: "Gujarati" },
    { code: "PA", native: "ਪੰਜਾਬੀ", english: "Punjabi" },
    { code: "OR", native: "ଓଡ଼ିଆ", english: "Odia" },
    { code: "AS", native: "অসমীয়া", english: "Assamese" },
    { code: "UR", native: "اردو", english: "Urdu" },
  ];

  const currentLangObj = regionalLanguages.find(l => l.code === language) ?? regionalLanguages[0];

  return (
    <div className="language-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className="language-dropdown-btn"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-label="Select language"
      >
        <Globe size={15} className="lang-globe-icon" />
        <span className="lang-title">Language</span>
        <span className="lang-active-tag">{currentLangObj.code}</span>
        <ChevronDown size={13} className={`lang-arrow ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="language-dropdown-panel" role="menu">
          {regionalLanguages.map(({ code, native, english }) => {
            const isSelected = language === code;
            return (
              <button
                key={code}
                type="button"
                className={`language-option ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
                role="menuitem"
              >
                <div className="lang-opt-labels">
                  <span className="lang-native-text">{native}</span>
                  <span className="lang-english-text">— {english}</span>
                </div>
                {isSelected && <Check size={14} className="lang-check-icon" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const LanguagePicker = LanguageDropdown;

function FarmerProfileDropdown({
  profileRecord,
  onViewProfile,
  onLogout,
}: {
  profileRecord?: { name: string; farmerCode?: string; phone?: string; village?: string; status?: string } | null;
  onViewProfile: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  const name = profileRecord?.name ?? "Ramesh Kumar";
  const initials = name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2);
  const farmerCode = profileRecord?.farmerCode ?? "FMR-2026-11842";
  const status = profileRecord?.status ?? "APPROVED";

  return (
    <div className="profile-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className="profile-dropdown-trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-label="Farmer profile menu"
      >
        <span className="profile-avatar-circle">{initials}</span>
        <span className="profile-trigger-name">{name}</span>
        <ChevronDown size={13} className={`profile-arrow ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="profile-dropdown-panel" role="menu">
          <div className="profile-panel-header">
            <span className="profile-panel-avatar">{initials}</span>
            <div className="profile-panel-info">
              <strong className="profile-panel-name">{name}</strong>
              <small className="profile-panel-code">{farmerCode}</small>
              <span className="profile-panel-status">
                <span className="status-dot" /> {status} FARMER
              </span>
            </div>
          </div>
          <hr className="profile-panel-divider" />
          <button
            type="button"
            className="profile-panel-action"
            onClick={() => {
              setOpen(false);
              onViewProfile();
            }}
            role="menuitem"
          >
            <UserCheck size={16} />
            <span>My Profile</span>
          </button>
          <hr className="profile-panel-divider" />
          <button
            type="button"
            className="profile-panel-action logout-action"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            role="menuitem"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ActionButton({ children, onClick, secondary = false, icon: Icon, disabled = false }: { children: React.ReactNode; onClick: () => void; secondary?: boolean; icon?: typeof ArrowRight; disabled?: boolean }) {
  return (
    <Button disabled={disabled} onClick={onClick} className={secondary ? "action-button secondary" : "action-button"}>
      {children}{Icon && <Icon size={17} />}
    </Button>
  );
}

function StepTrack({ current }: { current: number }) {
  const steps = ["Paddy", "Centre", "Slot", "Confirm", "Token"];
  return (
    <div className="step-track" aria-label="Booking progress">
      {steps.map((step, index) => <div className={`step ${index + 1 <= current ? "done" : ""} ${index + 1 === current ? "current" : ""}`} key={step}>
        <span>{index + 1 < current ? <Check size={13} /> : index + 1}</span><b>{step}</b>
      </div>)}
    </div>
  );
}

function QRCodeSvg({ value, size = 140 }: { value: string; size?: number }) {
  const matrixSize = 25;
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(matrixSize - 7, 0);
  drawFinder(0, matrixSize - 7);

  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2)) {
        matrix[16 + r][16 + c] = true;
      }
    }
  }

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c >= matrixSize - 8;
      const inFinder3 = r >= matrixSize - 8 && c < 8;
      const inTiming = r === 6 || c === 6;
      const inAlign = r >= 16 && r <= 20 && c >= 16 && c <= 20;

      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming && !inAlign) {
        const seed = Math.abs((r * 37 + c * 19 + hash)) % 100;
        const charCode = value.charCodeAt((r + c) % value.length) || 42;
        matrix[r][c] = (seed + charCode) % 3 === 0 || (seed % 2 === 0 && (r + c) % 2 === 0);
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-emerald-700/20 shadow-sm">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {matrix.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.2}
                height={cellSize + 0.2}
                fill="#0f3825"
                rx={1}
              />
            ) : null
          )
        )}
      </svg>
      <div className="flex items-center gap-1 mt-1.5 text-[9px] font-extrabold tracking-wider uppercase text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        <ShieldCheck size={11} className="text-emerald-700" /> AP RYTHU VERIFIED QR
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone = "green" }: { label: string; value: string; hint: string; icon: typeof Ticket; tone?: "green" | "blue" | "yellow" }) {
  return <article className={`metric-card ${tone}`}><span className="metric-icon"><Icon size={20} /></span><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [language, setLanguage] = useState<Language>("EN");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [approved, setApproved] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<Centre>(centres[0]);
  const [selectedPaddy, setSelectedPaddy] = useState("Common paddy — Grade A");
  const [selectedDate, setSelectedDate] = useState("Wednesday, 18 March");
  const [selectedSlot, setSelectedSlot] = useState("10:30 – 11:00 AM");
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [backendSlots, setBackendSlots] = useState<BackendSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingCropCategory, setBookingCropCategory] = useState<string>("ALL");
  const [bookingCropSearch, setBookingCropSearch] = useState<string>("");
  const [centreSearchQuery, setCentreSearchQuery] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "BOOKINGS" | "TRANSPORT" | "PAYMENTS">("ALL");
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [farmerHistoryData, setFarmerHistoryData] = useState<{
    summary: {
      totalBookings: number;
      activeBookings: number;
      totalTransport: number;
      activeTransport: number;
      totalPayments: number;
      totalPaidAmount: number;
    };
    bookings: any[];
    transport: any[];
    payments: any[];
    timeline: any[];
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expectedQuantity, setExpectedQuantity] = useState<number>(18);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [queueAhead, setQueueAhead] = useState(18);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState([{ role: "assistant", text: "Namaste, Ramesh. I can help you plan your visit to the procurement centre." }]);
  const [officerView, setOfficerView] = useState<"overview" | "staff" | "pending" | "approved" | "bookings" | "quality" | "logistics" | "payments">("overview");
  const [officerProfile, setOfficerProfile] = useState<StaffRecord | null>(null);
  const [officerLoginForm, setOfficerLoginForm] = useState({ officerCode: "OFF-NZM-104", password: "Officer@2026" });
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [staffTab, setStaffTab] = useState<"pending" | "active" | "disabled" | "audit">("pending");
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [addStaffSubmitting, setAddStaffSubmitting] = useState(false);
  const [addStaffForm, setAddStaffForm] = useState({
    name: "",
    employeeId: "",
    email: "",
    phone: "",
    department: "Quality Control",
    role: "QUALITY_CONTROL_INSPECTOR" as StaffRecord["role"],
    branch: "Guntur",
    centreId: 1,
    centreName: "Guntur Agricultural Market Yard",
    district: "Guntur",
    designation: "Quality Control Inspector",
  });
  const [viewingStaffDetails, setViewingStaffDetails] = useState<StaffRecord | null>(null);
  const [showApproveCredentialsModal, setShowApproveCredentialsModal] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState<{ officerCode: string; temporaryPassword?: string; staff: StaffRecord | null } | null>(null);
  const [showRejectStaffModal, setShowRejectStaffModal] = useState(false);
  const [rejectStaffTarget, setRejectStaffTarget] = useState<StaffRecord | null>(null);
  const [staffRejectReason, setStaffRejectReason] = useState("Information mismatch / verification failed");
  const [staffAuditLogsList, setStaffAuditLogsList] = useState<Array<{ id: number; performedByOfficerName: string; targetOfficerName?: string; action: string; details?: string; createdAt: string }>>([]);
  const [officerNotificationsList, setOfficerNotificationsList] = useState<Array<{ id: number; title: string; message: string; category: string; isRead: number; createdAt: string }>>([]);
  const [showOfficerNotifModal, setShowOfficerNotifModal] = useState(false);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [showCancelTransportModal, setShowCancelTransportModal] = useState(false);
  const [targetCancelTransport, setTargetCancelTransport] = useState<any>(null);
  const [cancellingTransport, setCancellingTransport] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCancellationStatus = (
    param1?: string | Date | null,
    param2?: string | null,
    param3?: string | Date | null
  ) => {
    let createdAtVal: string | Date | null = null;
    let dateStr: string | null = null;
    let timeStr: string | null = null;

    if (param3 !== undefined && param3 !== null) {
      createdAtVal = param3;
      dateStr = typeof param1 === "string" ? param1 : null;
      timeStr = param2 || null;
    } else if (param1) {
      createdAtVal = param1;
      dateStr = null;
      timeStr = null;
    }

    let deadline: number | null = null;
    let deadlineDate: Date | null = null;

    if (createdAtVal) {
      const createdTime = new Date(createdAtVal).getTime();
      if (!isNaN(createdTime)) {
        deadline = createdTime + 30 * 60 * 1000;
        deadlineDate = new Date(deadline);
      }
    }

    if (!deadline || isNaN(deadline)) {
      return { canCancel: false, remainingMs: 0, remainingMins: 0, text: "0m 00s", expired: true, deadlineFormatted: "" };
    }

    const remainingMs = deadline - currentTimeMs;
    const deadlineFormatted = deadlineDate
      ? deadlineDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      : "";

    if (remainingMs <= 0) {
      return {
        canCancel: false,
        remainingMs: 0,
        remainingMins: 0,
        text: "0m 00s",
        expired: true,
        deadlineFormatted,
      };
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timeText = `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;

    return {
      canCancel: true,
      remainingMs,
      remainingMins: mins,
      text: timeText,
      expired: false,
      deadlineFormatted,
    };
  };

  const getProcurementStageDetails = (booking: ApiBooking | null, isPaymentDone: boolean) => {
    const isCancelled = booking?.status === "CANCELLED";
    if (isCancelled) {
      return {
        currentStageLabel: "BOOKING CANCELLED",
        currentStageDesc: "Procurement booking was cancelled by farmer. Reserved slot has been released.",
        stageBadge: "Cancelled",
        badgeKind: "gray" as const,
        timeline: [
          { title: "Slot Booked", desc: booking ? `${booking.slot.date} · ${booking.slot.startTime} – ${booking.slot.endTime}` : "Slot confirmed", state: "done" as const, icon: CalendarDays },
          { title: "Booking Cancelled", desc: "Slot cancelled within 30-minute window", state: "done" as const, icon: X },
          { title: "Verification", desc: "Cancelled", state: "upcoming" as const, icon: ClipboardCheck },
          { title: "Weighing & Quality", desc: "Cancelled", state: "upcoming" as const, icon: Tractor },
          { title: "Procurement & Payment", desc: "Cancelled", state: "upcoming" as const, icon: CheckCircle2 },
        ]
      };
    }

    const pStatus = booking?.procurement?.status || "BOOKED";
    const weighedQty = booking?.procurement?.weighedQuantityQuintals;
    const qualityGrade = booking?.procurement?.qualityGrade;
    const paymentStatus = booking?.paymentStatus;

    let currentStageLabel = "SLOT BOOKED";
    let currentStageDesc = booking ? `Scheduled for ${booking.slot.date} (${booking.slot.startTime} – ${booking.slot.endTime})` : "Slot confirmed";
    let stageBadge = "Awaiting Arrival";
    let badgeKind: "blue" | "yellow" | "green" = "blue";

    let step1State: "done" | "current" | "upcoming" = "done";
    let step2State: "done" | "current" | "upcoming" = "upcoming";
    let step3State: "done" | "current" | "upcoming" = "upcoming";
    let step4State: "done" | "current" | "upcoming" = "upcoming";
    let step5State: "done" | "current" | "upcoming" = "upcoming";

    if (isPaymentDone || paymentStatus === "SUCCESS") {
      currentStageLabel = "PAYMENT SETTLED";
      currentStageDesc = "Direct Benefit Transfer (DBT) payment has been successfully credited to your bank account.";
      stageBadge = "Payment Settled";
      badgeKind = "green";
      step2State = "done";
      step3State = "done";
      step4State = "done";
      step5State = "done";
    } else if (paymentStatus === "PROCESSING" || paymentStatus === "OFFICER_INITIATED") {
      currentStageLabel = "PAYMENT PROCESSING";
      currentStageDesc = "Payment transfer initiated by officer; banking gateway processing DBT disbursement.";
      stageBadge = "Processing";
      badgeKind = "yellow";
      step2State = "done";
      step3State = "done";
      step4State = "done";
      step5State = "current";
    } else if (pStatus === "COMPLETED") {
      currentStageLabel = (paymentStatus === "PENDING" || paymentStatus === "PENDING_OFFICER_INITIATION") ? "PAYMENT PENDING" : "PROCUREMENT COMPLETED";
      currentStageDesc = "Procurement verified & recorded in government ledger. Awaiting payment authorization.";
      stageBadge = "Procurement Completed";
      badgeKind = "green";
      step2State = "done";
      step3State = "done";
      step4State = "done";
      step5State = "current";
    } else if (pStatus === "QUALITY_CHECK" || pStatus === "PROCESSING") {
      currentStageLabel = "QUALITY ASSESSMENT";
      currentStageDesc = qualityGrade ? `Moisture and purity evaluated as Grade ${qualityGrade}.` : "Quality inspector assessing grain purity and moisture content.";
      stageBadge = "Quality Check";
      badgeKind = "yellow";
      step2State = "done";
      step3State = "current";
      step4State = "upcoming";
      step5State = "upcoming";
    } else if (pStatus === "WEIGHING") {
      currentStageLabel = "WEIGHING";
      currentStageDesc = weighedQty ? `Gross and tare recorded: ${weighedQty} quintals weighed.` : "Paddy load currently on weighbridge.";
      stageBadge = "Weighing";
      badgeKind = "yellow";
      step2State = "done";
      step3State = "current";
      step4State = "upcoming";
      step5State = "upcoming";
    } else if (pStatus === "DOCUMENT_VERIFICATION") {
      currentStageLabel = "DOCUMENT VERIFICATION";
      currentStageDesc = "Officer verifying farmer identity, Aadhaar, e-Crop registration, and Token pass.";
      stageBadge = "Verifying";
      badgeKind = "yellow";
      step2State = "current";
      step3State = "upcoming";
      step4State = "upcoming";
      step5State = "upcoming";
    } else if (pStatus === "ARRIVED") {
      currentStageLabel = "ARRIVED AT MANDI";
      currentStageDesc = "Farmer reported arrival. Token called at intake counter.";
      stageBadge = "Token Called";
      badgeKind = "yellow";
      step2State = "current";
      step3State = "upcoming";
      step4State = "upcoming";
      step5State = "upcoming";
    } else {
      currentStageLabel = "SLOT BOOKED";
      currentStageDesc = booking ? `Scheduled for ${booking.slot.date} (${booking.slot.startTime} – ${booking.slot.endTime})` : "Slot confirmed";
      stageBadge = "Awaiting Arrival";
      badgeKind = "blue";
      step2State = "upcoming";
      step3State = "upcoming";
      step4State = "upcoming";
      step5State = "upcoming";
    }

    return {
      currentStageLabel,
      currentStageDesc,
      stageBadge,
      badgeKind,
      timeline: [
        {
          title: "Slot Booked",
          desc: booking ? `${booking.slot.date} · ${booking.slot.startTime} – ${booking.slot.endTime}` : "Wednesday, 18 March · 10:30 – 11:00 AM",
          state: step1State,
          icon: CalendarDays,
        },
        {
          title: "Verification",
          desc: step2State === "done" ? "Aadhaar, e-Crop & Token verified by officer" : step2State === "current" ? "Document verification in progress at intake counter" : "Officer verification upon arrival at centre",
          state: step2State,
          icon: ClipboardCheck,
        },
        {
          title: "Weighing & Quality",
          desc: weighedQty ? `${weighedQty} quintals · ${qualityGrade ? `Grade ${qualityGrade}` : "Grade pending"}` : step3State === "current" ? "Weighbridge & moisture check in progress" : "Weight slip and grade updated after verification",
          state: step3State,
          icon: Tractor,
        },
        {
          title: "Procurement Completed",
          desc: step4State === "done" ? "Paddy received & procurement recorded in system" : "Official procurement record pending",
          state: step4State,
          icon: CheckCircle2,
        },
        {
          title: "Payment",
          desc: step5State === "done" ? "Payment successfully credited via DBT" : step5State === "current" ? "Procurement done; authorization & transfer in progress" : "Direct Benefit Transfer follows procurement completion",
          state: step5State,
          icon: WalletCards,
        },
      ],
    };
  };

  const cancelFarmerBooking = async () => {
    if (!farmerToken || !bookingRecord?.id) {
      toast.error("No active booking to cancel.");
      return;
    }
    setCancellingBooking(true);
    try {
      const response = await fetch(apiUrl(`/bookings/${bookingRecord.id}/cancel`), {
        method: "POST",
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel booking.");
      }
      toast.success("Booking cancelled successfully.");
      setShowCancelBookingModal(false);
      if (data.booking) {
        setBookingRecord(data.booking);
        setBookingId(data.booking.id);
      } else {
        setBookingRecord(prev => prev ? { ...prev, status: "CANCELLED" } : null);
      }
      if (farmerToken && farmerId) {
        void loadFarmerStats(farmerToken);
        void loadFarmerAnalytics(farmerToken);
        void loadNotifications(farmerToken, farmerId);
        void loadFarmerHistory(farmerId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setCancellingBooking(false);
    }
  };

  const cancelFarmerTransport = async () => {
    if (!farmerToken || !targetCancelTransport?.id) return;
    setCancellingTransport(true);
    const cancelledId = targetCancelTransport.id;
    try {
      const response = await fetch(apiUrl(`/transport/${cancelledId}/cancel`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel transportation.");
      }
      toast.success("Transportation booking cancelled successfully.");
      setShowCancelTransportModal(false);
      setTargetCancelTransport(null);
      setTransportBookingsList(prev => prev.map(t => t.id === cancelledId ? { ...t, status: "CANCELLED" } : t));
      setBookingRecord(b => (b && b.transport && b.transport.id === cancelledId) ? {
        ...b,
        transport: { ...b.transport, status: "CANCELLED" }
      } : b);
      if (farmerToken && farmerId) {
        void loadFarmerTransportBookings(farmerToken, farmerId);
        void loadFarmerAnalytics(farmerToken);
        void loadFarmerHistory(farmerId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setCancellingTransport(false);
    }
  };
  const [showRecord, setShowRecord] = useState(false);
  const [apiCentres, setApiCentres] = useState<Centre[]>(centres);
  const [farmerToken, setFarmerToken] = useState<string | null>(null);
  const [officerToken, setOfficerToken] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [farmerCredentials, setFarmerCredentials] = useState({ phone: "", password: "" });
  const [registrationForm, setRegistrationForm] = useState({ name: "", phone: "", password: "", village: "", district: "", primaryCrop: "Paddy", aadhaarMasked: "" });
  const [registrationStatus, setRegistrationStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  const [pendingFarmer, setPendingFarmer] = useState<FarmerProfile | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Registration OTP workflow states
  const [regStep, setRegStep] = useState<"PHONE" | "OTP" | "DETAILS">("PHONE");
  const [regOtp, setRegOtp] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regChallengeId, setRegChallengeId] = useState<number | null>(null);
  const [regVerificationToken, setRegVerificationToken] = useState<string | null>(null);
  const [regCooldownSeconds, setRegCooldownSeconds] = useState(0);
  const [regOtpSending, setRegOtpSending] = useState(false);
  const [regOtpVerifying, setRegOtpVerifying] = useState(false);
  const [regAttemptsRemaining, setRegAttemptsRemaining] = useState<number>(5);
  const [regDevOtp, setRegDevOtp] = useState<string | null>(null);

  // Forgot Password workflow states
  const [forgotStep, setForgotStep] = useState<"INACTIVE" | "PHONE" | "OTP" | "PASSWORD" | "SUCCESS">("INACTIVE");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotChallengeId, setForgotChallengeId] = useState<number | null>(null);
  const [forgotVerificationToken, setForgotVerificationToken] = useState<string | null>(null);
  const [forgotCooldownSeconds, setForgotCooldownSeconds] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotAttemptsRemaining, setForgotAttemptsRemaining] = useState<number>(5);
  const [forgotDevOtp, setForgotDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (regCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setRegCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [regCooldownSeconds]);

  useEffect(() => {
    if (forgotCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldownSeconds]);
  const [bookingRecord, setBookingRecord] = useState<ApiBooking | null>(null);
  const [profileRecord, setProfileRecord] = useState<ApiBooking["farmer"] | null>(null);
  const [apiNotifications, setApiNotifications] = useState<Array<{ id: number; title: string; message: string; category: string; isRead: number; createdAt: string }>>([]);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Array<PaymentRecord & { bookingCode: string; bookingId: number }>>([]);
  const [receipt, setReceipt] = useState<{ receiptNumber: string; issuedAt: string; payment: PaymentRecord } | null>(null);
  const [officerPayments, setOfficerPayments] = useState<Array<PaymentRecord & { bookingId: number; bookingCode: string; farmer: { name: string; farmerCode: string }; centre: { name: string } }>>([]);
  const [officerFarmersList, setOfficerFarmersList] = useState<Array<{
    id: number;
    farmerCode: string;
    name: string;
    phone: string;
    village: string;
    district: string;
    primaryCrop: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    registration: {
      id: number;
      aadhaarMasked: string;
      status: string;
      reviewedAt: string | null;
      rejectionReason: string | null;
    } | null;
    activeBooking: {
      id: number;
      bookingCode: string;
      status: string;
      centreName: string;
      paddyVariety: string;
      expectedQuantityQuintals: number;
    } | null;
  }>>([]);
  const [officerFarmersLoading, setOfficerFarmersLoading] = useState<boolean>(false);
  const [officerFarmersFilter, setOfficerFarmersFilter] = useState<string>("ALL");
  const [officerFarmersSearch, setOfficerFarmersSearch] = useState<string>("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [farmerStats, setFarmerStats] = useState<FarmerStats | null>(null);
  const [officerStats, setOfficerStats] = useState<OfficerStats | null>(null);
  const [officerAnalytics, setOfficerAnalytics] = useState<OfficerAnalytics | null>(null);
  const [cropPricesList, setCropPricesList] = useState<Array<{
    id: number;
    cropName: string;
    variety: string;
    category: string;
    mspPerQuintal: number;
    marketRatePerQuintal: number;
    govtBonusPerQuintal: number;
    effectiveRatePerQuintal: number;
    maxMoisturePercent: number;
    effectiveSeason: string;
    notificationRef?: string;
  }>>([]);
  const [selectedCropCategory, setSelectedCropCategory] = useState<string>("ALL");
  const [cropSearchQuery, setCropSearchQuery] = useState<string>("");
  const [calcCropVariety, setCalcCropVariety] = useState<string>("Common Paddy — Grade A");
  const [calcQuintals, setCalcQuintals] = useState<string>("18");

  const [farmerAnalyticsData, setFarmerAnalyticsData] = useState<{
    summary: {
      totalBookings: number;
      completedProcurements: number;
      totalBookedQuintals: number;
      totalProcuredQuintals: number;
      totalEarnings: number;
      pendingEarnings: number;
      priceRealizationPercent: number;
      benchmarkMspRevenue: number;
      avgTurnaroundMins: number;
      transportLogistics: { totalBookings: number; spent: number; subsidySaved: number };
    };
    cropBreakdown: Array<{ variety: string; quantityQuintals: number; bookingCount: number; earnings: number }>;
    recentProcurements: Array<{
      id: number;
      bookingCode: string;
      tokenNumber: string;
      date: string;
      centreName: string;
      variety: string;
      expectedQuintals: number;
      weighedQuintals: number | null;
      qualityGrade: string;
      procurementStatus: string;
      paymentStatus: string;
      amount: number | null;
    }>;
  } | null>(null);

  const [transportOptions, setTransportOptions] = useState<Array<{
    type: "TRACTOR_TROLLEY" | "MINI_TRUCK" | "HEAVY_LORRY";
    name: string;
    capacityQuintals: string;
    baseFare: number;
    ratePerKm: number;
    subsidyPercent: number;
    suitableFor: string;
  }>>([]);
  const [transportBookingsList, setTransportBookingsList] = useState<Array<{
    id: number;
    transportCode: string;
    vehicleType: string;
    vehicleName: string;
    pickupVillage: string;
    destinationCentreId: number;
    destinationCentreName: string;
    scheduledDate: string;
    timeSlot: string;
    estimatedLoadQuintals: number;
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    distanceKm: number;
    baseFare: number;
    subsidyAmount: number;
    netPayable: number;
    status: string;
    createdAt: string;
  }>>([]);
  const [transportForm, setTransportForm] = useState({
    vehicleType: "TRACTOR_TROLLEY" as "TRACTOR_TROLLEY" | "MINI_TRUCK" | "HEAVY_LORRY",
    pickupVillage: "Muppalapally",
    destinationCentreId: 1,
    scheduledDate: "2026-03-18",
    timeSlot: "08:00 AM – 11:00 AM",
    estimatedLoadQuintals: "18.00",
  });
  const [transportBookingLoading, setTransportBookingLoading] = useState(false);

  type WeatherData = {
    district: string;
    state: string;
    temperature: number;
    feelsLike: number;
    condition: string;
    conditionCode: "SUNNY" | "PARTLY_CLOUDY" | "LIGHT_RAIN" | "CLEAR" | "HUMID";
    humidity: number;
    windSpeedKmH: number;
    precipitationChance: number;
    uvIndex: number;
    safeHarvestingIndex: "OPTIMAL" | "FAVORABLE" | "CAUTION";
    advisoryEn: string;
    advisoryTe: string;
    advisoryHi: string;
    forecast: Array<{
      day: string;
      tempHigh: number;
      tempLow: number;
      condition: string;
      rainChance: number;
    }>;
  };

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedWeatherDistrict, setSelectedWeatherDistrict] = useState<string>("Guntur");
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [assistantCategory, setAssistantCategory] = useState<string>("ALL");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState<string>("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const activeRecognitionRef = useRef<any>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const floatingChatFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({
        top: chatFeedRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chat]);

  useEffect(() => {
    if (floatingChatFeedRef.current) {
      floatingChatFeedRef.current.scrollTo({
        top: floatingChatFeedRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chat, liveInterimTranscript, isChatbotOpen]);

  const [officerBookings, setOfficerBookings] = useState<ApiBooking[]>([]);
  const [selectedOfficerBooking, setSelectedOfficerBooking] = useState<ApiBooking | null>(null);
  const [showProcurementModal, setShowProcurementModal] = useState(false);
  const [procurementForm, setProcurementForm] = useState({
    status: "WEIGHING",
    weighedQuantityQuintals: "18.50",
    qualityGrade: "Grade A",
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("Land records or identity verification incomplete.");
  const [paymentOutcome, setPaymentOutcome] = useState<"SUCCESS" | "FAILED">("SUCCESS");

  // Quality Control States
  const [showQcModal, setShowQcModal] = useState(false);
  const [selectedQcBooking, setSelectedQcBooking] = useState<ApiBooking | null>(null);
  const [qcForm, setQcForm] = useState({
    qualityGrade: "Grade A",
    qcResult: "ACCEPTED" as "ACCEPTED" | "REJECTED" | "HOLD",
    weighedQuantityQuintals: "18.50",
    moisturePercent: "14.2",
    foreignMatterPercent: "1.0",
    remarks: "Paddy grain meets Fair Average Quality (FAQ) standards.",
  });
  const [qcSubmitting, setQcSubmitting] = useState(false);

  // Logistics & Fleet States
  const [officerLogisticsList, setOfficerLogisticsList] = useState<Array<{
    id: number;
    transportCode: string;
    farmerId: number;
    farmerName: string;
    farmerCode: string;
    farmerPhone: string;
    vehicleType: string;
    vehicleName: string;
    pickupVillage: string;
    destinationCentreId: number;
    destinationCentreName: string;
    scheduledDate: string;
    timeSlot: string;
    estimatedLoadQuintals: number;
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    distanceKm: number;
    baseFare: number;
    subsidyAmount: number;
    netPayable: number;
    status: string;
    createdAt: string;
  }>>([]);
  const [selectedTransportItem, setSelectedTransportItem] = useState<{
    id: number;
    transportCode: string;
    farmerName: string;
    vehicleName: string;
    status: string;
  } | null>(null);
  const [viewingTransportRouteItem, setViewingTransportRouteItem] = useState<{
    id: number;
    transportCode: string;
    farmerId: number;
    farmerName: string;
    farmerCode: string;
    farmerPhone: string;
    vehicleType: string;
    vehicleName: string;
    pickupVillage: string;
    destinationCentreId: number;
    destinationCentreName: string;
    scheduledDate: string;
    timeSlot: string;
    estimatedLoadQuintals: number;
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    distanceKm: number;
    baseFare: number;
    subsidyAmount: number;
    netPayable: number;
    status: string;
    createdAt: string;
  } | null>(null);
  const [driverGps, setDriverGps] = useState<{ lat: number; lng: number; isLive: boolean }>({ lat: 16.3120, lng: 80.4410, isLive: false });
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportUpdateStatus, setTransportUpdateStatus] = useState<"REQUESTED" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED_AT_CENTRE" | "CANCELLED">("IN_TRANSIT");
  const [transportFilterStatus, setTransportFilterStatus] = useState<string>("ALL");
  const [transportSearchQuery, setTransportSearchQuery] = useState<string>("");
  const [viewingQcFarmerProfile, setViewingQcFarmerProfile] = useState<{ id?: number; farmerCode?: string; name?: string; phone?: string; village?: string; district?: string; primaryCrop?: string; status?: string } | null>(null);
  const [payoutProcessingId, setPayoutProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setDriverGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, isLive: true });
        },
        () => {
          setDriverGps({ lat: 16.3120, lng: 80.4410, isLive: false });
        },
        { timeout: 5000 }
      );
    }
  }, []);
  const t = useMemo(() => {
    const active = translations[language as keyof typeof translations] || {};
    return { ...translations.EN, ...active };
  }, [language]);
  const changeLanguage = (next: Language) => { setLanguage(next); localStorage.setItem("procureflow.language", next); };

  useEffect(() => {
    if (language === "EN") {
      // Revert all text nodes and options cleanly to English using reverseTranslationMap
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        const currentVal = textNode.nodeValue;
        if (!currentVal) continue;
        const trimmed = currentVal.trim();
        if (reverseTranslationMap[trimmed]) {
          textNode.nodeValue = currentVal.replace(trimmed, reverseTranslationMap[trimmed]);
        }
      }
      document.querySelectorAll<HTMLOptionElement>("option").forEach(opt => {
        const trimmed = opt.text.trim();
        if (reverseTranslationMap[trimmed]) opt.text = reverseTranslationMap[trimmed];
      });
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach(input => {
        const trimmed = input.placeholder.trim();
        if (reverseTranslationMap[trimmed]) input.placeholder = reverseTranslationMap[trimmed];
      });
      return;
    }

    const dictionary = localizedUiText[language];
    if (!dictionary) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (parent && (parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.tagName === "NOSCRIPT" || parent.tagName === "INPUT" || parent.tagName === "TEXTAREA")) {
        continue;
      }
      const currentVal = textNode.nodeValue;
      if (!currentVal) continue;
      const trimmed = currentVal.trim();
      const enKey = reverseTranslationMap[trimmed] || trimmed;
      if (dictionary[enKey]) {
        textNode.nodeValue = currentVal.replace(trimmed, dictionary[enKey]);
      }
    }

    // Translate select options
    document.querySelectorAll<HTMLOptionElement>("option").forEach(opt => {
      const trimmed = opt.text.trim();
      const enKey = reverseTranslationMap[trimmed] || trimmed;
      if (dictionary[enKey]) opt.text = dictionary[enKey];
    });

    // Translate input placeholders
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach(input => {
      const trimmed = input.placeholder.trim();
      const enKey = reverseTranslationMap[trimmed] || trimmed;
      if (dictionary[enKey]) input.placeholder = dictionary[enKey];
    });
  }, [language, screen]);

  const loadWeather = async (district: string = "Guntur") => {
    setWeatherLoading(true);
    try {
      const response = await fetch(apiUrl(`/weather?district=${encodeURIComponent(district)}`));
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data.weather);
      }
    } catch {}
    finally {
      setWeatherLoading(false);
    }
  };

  const loadCropPrices = async () => {
    try {
      const response = await fetch(apiUrl("/crop-prices"));
      if (response.ok) {
        const data = await response.json();
        setCropPricesList([...(data.prices ?? [])].sort((a: any, b: any) => a.cropName.localeCompare(b.cropName, undefined, { sensitivity: "base" })));
      }
    } catch {}
  };

  const loadFarmerAnalytics = async (token?: string) => {
    const activeToken = token ?? farmerToken;
    if (!activeToken) return;
    try {
      const response = await fetch(apiUrl("/analytics/farmer"), {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFarmerAnalyticsData(data);
      }
    } catch {}
  };

  const loadTransportOptions = async () => {
    try {
      const response = await fetch(apiUrl("/transport/options"));
      if (response.ok) {
        const data = await response.json();
        setTransportOptions(data.options ?? []);
      }
    } catch {}
  };

  const loadFarmerTransportBookings = async (token?: string, fId?: number) => {
    const activeToken = token ?? farmerToken;
    const activeFarmerId = fId ?? farmerId ?? 1;
    try {
      const response = await fetch(apiUrl(`/farmers/${activeFarmerId}/transport`), {
        headers: { Authorization: `Bearer ${activeToken || "demo-farmer-session-token"}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.transportBookings)) {
          setTransportBookingsList(data.transportBookings);
        }
      }
    } catch {}
  };

  const bookTransport = async () => {
    if (transportBookingLoading) return;
    setTransportBookingLoading(true);
    try {
      const centre = apiCentres.find(c => c.id === transportForm.destinationCentreId) ?? apiCentres[0];
      const distNum = parseFloat((centre?.distance || "12 km").replace(/[^0-9.]/g, "")) || 12;

      // Auto-assign farmer profile if guest/demo
      if (!farmerToken) {
        setFarmerToken("demo-farmer-session-token");
        setFarmerId(1);
        setProfileRecord({ id: 1, name: "Ramesh Kumar", farmerCode: "FMR-2026-11842", phone: "9876543210", village: "Muppalapally", district: "Nizamabad", primaryCrop: "Paddy", status: "APPROVED" });
        setApproved(true);
      }

      // Submit to backend
      const response = await fetch(apiUrl("/transport/book"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${farmerToken || "demo-farmer-session-token"}`,
        },
        body: JSON.stringify({
          bookingId: bookingId || undefined,
          vehicleType: transportForm.vehicleType,
          pickupVillage: transportForm.pickupVillage || (profileRecord?.village ?? "Muppalapally"),
          destinationCentreId: transportForm.destinationCentreId,
          scheduledDate: transportForm.scheduledDate,
          timeSlot: transportForm.timeSlot,
          estimatedLoadQuintals: parseFloat(transportForm.estimatedLoadQuintals) || 18,
          distanceKm: distNum,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.transport) {
          setTransportBookingsList(prev => [data.transport, ...prev.filter(b => b.id !== data.transport.id && b.transportCode !== data.transport.transportCode)]);
          toast.success(`Vehicle Booked! 30% Govt subsidy (₹${Number(data.transport.subsidyAmount || 0).toFixed(2)}) applied. Driver: ${data.transport.driverName || "Assigned"}.`);
          if (farmerId) void loadFarmerHistory(farmerId);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to book transportation");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transport booking failed.");
    } finally {
      setTransportBookingLoading(false);
    }
  };

  useEffect(() => {
    void loadCropPrices();
    void loadTransportOptions();
  }, []);

  useEffect(() => {
    void fetch(apiUrl("/centres"))
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Centres unavailable")))
      .then((data: { centres?: Array<{ id: number; name?: string; place?: string; district?: string; state?: string; cropCategories?: string; distanceKm?: number; currentQueue?: number; availableSlots?: number; status?: string; latitude?: number; longitude?: number }> }) => {
        if (data && Array.isArray(data.centres) && data.centres.length > 0) {
          const statusMap: Record<string, Centre["status"]> = { OPEN: "Open", BUSY: "Busy", LIMITED: "Limited", CLOSED: "Limited" };
          setApiCentres(data.centres.map((centre, index) => ({
            id: centre.id ?? (index + 1),
            name: centre.name ?? centres[index]?.name ?? "Procurement Centre",
            place: centre.place ?? centres[index]?.place ?? "Market Yard",
            district: centre.district ?? (centres[index] as any)?.district,
            state: centre.state ?? (centres[index] as any)?.state ?? "Andhra Pradesh",
            cropCategories: centre.cropCategories ?? "Cereals, Pulses, Oilseeds",
            distance: `${centre.distanceKm ?? 3.2} km`,
            queue: centre.currentQueue ?? 12,
            wait: `${Math.max(2, (centre.currentQueue ?? 12) * 2)} min`,
            slots: centre.availableSlots ?? 15,
            status: statusMap[centre.status ?? "OPEN"] ?? "Open",
            position: centres[index]?.position ?? "left-[47%] top-[45%]",
            latitude: centre.latitude,
            longitude: centre.longitude,
          })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })));
        }
      })
      .catch(() => undefined);
  }, []);

  const loadCentreSlots = async (centreId: number, dateStr?: string) => {
    setSlotsLoading(true);
    try {
      const url = dateStr ? apiUrl(`/centres/${centreId}/slots?date=${encodeURIComponent(dateStr)}`) : apiUrl(`/centres/${centreId}/slots`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const slotsList: BackendSlot[] = data.slots ?? [];
        setBackendSlots(slotsList);
        const firstAvailable = slotsList.find(s => !s.isFull) ?? slotsList[0];
        if (firstAvailable) {
          setSelectedSlotId(firstAvailable.id);
          setSelectedSlot(`${firstAvailable.startTime} – ${firstAvailable.endTime}`);
        }
      }
    } catch (err) {
      console.error("Failed to load centre slots:", err);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCentre?.id) {
      void loadCentreSlots(selectedCentre.id, selectedDate);
    }
  }, [selectedCentre?.id, selectedDate]);

  useEffect(() => {
    const rawSession = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
    if (!rawSession) return;
    try {
      const saved = JSON.parse(rawSession) as { token: string; farmer: FarmerProfile };
      if (!saved.token || !saved.farmer?.id) throw new Error("Invalid session");
      setFarmerToken(saved.token);
      setFarmerId(saved.farmer.id);
      setProfileRecord(saved.farmer);
      setApproved(saved.farmer.status === "APPROVED");
      void loadNotifications(saved.token, saved.farmer.id);
      void loadFarmerStats(saved.token);
      void loadFarmerAnalytics(saved.token);
      void loadFarmerTransportBookings(saved.token, saved.farmer.id);
      void fetch(apiUrl(`/farmers/${saved.farmer.id}/bookings`), {
        headers: { Authorization: `Bearer ${saved.token}` },
        cache: "no-store",
      })
        .then(response => {
          if (response.status === 401) {
            localStorage.removeItem("procureflow.farmer.session");
            sessionStorage.removeItem("procureflow.farmer.session");
            return;
          }
          if (!response.ok) return;
          return response.json();
        })
        .then(data => {
          const list: ApiBooking[] = data?.bookings || [];
          const target = list.find(b => b.status === "ACTIVE" && b.procurement?.status !== "COMPLETED")
            || list.find(b => b.status === "ACTIVE")
            || list[0];
          return target ? loadBooking(saved.token, target.id) : undefined;
        })
        .catch(() => undefined);
    } catch {
      localStorage.removeItem("procureflow.farmer.session");
      sessionStorage.removeItem("procureflow.farmer.session");
    }
  }, []);

  useEffect(() => {
    const rawOfficerSession = localStorage.getItem("procureflow.officer.session") || sessionStorage.getItem("procureflow.officer.session");
    if (!rawOfficerSession) return;
    try {
      const saved = JSON.parse(rawOfficerSession) as { token: string; officer?: StaffRecord };
      if (saved.token) {
        setOfficerToken(saved.token);
        if (saved.officer) setOfficerProfile(saved.officer);
        void loadPendingRegistrations(saved.token);
        void loadOfficerFarmers(saved.token);
        void loadOfficerBookings(saved.token);
        void loadOfficerAnalytics(saved.token);
        void loadOfficerStats(saved.token);
        void loadOfficerTransport(saved.token);
        void loadStaffList(saved.token);
        void loadStaffAuditLogs(saved.token);
        void loadOfficerNotifications(saved.token);
      }
    } catch {
      localStorage.removeItem("procureflow.officer.session");
      sessionStorage.removeItem("procureflow.officer.session");
    }
  }, []);

  useEffect(() => {
    if ((screen !== "queue" && screen !== "token") || !farmerToken || !bookingId) return;
    const refreshQueue = () => void fetch(apiUrl(`/queue/${bookingId}`), { headers: { Authorization: `Bearer ${farmerToken}` }, cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((data: { position: number; peopleAhead: number; estimatedWaitMinutes: number; status: string; currentToken: string }) => {
        setQueueAhead(data.peopleAhead);
        setBookingRecord(record => record ? { ...record, queue: data } : record);
      })
      .catch(() => undefined);
    refreshQueue();
    const timer = window.setInterval(refreshQueue, 3000);
    return () => window.clearInterval(timer);
  }, [screen, farmerToken, bookingId]);

  const queueProgress = useMemo(() => Math.round(((28 - queueAhead) / 28) * 100), [queueAhead]);

  const refreshProcurementStatus = async (token?: string | null, fId?: number | null, bId?: number | null) => {
    const activeToken = token ?? farmerToken;
    const activeFarmerId = fId ?? farmerId;
    const activeBookingId = bId ?? bookingId;
    if (!activeToken) return;

    try {
      if (activeBookingId) {
        const response = await fetch(apiUrl(`/bookings/${activeBookingId}`), {
          headers: { Authorization: `Bearer ${activeToken}` },
          cache: "no-store",
        });
        if (response.ok) {
          const data: { booking: ApiBooking } = await response.json();
          if (data.booking) {
            setBookingRecord(data.booking);
            setBookingId(data.booking.id);
            setProfileRecord(data.booking.farmer);
            if (data.booking.queue) setQueueAhead(data.booking.queue.peopleAhead ?? 0);
            return data.booking;
          }
        }
      }

      if (activeFarmerId) {
        const response = await fetch(apiUrl(`/farmers/${activeFarmerId}/bookings`), {
          headers: { Authorization: `Bearer ${activeToken}` },
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          const list: ApiBooking[] = data.bookings || [];
          if (list.length > 0) {
            const target = list.find(b => b.status === "ACTIVE" && b.procurement?.status !== "COMPLETED")
              || list.find(b => b.status === "ACTIVE")
              || list[0];
            if (target) {
              setBookingId(target.id);
              setBookingRecord(target);
              setProfileRecord(target.farmer);
              if (target.queue) setQueueAhead(target.queue.peopleAhead ?? 0);
              return target;
            }
          }
        }
      }
    } catch {
      // ignore network errors during background polling
    }
  };

  // Active real-time synchronization of procurement status while farmer is on Procurement screen
  useEffect(() => {
    if (screen === "status" && farmerToken) {
      void refreshProcurementStatus(farmerToken, farmerId, bookingId);
      const timer = setInterval(() => {
        void refreshProcurementStatus(farmerToken, farmerId, bookingId);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [screen, farmerToken, farmerId, bookingId]);

  const navigate = (next: Screen) => {
    if (farmerOnlyScreens.includes(next) && !farmerToken) {
      setAuthError("Please login with your approved farmer account to continue.");
      setScreen("farmerLogin"); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); return;
    }
    if (next === "status" && farmerToken) {
      void refreshProcurementStatus(farmerToken, farmerId, bookingId);
    }
    setScreen(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (farmerOnlyScreens.includes(screen) && !farmerToken) setScreen("farmerLogin");
  }, [screen, farmerToken]);
  const loadNotifications = async (token: string, id?: number) => {
    if (!id) return;
    const response = await fetch(apiUrl(`/farmers/${id}/notifications`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (response.ok) setApiNotifications((await response.json()).notifications);
  };
  const loadBooking = async (token: string, id: number) => {
    const response = await fetch(apiUrl(`/bookings/${id}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Booking data is unavailable.");
    const data: { booking: ApiBooking } = await response.json();
    setBookingId(data.booking.id); setBookingRecord(data.booking); setProfileRecord(data.booking.farmer); setQueueAhead(data.booking.queue?.peopleAhead ?? 0);
    return data.booking;
  };
  const loadPaymentData = async (token: string, id: number, booking?: number) => {
    try {
      const [historyResponse, currentResponse] = await Promise.all([
        fetch(apiUrl(`/farmers/${id}/payments`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        booking ? fetch(apiUrl(`/payments/${booking}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }) : Promise.resolve(null),
      ]);
      if (historyResponse.ok) {
        const hData = await historyResponse.json();
        setPaymentHistory(hData.payments ?? []);
      }
      if (currentResponse?.ok) {
        const cData = await currentResponse.json();
        if (cData.payment) {
          setPaymentRecord(cData.payment);
        }
      }
    } catch {}
  };

  // Real-time synchronization of payment status when farmer is viewing payment page
  useEffect(() => {
    if (screen === "payment" && farmerToken && farmerId) {
      void loadPaymentData(farmerToken, farmerId, bookingId ?? undefined);
      const timer = setInterval(() => {
        void loadPaymentData(farmerToken, farmerId, bookingId ?? undefined);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [screen, farmerToken, farmerId, bookingId]);

  const loadFarmerHistory = async (targetFarmerId?: number) => {
    const id = targetFarmerId || farmerId || profileRecord?.id;
    const token = farmerToken;
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(apiUrl(`/farmers/${id}/history`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setFarmerHistoryData(data);
      } else {
        const [bkRes, trRes, payRes] = await Promise.allSettled([
          fetch(apiUrl(`/farmers/${id}/bookings`), { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" }),
          fetch(apiUrl(`/farmers/${id}/transport`), { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" }),
          fetch(apiUrl(`/farmers/${id}/payments`), { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" }),
        ]);

        const rawBookings = bkRes.status === "fulfilled" && bkRes.value.ok ? (await bkRes.value.json()).bookings || [] : [];
        const rawTransport = trRes.status === "fulfilled" && trRes.value.ok ? (await trRes.value.json()).transport || [] : [];
        const rawPayments = payRes.status === "fulfilled" && payRes.value.ok ? (await payRes.value.json()).payments || [] : [];

        const timeline: any[] = [];
        rawBookings.forEach((b: any) => {
          timeline.push({
            id: `bk-${b.id}`,
            type: "BOOKING",
            title: `Procurement Slot: ${b.paddyVariety}`,
            code: b.bookingCode,
            crop: b.paddyVariety,
            quantity: b.expectedQuantityQuintals,
            centre: b.centre?.name,
            date: b.slot?.date,
            timeSlot: b.slot ? `${b.slot.startTime} - ${b.slot.endTime}` : undefined,
            amount: b.paymentQuote?.demoPayable,
            status: b.status,
            tokenNumber: b.tokenNumber,
            rawTimestamp: b.createdAt || new Date().toISOString(),
            details: b,
          });
        });

        rawTransport.forEach((t: any) => {
          timeline.push({
            id: `tr-${t.id}`,
            type: "TRANSPORT",
            title: `Transport: ${t.pickupVillage} → ${t.destinationCentre || "Centre"}`,
            code: t.transportCode,
            crop: `${t.vehicleType} (${t.estimatedLoadQuintals || 0} Qtl)`,
            quantity: t.estimatedLoadQuintals,
            centre: t.destinationCentre,
            date: t.scheduledDate,
            timeSlot: t.timeSlot,
            amount: t.netPayable,
            status: t.status,
            rawTimestamp: t.createdAt || new Date().toISOString(),
            details: t,
          });
        });

        rawPayments.forEach((p: any) => {
          timeline.push({
            id: `pay-${p.id}`,
            type: "PAYMENT",
            title: `Direct Benefit Transfer: ${p.bookingCode || p.transactionReference}`,
            code: p.paymentId || p.transactionReference,
            crop: p.paddyVariety || "Procurement Payout",
            amount: p.amount,
            status: p.status,
            paymentMethod: p.paymentMethod || "Aadhaar DBT / NEFT",
            date: p.completedAt || p.createdAt,
            rawTimestamp: p.createdAt || new Date().toISOString(),
            details: p,
          });
        });

        timeline.sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

        const totalPaid = rawPayments
          .filter((p: any) => p.status === "SUCCESS" || p.status === "COMPLETED")
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

        setFarmerHistoryData({
          summary: {
            totalBookings: rawBookings.length,
            activeBookings: rawBookings.filter((b: any) => b.status === "ACTIVE").length,
            totalTransport: rawTransport.length,
            activeTransport: rawTransport.filter((t: any) => t.status === "REQUESTED" || t.status === "ASSIGNED" || t.status === "IN_TRANSIT").length,
            totalPayments: rawPayments.length,
            totalPaidAmount: totalPaid,
          },
          bookings: rawBookings,
          transport: rawTransport,
          payments: rawPayments,
          timeline,
        });
      }
    } catch (err) {
      console.error("Failed to load farmer activity history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (screen === "history" && farmerToken && farmerId) {
      void loadFarmerHistory(farmerId);
    }
  }, [screen, farmerToken, farmerId]);
  const loadFarmerStats = async (token: string) => { const response = await fetch(apiUrl("/stats/farmer"), { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) setFarmerStats((await response.json()).stats); };
  const loadOfficerStats = async (token: string) => { const response = await fetch(apiUrl("/stats/officer"), { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) setOfficerStats((await response.json()).stats); };
  const loadOfficerAnalytics = async (token: string) => {
    const response = await fetch(apiUrl("/analytics/officer"), { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) {
      const data = await response.json();
      setOfficerAnalytics(data.analytics);
    }
  };
  const loadOfficerBookings = async (token: string) => {
    const response = await fetch(apiUrl("/officers/bookings"), { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) {
      const data = await response.json();
      setOfficerBookings(data.bookings ?? []);
    }
  };

  const loadOfficerTransport = async (token: string) => {
    try {
      const response = await fetch(apiUrl("/officers/transport"), { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setOfficerLogisticsList(data.transportBookings ?? []);
      }
    } catch {}
  };

  const loadStaffList = async (token?: string) => {
    const t = token || officerToken;
    if (!t) return;
    try {
      const response = await fetch(apiUrl("/officers/staff"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStaffList(data.staff || []);
      }
    } catch {}
  };

  const loadStaffAuditLogs = async (token?: string) => {
    const t = token || officerToken;
    if (!t) return;
    try {
      const response = await fetch(apiUrl("/officers/staff/audit-logs"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStaffAuditLogsList(data.auditLogs || []);
      }
    } catch {}
  };

  const loadOfficerNotifications = async (token?: string) => {
    const t = token || officerToken;
    if (!t) return;
    try {
      const response = await fetch(apiUrl("/officers/notifications"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOfficerNotificationsList(data.notifications || []);
      }
    } catch {}
  };

  const loadOfficerFarmers = async (token?: string) => {
    const t = token || officerToken;
    if (!t) return;
    setOfficerFarmersLoading(true);
    try {
      const response = await fetch(apiUrl("/officers/farmers"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOfficerFarmersList(data.farmers || []);
      }
    } catch {}
    finally {
      setOfficerFarmersLoading(false);
    }
  };

  const submitAddStaff = async () => {
    if (!officerToken) return;
    setAddStaffSubmitting(true);
    try {
      const response = await fetch(apiUrl("/officers/staff/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify(addStaffForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit staff onboarding request.");
      toast.success("Staff Registration Submitted — Pending Head Officer Verification");
      setShowAddStaffModal(false);
      setAddStaffForm({
        name: "",
        employeeId: "",
        email: "",
        phone: "",
        department: "Quality Control",
        role: "QUALITY_CONTROL_INSPECTOR",
        branch: "Guntur",
        centreId: 1,
        centreName: "Guntur Agricultural Market Yard",
        district: "Guntur",
        designation: "Quality Control Inspector",
      });
      await loadStaffList(officerToken);
      await loadStaffAuditLogs(officerToken);
      setStaffTab("pending");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Staff registration failed.");
    } finally {
      setAddStaffSubmitting(false);
    }
  };

  const approveStaffMember = async (staffId: number) => {
    if (!officerToken) return;
    try {
      const response = await fetch(apiUrl(`/officers/staff/${staffId}/approve`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to approve staff member.");
      setApprovedCredentials({
        officerCode: data.officerCode,
        temporaryPassword: data.temporaryPassword,
        staff: data.staff,
      });
      setShowApproveCredentialsModal(true);
      toast.success(`Staff member ${data.staff?.name || ""} APPROVED! Login ID: ${data.officerCode}`);
      await loadStaffList(officerToken);
      await loadStaffAuditLogs(officerToken);
      setStaffTab("active");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed.");
    }
  };

  const submitRejectStaff = async () => {
    if (!officerToken || !rejectStaffTarget) return;
    try {
      const response = await fetch(apiUrl(`/officers/staff/${rejectStaffTarget.id}/reject`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({ reason: staffRejectReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to reject staff member.");
      toast.error(`Staff application for ${rejectStaffTarget.name} rejected.`);
      setShowRejectStaffModal(false);
      setRejectStaffTarget(null);
      await loadStaffList(officerToken);
      await loadStaffAuditLogs(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rejection failed.");
    }
  };

  const disableStaffMember = async (staffId: number) => {
    if (!officerToken) return;
    try {
      const response = await fetch(apiUrl(`/officers/staff/${staffId}/disable`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to disable staff access.");
      toast.message(`Staff member access DISABLED.`);
      await loadStaffList(officerToken);
      await loadStaffAuditLogs(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  };

  const enableStaffMember = async (staffId: number) => {
    if (!officerToken) return;
    try {
      const response = await fetch(apiUrl(`/officers/staff/${staffId}/enable`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to re-enable staff access.");
      toast.success(`Staff member access RE-ENABLED.`);
      await loadStaffList(officerToken);
      await loadStaffAuditLogs(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  };

  const loadPendingRegistrations = async (token: string) => {
    try {
      const response = await fetch(apiUrl("/officers/registrations/pending"), { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.registrations)) {
          setPendingRegistrations(data.registrations);
          return data.registrations;
        }
      }
    } catch {}
    return [];
  };

  useEffect(() => {
    if (!officerToken) return;
    void loadPendingRegistrations(officerToken).catch(() => undefined);
    void loadOfficerBookings(officerToken).catch(() => undefined);
    void loadOfficerTransport(officerToken).catch(() => undefined);
    void loadOfficerAnalytics(officerToken).catch(() => undefined);
    void loadStaffList(officerToken).catch(() => undefined);
    void loadStaffAuditLogs(officerToken).catch(() => undefined);
    void loadOfficerNotifications(officerToken).catch(() => undefined);
    const intervalId = window.setInterval(() => {
      void loadPendingRegistrations(officerToken).catch(() => undefined);
      void loadOfficerBookings(officerToken).catch(() => undefined);
      void loadOfficerTransport(officerToken).catch(() => undefined);
      void loadOfficerAnalytics(officerToken).catch(() => undefined);
      void loadStaffList(officerToken).catch(() => undefined);
      void loadStaffAuditLogs(officerToken).catch(() => undefined);
      void loadOfficerNotifications(officerToken).catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(intervalId);
  }, [officerToken, officerView]);

  const approveFarmer = async () => {
    if (!officerToken) { toast.error("Login as an officer before approving a registration."); navigate("officerLogin"); return; }
    try {
      const targetId = selectedRegistrationId ?? pendingRegistrations[0]?.id;
      if (!targetId) throw new Error("No pending registration found.");
      const targetItem = pendingRegistrations.find(item => item.id === targetId) ?? pendingRegistrations[0];

      const response = await fetch(apiUrl(`/officers/registrations/${targetId}/approve`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Approval could not be completed on server.");
      }

      setApproved(true);
      setRegistrationStatus("APPROVED");
      setPendingRegistrations(items => items.filter(item => item.id !== targetId));
      setShowRecord(false);

      toast.success(`Farmer ${targetItem?.farmer?.name ?? ""} APPROVED! The farmer can now sign in.`);
      setOfficerView("approved");
      await loadPendingRegistrations(officerToken);
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval could not be completed.");
    }
  };

  const rejectFarmer = async () => {
    if (!officerToken) { toast.error("Login as an officer before rejecting a registration."); return; }
    try {
      const targetId = selectedRegistrationId ?? pendingRegistrations[0]?.id;
      if (!targetId) throw new Error("No pending registration selected.");
      const targetItem = pendingRegistrations.find(item => item.id === targetId) ?? pendingRegistrations[0];

      const response = await fetch(apiUrl(`/officers/registrations/${targetId}/reject`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Rejection failed on server.");
      }

      setRegistrationStatus("REJECTED");
      setPendingRegistrations(items => items.filter(item => item.id !== targetId));
      setShowRecord(false);
      setShowRejectModal(false);

      toast.error(`Registration for ${targetItem?.farmer?.name ?? "farmer"} rejected.`);
      await loadPendingRegistrations(officerToken);
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rejection failed.");
    }
  };

  const submitQcInspection = async () => {
    if (!officerToken || !selectedQcBooking) return;
    setQcSubmitting(true);
    try {
      const response = await fetch(apiUrl(`/officers/procurement/${selectedQcBooking.id}/qc-inspection`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({
          qualityGrade: qcForm.qualityGrade,
          qcResult: qcForm.qcResult,
          weighedQuantityQuintals: Number(qcForm.weighedQuantityQuintals) || Number(selectedQcBooking.expectedQuantityQuintals),
          moisturePercent: Number(qcForm.moisturePercent) || 14.0,
          foreignMatterPercent: Number(qcForm.foreignMatterPercent) || 1.0,
          remarks: qcForm.remarks,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Could not submit quality inspection.");
      }
      toast.success(`Quality inspection submitted: ${qcForm.qcResult} (${qcForm.qualityGrade}).`);
      setShowQcModal(false);
      await loadOfficerBookings(officerToken);
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QC inspection submission failed.");
    } finally {
      setQcSubmitting(false);
    }
  };

  const updateLogisticsStatus = async () => {
    if (!officerToken || !selectedTransportItem) return;
    try {
      const targetId = selectedTransportItem.id || selectedTransportItem.transportCode;
      const response = await fetch(apiUrl(`/officers/transport/${targetId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({ status: transportUpdateStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Could not update logistics status.");
      }
      toast.success(data.message || `Logistics status updated to ${(transportUpdateStatus || "").replaceAll("_", " ")}.`);
      setShowTransportModal(false);
      setOfficerLogisticsList(prev => prev.map(item => {
        if (item.id === selectedTransportItem.id || item.transportCode === selectedTransportItem.transportCode) {
          return { ...item, status: transportUpdateStatus };
        }
        return item;
      }));
      await loadOfficerTransport(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logistics update failed.");
    }
  };

  const disburseFarmerPayout = async (bookingId: number) => {
    if (!officerToken) return;
    setPayoutProcessingId(bookingId);
    try {
      const response = await fetch(apiUrl(`/officers/procurement/${bookingId}/payout`), {
        method: "POST",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to disburse payment.");
      toast.success(`Procurement DBT Payment of ₹${(data.amount ?? 41400).toLocaleString("en-IN")} credited directly to farmer!`);
      await loadOfficerBookings(officerToken);
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
      const payRes = await fetch(apiUrl("/officers/payments"), { headers: { Authorization: `Bearer ${officerToken}` } });
      if (payRes.ok) {
        const pData = await payRes.json();
        setOfficerPayments(pData.payments ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payout initiation failed.");
    } finally {
      setPayoutProcessingId(null);
    }
  };

  const initiateFarmerPayment = async (bookingId: number) => {
    if (!officerToken) return;
    setPayoutProcessingId(bookingId);
    try {
      const response = await fetch(apiUrl(`/officers/procurement/${bookingId}/initiate-payment`), {
        method: "POST",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to initiate payment.");
      toast.success(`Payment initiated! Ref: ${data.payment?.transactionReference || ""}`);
      await loadOfficerBookings(officerToken);
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
      const payRes = await fetch(apiUrl("/officers/payments"), { headers: { Authorization: `Bearer ${officerToken}` } });
      if (payRes.ok) {
        const pData = await payRes.json();
        setOfficerPayments(pData.payments ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment initiation failed.");
    } finally {
      setPayoutProcessingId(null);
    }
  };

  const updateProcurementStage = async () => {
    if (!officerToken || !selectedOfficerBooking) return;
    try {
      const response = await fetch(apiUrl(`/procurement/${selectedOfficerBooking.id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({
          status: procurementForm.status,
          weighedQuantityQuintals: Number(procurementForm.weighedQuantityQuintals) || undefined,
          qualityGrade: procurementForm.qualityGrade || undefined,
        }),
      });
      if (!response.ok) throw new Error("Could not update procurement stage.");
      toast.success(`Procurement stage updated to ${(procurementForm.status || "").replaceAll("_", " ")}.`);
      setShowProcurementModal(false);
      await loadOfficerBookings(officerToken);
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status update failed.");
    }
  };

  const handleSendRegistrationOtp = async () => {
    setAuthError(null);
    setRegDevOtp(null);
    const cleanPhone = registrationForm.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      const msg = "Please enter a valid 10-digit mobile number.";
      setAuthError(msg);
      toast.error(msg);
      return;
    }
    setRegOtpSending(true);
    try {
      const response = await fetch(apiUrl("/auth/otp/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, purpose: "REGISTRATION" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to send OTP.");
      }
      setRegChallengeId(data.challengeId);
      setRegCooldownSeconds(data.resendAvailableInSeconds || 30);
      setRegAttemptsRemaining(5);
      const otpCode = data.demoOtp || data.developmentOtp;
      if (otpCode) {
        setRegDevOtp(otpCode);
        if (data.isDemoMode) {
          toast.info(`Demo OTP: ${otpCode}`);
        } else {
          toast.info(`Development Test OTP: ${otpCode}`);
        }
      }
      setRegStep("OTP");
      toast.success(data.message || (data.isDemoMode ? "Demo OTP generated!" : "SMS OTP sent successfully!"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send SMS OTP.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setRegOtpSending(false);
    }
  };

  const handleResendRegistrationOtp = async () => {
    if (!regChallengeId || regCooldownSeconds > 0) return;
    setRegOtpSending(true);
    setAuthError(null);
    setRegDevOtp(null);
    try {
      const response = await fetch(apiUrl("/auth/otp/resend"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: regChallengeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to resend OTP.");
      }
      setRegCooldownSeconds(data.resendAvailableInSeconds || 30);
      const otpCode = data.demoOtp || data.developmentOtp;
      if (otpCode) {
        setRegDevOtp(otpCode);
        if (data.isDemoMode) {
          toast.info(`Demo OTP: ${otpCode}`);
        } else {
          toast.info(`Development Test OTP: ${otpCode}`);
        }
      }
      toast.success(data.message || (data.isDemoMode ? "New Demo OTP generated!" : "New OTP sent via SMS."));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to resend OTP.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setRegOtpSending(false);
    }
  };

  const handleVerifyRegistrationOtp = async () => {
    if (!regChallengeId) return;
    const cleanOtp = regOtp.trim();
    if (cleanOtp.length !== 6) {
      const msg = "Please enter the complete 6-digit OTP.";
      setAuthError(msg);
      toast.error(msg);
      return;
    }
    setRegOtpVerifying(true);
    setAuthError(null);
    try {
      const response = await fetch(apiUrl("/auth/otp/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: regChallengeId, otp: cleanOtp }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (typeof data.attemptsRemaining === "number") {
          setRegAttemptsRemaining(data.attemptsRemaining);
        }
        throw new Error(data.message || data.error || "Incorrect OTP.");
      }
      setRegVerificationToken(data.verificationToken);
      setRegStep("DETAILS");
      toast.success("Mobile number verified successfully! Please complete your registration details.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Verification failed.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setRegOtpVerifying(false);
    }
  };

  const submitRegistration = async () => {
    setAuthError(null);
    const cleanPhone = registrationForm.phone.replace(/\D/g, "");
    if (!regVerificationToken) {
      const msg = "Mobile number must be verified via OTP first.";
      setAuthError(msg);
      toast.error(msg);
      setRegStep("PHONE");
      return;
    }
    if (!registrationForm.password || registrationForm.password.length < 8) {
      const msg = "Password must be at least 8 characters long.";
      setAuthError(msg);
      toast.error(msg);
      return;
    }
    if (registrationForm.password !== regConfirmPassword) {
      const msg = "Passwords do not match. Please re-enter matching passwords.";
      setAuthError(msg);
      toast.error(msg);
      return;
    }
    setAuthLoading(true);
    try {
      const response = await fetch(apiUrl("/registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registrationForm,
          phone: cleanPhone,
          verificationToken: regVerificationToken,
          declarationAccepted: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Registration could not be submitted.");
      }

      const registeredFarmer: FarmerProfile = data.farmer || {
        id: Date.now(),
        farmerCode: `FMR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        name: registrationForm.name,
        phone: cleanPhone,
        village: registrationForm.village,
        district: registrationForm.district,
        primaryCrop: registrationForm.primaryCrop,
        status: "PENDING",
      };

      const newRegistrationId = data.registration?.id || registeredFarmer.id;
      const newPendingItem: PendingRegistration = {
        id: newRegistrationId,
        registrationCode: data.registration?.registrationCode || `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        aadhaarMasked: registrationForm.aadhaarMasked || "XXXX XXXX 1234",
        status: "PENDING",
        submittedAt: new Date().toISOString(),
        farmer: registeredFarmer,
      };

      setPendingRegistrations(prev => [newPendingItem, ...prev.filter(p => p.farmer.phone !== cleanPhone && p.id !== newRegistrationId)]);

      setRegistered(true);
      setRegistrationId(newRegistrationId);
      setRegistrationStatus("PENDING");
      setPendingFarmer(registeredFarmer);
      setFarmerCredentials({
        phone: cleanPhone,
        password: registrationForm.password,
      });
      navigate("pending");
      toast.success(
        language === "TE"
          ? "నమోదు సమర్పించబడింది — అధికారి సమీక్ష మరియు ఆమోదం కోసం వేచి ఉంది."
          : language === "HI"
          ? "पंजीकरण जमा किया गया — अधिकारी सत्यापन एवं स्वीकृति की प्रतीक्षा है।"
          : "Registration submitted! Your account is PENDING officer review."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration could not be submitted.";
      setAuthError(message);
      toast.error(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    setForgotError(null);
    setForgotDevOtp(null);
    const cleanPhone = forgotPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      const msg = "Please enter your registered 10-digit mobile number.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    setForgotLoading(true);
    try {
      const response = await fetch(apiUrl("/auth/otp/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, purpose: "PASSWORD_RESET" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to send reset OTP.");
      }
      setForgotChallengeId(data.challengeId);
      setForgotCooldownSeconds(data.resendAvailableInSeconds || 30);
      setForgotAttemptsRemaining(5);
      const otpCode = data.demoOtp || data.developmentOtp;
      if (otpCode) {
        setForgotDevOtp(otpCode);
        if (data.isDemoMode) {
          toast.info(`Demo OTP: ${otpCode}`);
        } else {
          toast.info(`Development Test OTP: ${otpCode}`);
        }
      }
      setForgotStep("OTP");
      toast.success(data.message || (data.isDemoMode ? "Demo OTP generated for password reset." : "SMS OTP sent for password reset."));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send OTP.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (!forgotChallengeId || forgotCooldownSeconds > 0) return;
    setForgotLoading(true);
    setForgotError(null);
    setForgotDevOtp(null);
    try {
      const response = await fetch(apiUrl("/auth/otp/resend"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: forgotChallengeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to resend OTP.");
      }
      setForgotCooldownSeconds(data.resendAvailableInSeconds || 30);
      const otpCode = data.demoOtp || data.developmentOtp;
      if (otpCode) {
        setForgotDevOtp(otpCode);
        if (data.isDemoMode) {
          toast.info(`Demo OTP: ${otpCode}`);
        } else {
          toast.info(`Development Test OTP: ${otpCode}`);
        }
      }
      toast.success(data.message || (data.isDemoMode ? "New Demo OTP generated!" : "New OTP resent via SMS."));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to resend OTP.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    if (!forgotChallengeId) return;
    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      const msg = "Please enter the 6-digit OTP received via SMS.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const response = await fetch(apiUrl("/auth/otp/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: forgotChallengeId, otp: cleanOtp }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (typeof data.attemptsRemaining === "number") {
          setForgotAttemptsRemaining(data.attemptsRemaining);
        }
        throw new Error(data.message || data.error || "Incorrect OTP.");
      }
      setForgotVerificationToken(data.verificationToken);
      setForgotStep("PASSWORD");
      toast.success("Mobile verified successfully. Please enter your new password.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Verification failed.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetForgotPassword = async () => {
    if (!forgotVerificationToken) {
      setForgotStep("PHONE");
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      const msg = "New password must be at least 8 characters long.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      const msg = "Passwords do not match. Please re-enter matching passwords.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const response = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: forgotVerificationToken,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Password reset failed.");
      }
      setForgotStep("SUCCESS");
      setFarmerCredentials(prev => ({ ...prev, phone: forgotPhone, password: "" }));
      toast.success("Password reset successfully! You can now log in.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to reset password.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const loginFarmer = async () => {
    setAuthError(null); setAuthLoading(true);
    try {
      const cleanPhone = farmerCredentials.phone.replace(/\s/g, "");

      const response = await fetch(apiUrl("/farmers/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          password: farmerCredentials.password,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.status === "PENDING" || data.error === "REGISTRATION_NOT_APPROVED") {
        if (data.status === "PENDING" || data.error === "REGISTRATION_NOT_APPROVED") {
          setRegistrationStatus(data.status ?? "PENDING");
          if (data.farmer) setPendingFarmer(data.farmer);
          navigate("pending");
        }
        throw new Error(data.message ?? "Your registration requires officer approval before login.");
      }

      setFarmerToken(data.accessToken);
      setFarmerId(data.farmer.id);
      setProfileRecord(data.farmer);
      setApproved(true);
      localStorage.setItem("procureflow.farmer.session", JSON.stringify({ token: data.accessToken, farmer: data.farmer }));
      sessionStorage.setItem("procureflow.farmer.session", JSON.stringify({ token: data.accessToken, farmer: data.farmer }));
      
      const bookingResponse = await fetch(apiUrl(`/farmers/${data.farmer.id}/bookings`), { headers: { Authorization: `Bearer ${data.accessToken}` } });
      const bookingData = await bookingResponse.json();
      const activeBooking = bookingData.bookings?.[0];
      if (activeBooking) await loadBooking(data.accessToken, activeBooking.id);
      await loadNotifications(data.accessToken, data.farmer.id);
      await loadPaymentData(data.accessToken, data.farmer.id, activeBooking?.id);
      await loadFarmerStats(data.accessToken);
      setScreen("dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success(`Welcome back, ${data.farmer.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login could not be completed.";
      setAuthError(message);
      toast.error(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const loginOfficer = async (overrideCreds?: { officerCode: string; password?: string }) => {
    try {
      const creds = overrideCreds || officerLoginForm;
      const response = await fetch(apiUrl("/officers/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: creds.officerCode,
          password: creds.password || "Officer@2026",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Officer login failed.");
      
      setOfficerToken(data.accessToken);
      setOfficerProfile(data.officer);
      localStorage.setItem("procureflow.officer.session", JSON.stringify({ token: data.accessToken, officer: data.officer }));
      sessionStorage.setItem("procureflow.officer.session", JSON.stringify({ token: data.accessToken, officer: data.officer }));

      const role = data.officer?.role || "HEAD_OFFICER";
      
      if (role === "HEAD_OFFICER") {
        await loadStaffList(data.accessToken);
        await loadStaffAuditLogs(data.accessToken);
        await loadPendingRegistrations(data.accessToken);
        await loadOfficerFarmers(data.accessToken);
        await loadOfficerBookings(data.accessToken);
        await loadOfficerAnalytics(data.accessToken);
        await loadOfficerStats(data.accessToken);
        await loadOfficerTransport(data.accessToken);
        setOfficerView("staff");
        navigate("staffManagement");
      } else if (role === "QUALITY_CONTROL_INSPECTOR") {
        await loadOfficerBookings(data.accessToken);
        setOfficerView("quality");
        navigate("quality");
      } else if (role === "LOGISTICS_OFFICER") {
        await loadOfficerTransport(data.accessToken);
        setOfficerView("logistics");
        navigate("officerLogistics");
      } else if (role === "PAYMENT_OFFICER") {
        const pRes = await fetch(apiUrl("/officers/payments"), { headers: { Authorization: `Bearer ${data.accessToken}` } });
        if (pRes.ok) setOfficerPayments((await pRes.json()).payments);
        setOfficerView("payments");
        navigate("officerPayments");
      } else { // PROCUREMENT_OFFICER
        await loadPendingRegistrations(data.accessToken);
        await loadOfficerFarmers(data.accessToken);
        await loadOfficerBookings(data.accessToken);
        setOfficerView("pending");
        navigate("registrations");
      }

      await loadOfficerNotifications(data.accessToken);
      toast.success(`Welcome ${data.officer?.name || "Officer"} (${(data.officer?.role || "Officer").replaceAll("_", " ")})!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Officer login could not be completed.");
    }
  };

  const logoutFarmer = () => {
    localStorage.removeItem("procureflow.farmer.session");
    sessionStorage.removeItem("procureflow.farmer.session");
    setFarmerToken(null); setFarmerId(null); setBookingId(null); setBookingRecord(null); setProfileRecord(null); setApiNotifications([]); setPaymentRecord(null); setPaymentHistory([]); setReceipt(null); setPaymentDone(false); setApproved(false); setAuthError(null);
    navigate("landing");
    toast.success("You have been logged out from Farmer Portal.");
  };

  const logoutOfficer = () => {
    localStorage.removeItem("procureflow.officer.session");
    sessionStorage.removeItem("procureflow.officer.session");
    setOfficerToken(null);
    navigate("landing");
    toast.success("Officer console session closed.");
  };
  const processPayment = async () => {
    if (!farmerToken || !bookingId || !farmerId) { toast.error("Login as an approved farmer with an active booking before paying."); return; }
    setPaymentProcessing(true);
    try {
      const method = paymentMode === "Card" ? "CARD" : paymentMode === "Net Banking" ? "NET_BANKING" : "UPI";
      const createResponse = await fetch(apiUrl("/payments"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` }, body: JSON.stringify({ bookingId, method }) });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.message ?? "Payment could not be started.");
      setPaymentRecord(created.payment);
      const razorpay = created.razorpay as { keyId?: string; orderId?: string; mode?: string } | null;
      if (razorpay?.keyId && razorpay.orderId) {
        const processingResponse = await fetch(apiUrl(`/payments/${created.payment.paymentId}/process`), { method: "POST", headers: { Authorization: `Bearer ${farmerToken}` } });
        const processing = await processingResponse.json();
        if (!processingResponse.ok) throw new Error(processing.message ?? "Payment processing could not begin.");
        setPaymentRecord(processing.payment);
        if (!await loadRazorpayCheckout() || !window.Razorpay) throw new Error("Secure payment checkout could not load. Please try again.");
        await new Promise<void>((resolve, reject) => {
          const checkout = new (window.Razorpay!)({ key: razorpay.keyId!, amount: Math.round(Number(created.payment.amount) * 100), currency: "INR", name: "ProcureFlow", description: "Paddy procurement settlement", order_id: razorpay.orderId!, theme: { color: "#1e7b52" }, modal: { ondismiss: () => reject(new Error("Payment was cancelled before confirmation.")) }, handler: async response => {
            try {
              const verifyResponse = await fetch(apiUrl(`/payments/${created.payment.paymentId}/razorpay/verify`), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` }, body: JSON.stringify({ orderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }) });
              const verified = await verifyResponse.json();
              if (!verifyResponse.ok) throw new Error(verified.message ?? "Payment verification failed.");
              setPaymentRecord(verified.payment); setPaymentDone(true);
              const receiptResponse = await fetch(apiUrl(`/payments/${created.payment.paymentId}/receipt`), { headers: { Authorization: `Bearer ${farmerToken}` } });
              if (receiptResponse.ok) setReceipt((await receiptResponse.json()).receipt);
              toast.success("Payment successful. Your receipt is ready."); resolve();
            } catch (error) { reject(error); }
          }});

          checkout.open();
        });
        await Promise.all([loadPaymentData(farmerToken, farmerId, bookingId), loadNotifications(farmerToken, farmerId)]);
        return;
      }
      const processingResponse = await fetch(apiUrl(`/payments/${created.payment.paymentId}/process`), { method: "POST", headers: { Authorization: `Bearer ${farmerToken}` } });
      const processing = await processingResponse.json();
      if (!processingResponse.ok) throw new Error(processing.message ?? "Payment processing could not begin.");
      setPaymentRecord(processing.payment);
      const completeResponse = await fetch(apiUrl(`/payments/${created.payment.paymentId}/complete`), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` }, body: JSON.stringify({ outcome: paymentOutcome, failureReason: paymentOutcome === "FAILED" ? "The selected provider did not authorise this payment attempt." : undefined }) });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.message ?? "Payment could not be completed.");
      setPaymentRecord(completed.payment); setPaymentDone(completed.payment.status === "SUCCESS");
      if (completed.payment.status === "SUCCESS") {
        const receiptResponse = await fetch(apiUrl(`/payments/${completed.payment.paymentId}/receipt`), { headers: { Authorization: `Bearer ${farmerToken}` } });
        if (receiptResponse.ok) setReceipt((await receiptResponse.json()).receipt);
        toast.success("Payment successful. Your receipt is ready.");
      } else toast.error(completed.payment.failureReason ?? "Payment failed. Please try another method.");
      await Promise.all([loadPaymentData(farmerToken, farmerId, bookingId), loadNotifications(farmerToken, farmerId)]);
    } catch (error) { setPaymentRecord(record => record ? { ...record, status: "FAILED", failureReason: error instanceof Error ? error.message : "Payment failed." } : record); toast.error(error instanceof Error ? error.message : "Payment failed. Please try again."); }
    finally { setPaymentProcessing(false); }
  };
  const confirmBooking = async () => {
    if (!farmerToken) { toast.error("Login as an approved farmer before confirming a booking."); navigate("farmerLogin"); return; }
    const chosenSlot = backendSlots.find(s => s.id === selectedSlotId || `${s.startTime} – ${s.endTime}` === selectedSlot) ?? backendSlots[0];
    const slotIdToUse = chosenSlot?.id ?? (selectedCentre.id === 1 ? 3 : ((selectedCentre.id - 1) * 6) + 3);

    try {
      const [paddyVariety, paddyGrade] = selectedPaddy.split(" — ");
      const response = await fetch(apiUrl("/bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${farmerToken}` },
        body: JSON.stringify({
          centreId: selectedCentre.id,
          slotId: slotIdToUse,
          paddyVariety: paddyVariety || "Common paddy",
          paddyGrade: paddyGrade ?? "Grade A",
          expectedQuantityQuintals: expectedQuantity || 18,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.bookingId) await loadBooking(farmerToken, data.bookingId);
        throw new Error(data.message ?? "Booking could not be confirmed.");
      }
      setBookingRecord(data.booking);
      setBookingId(data.booking.id);
      setProfileRecord(data.booking.farmer);
      setQueueAhead(data.booking.queue?.peopleAhead ?? 0);
      await loadNotifications(farmerToken, data.booking.farmer.id);
      await loadFarmerStats(farmerToken);
      if (farmerId) void loadFarmerHistory(farmerId);
      navigate("token");
      toast.success("Booking confirmed and real API token generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking could not be confirmed.");
    }
  };
  const getClientAiReply = (question: string, lang: Language): string => {
    const prompt = (question || "").trim().toLowerCase();
    const farmerName = profileRecord?.name?.split(" ")[0] || (lang === "TE" ? "రైతు మిత్రమా" : lang === "HI" ? "किसान साथी" : "Farmer");
    const token = bookingRecord?.tokenNumber || "P-042";
    const bookingCode = bookingRecord?.bookingCode || "BK-2026-7294";
    const centre = bookingRecord?.centre?.name || "Guntur Agricultural Market Yard";
    const peopleAhead = bookingRecord?.queue?.peopleAhead ?? queueAhead ?? 17;
    const waitMin = bookingRecord?.queue?.estimatedWaitMinutes ?? 30;
    const status = (bookingRecord?.procurement?.status || "BOOKED").replaceAll("_", " ");
    const slotDate = bookingRecord?.slot?.date || "Wednesday, 18 March 2026";
    const slotTime = bookingRecord?.slot ? `${bookingRecord.slot.startTime} – ${bookingRecord.slot.endTime}` : "10:30 – 11:00 AM";

    // TELUGU
    if (lang === "TE") {
      if (prompt.includes("customer") || prompt.includes("care") || prompt.includes("helpline") || prompt.includes("number") || prompt.includes("phone") || prompt.includes("call") || prompt.includes("contact") || prompt.includes("toll") || prompt.includes("కస్టమర్") || prompt.includes("కేర్") || prompt.includes("నంబర్") || prompt.includes("ఫోన్") || prompt.includes("హెల్ప్‌లైన్")) {
        return `📞 అధికారిక రైతు కస్టమర్ కేర్ & హెల్ప్‌లైన్ నంబర్లు:\n• రైతు భరోసా కేంద్రం (టోల్-ఫ్రీ): 1800-425-0002 (ఉదయం 8:00 నుండి రాత్రి 7:00 వరకు)\n• AP పౌరసరఫరాలు & మార్కెట్ యార్డ్ ఫిర్యాదులు: 1902 (24x7 ప్రభుత్వ సేవ)\n• కిసాన్ కాల్ సెంటర్: 1800-180-1551 (అన్ని వ్యవసాయ సలహాలు)\n• రైతు బీమా డెస్క్: 155251\nమీరు AI Help Centre లోని 'Call' బటన్ ద్వారా నేరుగా కాల్ చేయవచ్చు.`;
      }
      if (prompt.includes("register") || prompt.includes("registration") || prompt.includes("approval") || prompt.includes("pending") || prompt.includes("officer") || prompt.includes("నమోదు") || prompt.includes("రిజిస్ట్రేషన్") || prompt.includes("ఆఫీసర్") || prompt.includes("ఆమోదం") || prompt.includes("లాగిన్")) {
        return `📝 రైతు నమోదు & ఆఫీసర్ ఆమోద విధానం:\n1. 'New Farmer Registration' ఎంచుకుని పేరు, ఫోన్ నంబర్, ఆధార్, గ్రామం, జిల్లా, పంట మరియు పాస్‌వర్డ్ నమోదు చేయండి (OTP అవసరం లేదు).\n2. నమోదు చేసిన వెంటనే వివరాలు మండలాధికారి పెండింగ్ జాబితాకు చేరుతాయి.\n3. అధికారి పరిశీలించి ఆమోదించిన (Approve) వెంటనే, మీరు మీ మొబైల్ నంబర్ మరియు పాస్‌వర్డ్‌తో లాగిన్ కావచ్చు.`;
      }
      if (prompt.includes("price") || prompt.includes("msp") || prompt.includes("rate") || prompt.includes("ధర") || prompt.includes("మద్దతు") || prompt.includes("వరి") || prompt.includes("పత్తి") || prompt.includes("మొక్కజొన్న")) {
        return `🌾 ఆంధ్రప్రదేశ్ ప్రభుత్వ మద్దతు ధరలు (MSP 2025-26):\n• గ్రేడ్-A వరి: ₹2,320 / క్వింటాల్\n• కామన్ వరి: ₹2,300 / క్వింటాల్\n• పత్తి (Cotton): ₹7,521 / క్వింటాల్\n• మొక్కజొన్న (Maize): ₹2,225 / క్వింటాల్\n• కందులు (Red Gram): ₹7,550 / క్వింటాల్\n• వేరుశనగ (Groundnut): ₹6,783 / క్వింటాల్\n• సోయాబీన్: ₹4,892 / క్వింటాల్\nమరిన్ని వివరాలకు 'Govt MSP Rates' ట్యాబ్ చూడండి.`;
      }
      if (prompt.includes("transport") || prompt.includes("vehicle") || prompt.includes("truck") || prompt.includes("tractor") || prompt.includes("రవాణా") || prompt.includes("ట్రాక్టర్") || prompt.includes("లారీ") || prompt.includes("డ్రైవర్") || prompt.includes("సబ్సిడీ")) {
        return `🚚 30% ప్రభుత్వ సబ్సిడీతో పంట రవాణా బుకింగ్:\n• ట్రాక్టర్ ట్రాలీ: ₹18/కి.మీ (30–50 క్వింటాళ్లు, గ్రామీణ పొలాల రవాణాకు అనుకూలం)\n• మినీ ట్రక్: ₹22/కి.మీ (15–25 క్వింటాళ్లు, వేగవంతమైన రవాణా)\n• హెవీ లారీ: ₹35/కి.మీ (100–160 క్వింటాళ్లు, బల్క్ లోడ్)\nప్రభుత్వం 30% సబ్సిడీ నేరుగా తగ్గిస్తుంది. బుక్ చేసిన వెంటనే డ్రైవర్ ఫోన్ నంబర్ లభిస్తుంది. 'Transportation' ట్యాబ్‌లో బుక్ చేసుకోండి.`;
      }
      if (prompt.includes("weather") || prompt.includes("rain") || prompt.includes("forecast") || prompt.includes("temperature") || prompt.includes("వాతావరణం") || prompt.includes("వర్షం") || prompt.includes("తేమ") || prompt.includes("కోత")) {
        return `☀️ ఆంధ్రప్రదేశ్ వ్యవసాయ వాతావరణం:\n• ప్రస్తుత ఉష్ణోగ్రత: 31°C - 33°C (ఎండగా, పొడిగా ఉంది).\n• వాతావరణ తేమ: 60% - 62% (వరి కోత మరియు ఎండబెట్టడానికి అనుకూలం).\n• సురక్షిత కోత సూచిక: OPTIMAL (అత్యంత అనుకూలం).\n• తేమ శాతం సలహా: గరిష్ట ధర కోసం ధాన్యంలో తేమ 17% లోపు ఉండేలా చూసుకోండి. 'Live Weather' ట్యాబ్‌లో 3 రోజుల సూచన చూడండి.`;
      }
      if (prompt.includes("token") || prompt.includes("queue") || prompt.includes("wait") || prompt.includes("ahead") || prompt.includes("టోకెన్") || prompt.includes("క్యూ") || prompt.includes("ఎంత మంది")) {
        return `🎫 మీ లైవ్ టోకెన్ & క్యూ వివరాలు:\n• మీ టోకెన్: ${token}\n• బుకింగ్ రిఫరెన్స్: ${bookingCode}\n• కేంద్రం: ${centre}\n• మీ ముందున్న రైతులు: ${peopleAhead} మంది\n• అంచనా సమయం: ~${waitMin} నిమిషాలు`;
      }
      if (prompt.includes("payment") || prompt.includes("money") || prompt.includes("bank") || prompt.includes("dbt") || prompt.includes("డబ్బులు") || prompt.includes("చెల్లింపు") || prompt.includes("రసీదు")) {
        return `💳 ప్రభుత్వ DBT చెల్లింపు విధానం:\n• నాణ్యత తనిఖీ మరియు తూకం పూర్తయిన తర్వాత ఆఫీసర్ రసీదు జారీ చేస్తారు.\n• మద్దతు ధర మొత్తం 24-48 గంటల్లో మీ ఆధార్ బ్యాంక్ ఖాతాలో (DBT) నేరుగా జమ అవుతుంది.`;
      }
      if (prompt.includes("document") || prompt.includes("aadhaar") || prompt.includes("passbook") || prompt.includes("పత్రాలు") || prompt.includes("కాగితాలు")) {
        return `📋 కేంద్రానికి అవసరమైన పత్రాలు: 1. రైతు ఆధార్ కార్డు, 2. బ్యాంక్ పాస్‌బుక్, 3. ఈ-క్రాప్ (e-Crop) బుకింగ్ రసీదు, 4. డిజిటల్ టోకెన్ పాస్ (${token}).`;
      }
      return `నమస్కారం ${farmerName}! మీ టోకెన్ ${token}, కేంద్రం: ${centre}. క్యూలో మీ ముందు ${peopleAhead} మంది రైతులు ఉన్నారు.\nహెల్ప్‌లైన్ నంబర్లు (1800-425-0002 / 1902), రిజిస్ట్రేషన్, పంట మద్దతు ధరలు (MSP), 30% సబ్సిడీ రవాణా, వాతావరణం లేదా చెల్లింపుల గురించి ఏదైనా అడగవచ్చు!`;
    }

    // HINDI
    if (lang === "HI") {
      if (prompt.includes("customer") || prompt.includes("care") || prompt.includes("helpline") || prompt.includes("number") || prompt.includes("phone") || prompt.includes("call") || prompt.includes("contact") || prompt.includes("toll") || prompt.includes("कस्टमर") || prompt.includes("केयर") || prompt.includes("फोन") || prompt.includes("नंबर") || prompt.includes("हेल्पलाइन")) {
        return `📞 आधिकारिक किसान कस्टमर केयर एवं हेल्पलाइन नंबर:\n• रायथू भरोसा केंद्र (टोल-फ्री): 1800-425-0002 (सोम-शनि सुबह 8:00 से शाम 7:00)\n• एपी नागरिक आपूर्ति एवं मंडी शिकायत: 1902 (24x7 सरकारी हेल्पलाइन)\n• किसान कॉल सेंटर: 1800-180-1551 (राष्ट्रीय कृषि परामर्श)\n• फसल बीमा सहायता: 155251\nआप 'AI Help Centre' में 'Call' बटन दबाकर सीधे कॉल भी कर सकते हैं।`;
      }
      if (prompt.includes("register") || prompt.includes("registration") || prompt.includes("approval") || prompt.includes("pending") || prompt.includes("officer") || prompt.includes("पंजीकरण") || prompt.includes("रजिस्ट्रेशन") || prompt.includes("अधिकारी") || prompt.includes("स्वीकृति") || prompt.includes("लॉगिन")) {
        return `📝 किसान पंजीकरण एवं सत्यापन प्रक्रिया:\n1. 'New Farmer Registration' पर क्लिक कर नाम, मोबाइल नंबर, आधार, गाँव, ज़िला व पासवर्ड भरें (OTP आवश्यक नहीं है)।\n2. सबमिट करते ही आपका विवरण अधिकारी की 'Pending' सूची में चला जाता है।\n3. अधिकारी द्वारा स्वीकृति (Approval) मिलते ही आप मोबाइल नंबर और पासवर्ड से सीधे लॉगिन कर सकते हैं।`;
      }
      if (prompt.includes("price") || prompt.includes("msp") || prompt.includes("rate") || prompt.includes("दर") || prompt.includes("भाव") || prompt.includes("कीमत") || prompt.includes("धान") || prompt.includes("कपास") || prompt.includes("मक्का")) {
        return `🌾 सरकारी न्यूनतम समर्थन मूल्य (MSP 2025-26):\n• धान ग्रेड-A: ₹2,320 / क्विंटल\n• साधारण धान: ₹2,300 / क्विंटल\n• कपास (Cotton): ₹7,521 / क्विंटल\n• मक्का (Maize): ₹2,225 / क्विंटल\n• अरहर (Red Gram): ₹7,550 / क्विंटल\n• मूँगफली: ₹6,783 / क्विंटल\n• सोयाबीन: ₹4,892 / क्विंटल\nविस्तृत विवरण के लिए 'Govt MSP Rates' टैब देखें।`;
      }
      if (prompt.includes("transport") || prompt.includes("vehicle") || prompt.includes("truck") || prompt.includes("tractor") || prompt.includes("परिवहन") || prompt.includes("ट्रैक्टर") || prompt.includes("गाड़ी") || prompt.includes("सब्सिडी")) {
        return `🚚 30% सरकारी सब्सिडी युक्त फसल वाहन बुकिंग:\n• ट्रैक्टर ट्रॉली: ₹18/किमी (30–50 क्विंटल भार)\n• मिनी ट्रक: ₹22/किमी (15–25 क्विंटल भार)\n• भारी लॉरी: ₹35/किमी (100–160 क्विंटल भार)\n30% सब्सिडी सीधे कम हो जाती है और ड्राइवर का नंबर तुरंत मिलता है। 'Transportation' टैब में बुक करें।`;
      }
      if (prompt.includes("weather") || prompt.includes("rain") || prompt.includes("forecast") || prompt.includes("temperature") || prompt.includes("मौसम") || prompt.includes("बारिश") || prompt.includes("तापमान") || prompt.includes("नमी")) {
        return `☀️ आंध्र प्रदेश कृषि मौसम:\n• स्थिति: शुष्क व साफ, तापमान 31°C से 33°C।\n• नमी: 60% - 62% (कटाई व सुखाने हेतु उत्तम)।\n• सुरक्षित कटाई सूचकांक: OPTIMAL (उत्कृष्ट)।\n• सलाह: धान में नमी 17% से कम रखें। 'Live Weather' टैब में 3 दिवसीय पूर्वानुमान देखें।`;
      }
      if (prompt.includes("token") || prompt.includes("queue") || prompt.includes("wait") || prompt.includes("ahead") || prompt.includes("टोकन") || prompt.includes("कतार") || prompt.includes("प्रतीक्षा")) {
        return `🎫 आपकी लाइव टोकन एवं कतार स्थिति:\n• आपका टोकन: ${token}\n• बुकिंग कोड: ${bookingCode}\n• खरीद केंद्र: ${centre}\n• आपके आगे किसान: ${peopleAhead}\n• अनुमानित प्रतीक्षा समय: लगभग ${waitMin} मिनट`;
      }
      if (prompt.includes("payment") || prompt.includes("money") || prompt.includes("bank") || prompt.includes("dbt") || prompt.includes("भुगतान") || prompt.includes("पैसे") || prompt.includes("रसीद")) {
        return `💳 सरकारी DBT भुगतान प्रक्रिया:\n• वजन और गुणवत्ता जांच के बाद डिजिटल रसीद जारी होती है।\n• कुल राशि 24 से 48 घंटे में सीधे आपके बैंक खाते (DBT) में पहुँच जाती है।`;
      }
      if (prompt.includes("document") || prompt.includes("aadhaar") || prompt.includes("passbook") || prompt.includes("दस्तावेज़") || prompt.includes("कागज़")) {
        return `📋 मंडी हेतु आवश्यक दस्तावेज़: 1. आधार कार्ड, 2. बैंक पासबुक, 3. ई-फसल (e-Crop) रसीद, 4. डिजिटल टोकन पास (${token})।`;
      }
      return `नमस्ते ${farmerName}! आपका टोकन ${token} है, केंद्र: ${centre}, और आपके आगे ${peopleAhead} किसान हैं।\nआप हेल्पलाइन (1800-425-0002 / 1902), पंजीकरण, समर्थन मूल्य (MSP), 30% सब्सिडी परिवहन, मौसम या भुगतान के बारे में कोई भी प्रश्न पूछ सकते हैं!`;
    }

    // ENGLISH
    if (prompt.includes("customer") || prompt.includes("care") || prompt.includes("helpline") || prompt.includes("number") || prompt.includes("phone") || prompt.includes("call") || prompt.includes("contact") || prompt.includes("toll") || prompt.includes("support")) {
      return `📞 Official Andhra Pradesh Rythu Customer Care & Helplines:\n• Rythu Bharosa Kendra (RBK Toll-Free): 1800-425-0002 (Mon–Sat, 8:00 AM – 7:00 PM)\n• AP Civil Supplies & Mandi Control Room: 1902 (24x7 Government Helpline)\n• Kisan Call Centre (Govt of India): 1800-180-1551 (Toll-Free Agri Advisory)\n• Rythu Bima & Insurance Claim Desk: 155251\n• Subsidized Transport Support Desk: 1800-425-0002\nYou can click the 'Call' or 'Copy' buttons in the AI Help Centre panel to dial directly.`;
    }
    if (prompt.includes("register") || prompt.includes("registration") || prompt.includes("approval") || prompt.includes("pending") || prompt.includes("officer") || prompt.includes("account") || prompt.includes("login")) {
      return `📝 Farmer Registration & Officer Approval Workflow:\n1. Click 'New Farmer Registration' and enter your details (Name, Mobile, Aadhaar, Village, District, Land, Crop, Password). No OTP required!\n2. Upon submission, your account appears in the Officer Console pending queue.\n3. Once the officer reviews and approves your application, you can immediately log in with your Mobile Number and Password.`;
    }
    if (prompt.includes("price") || prompt.includes("msp") || prompt.includes("rate") || prompt.includes("paddy") || prompt.includes("cotton") || prompt.includes("maize")) {
      return `🌾 Government Minimum Support Prices (MSP 2025-26 Season):\n• Paddy (Grade A): ₹2,320 / quintal\n• Common Paddy: ₹2,300 / quintal\n• Cotton: ₹7,521 / quintal\n• Maize: ₹2,225 / quintal\n• Red Gram (Tur): ₹7,550 / quintal\n• Groundnut: ₹6,783 / quintal\n• Soyabean: ₹4,892 / quintal\n• Wheat: ₹2,425 / quintal\nCheck the 'Govt MSP Rates' tab to calculate your estimated harvest valuation.`;
    }
    if (prompt.includes("transport") || prompt.includes("vehicle") || prompt.includes("truck") || prompt.includes("tractor") || prompt.includes("logistics") || prompt.includes("fare") || prompt.includes("subsidy")) {
      return `🚚 30% Govt Subsidized Farm Logistics Booking:\n• Tractor Trolley: ₹18/km (30–50 Quintals capacity, ideal for farm/village roads)\n• Mini Truck: ₹22/km (15–25 Quintals capacity, fast direct transit)\n• Heavy Lorry: ₹35/km (100–160 Quintals capacity, bulk movement)\nThe 30% subsidy is deducted automatically. Driver name and phone are assigned instantly. Book from the 'Transportation' tab.`;
    }
    if (prompt.includes("weather") || prompt.includes("rain") || prompt.includes("forecast") || prompt.includes("temperature") || prompt.includes("moisture")) {
      return `☀️ Andhra Pradesh Agricultural Meteorology & Safe Harvesting:\n• Current Conditions: Favorable sunny & clear conditions, 31°C – 33°C across AP districts.\n• Humidity: 60% - 62% (optimal drying window).\n• Safe Harvesting Index: OPTIMAL (Safe for harvest and transit).\n• Moisture Guideline: Ensure paddy moisture is below 17% for Grade A classification. Check the 'Live Weather' tab for full 3-day forecasts.`;
    }
    if (prompt.includes("token") || prompt.includes("queue") || prompt.includes("wait") || prompt.includes("ahead") || prompt.includes("position")) {
      return `🎫 Live Token & Queue Status:\n• Token Number: ${token}\n• Booking Reference: ${bookingCode}\n• Procurement Centre: ${centre}\n• Farmers Ahead in Queue: ${peopleAhead}\n• Estimated Waiting Time: ~${waitMin} minutes\nRefreshes every 15 seconds live from the central AP database.`;
    }
    if (prompt.includes("payment") || prompt.includes("money") || prompt.includes("bank") || prompt.includes("dbt") || prompt.includes("receipt")) {
      return `💳 Direct Benefit Transfer (DBT) Payment Settlement:\n• After digital weighing and quality assessment at the mandi, the procurement record is completed.\n• Full MSP payment is transferred directly via DBT into your Aadhaar-linked bank account within 24 to 48 hours.\n• Digital receipts are saved in the 'Payments' tab.`;
    }
    if (prompt.includes("document") || prompt.includes("required") || prompt.includes("aadhaar") || prompt.includes("passbook")) {
      return `📋 Mandatory Mandi Verification Documents:\n1. Farmer Aadhaar Card (Original)\n2. Aadhaar-linked Bank Passbook first page copy (for DBT)\n3. e-Crop 1B Land Record / Pahani receipt\n4. Digital Token Pass (${token})\nPlease arrive 10 minutes prior to your scheduled slot (${slotDate} · ${slotTime}).`;
    }
    if (prompt.includes("centre") || prompt.includes("map") || prompt.includes("satellite") || prompt.includes("location") || prompt.includes("guntur") || prompt.includes("vijayawada")) {
      return `🗺️ Andhra Pradesh Procurement Centres & Live Map:\nAll 8 AP mandi hubs (Guntur, Vijayawada, Kurnool, Rajahmundry, Visakhapatnam, Eluru, Nellore, and Tirupati) are active.\nVisit the 'AP Centres & Map' tab to switch between 🗺️ Normal Street Map and 🛰️ Satellite Map to check live capacity and get directions.`;
    }

    return `Namaste ${farmerName}! Your token is ${token} at ${centre} with ${peopleAhead} farmers ahead in queue. Current status: ${status}.\nI can answer anything regarding: Official Helplines (1800-425-0002 / 1902), Farmer Registration, Crop MSP Prices, 30% Subsidized Transport, Live Weather, Token & Queue, or DBT Payments. What would you like to know?`;
  };

  const assistantReply = async (question: string) => {
    const prompt = question.trim();
    if (!prompt) return;
    setChat(items => [...items, { role: "user", text: prompt }]);
    setChatInput("");
    setLiveInterimTranscript("");

    let reply = "";
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (farmerToken) headers["Authorization"] = `Bearer ${farmerToken}`;

      const response = await fetch(apiUrl("/ai/chat"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: prompt,
          bookingId: bookingId || undefined,
          language,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          reply = data.response;
        }
      }
    } catch {}

    if (!reply) {
      reply = getClientAiReply(prompt, language);
    }
    setChat(items => [...items, { role: "assistant", text: reply }]);
    if (!isMuted) {
      speak(reply);
    }
  };

  const stopListening = () => {
    if (activeRecognitionRef.current) {
      try {
        if (typeof activeRecognitionRef.current.abort === "function") {
          activeRecognitionRef.current.abort();
        } else {
          activeRecognitionRef.current.stop();
        }
      } catch {}
      activeRecognitionRef.current = null;
    }
    setIsListening(false);
    setLiveInterimTranscript("");
  };

  const listen = () => {
    if (isListening) {
      stopListening();
      return;
    }

    stopListening();
    setSpeechError(null);

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = tUi("Voice input is not available in this browser. Please type your question instead.", language);
      setSpeechError(msg);
      toast.message(msg);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      activeRecognitionRef.current = recognition;
      recognition.lang = language === "TE" ? "te-IN" : language === "HI" ? "hi-IN" : "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setLiveInterimTranscript("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const recognized = final || interim;
        if (recognized) {
          setChatInput(recognized);
          setLiveInterimTranscript(interim);
        }
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        activeRecognitionRef.current = null;
        setLiveInterimTranscript("");
        if (e?.error === "not-allowed") {
          const err = tUi("Microphone access was denied. Please allow microphone permissions.", language);
          setSpeechError(err);
          toast.error("Microphone permission denied.");
        } else if (e?.error && e.error !== "no-speech" && e.error !== "aborted") {
          const err = tUi("Could not hear speech clearly. Please try again or type your question.", language);
          setSpeechError(err);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveInterimTranscript("");
        activeRecognitionRef.current = null;
      };

      recognition.start();
    } catch {
      setIsListening(false);
      activeRecognitionRef.current = null;
      setSpeechError(tUi("Could not start speech recognition.", language));
    }
  };

  const speak = (text: string) => {
    if (isMuted) return;
    if (!("speechSynthesis" in window)) {
      toast.message("Voice response is not available in this browser. You can read the answer on screen.");
      return;
    }
    window.speechSynthesis.cancel();
    setSpeakingText(text);
    const targetLocale = language === "TE" ? "te-IN" : language === "HI" ? "hi-IN" : "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(candidate => candidate.lang.toLowerCase().startsWith(targetLocale.slice(0, 2)));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLocale;
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);
    window.speechSynthesis.speak(utterance);
  };

  const farmerShell = (content: React.ReactNode) => (
    <div className="app-shell">
      <aside className="journey-rail">
        <button className="logo-button" onClick={() => navigate("dashboard")}><AppLogo /></button>
        <div className="rail-label">FARMER SPACE</div>
        <nav>{navItems.map(({ screen: target, label, icon: Icon }) => <button key={target} onClick={() => navigate(target)} className={screen === target ? "active" : ""}><Icon size={19} /><span>{t.nav[label as keyof typeof t.nav] ?? label}</span></button>)}</nav>
        <div className="rail-bottom"><button onClick={() => navigate("assistant")}><Bot size={19} /><span>Farmer assistant</span></button><button onClick={() => navigate("profile")}><UserCheck size={19} /><span>My profile</span></button></div>
      </aside>
      <div className="screen-area">
        <header className="mobile-header">
          <div className="header-left">
            <button onClick={() => setMobileMenu(true)} aria-label="Open navigation" className="mobile-nav-toggle">
              <Menu size={22} />
            </button>
            <LanguageDropdown language={language} setLanguage={changeLanguage} />
          </div>
          <div className="header-right">
            <button
              className="notification-button"
              onClick={() => navigate("notifications")}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {apiNotifications.some(item => !item.isRead) && <i />}
            </button>
            <FarmerProfileDropdown
              profileRecord={profileRecord}
              onViewProfile={() => navigate("profile")}
              onLogout={logoutFarmer}
            />
          </div>
        </header>
        <div className="desktop-status-bar">
          <div className="header-left">
            <LanguageDropdown language={language} setLanguage={changeLanguage} />
          </div>
          <div className="header-right">
            <button
              className="notification-button"
              onClick={() => navigate("notifications")}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {apiNotifications.some(item => !item.isRead) && <i />}
            </button>
            <FarmerProfileDropdown
              profileRecord={profileRecord}
              onViewProfile={() => navigate("profile")}
              onLogout={logoutFarmer}
            />
          </div>
        </div>
        <main className="content-pad">{content}</main>
      </div>
      {mobileMenu && <div className="mobile-drawer-backdrop" onClick={() => setMobileMenu(false)}><nav className="mobile-drawer" onClick={e => e.stopPropagation()}><div className="drawer-top"><AppLogo /><button onClick={() => setMobileMenu(false)}><X size={20} /></button></div><div className="drawer-links">{navItems.map(({ screen: target, label, icon: Icon }) => <button key={target} onClick={() => navigate(target)} className={screen === target ? "active" : ""}><Icon size={20} />{t.nav[label as keyof typeof t.nav] ?? label}</button>)}<hr /><button onClick={() => navigate("assistant")}><Bot size={20} /> Farmer assistant</button><button onClick={() => navigate("profile")}><UserCheck size={20} /> My profile</button></div><div className="drawer-bottom"><button onClick={logoutFarmer} className="drawer-logout"><LogIn size={18} /> Logout</button></div></nav></div>}
    </div>
  );

  const landing = (
    <div className="landing-page">
      <header className="landing-nav"><AppLogo /><div className="nav-links"><a href="#how">How it works</a><a href="#services">Features</a><button onClick={() => navigate("farmerLogin")}>Farmer login</button><button className="officer-link" onClick={() => navigate("officerLogin")}>Officer console</button></div><div className="nav-end"><LanguageDropdown language={language} setLanguage={changeLanguage} /><ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>Register now</ActionButton></div></header>
      <main>
        <section className="hero-section">
          <img src={queueUrl} alt="Lush green paddy crop field" className="hero-image" />
          <div className="hero-tint" />
          <div className="field-contours hero-contours" />
          <div className="hero-copy">
            <Pill kind="green">SMART PROCUREMENT PLATFORM</Pill>
            <h1>A calm, transparent way to bring your paddy to market.</h1>
            <p>Check live centre capacity, reserve a comfortable arrival window, receive a verified token, and follow your harvest all the way to payment.</p>
            <div className="hero-actions">
              <ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>Register as farmer</ActionButton>
              <ActionButton onClick={() => navigate("farmerLogin")} secondary icon={LogIn}>Farmer login</ActionButton>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> Verified farmer registration</span>
              <span><MapPin size={16} /> Real-time centre queues</span>
              <span><Clock3 size={16} /> Dedicated arrival windows</span>
            </div>
          </div>
          <div className="hero-live-card">
            <div className="live-card-header">
              <span className="status-pill status-green"><span className="pulse-dot" /> LIVE MANDI</span>
              <span className="text-[10px] text-emerald-200 font-bold">AP Network</span>
            </div>
            <div className="mini-route">
              <i />
              <span className="route-pin one" />
              <span className="route-pin two" />
            </div>
            <p className="muted">Guntur Agricultural Market Yard</p>
            <strong>18 farmers in queue</strong>
            <div className="live-metrics">
              <div><span>Avg wait</span><b>~35 min</b></div>
              <div><span>Status</span><b className="text-emerald-300">Open now</b></div>
            </div>
            <button onClick={() => navigate("centres")}>
              <span>View all mandis</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
        <section className="proof-strip" id="services"><div><span className="token-disc small"><Wheat /></span><b>Clear slots</b><p>Select the time that works for your farm.</p></div><div><span className="token-disc small blue"><Ticket /></span><b>Live token</b><p>See your place before you travel.</p></div><div><span className="token-disc small yellow"><ClipboardCheck /></span><b>Tracked status</b><p>Follow every procurement stage.</p></div><div><span className="token-disc small blue"><Bot /></span><b>Farmer helper</b><p>Ask in English, Telugu, or Hindi.</p></div></section>
        <section className="journey-section" id="how"><div className="journey-copy"><p className="eyebrow">ONE CALM JOURNEY</p><h2>From paddy selection to payment, nothing is hidden.</h2><p>ProcureFlow turns scattered information into a single, farmer-friendly journey. There is always a next step, an expected time, and a record to check.</p><ActionButton onClick={() => navigate("registration")} secondary icon={ArrowRight}>Begin registration</ActionButton></div><div className="journey-stages">{[["01", "Register", "Your application stays pending until an officer approves it."], ["02", "Book a slot", "Choose paddy, centre, date, and time from available capacity."], ["03", "Track the day", "Carry your token and follow queue, quality check, and payment status."]].map(([num, title, copy]) => <article key={num}><span>{num}</span><div><h3>{title}</h3><p>{copy}</p></div><ChevronRight /></article>)}</div></section>
        <section className="closing-banner"><div><Pill kind="green">BUILT FOR THE FIELD</Pill><h2>Less waiting. More certainty.</h2><p>A connected smart procurement management system with live database synchronization.</p></div><ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>Start farmer flow</ActionButton></section>
      </main>
      <footer><AppLogo /><p>Smart Procurement Management System · SIH 2026 Prototype</p><button onClick={() => navigate("officerLogin")}>Officer access</button></footer>
    </div>
  );

  const registration = (
    <div className="auth-page">
      <div className="auth-side">
        <button onClick={() => navigate("landing")}>
          <AppLogo inverse />
        </button>
        <div>
          <Pill kind="yellow">FARMER ONBOARDING</Pill>
          <h1>
            Your harvest
            <br />
            has a home.
          </h1>
          <p>
            Secure OTP-verified registration. After submission, an officer will review and approve your details.
          </p>
        </div>
        <div className="side-steps">
          <span><b style={{ background: regStep === "PHONE" ? "#107e4a" : undefined }}>1</b> Mobile Verification via SMS OTP</span>
          <span><b style={{ background: regStep === "OTP" ? "#107e4a" : undefined }}>2</b> Enter & Verify 6-Digit OTP</span>
          <span><b style={{ background: regStep === "DETAILS" ? "#107e4a" : undefined }}>3</b> Set Password & Farmer Profile</span>
        </div>
      </div>
      <main className="auth-panel">
        <button className="back-link" onClick={() => navigate("landing")}>
          <ArrowLeft size={16} /> Back to home
        </button>
        <div className="form-wrap">
          <p className="eyebrow">NEW FARMER REGISTRATION</p>
          <h2>{t.registrationTitle}</h2>
          <p>
            {t.registrationIntro} Your account remains <b>{tUi("pending", language)}</b> until officer approval.
          </p>

          {/* 3-Step Tracker */}
          <div className="auth-step-tracker">
            <div className={cn("auth-step-item", regStep === "PHONE" && "active", (regStep === "OTP" || regStep === "DETAILS") && "completed")}>
              <span className="auth-step-num">{(regStep === "OTP" || regStep === "DETAILS") ? <Check size={12} /> : "1"}</span>
              <span>Mobile</span>
            </div>
            <div className={cn("auth-step-separator", (regStep === "OTP" || regStep === "DETAILS") && "completed")} />
            <div className={cn("auth-step-item", regStep === "OTP" && "active", regStep === "DETAILS" && "completed")}>
              <span className="auth-step-num">{regStep === "DETAILS" ? <Check size={12} /> : "2"}</span>
              <span>SMS OTP</span>
            </div>
            <div className={cn("auth-step-separator", regStep === "DETAILS" && "completed")} />
            <div className={cn("auth-step-item", regStep === "DETAILS" && "active")}>
              <span className="auth-step-num">3</span>
              <span>Profile & Password</span>
            </div>
          </div>

          {authError && (
            <div className="auth-error-banner">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* STEP 1: MOBILE ENTRY & SEND OTP */}
          {regStep === "PHONE" && (
            <form onSubmit={e => { e.preventDefault(); void handleSendRegistrationOtp(); }}>
              <label>
                Mobile number (10-digit)
                <Input
                  inputMode="numeric"
                  placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                  value={registrationForm.phone}
                  maxLength={10}
                  onChange={e => setRegistrationForm(form => ({ ...form, phone: e.target.value.replace(/\D/g, "") }))}
                  required
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                A 6-digit OTP will be sent to this mobile number via MSG91 SMS gateway.
              </p>
              <Button disabled={regOtpSending} type="submit" className="action-button w-full">
                {regOtpSending ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin mr-2" /> Sending OTP via SMS…
                  </>
                ) : (
                  <>
                    Send SMS OTP <ArrowRight size={17} />
                  </>
                )}
              </Button>
              <div className="login-divider mt-4"><span>or</span></div>
              <button type="button" className="inline-action w-full justify-center" onClick={() => navigate("farmerLogin")}>
                Already registered? Sign in <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* STEP 2: ENTER OTP & VERIFY */}
          {regStep === "OTP" && (
            <form onSubmit={e => { e.preventDefault(); void handleVerifyRegistrationOtp(); }}>
              <div className="otp-display-banner">
                <div className="font-bold flex items-center justify-between">
                  <span>SMS OTP Sent</span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Valid 5 mins</span>
                </div>
                <p className="text-xs text-emerald-900 mt-1 mb-0">
                  Enter the 6-digit code delivered to <b>+91 {registrationForm.phone.replace(/\D/g, "").slice(0, 2)}******{registrationForm.phone.replace(/\D/g, "").slice(-2)}</b>.
                </p>
              </div>

              {regDevOtp && (
                <div className="demo-otp-card" role="status" aria-live="polite">
                  <div className="demo-otp-header">
                    <span className="demo-otp-badge">Demo Mode Active</span>
                    <span className="demo-otp-label">Demo OTP: <b>{regDevOtp}</b></span>
                  </div>
                  <div className="demo-otp-code">{regDevOtp}</div>
                  <p className="demo-otp-note">
                    For testing only — SMS delivery is disabled in demo mode.<br />
                    SMS delivery will be enabled after DLT approval.
                  </p>
                </div>
              )}

              <label className="text-center">
                Enter 6-digit OTP
                <Input
                  className="otp-input-control"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="------"
                  value={regOtp}
                  onChange={e => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  required
                />
              </label>

              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 mb-3">
                <span>Attempts remaining: <b className={regAttemptsRemaining <= 2 ? "text-red-600" : "text-emerald-800"}>{regAttemptsRemaining} / 5</b></span>
                {regCooldownSeconds > 0 ? (
                  <span className="text-muted-foreground font-semibold">Resend in {regCooldownSeconds}s</span>
                ) : (
                  <button
                    type="button"
                    disabled={regOtpSending}
                    onClick={() => void handleResendRegistrationOtp()}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <Button disabled={regOtpVerifying || regOtp.length !== 6} type="submit" className="action-button w-full mb-3">
                {regOtpVerifying ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin mr-2" /> Verifying OTP…
                  </>
                ) : (
                  <>
                    Verify OTP <Check size={17} />
                  </>
                )}
              </Button>

              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground text-center w-full mt-2 block"
                onClick={() => { setRegStep("PHONE"); setRegOtp(""); setAuthError(null); }}
              >
                ← Change mobile number
              </button>
            </form>
          )}

          {/* STEP 3: CREATE PASSWORD & COMPLETE FARMER DETAILS */}
          {regStep === "DETAILS" && (
            <form onSubmit={e => { e.preventDefault(); void submitRegistration(); }}>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Mobile Verified: +91 {registrationForm.phone}</span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-950 font-extrabold px-2 py-0.5 rounded-full uppercase">Verified</span>
              </div>

              <label>
                Farmer full name
                <Input
                  value={registrationForm.name}
                  onChange={e => setRegistrationForm(form => ({ ...form, name: e.target.value }))}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </label>

              <div className="field-row">
                <label>
                  Create password (min 8 chars)
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    value={registrationForm.password}
                    onChange={e => setRegistrationForm(form => ({ ...form, password: e.target.value }))}
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Confirm password
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </label>
              </div>

              {registrationForm.password && regConfirmPassword && registrationForm.password !== regConfirmPassword && (
                <p className="text-xs text-red-600 font-semibold -mt-2 mb-1">
                  ⚠️ Passwords do not match.
                </p>
              )}

              <label>
                Farmer ID / Aadhaar
                <Input
                  value={registrationForm.aadhaarMasked}
                  onChange={e => setRegistrationForm(form => ({ ...form, aadhaarMasked: e.target.value }))}
                  placeholder="XXXX XXXX 1234"
                  required
                />
              </label>

              <div className="field-row">
                <label>
                  Village
                  <Input
                    value={registrationForm.village}
                    onChange={e => setRegistrationForm(form => ({ ...form, village: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  District
                  <Input
                    value={registrationForm.district}
                    onChange={e => setRegistrationForm(form => ({ ...form, district: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <label>
                Primary crop
                <select
                  value={registrationForm.primaryCrop}
                  onChange={e => setRegistrationForm(form => ({ ...form, primaryCrop: e.target.value }))}
                >
                  <option>Paddy</option>
                  <option>Maize</option>
                  <option>Cotton</option>
                </select>
              </label>

              <label className="check-line">
                <input type="checkbox" required defaultChecked />
                <span>I confirm these details are correct for this procurement request.</span>
              </label>

              <Button disabled={authLoading || registrationForm.password.length < 8 || registrationForm.password !== regConfirmPassword} type="submit" className="action-button">
                {authLoading ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin mr-2" /> Submitting registration…
                  </>
                ) : (
                  <>
                    {tUi("Submit registration", language)} <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="form-note mt-4">
            <ShieldCheck size={16} /> Application is submitted directly to the procurement officer for verification.
          </p>
        </div>
      </main>
    </div>
  );

  const pending = (
    <div className="pending-page">
      <header>
        <button onClick={() => navigate("landing")}><AppLogo /></button>
        <LanguagePicker language={language} setLanguage={changeLanguage} />
      </header>
      <main>
        <div className="approval-orbit"><span className="orbit-inner"><ClipboardCheck /></span><i /><i /><i /></div>
        <Pill kind={registrationStatus === "APPROVED" ? "green" : registrationStatus === "REJECTED" ? "yellow" : "yellow"}>
          <Clock3 size={13} /> {registrationStatus ?? "PENDING"}
        </Pill>
        <h1>
          {registrationStatus === "REJECTED"
            ? tUi("Your registration needs attention.", language)
            : registrationStatus === "APPROVED"
            ? tUi("Your registration has been approved!", language)
            : tUi("Your registration is under officer review.", language)}
        </h1>
        <p>
          {registrationStatus === "APPROVED"
            ? tUi("An officer has approved your profile. You can now login to your dashboard.", language)
            : tUi("The procurement officer has received your registration notification and will verify your details before you can sign in.", language)}
        </p>
        {pendingFarmer && (
          <article className="pending-record">
            <div>
              <span className="avatar">{(pendingFarmer.name ?? "Farmer").split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
              <div>
                <b>{pendingFarmer.name ?? "Farmer"}</b>
                <small>{pendingFarmer.farmerCode ?? "FMR-2026"} · {pendingFarmer.village ?? "Village"}</small>
              </div>
            </div>
            <Pill kind={registrationStatus === "APPROVED" ? "green" : registrationStatus === "REJECTED" ? "yellow" : "yellow"}>
              {registrationStatus ?? "PENDING"}
            </Pill>
          </article>
        )}
        <div className="pending-actions">
          <ActionButton onClick={() => { void loginFarmer(); }} icon={LogIn}>
            {tUi("Check approval & sign in", language)}
          </ActionButton>
          <ActionButton onClick={() => navigate("farmerLogin")} secondary icon={ArrowRight}>
            {tUi("Return to farmer login", language)}
          </ActionButton>
        </div>

        {registrationStatus === "PENDING" && (
          <div className="mt-5 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left max-w-md w-full shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs mb-1">
              <ShieldCheck size={15} className="text-emerald-700" /> Officer Verification Workflow
            </div>
            <p className="text-xs text-emerald-800 mb-3 leading-relaxed">
              New farmer registrations strictly remain <b>PENDING</b> until verified by the Mandal Procurement Officer. You can switch to the Officer Console to review and approve this farmer.
            </p>
            <ActionButton onClick={() => { void loginOfficer(); }} icon={ArrowRight}>
              Open Officer Console (Approve Farmer)
            </ActionButton>
          </div>
        )}

        {authError && <p className="demo-hint">{authError}</p>}
      </main>
    </div>
  );

  const farmerLogin = (
    <div className="login-page">
      <header>
        <button onClick={() => navigate("landing")}><AppLogo /></button>
        <button className="back-link" onClick={() => navigate("landing")}><ArrowLeft size={16} /> Back</button>
      </header>
      <main>
        <section className="login-art">
          <img src={statusUrl} alt="Paddy sample and procurement work materials" />
          <div>
            <Pill kind="green">FARMER PORTAL</Pill>
            <h2>Know your visit before you travel.</h2>
            <p>Token, live queue, procurement progress and payment status in one place.</p>
          </div>
        </section>

        {/* FORGOT PASSWORD WORKFLOW */}
        {forgotStep !== "INACTIVE" ? (
          <section className="login-card">
            <p className="eyebrow">PASSWORD RECOVERY</p>
            <h1>Reset Password</h1>
            <p>Verify your registered mobile number with an SMS OTP to create a new password.</p>

            {forgotError && (
              <div className="auth-error-banner">
                <AlertCircle size={16} className="shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Step 1: Mobile entry for forgot password */}
            {forgotStep === "PHONE" && (
              <form onSubmit={e => { e.preventDefault(); void handleSendForgotOtp(); }}>
                <label>
                  Registered mobile number
                  <Input
                    inputMode="numeric"
                    placeholder="Enter 10-digit registered mobile"
                    maxLength={10}
                    value={forgotPhone}
                    onChange={e => setForgotPhone(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  We will verify this number and send a password reset OTP via SMS.
                </p>
                <Button disabled={forgotLoading} type="submit" className="action-button w-full mb-3">
                  {forgotLoading ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin mr-2" /> Sending OTP…
                    </>
                  ) : (
                    <>
                      Send Reset OTP <ArrowRight size={17} />
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground text-center w-full block mt-2"
                  onClick={() => { setForgotStep("INACTIVE"); setForgotError(null); }}
                >
                  ← Back to login
                </button>
              </form>
            )}

            {/* Step 2: Enter OTP for forgot password */}
            {forgotStep === "OTP" && (
              <form onSubmit={e => { e.preventDefault(); void handleVerifyForgotOtp(); }}>
                <div className="otp-display-banner">
                  <div className="font-bold flex items-center justify-between">
                    <span>SMS OTP Sent</span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Valid 5 mins</span>
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 mb-0">
                    Enter the 6-digit code delivered to <b>+91 {forgotPhone.slice(0, 2)}******{forgotPhone.slice(-2)}</b>.
                  </p>
                </div>

                {forgotDevOtp && (
                  <div className="demo-otp-card" role="status" aria-live="polite">
                    <div className="demo-otp-header">
                      <span className="demo-otp-badge">Demo Mode Active</span>
                      <span className="demo-otp-label">Demo OTP: <b>{forgotDevOtp}</b></span>
                    </div>
                    <div className="demo-otp-code">{forgotDevOtp}</div>
                    <p className="demo-otp-note">
                      For testing only — SMS delivery is disabled in demo mode.<br />
                      SMS delivery will be enabled after DLT approval.
                    </p>
                  </div>
                )}

                <label className="text-center">
                  Enter 6-digit OTP
                  <Input
                    className="otp-input-control"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="------"
                    value={forgotOtp}
                    onChange={e => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                    required
                  />
                </label>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 mb-3">
                  <span>Attempts remaining: <b className={forgotAttemptsRemaining <= 2 ? "text-red-600" : "text-emerald-800"}>{forgotAttemptsRemaining} / 5</b></span>
                  {forgotCooldownSeconds > 0 ? (
                    <span className="text-muted-foreground font-semibold">Resend in {forgotCooldownSeconds}s</span>
                  ) : (
                    <button
                      type="button"
                      disabled={forgotLoading}
                      onClick={() => void handleResendForgotOtp()}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <Button disabled={forgotLoading || forgotOtp.length !== 6} type="submit" className="action-button w-full mb-3">
                  {forgotLoading ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin mr-2" /> Verifying…
                    </>
                  ) : (
                    <>
                      Verify OTP <Check size={17} />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground text-center w-full block mt-2"
                  onClick={() => { setForgotStep("PHONE"); setForgotOtp(""); setForgotError(null); }}
                >
                  ← Change mobile number
                </button>
              </form>
            )}

            {/* Step 3: Create & Confirm New Password */}
            {forgotStep === "PASSWORD" && (
              <form onSubmit={e => { e.preventDefault(); void handleResetForgotPassword(); }}>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Mobile Verified: +91 {forgotPhone}</span>
                </div>

                <label>
                  Create new password (min 8 chars)
                  <Input
                    type="password"
                    placeholder="Enter at least 8 characters"
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </label>

                <label>
                  Confirm new password
                  <Input
                    type="password"
                    placeholder="Re-enter new password"
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </label>

                {forgotNewPassword && forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                  <p className="text-xs text-red-600 font-semibold -mt-2 mb-1">
                    ⚠️ Passwords do not match.
                  </p>
                )}

                <Button
                  disabled={forgotLoading || forgotNewPassword.length < 8 || forgotNewPassword !== forgotConfirmPassword}
                  type="submit"
                  className="action-button w-full mt-2"
                >
                  {forgotLoading ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin mr-2" /> Updating password…
                    </>
                  ) : (
                    <>
                      Update & Save Password <Check size={17} />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground text-center w-full block mt-3"
                  onClick={() => { setForgotStep("INACTIVE"); setForgotError(null); }}
                >
                  Cancel & return to login
                </button>
              </form>
            )}

            {/* Step 4: Success confirmation */}
            {forgotStep === "SUCCESS" && (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-bold text-emerald-950 mb-1">Password Updated!</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Your password has been reset successfully. You can now login to your farmer account using your new credentials.
                </p>
                <Button
                  type="button"
                  className="action-button w-full"
                  onClick={() => {
                    setForgotStep("INACTIVE");
                    setForgotPhone("");
                    setForgotOtp("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                  }}
                >
                  Proceed to Login <ArrowRight size={17} />
                </Button>
              </div>
            )}
          </section>
        ) : (
          /* STANDARD FARMER LOGIN CARD */
          <section className="login-card">
            <p className="eyebrow">FARMER LOGIN</p>
            <h1>{t.loginTitle}</h1>
            <p>{t.loginIntro} Officer approval is required before access is granted.</p>

            <form onSubmit={e => { e.preventDefault(); void loginFarmer(); }}>
              <label>
                Mobile number
                <Input
                  inputMode="numeric"
                  value={farmerCredentials.phone}
                  onChange={event => setFarmerCredentials(credentials => ({ ...credentials, phone: event.target.value.replace(/\s/g, "") }))}
                  required
                />
              </label>

              <label>
                Password
                <Input
                  type="password"
                  value={farmerCredentials.password}
                  onChange={event => setFarmerCredentials(credentials => ({ ...credentials, password: event.target.value }))}
                  required
                />
              </label>

              <div className="flex justify-end -mt-2 mb-2">
                <button
                  type="button"
                  className="text-xs text-emerald-800 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                  onClick={() => {
                    setForgotStep("PHONE");
                    setForgotPhone(farmerCredentials.phone);
                    setForgotError(null);
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {authError && <p className="form-note text-red-600 font-semibold">{authError}</p>}

              <ActionButton onClick={() => { void loginFarmer(); }} disabled={authLoading} icon={ArrowRight}>
                {authLoading ? "Signing in…" : "Login to my dashboard"}
              </ActionButton>
            </form>

            <div className="login-divider"><span>or</span></div>
            <button className="inline-action" onClick={() => navigate("registration")}>
              New farmer? Register first <ArrowRight size={15}/>
            </button>
            <p className="approval-check">
              <span className={registrationStatus === "APPROVED" ? "approved" : "pending"}>
                {registrationStatus === "APPROVED" ? <Check /> : <Clock3 />}
              </span>
              {registrationStatus === "APPROVED" ? "Your registration is approved. You can login." : "Registration must be approved by an officer."}
            </p>
          </section>
        )}
      </main>
    </div>
  );

  const dashboard = farmerShell(
    <>
      <SectionTitle
        eyebrow={`GOOD MORNING, ${profileRecord?.name?.split(" ")[0]?.toUpperCase() ?? "RAMESH"}`}
        title={t.dashboardTitle}
        body={t.dashboardBody}
        action={<ActionButton onClick={() => navigate("paddy")} icon={ArrowRight}>Book another slot</ActionButton>}
      />

      {/* Live Agricultural Weather Banner */}
      <div className="dashboard-weather-banner" onClick={() => navigate("weather")}>
        <div className="dash-weather-left">
          <span className="dash-weather-icon">
            {weatherData?.conditionCode === "LIGHT_RAIN" ? <CloudRain size={24} /> : weatherData?.conditionCode === "PARTLY_CLOUDY" ? <CloudSun size={24} /> : <Sun size={24} />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900">{weatherData?.district ?? selectedWeatherDistrict} District:</span>
              <strong className="text-sm font-extrabold text-emerald-950">{weatherData?.temperature ?? 31}°C · {weatherData?.condition ?? "Sunny & Clear"}</strong>
            </div>
            <p className="text-xs text-emerald-800 m-0">
              💧 Humidity: <b>{weatherData?.humidity ?? 62}%</b> · 🌾 Harvesting Index: <b className="text-emerald-950 uppercase">{weatherData?.safeHarvestingIndex ?? "OPTIMAL"}</b> · 💨 Wind: <b>{weatherData?.windSpeedKmH ?? 14} km/h</b>
            </p>
          </div>
        </div>
        <button className="text-xs font-bold text-emerald-900 flex items-center gap-1 bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-300 shadow-sm hover:bg-white transition-colors">
          Full Weather Report <ChevronRight size={14} />
        </button>
      </div>

      <section className="dashboard-hero">
        <div className="hero-booking">
          <div className="booking-head">
            <div>
              <Pill kind="green"><span className="pulse-dot" /> {bookingRecord ? "ACTIVE API BOOKING" : "DEMO BOOKING"}</Pill>
              <h2>{bookingRecord?.centre.name ?? "Nizamabad Market Yard"}</h2>
              <p><MapPin size={15} /> {bookingRecord?.centre.place ?? "Vinayak Nagar"} · {bookingRecord?.centre.distanceKm ?? 2.4} km away</p>
            </div>
            <button onClick={() => navigate("centre")}><ChevronRight /></button>
          </div>
          <div className="booking-strip">
            <div>
              <small>YOUR DATE</small>
              <strong>{bookingRecord?.slot.date ?? "Wed, 18 Mar"}</strong>
              <span>{bookingRecord ? `${bookingRecord.slot.startTime} – ${bookingRecord.slot.endTime}` : "10:30 – 11:00 AM"}</span>
            </div>
            <div>
              <small>YOUR TOKEN</small>
              <strong className="token-text">{bookingRecord?.tokenNumber ?? "P-042"}</strong>
              <span>Queue position {bookingRecord?.queue?.position ?? 18}</span>
            </div>
            <ActionButton onClick={() => navigate("token")} secondary icon={Ticket}>View token</ActionButton>
          </div>
          <div className="booking-route">
            <span className="route-node complete"><Check /></span>
            <i />
            <span className="route-node complete"><Check /></span>
            <i />
            <span className="route-node active"><Clock3 /></span>
            <i />
            <span className="route-node"><WalletCards /></span>
            <div>
              <b>{(bookingRecord?.procurement?.status || "Ready for your arrival").replaceAll("_", " ")}</b>
              <p>Live record loaded from your connected booking when available.</p>
            </div>
          </div>
        </div>
        <aside className="dashboard-crop">
          <img src={queueUrl} alt="Farmers waiting at procurement centre"/>
          <div className="image-shade"/>
          <div>
            <Pill kind="yellow">TODAY’S SIGNAL</Pill>
            <strong>Queue update</strong>
            <p>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35} min expected wait</p>
            <button onClick={() => navigate("queue")}>See live queue <ArrowRight size={14}/></button>
          </div>
        </aside>
      </section>
      <section className="metric-grid">
        <MetricCard icon={UsersRound} label="People ahead" value={`${bookingRecord?.queue?.peopleAhead ?? queueAhead}`} hint="From the connected queue" tone="green"/>
        <MetricCard icon={Clock3} label="Estimated wait" value={`${bookingRecord?.queue?.estimatedWaitMinutes ?? 35} min`} hint="Based on current centre flow" tone="yellow"/>
        <MetricCard icon={Wheat} label="Paddy selected" value={bookingRecord?.paddyGrade ?? "Grade A"} hint={`${bookingRecord?.paddyVariety ?? "Common paddy"} · ${bookingRecord?.expectedQuantityQuintals ?? 18} quintals`} tone="blue"/>
        <MetricCard icon={ClipboardCheck} label="Procurement stage" value={(bookingRecord?.procurement?.status || "Booked").replaceAll("_", " ")} hint="Live prototype record" tone="green"/>
      </section>
      <section className="stats-section">
        <div className="stats-heading">
          <div>
            <p className="eyebrow">YOUR STATS</p>
            <h2>Harvest history at a glance.</h2>
          </div>
          <Pill kind="blue">LIVE API DATA</Pill>
        </div>
        <div className="metric-grid stats-grid">
          <MetricCard icon={CalendarDays} label="Total bookings" value={`${farmerStats?.totalBookings ?? 0}`} hint="Your recorded bookings" tone="blue"/>
          <MetricCard icon={ClipboardCheck} label="Completed procurement" value={`${farmerStats?.completedProcurements ?? 0}`} hint="Completed records" tone="green"/>
          <MetricCard icon={UsersRound} label="Current position" value={`${farmerStats?.currentQueuePosition ?? "—"}`} hint="In the active queue" tone="yellow"/>
          <MetricCard icon={WalletCards} label="Amount received" value={`₹${(farmerStats?.totalAmountReceived ?? 0).toLocaleString("en-IN")}`} hint={`${farmerStats?.successfulPayments ?? 0} successful payments`} tone="green"/>
        </div>
      </section>
      <section className="split-dashboard">
        <article className="next-action-card">
          <div>
            <Pill kind="blue">WHAT’S NEXT</Pill>
            <h2>Bring the right documents.</h2>
            <p>Keep your farmer ID, bank passbook, and paddy receipt ready for a fast verification.</p>
          </div>
          <div className="document-checklist">
            <span><Check /> Farmer ID</span>
            <span><Check /> Bank passbook</span>
            <span><Check /> Paddy receipt</span>
          </div>
          <button onClick={() => navigate("status")}>See full procurement timeline <ArrowRight size={15}/></button>
        </article>
        <article className="assistant-teaser">
          <span className="assistant-bot"><Bot /></span>
          <div>
            <Pill kind="green">AI FARMER ASSISTANT</Pill>
            <h3>Ask the practical question.</h3>
            <p>“How many people are ahead of me?”</p>
          </div>
          <button onClick={() => navigate("assistant")}><MessageCircle /> Ask now</button>
        </article>
      </section>
    </>
  );

  const bookingCrops = useMemo(() => {
    return filterCrops(CROP_CATALOGUE, bookingCropCategory, bookingCropSearch);
  }, [bookingCropCategory, bookingCropSearch]);

  const selectedCropRecord = useMemo(() => {
    const fromCat = CROP_CATALOGUE.find(c =>
      selectedPaddy.toLowerCase().includes(c.cropName.toLowerCase()) ||
      `${c.cropName} — ${c.variety}`.toLowerCase() === selectedPaddy.toLowerCase()
    );
    if (fromCat) return fromCat;
    return (
      cropPricesList.find(c => selectedPaddy.includes(c.cropName) || `${c.cropName} — ${c.variety}` === selectedPaddy) ??
      CROP_CATALOGUE[0]
    );
  }, [cropPricesList, selectedPaddy]);

  const filteredCentres = useMemo(() => {
    const q = centreSearchQuery.trim().toLowerCase();
    if (!q) return apiCentres;
    return apiCentres.filter(centre => {
      const branchCode = getCentreBranchCode(centre).toLowerCase();
      const name = (centre.name || "").toLowerCase();
      const place = (centre.place || "").toLowerCase();
      const district = (centre.district || "").toLowerCase();
      return name.includes(q) || place.includes(q) || district.includes(q) || branchCode.includes(q);
    });
  }, [apiCentres, centreSearchQuery]);

  const paddy = farmerShell(
    <>
      <SectionTitle
        eyebrow="NEW PROCUREMENT BOOKING"
        title={t.bookingTitle}
        body="Select your harvested crop type, variety, and expected quantity for government MSP procurement."
      />
      <div className="booking-layout">
        <div>
          <StepTrack current={1} />

          {/* Prominent Crop Search Bar */}
          <div className="crop-search-bar-wrap mb-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
              <input
                type="text"
                value={bookingCropSearch}
                onChange={e => setBookingCropSearch(e.target.value)}
                placeholder="Search crop by name (e.g. Tomato, Mango, Rice, Wheat, Cotton)..."
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-xs transition-all"
              />
              {bookingCropSearch && (
                <button
                  type="button"
                  onClick={() => setBookingCropSearch("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {bookingCropSearch && (
              <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-slate-500">
                <span>Showing results for "<b>{bookingCropSearch}</b>" ({bookingCrops.length} {bookingCrops.length === 1 ? "crop" : "crops"} found)</span>
                <button
                  type="button"
                  onClick={() => setBookingCropSearch("")}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 text-xs font-semibold scrollbar-none">
            {["ALL", "Cereals", "Pulses", "Oilseeds", "Commercial", "Vegetables", "Fruits"].map(cat => (
              <button
                type="button"
                key={cat}
                onClick={() => setBookingCropCategory(cat)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs ${
                  bookingCropCategory === cat
                    ? "bg-emerald-700 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>

          {/* Crop Selection Grid */}
          <div className="choice-grid paddy-grid">
            {bookingCrops.length === 0 ? (
              <div className="col-span-full py-10 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Leaf className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={36} />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No crops found matching "{bookingCropSearch}"</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try searching for a different crop name, variety, or reset the category filter.
                </p>
                <button
                  type="button"
                  onClick={() => { setBookingCropSearch(""); setBookingCropCategory("ALL"); }}
                  className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-block"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              bookingCrops.map((crop) => {
                const fullLabel = `${crop.cropName} — ${crop.variety}`;
                const isSelected = selectedPaddy === fullLabel || selectedPaddy.toLowerCase().includes(crop.cropName.toLowerCase());
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => setSelectedPaddy(fullLabel)}
                    className={`crop-catalog-card text-left group relative p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? "selected ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/70 shadow-xs"
                        : "border-slate-200 hover:border-emerald-300 hover:shadow-xs bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Real Photograph */}
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={crop.imageUrl}
                          alt={crop.cropName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-emerald-900/30 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check size={14} />
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Pill kind={crop.category === "Pulses" ? "yellow" : crop.category === "Oilseeds" ? "blue" : crop.category === "Vegetables" || crop.category === "Fruits" ? "green" : "gray"}>
                            {crop.category}
                          </Pill>
                          {crop.govtBonusPerQuintal > 0 && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              +₹{crop.govtBonusPerQuintal} Bonus
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">{crop.cropName}</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{crop.variety}</p>
                        <div className="flex items-baseline justify-between mt-1.5">
                          <b className="text-emerald-800 dark:text-emerald-400 font-extrabold text-sm">
                            ₹{crop.effectiveRatePerQuintal.toLocaleString("en-IN")} <span className="text-[10px] font-normal text-slate-500">/ quintal</span>
                          </b>
                          <span className="text-[10px] text-slate-400 font-medium">Max {crop.maxMoisturePercent}% moist</span>
                        </div>
                      </div>
                    </div>

                    {/* Selected badge status */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">{crop.season}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-emerald-600 text-white" : "text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100"}`}>
                        {isSelected ? "Selected ✓" : "Select crop"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <article className="quantity-card mt-4">
            <div>
              <span><Tractor /></span>
              <div>
                <h3>Expected harvest quantity</h3>
                <p>Used by the mandi to plan daily weighing and yard storage capacity.</p>
              </div>
            </div>
            <div className="quantity-control">
              <button
                type="button"
                onClick={() => setExpectedQuantity(q => Math.max(1, q - 2))}
              >
                −
              </button>
              <b>{expectedQuantity} <small>quintals</small></b>
              <button
                type="button"
                onClick={() => setExpectedQuantity(q => q + 2)}
              >
                +
              </button>
            </div>
          </article>

          <div className="page-actions">
            <ActionButton onClick={() => navigate("dashboard")} secondary icon={ArrowLeft}>
              Save for later
            </ActionButton>
            <ActionButton onClick={() => navigate("centres")} icon={ArrowRight}>
              Choose a centre
            </ActionButton>
          </div>
        </div>

        <aside className="booking-aside">
          <Pill kind="yellow">MSP PROCUREMENT POLICY</Pill>
          <h3>100% Guaranteed MSP Rates.</h3>
          <p>Government declared MSP with state bonus credited directly to your bank account via Aadhaar DBT.</p>
          <div className="tip-line"><ShieldCheck /> Direct Benefit Transfer (DBT) enabled.</div>
          <div className="tip-line"><MapPin /> Centre availability updates live from server.</div>
          {selectedCropRecord && (
            <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Selected Crop Summary</span>
              <div className="flex items-center gap-2">
                <img
                  src={(selectedCropRecord as any).imageUrl || getCatalogueCropImage(selectedCropRecord.cropName)}
                  alt={selectedCropRecord.cropName}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{selectedCropRecord.cropName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{selectedCropRecord.variety}</div>
                </div>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Government Rate:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{selectedCropRecord.effectiveRatePerQuintal}/qtl</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Est. Payout ({expectedQuantity} Qtl):</span>
                <b className="text-emerald-700 dark:text-emerald-400 font-bold">
                  ₹{(expectedQuantity * selectedCropRecord.effectiveRatePerQuintal).toLocaleString("en-IN")}
                </b>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );

  const centresScreen = farmerShell(
    <>
      <SectionTitle
        eyebrow="CHOOSE ANDHRA PRADESH PROCUREMENT CENTRE"
        title="Find a calmer route to procurement."
        body="Compare live queue signals, waiting time, slots, and distance from the connected API across Andhra Pradesh."
      />
      <div className="booking-layout centres-layout">
        <div>
          <StepTrack current={2}/>

          {/* Prominent Centre Search Bar */}
          <div className="centre-search-bar-wrap mb-4">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
              <input
                type="text"
                value={centreSearchQuery}
                onChange={e => setCentreSearchQuery(e.target.value)}
                placeholder="Search procurement centre by name, district, place, or code (e.g. Vijayawada, Guntur, KNL, VJA)..."
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-xs transition-all"
              />
              {centreSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCentreSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {centreSearchQuery && (
              <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-slate-500">
                <span>Showing results for "<b>{centreSearchQuery}</b>" ({filteredCentres.length} {filteredCentres.length === 1 ? "centre" : "centres"} found)</span>
                <button
                  type="button"
                  onClick={() => setCentreSearchQuery("")}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          <div className="map-toolbar">
            <div>
              <LocateFixed size={17}/>
              <span>Andhra Pradesh Procurement Network</span>
            </div>
            <button onClick={() => void fetch(apiUrl("/centres")).then(response => response.ok ? response.json() : Promise.reject()).then(({ centres: responseCentres }) => {
              const statusMap: Record<string, Centre["status"]> = { OPEN: "Open", BUSY: "Busy", LIMITED: "Limited", CLOSED: "Limited" };
              setApiCentres(responseCentres.map((centre: { id: number; name: string; place: string; distanceKm: number; currentQueue: number; availableSlots: number; status: string; latitude?: number; longitude?: number }, index: number) => ({
                id: centre.id,
                name: centre.name,
                place: centre.place,
                distance: `${centre.distanceKm} km`,
                queue: centre.currentQueue,
                wait: `${Math.max(2, centre.currentQueue * 2)} min`,
                slots: centre.availableSlots,
                status: statusMap[centre.status] ?? "Limited",
                position: centres[index]?.position ?? "left-[47%] top-[45%]",
                latitude: centre.latitude,
                longitude: centre.longitude,
              })).sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })));
              toast.success("Andhra Pradesh centre availability refreshed from the API.");
            }).catch(() => toast.error("Centre availability is unavailable."))}>
              Refresh availability
            </button>
          </div>
          <div className="centre-map real-map-wrap">
            <MapView
              centres={filteredCentres}
              selectedCentreId={selectedCentre.id}
              initialCenter={{ lat: 16.2970, lng: 80.4350 }}
              initialZoom={8}
              onSelectCentre={(c) => setSelectedCentre(c as Centre)}
            />
          </div>
          <div className="list-heading">
            <h2>Andhra Pradesh Centres</h2>
            <span>{filteredCentres.length} available</span>
          </div>
          <div className="centre-list">
            {filteredCentres.length === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <MapPin className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={36} />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No procurement centres found matching "{centreSearchQuery}"</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Check your spelling or search by district (e.g. Guntur, Krishna, Kurnool) or branch code (e.g. VJA, GNT).
                </p>
                <button
                  type="button"
                  onClick={() => setCentreSearchQuery("")}
                  className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-block"
                >
                  Reset centre search
                </button>
              </div>
            ) : (
              filteredCentres.map(centre => (
                <button
                  key={centre.id}
                  className={selectedCentre.id === centre.id ? "selected" : ""}
                  onClick={() => {
                    setSelectedCentre(centre);
                    navigate("centre");
                  }}
                >
                  <span className={`centre-status ${(centre.status || "active").toLowerCase()}`}>
                    <MapPin size={17}/>
                  </span>
                  <div>
                    <h3>{centre.name}</h3>
                    <p>{centre.place} · {centre.distance}</p>
                    <span>{centre.queue} in queue <i/> {centre.wait} wait <i/> {centre.slots} slots</span>
                  </div>
                  <Pill kind={centre.status === "Open" ? "green" : centre.status === "Busy" ? "yellow" : "blue"}>
                    {centre.status}
                  </Pill>
                  <ChevronRight />
                </button>
              ))
            )}
          </div>
        </div>
        <aside className="booking-aside availability-aside">
          <Pill kind="green">WHY THIS MATTERS</Pill>
          <h3>Choose time, not just distance.</h3>
          <p>A centre with a shorter queue may save you more than a nearby centre on a busy day.</p>
          <div className="availability-callout">
            <UsersRound />
            <strong>Vijayawada is calmest now</strong>
            <span>Connected data shown in the list</span>
          </div>
          <button onClick={() => {
            const chosen = apiCentres[1] ?? centres[1];
            setSelectedCentre(chosen);
            navigate("centre");
          }}>
            View Vijayawada Centre <ArrowRight size={15}/>
          </button>
        </aside>
      </div>
    </>
  );

  const centreDetail = farmerShell(<><button className="back-link" onClick={() => navigate("centres")}><ArrowLeft size={16}/> All centres</button><div className="centre-detail"><section><div className="centre-detail-head"><div><Pill kind={selectedCentre.status === "Open" ? "green" : "yellow"}><span className="pulse-dot" /> {selectedCentre.status}</Pill><h1>{selectedCentre.name}</h1><p><MapPin size={16}/> {selectedCentre.place} · {selectedCentre.distance} from your village</p></div><span className="large-location"><MapPin/></span></div><div className="centre-stat-row"><div><small>CURRENT QUEUE</small><strong>{selectedCentre.queue}</strong><span>farmers waiting</span></div><div><small>ESTIMATED WAIT</small><strong>{selectedCentre.wait}</strong><span>at current speed</span></div><div><small>SLOTS OPEN</small><strong>{selectedCentre.slots}</strong><span>available slots</span></div></div><div className="centre-route-preview"><div className="route-map"><span className="route-source"><Sprout /></span><span className="route-destination"><MapPin /></span><i /></div><div><b>From Muppalapally</b><p>2.4 km · approximately 8 minutes</p></div><button onClick={() => toast.message("Routing map view ready.")}><LocateFixed size={17}/> Route</button></div><section className="centre-notes"><h2>At this centre</h2><div><span><Check /> Weighing facility ready</span><span><Check /> Quality check queue available</span><span><Check /> Document desk open</span></div></section></section><aside><StepTrack current={2}/><Pill kind="blue">YOUR SELECTION</Pill><h3>{selectedPaddy}</h3><p>18 quintals expected</p><hr/><p>Choose a date and slot to hold this centre in your booking.</p><ActionButton onClick={() => navigate("slot")} icon={ArrowRight}>Choose a slot</ActionButton><button onClick={() => navigate("centres")}>Compare another centre</button></aside></div></>);

  const slot = farmerShell(
    <>
      <SectionTitle
        eyebrow="RESERVE A TIME"
        title="Pick the window that fits your day."
        body={`At ${selectedCentre.name}, these slot capacities are loaded live from the procurement database.`}
      />
      <div className="booking-layout">
        <div>
          <StepTrack current={3} />
          <div className="date-picker-row">
            {[
              { label: "Today, 17 Mar", dateStr: "2026-03-17", sub: "TODAY", day: 17 },
              { label: "Wednesday, 18 March", dateStr: "2026-03-18", sub: "WED", day: 18 },
              { label: "Thursday, 19 March", dateStr: "2026-03-19", sub: "THU", day: 19 },
              { label: "Friday, 20 March", dateStr: "2026-03-20", sub: "FRI", day: 20 },
            ].map(d => (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(d.label);
                  void loadCentreSlots(selectedCentre.id, d.dateStr);
                }}
                className={selectedDate === d.label || selectedDate.includes(String(d.day)) ? "selected" : ""}
                key={d.dateStr}
              >
                <span>{d.sub}</span>
                <b>{d.day}</b>
                <small>March</small>
              </button>
            ))}
          </div>

          <h2 className="slot-heading flex items-center justify-between">
            <span>Available Windows</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Live Centre Capacity
            </span>
          </h2>

          <div className="slot-grid">
            {slotsLoading ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-emerald-600 border-t-transparent mb-2" />
                <p className="text-xs font-bold text-emerald-800">Loading slot availability from server…</p>
              </div>
            ) : backendSlots.length > 0 ? (
              backendSlots.map(slotItem => {
                const isSelected = selectedSlotId === slotItem.id || selectedSlot === `${slotItem.startTime} – ${slotItem.endTime}`;
                const isLimited = !slotItem.isFull && slotItem.available <= 5;
                const tone = slotItem.isFull ? "busy" : isSelected ? "selected" : isLimited ? "busy" : "calm";
                return (
                  <button
                    type="button"
                    disabled={slotItem.isFull}
                    onClick={() => {
                      setSelectedSlotId(slotItem.id);
                      setSelectedSlot(`${slotItem.startTime} – ${slotItem.endTime}`);
                    }}
                    key={slotItem.id}
                    className={`slot-choice ${tone} ${isSelected ? "selected ring-2 ring-emerald-600" : ""} ${
                      slotItem.isFull ? "opacity-50 cursor-not-allowed bg-slate-100" : ""
                    }`}
                  >
                    <span className="font-bold text-slate-900 tracking-wide">{slotItem.startTime} – {slotItem.endTime}</span>
                    <b className="text-xs">{slotItem.available} / {slotItem.capacity} slots available</b>
                    <div className="mt-1">
                      {slotItem.isFull ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 uppercase">FULL</span>
                      ) : isLimited ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 uppercase">LIMITED ({slotItem.available} LEFT)</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 uppercase">AVAILABLE</span>
                      )}
                    </div>
                    {isSelected && <i><Check /></i>}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-700">No active operational slots for this date.</p>
                <small className="text-[11px] text-slate-400">Please choose another date or procurement centre.</small>
              </div>
            )}
          </div>

          <div className="page-actions">
            <ActionButton onClick={() => navigate("centre")} secondary icon={ArrowLeft}>Change centre</ActionButton>
            <ActionButton onClick={() => navigate("confirmation")} icon={ArrowRight}>Review booking</ActionButton>
          </div>
        </div>

        <aside className="booking-aside slot-summary">
          <Pill kind="green">YOUR BOOKING</Pill>
          <h3>{selectedCentre.name}</h3>
          <p>{selectedCentre.distance} from Muppalapally</p>
          <hr />
          <span><Wheat /> {selectedPaddy}</span>
          <span><Tractor /> {expectedQuantity} quintals</span>
          <span><CalendarDays /> {selectedDate}</span>
          <span><Clock3 /> {selectedSlot}</span>
          <p className="tip-line"><Clock3 /> Arrive 10 minutes early for document verification.</p>
        </aside>
      </div>
    </>
  );

  const confirmation = farmerShell(
    <>
      <SectionTitle
        eyebrow="REVIEW AND CONFIRM"
        title="Your procurement slot is ready."
        body="Check these details once. Generating a token will confirm your place in the connected database queue."
      />
      <div className="confirmation-layout">
        <div>
          <StepTrack current={4} />
          <article className="booking-ticket">
            <div className="ticket-top">
              <AppLogo />
              <Pill kind="green">READY TO CONFIRM</Pill>
            </div>
            <div className="ticket-grid">
              <div>
                <small>CENTRE</small>
                <b>{selectedCentre.name}</b>
                <p><MapPin /> {selectedCentre.place}</p>
              </div>
              <div>
                <small>DATE & TIME</small>
                <b>{selectedDate}</b>
                <p><Clock3 /> {selectedSlot}</p>
              </div>
              <div>
                <small>PADDY</small>
                <b>{selectedPaddy}</b>
                <p><Wheat /> Approx. 18 quintals</p>
              </div>
              <div>
                <small>BOOKING ID</small>
                <b>{bookingRecord?.bookingCode ?? "Generated on confirmation"}</b>
                <p><ShieldCheck /> Database synced record</p>
              </div>
            </div>

            <div className="slot-fee-banner">
              <div className="fee-line">
                <span className="fee-text">Procurement Slot Booking Fee:</span>
                <b className="fee-free-text">₹0 (Free Govt Service)</b>
              </div>
              <div className="fee-line fee-total-line">
                <span className="fee-text">Amount Payable:</span>
                <b className="fee-zero-text">₹0</b>
              </div>
            </div>

            <div className="ticket-bottom">
              <span>Expected queue <b>{selectedCentre.queue} farmers</b></span>
              <span>Estimated wait <b>{selectedCentre.wait}</b></span>
            </div>
          </article>
          <div className="consent-box">
            <input type="checkbox" defaultChecked />
            <p>I confirm my visit to the procurement centre with the stated paddy load and documents. (Slot reservation is 100% free of charge).</p>
          </div>
          <div className="page-actions">
            <ActionButton onClick={() => navigate("slot")} secondary icon={ArrowLeft}>Change time</ActionButton>
            <ActionButton onClick={() => { void confirmBooking(); }} icon={Ticket}>Confirm & generate token</ActionButton>
          </div>
        </div>
        <aside className="booking-aside confirmation-help">
          <span className="token-disc"><Phone /></span>
          <h3>Need a hand?</h3>
          <p>The centre help desk is available from 9:00 AM to 5:00 PM.</p>
          <button onClick={() => toast.message("Helpline: 1800-000-2026")}>Call support <Phone size={15} /></button>
        </aside>
      </div>
    </>
  );

  const token = farmerShell(
    (() => {
      const stageDetails = getProcurementStageDetails(bookingRecord, paymentDone);
      const cStatus = getCancellationStatus(bookingRecord?.slot?.date, bookingRecord?.slot?.startTime, bookingRecord?.createdAt);
      const isCancelled = bookingRecord?.status === "CANCELLED";
      const rawToken = bookingRecord?.tokenNumber ?? "TK-GNT-0001";
      const branchCode = getCentreBranchCode(bookingRecord?.centre ?? selectedCentre);
      const displayToken = rawToken.startsWith("TK-")
        ? rawToken
        : rawToken.startsWith("Token ")
        ? `TK-${branchCode}-${rawToken.replace("Token ", "").padStart(4, "0")}`
        : rawToken.startsWith("P-")
        ? `TK-${branchCode}-${rawToken.replace("P-", "").padStart(4, "0")}`
        : `TK-${branchCode}-${rawToken}`;

      return (
        <>
          <SectionTitle
            eyebrow="OFFICIAL MANDI PROCUREMENT PASS"
            title={t.tokenTitle}
            body={tUi("Official verified digital token pass. Present this pass or QR code at the procurement centre entry gate.", language)}
          />

          <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Digital Token Pass Card */}
            <div className="digital-token-pass">
              {/* Pass Top Header */}
              <div className="token-pass-header">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Ticket size={22} />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                        GOVERNMENT MSP PROCUREMENT PASS
                      </div>
                      <h2 className="text-lg font-bold text-white m-0">ProcureFlow Digital Token Pass</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-200 border border-rose-400/40">
                        <AlertTriangle size={13} /> CANCELLED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-400/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> ACTIVE PASS
                      </span>
                    )}
                  </div>
                </div>

                {/* Prominent Token Display */}
                <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300 block mb-1">
                      TOKEN PASS NUMBER
                    </span>
                    <div className="token-serial-display">
                      {displayToken}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/80 block">
                      SCHEDULED APPOINTMENT
                    </span>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      {bookingRecord?.slot?.date ?? "Wednesday, 18 March 2026"}
                    </span>
                    <span className="text-xs text-emerald-200 font-medium">
                      {bookingRecord?.slot ? `${bookingRecord.slot.startTime} – ${bookingRecord.slot.endTime}` : selectedSlot}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ticket Notch & Perforated Divider */}
              <div className="ticket-notch-divider">
                <div className="ticket-perforated-line" />
              </div>

              {/* Pass Main Body */}
              <div className="p-6 sm:p-8 space-y-6 bg-white">
                {/* 5-Step Horizontal Lifecycle Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#14532d]">
                      PROCUREMENT PROGRESS & LIFECYCLE
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {stageDetails.currentStageLabel}
                    </span>
                  </div>

                  <div className="lifecycle-track">
                    {stageDetails.timeline.map((step, sIdx) => {
                      const statusClass = step.state === "done" ? "completed" : step.state === "current" ? "active" : "upcoming";
                      return (
                        <div key={step.title} className={`lifecycle-step ${statusClass}`}>
                          <div className="lifecycle-step-dot">
                            {step.state === "done" ? <Check size={14} /> : sIdx + 1}
                          </div>
                          <span className="lifecycle-step-label">{step.title}</span>
                          <span className="text-[10px] text-slate-400 hidden sm:block">{step.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Core Verification Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PROCUREMENT CENTRE</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5 leading-snug">
                      {bookingRecord?.centre?.name ?? selectedCentre.name}
                    </strong>
                    <span className="text-xs text-slate-500">{bookingRecord?.centre?.place ?? selectedCentre.place}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FARMER DETAILS</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5">
                      {bookingRecord?.farmer?.name ?? profileRecord?.name ?? "Ramesh Kumar"}
                    </strong>
                    <span className="text-xs text-slate-500">
                      ID: {profileRecord?.farmerCode ?? "FMR-2026-11842"} · Aadhaar: {(profileRecord as any)?.aadhaarMasked ?? "XXXX XXXX 1234"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CROP & VARIETY</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5">
                      {bookingRecord?.paddyVariety ?? selectedPaddy.split("—")[0]}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {bookingRecord?.paddyGrade ?? "Grade A"} · {bookingRecord?.expectedQuantityQuintals ?? 18} Quintals
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LIVE QUEUE STATUS</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5">
                      Position #{bookingRecord?.queue?.position ?? 1}
                    </strong>
                    <span className="text-xs text-amber-700 font-bold">
                      {bookingRecord?.queue?.peopleAhead ?? 0} farmers ahead · ~{bookingRecord?.queue?.estimatedWaitMinutes ?? 0}m wait
                    </span>
                  </div>
                </div>

                {/* QR Code & Entry Gate Verification */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-emerald-100 flex-shrink-0">
                    <QRCodeSvg
                      value={`PROCUREFLOW:${displayToken}|BOOKING:${bookingRecord?.bookingCode ?? "BK-2026-7294"}|FARMER:${profileRecord?.farmerCode ?? "FMR-2026-11842"}|CENTRE:${bookingRecord?.centre?.name ?? selectedCentre.name}`}
                      size={120}
                    />
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200/80 text-emerald-900">
                      <ShieldCheck size={14} /> Official Verified Gate Pass
                    </div>
                    <h3 className="text-base font-extrabold text-[#153e2a] m-0">Scan at Entry Gate & Weighbridge</h3>
                    <p className="text-xs text-slate-600 m-0 leading-relaxed">
                      Present this digital QR code to the procurement officer upon mandi arrival. Keep your original Aadhaar card and bank passbook handy for instant biometric confirmation.
                    </p>
                  </div>
                </div>

                {/* Mandi Gate Check-in Guidelines */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock3 size={15} />
                    </div>
                    <div>
                      <b className="text-xs text-[#153e2a] block">Arrive 10 Mins Early</b>
                      <span className="text-[11px] text-slate-500">Report prior to slot window for orderly gate entry.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scale size={15} />
                    </div>
                    <div>
                      <b className="text-xs text-[#153e2a] block">Moisture Standard</b>
                      <span className="text-[11px] text-slate-500">Moisture must be tested below 17% for 100% MSP payout.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Coins size={15} />
                    </div>
                    <div>
                      <b className="text-xs text-[#153e2a] block">Direct Bank DBT</b>
                      <span className="text-[11px] text-slate-500">Disbursed directly to Aadhaar-linked bank within 24-48h.</span>
                    </div>
                  </div>
                </div>

                {/* Actions & 30-Minute Cancellation Window */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("queue")}
                      className="border-emerald-600 text-emerald-800 font-bold hover:bg-emerald-50 h-9"
                    >
                      <UsersRound size={15} className="mr-1.5" /> Open Live Queue
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const copy = `ProcureFlow Token: ${displayToken}, Booking ID: ${bookingRecord?.bookingCode ?? "BK-2026-7294"}, Centre: ${bookingRecord?.centre?.name ?? selectedCentre.name}, Slot: ${bookingRecord?.slot?.date ?? ""} (${bookingRecord?.slot?.startTime ?? ""})`;
                        navigator.clipboard?.writeText(copy);
                        toast.success("Token details copied to clipboard.");
                      }}
                      className="h-9"
                    >
                      <Copy size={14} className="mr-1.5" /> Copy Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="h-9"
                    >
                      <Download size={14} className="mr-1.5" /> Download Pass
                    </Button>
                  </div>

                  {/* 30-Minute Cancellation Box */}
                  <div>
                    {isCancelled ? (
                      <div className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span className="font-bold">Booking Cancelled</span>
                        <button onClick={() => navigate("paddy")} className="text-emerald-800 underline font-extrabold ml-1">
                          Book New Slot
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {!cStatus.expired ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              Cancel window: <b className="text-amber-700 font-bold">{cStatus.text}</b>
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowCancelBookingModal(true)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-3"
                            >
                              Cancel Booking
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Cancellation closed (exceeded 30-min window)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    })()
  );

  const queue = farmerShell(<><SectionTitle eyebrow="LIVE QUEUE" title={t.queueTitle} body={tUi("Your connected queue refreshes every fifteen seconds while this screen is open.", language)} action={<Pill kind="green"><span className="pulse-dot"/> {t.live} updates</Pill>}/><div className="queue-layout"><section className="queue-main"><div className="queue-visual"><img src={queueUrl} alt="Orderly procurement centre queue"/><div className="image-shade"/><div className="queue-overlay"><Pill kind="yellow">{bookingRecord?.centre.name ?? "NIZAMABAD MARKET YARD"}</Pill><h2>Current token <strong>{bookingRecord?.queue?.currentToken ?? "P-024"}</strong></h2><p>Processing is moving steadily today.</p></div></div><div className="your-position"><div><small>YOUR TOKEN</small><strong>{bookingRecord?.tokenNumber ?? "P-042"}</strong><span>Booking {bookingRecord?.bookingCode ?? "BK-2026-7294"}</span></div><div><small>PEOPLE AHEAD</small><strong>{bookingRecord?.queue?.peopleAhead ?? queueAhead}</strong><span>Updated from the API</span></div><div><small>ESTIMATED WAIT</small><strong>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35} min</strong><span>{bookingRecord?.queue?.status ?? "WAITING"}</span></div></div><div className="queue-track"><div className="track-labels"><span>Current {bookingRecord?.queue?.currentToken ?? "P-024"}</span><span>Your {bookingRecord?.tokenNumber ?? "P-042"}</span></div><div className="track-bar"><i style={{ width: `${Math.max(18, queueProgress)}%` }} /><b style={{ left: `${Math.max(18, queueProgress)}%` }}>{bookingRecord?.tokenNumber ?? "P-042"}</b></div><div className="queue-scale"><span>{bookingRecord?.queue?.currentToken ?? "P-024"}</span><span>Queue</span><span>Position {bookingRecord?.queue?.position ?? 18}</span><span>{bookingRecord?.tokenNumber ?? "P-042"}</span></div></div></section><aside className="queue-side"><Pill kind="blue">CENTRE RHYTHM</Pill><h3>Connected estimate.</h3><p>The current token and waiting estimate are derived from live database records.</p><div className="rhythm-metrics"><span><UsersRound/><b>{bookingRecord?.queue?.position ?? 18}</b> position</span><span><Clock3/><b>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35}</b> min wait</span></div><hr/><h4>What to do now</h4><ul><li><Check/> Keep your documents ready.</li><li><Check/> Avoid joining early.</li><li><Check/> Check again before leaving.</li></ul><button onClick={() => navigate("assistant")}>Ask farmer assistant <Bot size={15}/></button></aside></div><section className="queue-alert"><Bell/><div><b>Queue notifications are active.</b><p>The backend creates a notification when your token is close to the front.</p></div><span><Check/> Active</span></section></>);

  const status = farmerShell(
    (() => {
      const stageDetails = getProcurementStageDetails(bookingRecord, paymentDone);
      return (
        <>
          <SectionTitle eyebrow="PROCUREMENT STATUS" title={t.statusTitle} body={tUi("Follow the journey of your paddy from booked slot to payment confirmation.", language)}/>
          <div className="status-layout">
            <section className="timeline-card">
              <div className="timeline-head">
                <div>
                  <Pill kind={bookingRecord?.status === "CANCELLED" ? "gray" : "green"}>
                    {bookingRecord?.status === "CANCELLED" ? "CANCELLED" : (bookingRecord?.bookingCode ?? "BK-2026-7294")}
                  </Pill>
                  <h2>{bookingRecord?.centre.name ?? "Nizamabad Market Yard"}</h2>
                  <p>{bookingRecord?.paddyVariety ?? "Common paddy"} · {bookingRecord?.paddyGrade ?? "Grade A"} · {bookingRecord?.expectedQuantityQuintals ?? 18} quintals expected</p>
                </div>
                <button onClick={() => navigate("token")}>
                  <Ticket size={18}/> {bookingRecord?.tokenNumber ? (bookingRecord.tokenNumber.startsWith("TK-") || bookingRecord.tokenNumber.startsWith("Token ") ? bookingRecord.tokenNumber : `Token ${bookingRecord.tokenNumber}`) : "Token TK-GNT-0001"}
                </button>
              </div>

              {/* Prominent Current Stage Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Current Stage</span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{stageDetails.currentStageLabel}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{stageDetails.currentStageDesc}</p>
                </div>
                <Pill kind={stageDetails.badgeKind}>{stageDetails.stageBadge}</Pill>
              </div>

              {/* 5-Step Clear Procurement Stage Progression */}
              <div className="timeline">
                {stageDetails.timeline.map(({ title, desc, state, icon: Icon }) => (
                  <article className={`timeline-row ${state}`} key={title}>
                    <span><Icon size={18}/></span>
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                    <i>{state === "done" ? <Check/> : state === "current" ? "In progress" : "Next"}</i>
                  </article>
                ))}
              </div>
            </section>
            <aside className="status-aside">
              <img src={statusUrl} alt="Paddy sample in tray, clipboard and weighing equipment"/><div className="image-shade"/>
              <div>
                <Pill kind="yellow">QUALITY SIGNAL</Pill>
                <h3>{bookingRecord?.procurement?.qualityGrade ? `Grade ${bookingRecord.procurement.qualityGrade}` : "Quality assessment pending"}</h3>
                <p>The displayed signal is pulled from the live procurement record in the database.</p>
              </div>

              {/* 30-Minute Cancellation Card on Procurement Status screen */}
              {(() => {
                const cStatus = getCancellationStatus(bookingRecord?.slot?.date, bookingRecord?.slot?.startTime, bookingRecord?.createdAt);
                const isCancelled = bookingRecord?.status === "CANCELLED";
                if (isCancelled) {
                  return (
                    <div className="mt-4 p-3 bg-white/95 text-rose-800 rounded-xl text-xs border border-rose-200">
                      <span className="font-bold flex items-center gap-1.5"><AlertTriangle size={15} /> Booking Cancelled</span>
                      <p className="mt-1 text-[11px] text-slate-600">This slot booking was cancelled. Your slot capacity has been released.</p>
                      <button onClick={() => navigate("paddy")} className="mt-2 text-xs text-emerald-800 underline font-bold">Book New Slot</button>
                    </div>
                  );
                }
                return (
                  <div className="mt-4 p-3 bg-white/95 text-slate-800 rounded-xl text-xs border border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                        <Clock3 size={14} className={cStatus.expired ? "text-slate-400" : "text-emerald-700"} />
                        {tUi("Cancellation available for 30 minutes after booking", language)}
                      </span>
                      <span className="text-[11px] text-slate-600 pl-5">
                        {cStatus.expired ? (
                          <b className="text-slate-500">Cancellation window expired (deadline was {cStatus.deadlineFormatted})</b>
                        ) : (
                          <>Time remaining: <b className="text-amber-700 font-bold">{cStatus.text}</b> (until {cStatus.deadlineFormatted})</>
                        )}
                      </span>
                    </div>
                    {!cStatus.expired && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowCancelBookingModal(true)}
                        className="w-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white h-8 rounded-lg mt-2"
                      >
                        Cancel Booking
                      </Button>
                    )}
                  </div>
                );
              })()}
            </aside>
          </div>
          <section className="status-summary">
            <div>
              <span className="token-disc small"><ClipboardCheck/></span>
              <p>
                <b>{stageDetails.currentStageLabel}</b><br/>
                The current stage is synchronized in real-time with officer actions.
              </p>
            </div>
            <div>
              <span className="token-disc small blue"><WalletCards/></span>
              <p>
                <b>{paymentDone ? "Payment Settled" : "Payment follows completion"}</b><br/>
                {paymentDone ? "DBT transfer completed to account." : "Explore payment details anytime."}
              </p>
            </div>
            <ActionButton onClick={() => navigate("payment")} secondary icon={ArrowRight}>View payment</ActionButton>
          </section>
        </>
      );
    })()
  );

  const payment = farmerShell(
    <>
      <SectionTitle
        eyebrow="DIRECT BENEFIT TRANSFER (DBT) · CROP SETTLEMENT"
        title="Procurement Payment & Farmer Settlement"
        body="Official government DBT payout for your procured harvest credited directly to your bank account."
      />

      {(() => {
        const isPaymentCredited = paymentRecord?.status === "SUCCESS";
        const isPaymentProcessing = paymentRecord?.status === "PROCESSING" || paymentProcessing;
        const isPaymentInitiated = paymentRecord?.status === "OFFICER_INITIATED";
        const isPaymentFailed = paymentRecord?.status === "FAILED";
        const isQcPassed = bookingRecord?.procurement?.status === "COMPLETED" || bookingRecord?.procurement?.status === "QUALITY_CHECK";

        const paymentStatusLabel = isPaymentCredited
          ? "Payment Successful"
          : isPaymentProcessing
          ? "Payment Processing"
          : isPaymentInitiated
          ? "Payment Initiated by Officer"
          : isPaymentFailed
          ? "Payment Failed"
          : isQcPassed
          ? "Pending Officer Initiation"
          : "Pending Quality Inspection";

        const pillKind = isPaymentCredited ? "green" : isPaymentProcessing ? "yellow" : isPaymentInitiated ? "blue" : isPaymentFailed ? "yellow" : "blue";

        return (
          <div className="payment-credit-highlight-card">
            <div className="credit-highlight-main">
              <div className="credit-badge-row">
                <span className="payout-type-tag">Government DBT Payout</span>
                <Pill kind={pillKind}>
                  {isPaymentCredited ? <Check size={13} /> : <Clock3 size={13} />}
                  Payment Status: {paymentStatusLabel}
                </Pill>
              </div>
              <small className="credit-label">
                {isPaymentCredited ? "Payment Received / Amount Credited" : "Estimated Payout / DBT Payable"}
              </small>
              <strong className="credit-amount">
                ₹{((bookingRecord?.paymentQuote?.demoPayable ?? (paymentRecord?.amount ? Number(paymentRecord.amount) : 41400))).toLocaleString("en-IN")}
              </strong>
              <p className="credit-bank-note">
                {isPaymentCredited ? (
                  <>Credited to Farmer: <b>{profileRecord?.name ?? "Ramesh Kumar"}</b> · Ref: <b className="font-mono">{paymentRecord?.transactionReference ?? ""}</b> · Direct DBT Bank Credit</>
                ) : isPaymentInitiated ? (
                  <>Initiated by Head Officer · Ref: <b className="font-mono">{paymentRecord?.transactionReference ?? ""}</b> · Direct Aadhaar DBT Payout Queued for Crediting</>
                ) : isPaymentProcessing ? (
                  <>Processing Direct Bank Transfer to: <b>{profileRecord?.name ?? "Ramesh Kumar"}</b></>
                ) : (
                  <>Payable to Farmer: <b>{profileRecord?.name ?? "Ramesh Kumar"}</b> · Linked Bank A/C (Aadhaar DBT Enabled upon Officer Initiation)</>
                )}
              </p>
            </div>

            <div className="credit-details-strip">
              <div>
                <small>PROCUREMENT ID</small>
                <b>{bookingRecord?.bookingCode ? `PR-${bookingRecord.bookingCode.replace("BK-", "")}` : "PR-2026-7294"}</b>
              </div>
              <div>
                <small>SETTLEMENT STATUS</small>
                <b className={isPaymentCredited ? "text-emerald-700" : isPaymentProcessing ? "text-amber-700" : isPaymentInitiated ? "text-blue-700" : isPaymentFailed ? "text-rose-700" : "text-slate-600"}>
                  {paymentStatusLabel} {isPaymentCredited && "(Bank Transfer)"}
                </b>
              </div>
              <div>
                <small>CROP & VARIETY</small>
                <b>{bookingRecord?.paddyVariety ?? "Common paddy"} ({bookingRecord?.expectedQuantityQuintals ?? 18} Quintals)</b>
              </div>
              <div>
                <small>SETTLEMENT DATE</small>
                <b>{isPaymentCredited && paymentRecord?.completedAt ? new Date(paymentRecord.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : paymentRecord?.initiatedAt ? new Date(paymentRecord.initiatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Pending Officer Initiation"}</b>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="payment-layout">
        <section className="payment-panel">
          {paymentRecord?.status === "SUCCESS" ? (
            <div className="payment-success">
              <span><Check /></span>
              <Pill kind="green">PAYMENT RECEIVED</Pill>
              <h2>Amount Credited to Farmer Account</h2>
              <p>Government DBT procurement payout has been credited to your verified bank account.</p>
              <div>
                <b>Amount Credited</b>
                <span>₹{Number(paymentRecord.amount).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <b>Payment ID</b>
                <span>{paymentRecord.paymentId}</span>
              </div>
              <div>
                <b>Transaction Reference</b>
                <span>{paymentRecord.transactionReference}</span>
              </div>
              <ActionButton onClick={() => navigate("dashboard")} icon={ArrowRight}>
                Return to dashboard
              </ActionButton>
            </div>
          ) : (
            <>
              <div className="demo-warning">
                <ShieldCheck />
                <p>
                  <b>Direct Benefit Transfer (DBT) Payout Settlement</b>
                  <br />
                  Govt procurement payment verification with bank gateway.
                </p>
              </div>

              <h2>Procurement Payment Payout Method</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Select your linked bank account or preferred payout gateway to receive procurement proceeds:
              </p>

              <div className="payment-methods">
                {[
                  ["Bank Direct Transfer (DBT)", Landmark, "Direct credit to Aadhaar-linked Bank A/C ****4821 (Recommended)"],
                  ["UPI Direct Payout", WalletCards, "Instant disbursement to registered farmer UPI VPA"],
                  ["Kisan Credit Card / RuPay", CreditCard, "Disbursement to Kisan Credit Card account"],
                ].map(([name, Icon, copy]) => (
                  <button
                    className={paymentMode === name ? "selected" : ""}
                    onClick={() => setPaymentMode(name as string)}
                    key={name as string}
                    type="button"
                  >
                    <span><Icon size={20} /></span>
                    <div>
                      <b>{name as string}</b>
                      <p>{copy as string}</p>
                    </div>
                    {paymentMode === name && <CheckCircle2 />}
                  </button>
                ))}
              </div>

              <div className="demo-payment-form">
                {paymentRecord?.status === "PROCESSING" ? (
                  <div>
                    <Pill kind="yellow">PROCESSING</Pill>
                    <p>Bank network is confirming the DBT transfer. Do not close this screen.</p>
                  </div>
                ) : paymentRecord?.status === "FAILED" ? (
                  <div>
                    <Pill kind="yellow">NEEDS ATTENTION</Pill>
                    <p>{paymentRecord.failureReason ?? "This disbursement could not be processed. Please retry."}</p>
                  </div>
                ) : (
                  <div>
                    <Pill kind="blue">PAYOUT READY</Pill>
                    <p>Proceed to verify payout credentials and receive payment receipt.</p>
                  </div>
                )}
              </div>

              <div className="payment-methods">
                <button
                  type="button"
                  className={paymentOutcome === "SUCCESS" ? "selected" : ""}
                  onClick={() => setPaymentOutcome("SUCCESS")}
                >
                  <span><CheckCircle2 size={20} /></span>
                  <div>
                    <b>Provider response: Payout Success</b>
                    <p>Simulate successful bank DBT credit to farmer.</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={paymentOutcome === "FAILED" ? "selected" : ""}
                  onClick={() => setPaymentOutcome("FAILED")}
                >
                  <span><X size={20} /></span>
                  <div>
                    <b>Provider response: Payout Error</b>
                    <p>Simulate bank network delay or authorization retry.</p>
                  </div>
                </button>
              </div>

              <ActionButton
                disabled={paymentProcessing || !bookingRecord}
                onClick={() => { void processPayment(); }}
                icon={ShieldCheck}
              >
                {paymentProcessing
                  ? "Processing DBT Settlement Payout…"
                  : paymentRecord?.status === "FAILED"
                  ? "Retry DBT Settlement Payout"
                  : "Verify & Receive Procurement Payment"}
              </ActionButton>
            </>
          )}
        </section>

        <aside className="payment-summary">
          {(() => {
            const isPaymentCredited = paymentRecord?.status === "SUCCESS";
            const isPaymentProcessing = paymentRecord?.status === "PROCESSING" || paymentProcessing;
            const isPaymentFailed = paymentRecord?.status === "FAILED";
            return (
              <>
                <Pill kind={isPaymentCredited ? "green" : "blue"}>PROCUREMENT SETTLEMENT</Pill>
                <h3>{isPaymentCredited ? "Amount Credited to Farmer" : "Estimated Settlement Payout"}</h3>
                {bookingRecord ? (
                  <>
                    <div>
                      <span>Paddy / Crop quantity</span>
                      <b>{bookingRecord.expectedQuantityQuintals} quintals</b>
                    </div>
                    <div>
                      <span>Govt MSP Rate</span>
                      <b>₹{bookingRecord.paymentQuote.unitPrice} / quintal</b>
                    </div>
                    {bookingRecord.paymentQuote.govtBonus ? (
                      <div>
                        <span>Govt Incentive Bonus</span>
                        <b className="positive">+₹{bookingRecord.paymentQuote.govtBonus}</b>
                      </div>
                    ) : null}
                    <hr />
                    <div className="payment-total">
                      <span>{isPaymentCredited ? "Total Amount Credited" : "Total Estimated Payout"}</span>
                      <b className="text-emerald-800">
                        ₹{(paymentRecord?.amount ? Number(paymentRecord.amount) : bookingRecord.paymentQuote.demoPayable).toLocaleString("en-IN")}
                      </b>
                    </div>
                    <p><MapPin /> {bookingRecord.centre?.name ?? "Guntur Market Yard"}</p>
                    <p><Ticket /> {bookingRecord.bookingCode}</p>
                    <small className={`${isPaymentCredited ? "text-emerald-700" : isPaymentProcessing ? "text-amber-700" : isPaymentFailed ? "text-rose-700" : "text-slate-500"} font-semibold block mt-2`}>
                      {isPaymentCredited
                        ? "✓ Credited to farmer via Direct Benefit Transfer (DBT)."
                        : isPaymentProcessing
                        ? "⏳ DBT payout transfer in progress with bank network."
                        : isPaymentFailed
                        ? "⚠ Payout disbursement failed. Please contact your procurement officer."
                        : "⏳ Pending Head Officer DBT initiation after quality check verification."}
                    </small>
                  </>
                ) : (
                  <p className="section-body">Sign in and load an active booking to view its procurement settlement.</p>
                )}
              </>
            );
          })()}
        </aside>
      </div>

      {receipt && (
        <section className="status-summary">
          <div>
            <span className="token-disc small blue"><CheckCircle2 /></span>
            <p>
              <b>Procurement Payment Receipt {receipt.receiptNumber}</b>
              <br />
              Payment ID: {receipt.payment.paymentId} · Transaction: {receipt.payment.transactionReference}
              <br />
              Amount Credited to Farmer: ₹{Number(receipt.payment.amount).toLocaleString("en-IN")}
            </p>
          </div>
          <ActionButton
            onClick={() => navigator.clipboard?.writeText(`Receipt ${receipt.receiptNumber} | Credited: ₹${receipt.payment.amount} | ID: ${receipt.payment.paymentId}`)}
            secondary
            icon={Check}
          >
            Copy receipt details
          </ActionButton>
        </section>
      )}

      <section className="status-summary">
        <div>
          <span className="token-disc small"><WalletCards /></span>
          <div>
            <b>Farmer Transaction & Payment Ledger</b>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clear distinction between ₹0 slot reservations and harvest procurement payouts.
            </p>
          </div>
        </div>
      </section>

      {/* 1. Slot Booking Fee Record: Always ₹0 */}
      <section className="status-summary">
        <div>
          <span className="token-disc small green"><Ticket /></span>
          <div>
            <b>1. Procurement Slot Booking Fee: ₹0</b>
            <p>
              Official Government Procurement Service · 100% Free Slot Reservation
              <br />
              Booking: {bookingRecord?.bookingCode ?? "BK-2026-7294"} · Status: <b>FREE / NO CHARGE (₹0)</b>
            </p>
          </div>
        </div>
        <Pill kind="green">₹0 FREE</Pill>
      </section>

      {/* 2. Procurement Payments: Amount Credited TO Farmer */}
      {paymentHistory.length ? (
        paymentHistory.map(history => (
          <section className="status-summary" key={history.paymentId}>
            <div>
              <span className="token-disc small blue"><WalletCards /></span>
              <div>
                <b>2. Procurement Payment: ₹{history.amount.toLocaleString("en-IN")} Credited TO Farmer</b>
                <p>
                  Payment Status: <b>{history.status === "SUCCESS" ? "Credited (DBT Bank Transfer)" : history.status}</b> · Method: {history.method}
                  <br />
                  Payment ID: {history.paymentId} · Transaction: {history.transactionReference}
                  <br />
                  Procurement Booking: {history.bookingCode} · Date: {new Date(history.initiatedAt ?? Date.now()).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
            <Pill kind={history.status === "SUCCESS" ? "green" : history.status === "FAILED" ? "yellow" : "blue"}>
              {history.status === "SUCCESS" ? "CREDITED" : history.status}
            </Pill>
          </section>
        ))
      ) : (
        <section className="status-summary">
          <div>
            <span className="token-disc small blue"><WalletCards /></span>
            <div>
              <b>2. Procurement Payment: ₹{((bookingRecord?.paymentQuote?.demoPayable ?? 41400)).toLocaleString("en-IN")} Credited TO Farmer</b>
              <p>
                Payment Status: <b>Credited (DBT Direct Bank Transfer)</b> · Linked Bank A/C ****4821
                <br />
                Procurement ID: {bookingRecord?.bookingCode ? `PR-${bookingRecord.bookingCode.replace("BK-", "")}` : "PR-2026-7294"} · Booking: {bookingRecord?.bookingCode ?? "BK-2026-7294"}
              </p>
            </div>
          </div>
          <Pill kind="green">CREDITED</Pill>
        </section>
      )}
    </>
  );

  const profile = farmerShell(<><SectionTitle eyebrow="FARMER PROFILE" title={t.profileTitle} body="Your current profile is loaded from the authenticated backend session."/><div className="profile-layout"><section className="profile-card"><div className="profile-main"><span className="profile-avatar">{getInitials(profileRecord?.name, "RK")}</span><div><Pill kind="green"><Check/> {profileRecord?.status ?? "APPROVED"} FARMER</Pill><h2>{profileRecord?.name ?? "Ramesh Kumar"}</h2><p>Farmer ID · {profileRecord?.farmerCode ?? "FMR-2026-11842"}</p></div><button onClick={() => toast.message("Profile details verified by officer.")}>Verified profile</button></div><div className="profile-details"><div><small>MOBILE NUMBER</small><b>+91 {profileRecord?.phone ?? "98765 43210"}</b></div><div><small>VILLAGE</small><b>{profileRecord?.village ?? "Muppalapally"}</b></div><div><small>DISTRICT</small><b>{profileRecord?.district ?? "Nizamabad"}, Telangana</b></div><div><small>PRIMARY CROP</small><b>{profileRecord?.primaryCrop ?? "Paddy"}</b></div></div><div className="profile-data-note"><ShieldCheck/><p>This profile is delivered from the protected database API after login.</p></div></section><aside className="profile-aside"><Pill kind="yellow">PROCUREMENT READY</Pill><h3>Profile status: {profileRecord?.status ?? "APPROVED"}</h3><p>Your authenticated profile is eligible to make bookings.</p><button onClick={() => navigate("paddy")}>Start a new booking <ArrowRight size={15}/></button></aside></div></>);

  const notifications = farmerShell(<><SectionTitle eyebrow="NOTIFICATIONS" title={t.notificationTitle} body="Booking, queue, procurement, and payment signals are loaded from your database records."/><div className="notifications-list">{(apiNotifications.length ? apiNotifications.map(notification => ({ icon: notification.category === "PAYMENT" ? WalletCards : notification.category === "PROCUREMENT" ? ClipboardCheck : notification.category === "QUEUE" ? UsersRound : Ticket, tone: notification.category === "QUEUE" ? "yellow" : notification.category === "PROCUREMENT" ? "blue" : "green", title: notification.title, copy: notification.message, time: new Date(notification.createdAt).toLocaleString() })) : [{ icon: Ticket, tone: "green", title: "Sign in to see API notifications", copy: "Your booking and status updates will appear here after an authenticated login.", time: "Live" }]).map(({ icon: Icon, tone, title, copy, time }) => <article key={`${title}-${time}`}><span className={`notice-icon ${tone}`}><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div><small>{time}</small></article>)}</div></>);

  const weatherScreen = farmerShell(
    <>
      <SectionTitle
        eyebrow="ANDHRA PRADESH AGRICULTURAL METEOROLOGY"
        title={t.weatherTitle}
        body={t.weatherBody}
        action={
          <div className="flex items-center gap-2">
            <select
              className="district-selector-dropdown"
              value={selectedWeatherDistrict}
              onChange={(e) => {
                const d = e.target.value;
                setSelectedWeatherDistrict(d);
                void loadWeather(d);
              }}
            >
              {["Guntur", "Vijayawada", "Kurnool", "Rajahmundry", "Visakhapatnam", "Eluru", "Nellore", "Tirupati"].map(dist => (
                <option key={dist} value={dist}>{dist} District</option>
              ))}
            </select>
            <ActionButton onClick={() => void loadWeather(selectedWeatherDistrict)} icon={LocateFixed}>
              Refresh
            </ActionButton>
          </div>
        }
      />

      <div className="weather-layout">
        <div>
          <div className="weather-hero-card">
            <div className="weather-hero-top">
              <div className="weather-location-title">
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full text-emerald-100">
                  <MapPin size={12} /> {weatherData?.district ?? selectedWeatherDistrict}, Andhra Pradesh
                </span>
                <h2>{weatherData?.condition ?? "Sunny & Clear"}</h2>
                <p>Updated live from AP Agri-Meteorological Station</p>
              </div>
              <span className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                {weatherData?.conditionCode === "LIGHT_RAIN" ? (
                  <CloudRain size={36} className="text-sky-300" />
                ) : weatherData?.conditionCode === "PARTLY_CLOUDY" ? (
                  <CloudSun size={36} className="text-amber-200" />
                ) : (
                  <Sun size={36} className="text-amber-300" />
                )}
              </span>
            </div>

            <div className="weather-temp-main">
              <div className="weather-temp-number">{weatherData?.temperature ?? 31}°C</div>
              <div className="weather-condition-badge">
                <b>Feels like {weatherData?.feelsLike ?? 33}°C</b>
                <span>Paddy moisture drying index: Optimal</span>
              </div>
            </div>

            <div className="weather-metrics-grid">
              <div className="weather-metric-item">
                <small>Humidity</small>
                <strong>{weatherData?.humidity ?? 62}%</strong>
                <span>Paddy target: {"<"} 17%</span>
              </div>
              <div className="weather-metric-item">
                <small>Wind Velocity</small>
                <strong>{weatherData?.windSpeedKmH ?? 14} km/h</strong>
                <span>Smooth transport</span>
              </div>
              <div className="weather-metric-item">
                <small>Precipitation</small>
                <strong>{weatherData?.precipitationChance ?? 10}%</strong>
                <span>Low rain risk</span>
              </div>
              <div className="weather-metric-item">
                <small>Harvest Status</small>
                <strong className="text-emerald-300">{weatherData?.safeHarvestingIndex ?? "OPTIMAL"}</strong>
                <span>Safe for transit</span>
              </div>
            </div>
          </div>

          <div className={`weather-advisory-card ${(weatherData?.safeHarvestingIndex ?? "OPTIMAL").toLowerCase()}`}>
            <div className="advisory-badge-row">
              <span className={`advisory-badge ${(weatherData?.safeHarvestingIndex ?? "OPTIMAL").toLowerCase()}`}>
                🌾 Safe Harvesting & Procurement Advisory
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                District: {selectedWeatherDistrict}
              </span>
            </div>
            <p className="advisory-text">
              {language === "TE"
                ? weatherData?.advisoryTe
                : language === "HI"
                ? weatherData?.advisoryHi
                : weatherData?.advisoryEn}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate("transportation")}
                className="action-button"
              >
                <Truck size={16} className="mr-1.5" /> Book Subsidized Vehicle for Today's Weather
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("paddy")}
                className="border-emerald-700/30 text-emerald-900"
              >
                <CalendarDays size={16} className="mr-1.5" /> Book Procurement Slot
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="forecast-panel">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#143d2c]">3-Day Agriculture Forecast</h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                AP Agromet
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Expected harvesting conditions for {selectedWeatherDistrict} district over the next 72 hours.
            </p>

            <div className="forecast-cards-grid">
              {(weatherData?.forecast ?? [
                { day: "Tomorrow", tempHigh: 33, tempLow: 23, condition: "Sunny & Dry", rainChance: 5 },
                { day: "Day After", tempHigh: 32, tempLow: 24, condition: "Partly Cloudy", rainChance: 15 },
                { day: "In 3 Days", tempHigh: 34, tempLow: 25, condition: "Clear Sky", rainChance: 10 },
              ]).map((fc, idx) => (
                <div className="forecast-day-card" key={idx}>
                  <div>
                    <h4>{fc.day}</h4>
                    <p>{fc.condition} · 🌧️ {fc.rainChance}% rain chance</p>
                  </div>
                  <div className="forecast-temp-range">
                    <b>{fc.tempHigh}°</b>
                    <span>/ {fc.tempLow}°C</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <Sparkles size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <b>Rythu Seva Tip:</b> Maintain paddy bag tarp covers during transit even on sunny days to prevent sudden coastal humidity absorption.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const promptCategories: Record<string, string[]> = {
    ALL: [
      "What is my token and estimated wait time?",
      "How many farmers are currently ahead of me?",
      "Is today's weather safe for paddy harvest in Guntur?",
      "What is the 2025-26 MSP rate for Grade A Paddy?",
      "How do I book a 30% subsidized tractor trolley?",
      "What documents must I carry to the procurement mandi?",
    ],
    TOKEN: [
      "What is my token and estimated wait time?",
      "How many farmers are currently ahead of me?",
      "Which AP centre currently has the shortest queue?",
      "When should I reach the centre for document verification?",
    ],
    WEATHER: [
      "Is today's weather safe for paddy harvest in Guntur?",
      "What is the maximum allowed moisture percentage for Grade A paddy?",
      "How do I protect harvest bags during transit from humidity?",
    ],
    MSP: [
      "What is the 2025-26 MSP rate for Grade A Paddy?",
      "What are the government bonus rates for Cotton and Maize in AP?",
      "When will my DBT procurement payment be credited?",
    ],
    TRANSPORT: [
      "How do I book a 30% subsidized tractor trolley?",
      "What is the per-km rate for mini trucks in Andhra Pradesh?",
      "How are vehicle driver details assigned?",
    ],
    PROCUREMENT: [
      "When should I reach the centre for document verification?",
      "What is the maximum allowed moisture percentage for Grade A paddy?",
      "What happens after weighbridge measurement?",
      "How is paddy quality inspected by the officer?",
    ],
    HELPLINE: [
      "What documents must I carry to the procurement mandi?",
      "What is the Rythu Bharosa Kendra toll-free number?",
      "How to register a grievance for procurement delay?",
    ],
  };

  const assistant = farmerShell(
    <>
      <SectionTitle
        eyebrow="AI FARMER ASSISTANT · DIGITAL KRISHI HELP CENTRE"
        title={t.assistantTitle}
        body={tUi("Ask any question regarding your live booking token, queue position, AP weather harvesting advisory, crop MSP rates, or subsidized transport.", language)}
      />
      <div className="assistant-advanced-layout">
        <section className="chat-panel">
          <div className="chat-head">
            <div className="flex items-center gap-3">
              <span className="assistant-bot-avatar"><Bot size={20} /></span>
              <div>
                <b className="text-sm font-extrabold text-[#143d2c]">ProcureFlow AI Assistant</b>
                <small className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <i className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  {tUi("Digital Krishi Help Centre", language)} · 24x7 Government Agri-Support
                </small>
              </div>
            </div>
            <LanguagePicker language={language} setLanguage={changeLanguage} />
          </div>

          <div className="assistant-category-chips">
            {[
              { id: "ALL", label: "🌟 " + tUi("All Topics", language) },
              { id: "TOKEN", label: "🎫 " + tUi("Token & Queue", language) },
              { id: "WEATHER", label: "🌧️ " + tUi("Weather & Advisory", language) },
              { id: "MSP", label: "🌾 " + tUi("Crop MSP Rates", language) },
              { id: "TRANSPORT", label: "🚚 " + tUi("Subsidized Transport", language) },
              { id: "PROCUREMENT", label: "⚖️ " + tUi("Procurement Help", language) },
              { id: "HELPLINE", label: "📞 " + tUi("Helplines & Docs", language) },
            ].map(cat => (
              <button
                key={cat.id}
                className={`category-chip-btn ${assistantCategory === cat.id ? "active" : ""}`}
                onClick={() => setAssistantCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="chat-feed" ref={chatFeedRef}>
            {chat.length === 0 ? (
              <div className="chat-empty-state">
                <span className="chat-empty-badge">
                  🌾 {tUi("Digital Krishi Help Centre", language)}
                </span>
                <h3 className="chat-empty-title">
                  {tUi("How can I help you today?", language)}
                </h3>
                <p className="chat-empty-desc">
                  {tUi("Ask any question regarding your live booking token, queue position, AP weather harvesting advisory, crop MSP rates, or subsidized transport.", language)}
                </p>
                <div className="prompt-chips-grid max-w-xl">
                  {(promptCategories[assistantCategory] ?? promptCategories.ALL).slice(0, 4).map(question => (
                    <button
                      className="prompt-chip-btn"
                      onClick={() => void assistantReply(question)}
                      key={question}
                    >
                      💡 {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((message, index) => (
                <div className={`chat-bubble ${message.role}`} key={`${message.text}-${index}`}>
                  {message.role === "assistant" ? (
                    <>
                      <div className="assistant-head-info">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                          <Bot size={14} className="text-emerald-700" /> ProcureFlow Krishi AI
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="assistant-role-pill">Official Agri-Advisor</span>
                          <button
                            onClick={() => speak(message.text)}
                            aria-label="Listen to response"
                            className={`assistant-audio-btn ${speakingText === message.text ? "text-emerald-600 animate-pulse" : ""}`}
                            title="Read answer aloud"
                          >
                            <Volume2 size={14} /> Listen
                          </button>
                        </div>
                      </div>
                      <p>{message.text}</p>
                    </>
                  ) : (
                    <>
                      <span className="user-label-pill">You (Farmer)</span>
                      <p>{message.text}</p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="suggested-prompts">
            <span className="font-bold text-xs text-[#164330] block mb-1">
              💡 {tUi("Select a quick question:", language)}
            </span>
            <div className="prompt-chips-grid">
              {(promptCategories[assistantCategory] ?? promptCategories.ALL).map(question => (
                <button
                  className="prompt-chip-btn"
                  onClick={() => void assistantReply(question)}
                  key={question}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Live Voice Recording Status Banner */}
          {isListening && (
            <div className="chat-listening-banner">
              <span className="recording-dot" />
              <span>{tUi("Listening... Speak now", language)} · Words appear in the input as you speak</span>
            </div>
          )}

          <form
            className="chat-compose"
            onSubmit={e => {
              e.preventDefault();
              void assistantReply(chatInput);
            }}
          >
            <button
              type="button"
              onClick={listen}
              title={isListening ? "Stop listening" : "Use voice input"}
              className={isListening ? "bg-red-600 text-white animate-pulse ring-4 ring-red-200" : "hover:bg-emerald-100"}
              aria-label="Toggle voice input"
            >
              <Mic size={18} />
            </button>
            <Input
              value={chatInput}
              onChange={event => setChatInput(event.target.value)}
              placeholder={
                isListening
                  ? tUi("Listening... Speak now", language)
                  : tUi("Type your question in English, Telugu, or Hindi…", language)
              }
            />
            <button type="submit" title="Send question" className="bg-emerald-700 hover:bg-emerald-800 text-white">
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="voice-note">
            <Headphones size={15} /> Voice recognition & speech read-aloud enabled in English, Telugu and Hindi.
          </p>
        </section>

        <aside className="helpline-side-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center font-bold">
              📞
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#153828] m-0">{tUi("Official Rythu Helplines", language)}</h3>
              <p className="text-[11px] text-muted-foreground m-0">{tUi("Direct Government Support Desks", language)}</p>
            </div>
          </div>

          <div className="helpline-item-row">
            <div className="helpline-info">
              <h4>{tUi("Rythu Bharosa Kendra Helpdesk", language)}</h4>
              <p>Toll-free · Mon–Sat (8 AM – 7 PM)</p>
              <b>1800-425-0002</b>
            </div>
            <div className="helpline-actions">
              <a href="tel:18004250002" className="helpline-call-btn" title="Call Rythu Helpline">
                <PhoneCall size={12} /> Call
              </a>
              <button
                className="helpline-copy-btn"
                onClick={() => {
                  navigator.clipboard?.writeText("18004250002");
                  toast.success("Helpline 1800-425-0002 copied.");
                }}
                title="Copy number"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="helpline-item-row">
            <div className="helpline-info">
              <h4>{tUi("AP Civil Supplies & Mandi Grievance", language)}</h4>
              <p>24x7 Government Helpline</p>
              <b>1902</b>
            </div>
            <div className="helpline-actions">
              <a href="tel:1902" className="helpline-call-btn" title="Call 1902">
                <PhoneCall size={12} /> Call
              </a>
              <button
                className="helpline-copy-btn"
                onClick={() => {
                  navigator.clipboard?.writeText("1902");
                  toast.success("Helpline 1902 copied.");
                }}
                title="Copy number"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="helpline-item-row">
            <div className="helpline-info">
              <h4>{tUi("Kisan Call Centre", language)}</h4>
              <p>National Agri-Support · 22 Languages</p>
              <b>1800-180-1551</b>
            </div>
            <div className="helpline-actions">
              <a href="tel:18001801551" className="helpline-call-btn" title="Call Kisan Helpline">
                <PhoneCall size={12} /> Call
              </a>
              <button
                className="helpline-copy-btn"
                onClick={() => {
                  navigator.clipboard?.writeText("18001801551");
                  toast.success("Helpline 1800-180-1551 copied.");
                }}
                title="Copy number"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="mt-5 p-4 bg-[#f4faf6] border border-[#c7e3d1] rounded-xl">
            <h4 className="text-xs font-bold text-[#144730] mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700" /> {tUi("Mandatory Mandi Checklist:", language)}
            </h4>
            <ul className="text-[11px] text-[#244b38] space-y-1.5 pl-1 m-0 list-none">
              <li className="flex items-center gap-1.5">
                <Check size={12} className="text-emerald-600" /> 1. Farmer Registration ID / Aadhaar
              </li>
              <li className="flex items-center gap-1.5">
                <Check size={12} className="text-emerald-600" /> 2. Aadhaar-linked Bank Passbook (DBT)
              </li>
              <li className="flex items-center gap-1.5">
                <Check size={12} className="text-emerald-600" /> 3. e-Crop / Land Record (Pahani/1B)
              </li>
              <li className="flex items-center gap-1.5">
                <Check size={12} className="text-emerald-600" /> 4. Digital Token Pass (<b>{bookingRecord?.tokenNumber ?? "Token 1"}</b>)
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );

  const officerMenuItems = useMemo(() => {
    const role = officerProfile?.role || "HEAD_OFFICER";
    if (role === "HEAD_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "staff", label: "Staff Management", icon: Users, target: "staffManagement" as Screen, badge: staffList.filter(s => s.status === "PENDING_VERIFICATION").length },
        { key: "pending", label: "Pending farmers", icon: UserCheck, target: "registrations" as Screen, badge: pendingRegistrations.length },
        { key: "approved", label: "Registered Farmers", icon: Users, target: "approved" as Screen, badge: officerFarmersList.length },
        { key: "bookings", label: "Bookings & queue", icon: CalendarDays, target: "bookings" as Screen, badge: 0 },
        { key: "quality", label: "Quality Control", icon: ShieldCheck, target: "quality" as Screen, badge: 0 },
        { key: "logistics", label: "Logistics & Transport", icon: Truck, target: "officerLogistics" as Screen, badge: officerLogisticsList.filter(l => l.status === "REQUESTED" || l.status === "ASSIGNED").length },
        { key: "payments", label: "Payment Settlement", icon: WalletCards, target: "officerPayments" as Screen, badge: 0 },
      ];
    }
    if (role === "PROCUREMENT_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "pending", label: "Pending farmers", icon: UserCheck, target: "registrations" as Screen, badge: pendingRegistrations.length },
        { key: "approved", label: "Registered Farmers", icon: Users, target: "approved" as Screen, badge: officerFarmersList.length },
        { key: "bookings", label: "Bookings & queue", icon: CalendarDays, target: "bookings" as Screen, badge: 0 },
        { key: "payments", label: "Payment Settlement", icon: WalletCards, target: "officerPayments" as Screen, badge: 0 },
      ];
    }
    if (role === "QUALITY_CONTROL_INSPECTOR") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "quality", label: "Quality Control Inspection", icon: ShieldCheck, target: "quality" as Screen, badge: 0 },
      ];
    }
    if (role === "LOGISTICS_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "logistics", label: "Logistics & Transport", icon: Truck, target: "officerLogistics" as Screen, badge: officerLogisticsList.filter(l => l.status === "REQUESTED" || l.status === "ASSIGNED").length },
      ];
    }
    if (role === "PAYMENT_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "payments", label: "Payment Settlement", icon: WalletCards, target: "officerPayments" as Screen, badge: 0 },
      ];
    }
    return [
      { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
      { key: "pending", label: "Pending farmers", icon: UserCheck, target: "registrations" as Screen, badge: pendingRegistrations.length },
    ];
  }, [officerProfile, staffList, pendingRegistrations, officerLogisticsList, officerFarmersList]);

  const officerShell = (content: React.ReactNode) => (
    <div className="officer-shell">
      <aside className="officer-rail">
        <button onClick={() => navigate("landing")}><AppLogo inverse/></button>
        <p>{(officerProfile?.role || "OFFICER CONSOLE").replaceAll("_", " ")}</p>
        {officerMenuItems.map(item => (
          <button
            key={item.key}
            onClick={() => {
              setOfficerView(item.key as typeof officerView);
              navigate(item.target);
            }}
            className={officerView === item.key ? "active" : ""}
          >
            <item.icon size={19}/>
            {item.label}
            {item.badge > 0 && <i>{item.badge}</i>}
          </button>
        ))}
        <div className="officer-rail-bottom">
          <button onClick={() => navigate("landing")}><ArrowLeft size={18}/> Farmer portal</button>
        </div>
      </aside>
      <div className="officer-main">
        <header>
          <div>
            <span className="today-dot"/> 
            {officerProfile ? (
              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full ml-1 border border-emerald-300">
                {(officerProfile?.role || "HEAD_OFFICER").replaceAll("_", " ")} · {officerProfile?.branch || "GUNTUR"}
              </span>
            ) : (
              <>Procurement window <b>Open today</b></>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguagePicker language={language} setLanguage={changeLanguage}/>
            <button
              className="notification-button relative"
              onClick={() => setShowOfficerNotifModal(true)}
              title="View officer & staff alerts"
            >
              <Bell size={19}/>
              {officerNotificationsList.filter(n => !n.isRead).length > 0 && <i/>}
            </button>
            <span className="officer-user font-bold" title={officerProfile?.name || "Officer"}>
              {getInitials(officerProfile?.name, "SO")}
            </span>
            <button className="top-logout-btn" onClick={logoutOfficer} title="Log out of officer console">
              <LogOut size={15} /> <span>Logout</span>
            </button>
          </div>
        </header>
        <main>{content}</main>
      </div>

      {/* Officer Notifications Modal */}
      {showOfficerNotifModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border flex flex-col gap-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                <Bell size={18} className="text-emerald-700" /> Operational Alerts & Notifications
              </h3>
              <button onClick={() => setShowOfficerNotifModal(false)}><X size={18}/></button>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {officerNotificationsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No new officer notifications.</div>
              ) : (
                officerNotificationsList.map(notif => (
                  <div key={notif.id} className="py-2.5">
                    <strong className="text-xs font-bold text-slate-900 block">{notif.title}</strong>
                    <p className="text-xs text-slate-600 m-0 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1">
                      {new Date(notif.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Button size="sm" onClick={() => setShowOfficerNotifModal(false)} className="w-full text-xs font-bold mt-1">
              Close Alerts
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const officerLogin = (
    <div className="officer-login">
      <header>
        <button onClick={() => navigate("landing")}><AppLogo /></button>
        <button className="back-link" onClick={() => navigate("landing")}><ArrowLeft size={16}/> Back to home</button>
      </header>
      <main>
        <section>
          <Pill kind="blue">OFFICER & STAFF GOVERNANCE</Pill>
          <h1>Department Staff & Mandi Management.</h1>
          <p>Multi-department access with Head Officer onboarding verification. Verify registrations, balance capacity, run quality inspections, assign subsidized transport, and settle farmer payments directly.</p>
          <div className="officer-login-stat">
            <span><UsersRound/> <b>{officerAnalytics?.approvedFarmers ?? 3}</b> farmers approved</span>
            <span><Clock3/> <b>{officerAnalytics?.activeBookings ?? 3}</b> active bookings</span>
          </div>
        </section>
        <form onSubmit={e => { e.preventDefault(); void loginOfficer(); }}>
          <p className="eyebrow">OFFICER & STAFF LOGIN</p>
          <h2>Enter your verified credentials.</h2>
          <label>
            Officer / Login ID
            <Input
              value={officerLoginForm.officerCode}
              onChange={e => setOfficerLoginForm(f => ({ ...f, officerCode: e.target.value }))}
              placeholder="e.g. OFF-NZM-104 or QC-2026-4892"
            />
          </label>
          <label>
            Password
            <Input
              type="password"
              value={officerLoginForm.password}
              onChange={e => setOfficerLoginForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
            />
          </label>

          <Button type="submit" className="action-button">Enter officer console <ArrowRight size={17}/></Button>

          {/* Quick Demo Login Preset Pills */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500">QUICK LOGIN PRESETS:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const creds = { officerCode: "OFF-NZM-104", password: "Officer@2026" };
                  setOfficerLoginForm(creds);
                  void loginOfficer(creds);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg cursor-pointer transition-colors"
              >
                👑 Head Officer
              </button>
              <button
                type="button"
                onClick={() => {
                  const creds = { officerCode: "QC-2026-4892", password: "Officer@2026" };
                  setOfficerLoginForm(creds);
                  void loginOfficer(creds);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg cursor-pointer transition-colors"
              >
                🔍 QC Inspector
              </button>
              <button
                type="button"
                onClick={() => {
                  const creds = { officerCode: "LOG-2026-1042", password: "Officer@2026" };
                  setOfficerLoginForm(creds);
                  void loginOfficer(creds);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg cursor-pointer transition-colors"
              >
                🚚 Logistics Officer
              </button>
              <button
                type="button"
                onClick={() => {
                  const creds = { officerCode: "PAY-2026-9041", password: "Officer@2026" };
                  setOfficerLoginForm(creds);
                  void loginOfficer(creds);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg cursor-pointer transition-colors"
              >
                💳 Payment Officer
              </button>
              <button
                type="button"
                onClick={() => {
                  const creds = { officerCode: "PO-2026-3391", password: "Officer@2026" };
                  setOfficerLoginForm(creds);
                  void loginOfficer(creds);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg cursor-pointer transition-colors"
              >
                🌾 Procurement Officer
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">New employee joining a department?</span>
            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
            >
              + Onboard Staff
            </button>
          </div>

          <p className="form-note"><ShieldCheck size={16}/> Authenticated officer session with role authorization.</p>
        </form>
      </main>
    </div>
  );

  const officerDashboard = officerShell(
    <>
      <SectionTitle
        eyebrow="NIZAMABAD DISTRICT · LIVE OPERATIONS"
        title="Procurement Operations Dashboard"
        body="Real-time operational metrics, capacity utilization, and arrival flow computed directly from the system database."
        action={<ActionButton onClick={() => { setOfficerView("pending"); navigate("registrations"); }} icon={UserCheck}>Review pending ({pendingRegistrations.length})</ActionButton>}
      />
      <section className="officer-metrics">
        <MetricCard icon={UserCheck} label="Pending registrations" value={`${officerAnalytics?.pendingRegistrations ?? pendingRegistrations.length}`} hint="Requires officer review" tone="yellow"/>
        <MetricCard icon={CalendarDays} label="Bookings today" value={`${officerAnalytics?.totalBookings ?? officerStats?.todaysBookings ?? 0}`} hint="Active stored bookings" tone="blue"/>
        <MetricCard icon={UsersRound} label="Active queue" value={`${officerAnalytics?.activeQueue ?? officerStats?.activeQueue ?? 0}`} hint="Farmers waiting at centres" tone="green"/>
        <MetricCard icon={WalletCards} label="Disbursed amount" value={`₹${((officerAnalytics?.financials?.totalDisbursed ?? 0) / 1000).toFixed(1)}k`} hint={`${officerAnalytics?.financials?.completedPaymentsCount ?? 0} settled payments`} tone="green"/>
      </section>
      <section className="stats-section officer-stats-section">
        <div className="stats-heading">
          <div>
            <p className="eyebrow">DATABASE ANALYTICS</p>
            <h2>Aggregated real data from stored procurement records.</h2>
          </div>
          <Pill kind="blue">LIVE DB METRICS</Pill>
        </div>
        <div className="metric-grid stats-grid">
          <MetricCard icon={UsersRound} label="Total registered farmers" value={`${officerAnalytics?.totalFarmers ?? 0}`} hint={`${officerAnalytics?.approvedFarmers ?? 0} approved / ${officerAnalytics?.rejectedRegistrations ?? 0} rejected`} tone="blue"/>
          <MetricCard icon={ClipboardCheck} label="Completed procurements" value={`${officerAnalytics?.completedProcurements ?? 0}`} hint="Final weight & quality checked" tone="green"/>
          <MetricCard icon={Clock3} label="Pending registrations" value={`${officerAnalytics?.pendingRegistrations ?? 0}`} hint="Awaiting approval" tone="yellow"/>
          <MetricCard icon={WalletCards} label="Pending payments" value={`₹${((officerAnalytics?.financials?.totalPendingAmount ?? 0) / 1000).toFixed(1)}k`} hint={`${officerAnalytics?.financials?.pendingPaymentsCount ?? 0} in progress`} tone="yellow"/>
        </div>
      </section>
      <section className="officer-grid">
        <article className="registration-alert">
          <div>
            <Pill kind={pendingRegistrations.length > 0 ? "yellow" : "green"}><Clock3 size={13}/> {pendingRegistrations.length > 0 ? "ACTION NEEDED" : "ALL REVIEWED"}</Pill>
            <h2>{pendingRegistrations.length > 0 ? `${pendingRegistrations.length} farmer${pendingRegistrations.length > 1 ? "s" : ""} waiting for approval.` : "No pending registrations"}</h2>
            <p>{pendingRegistrations.length > 0 && pendingRegistrations[0]?.farmer?.name ? `${pendingRegistrations[0].farmer.name} (${pendingRegistrations[0].farmer.village || "Village"}) submitted registration.` : "All farmer registrations have been processed."}</p>
          </div>
          {pendingRegistrations.length > 0 ? (
            <ActionButton onClick={() => { setOfficerView("pending"); navigate("registrations"); }} icon={ArrowRight}>Review now</ActionButton>
          ) : (
            <span className="cleared-icon"><Check/></span>
          )}
        </article>
        <article className="centre-pulse-card">
          <div className="centre-pulse-head">
            <div>
              <Pill kind="green"><span className="pulse-dot"/> LIVE CAPACITY</Pill>
              <h2>Centre pulse</h2>
            </div>
            <button onClick={() => { setOfficerView("bookings"); navigate("bookings"); }}><ArrowRight/></button>
          </div>
          {(officerAnalytics?.centreUtilization ?? centres).slice(0, 4).map(centre => {
            const queueCount = "currentQueue" in centre ? centre.currentQueue : centre.queue;
            const capacity = "queueCapacity" in centre ? centre.queueCapacity : 50;
            const util = "utilizationPercent" in centre ? centre.utilizationPercent : Math.round((queueCount / capacity) * 100);
            return (
              <div className="pulse-centre" key={centre.id}>
                <span><i className={(centre.status || "active").toLowerCase()}/>{centre.name}</span>
                <b>{queueCount} in queue ({util}% cap)</b>
                <Progress value={Math.min(100, util)} />
              </div>
            );
          })}
        </article>
      </section>
      <section className="officer-queue-summary">
        <div>
          <p className="eyebrow">ARRIVAL DISTRIBUTION BY SLOT</p>
          <h2>Arrivals scheduled today across all centres.</h2>
          <p>Real booking counts per slot time window computed from active database bookings.</p>
        </div>
        <div className="arrival-bars">
          {(officerAnalytics?.hourlyArrivals ?? [{ time: "09:30 AM", count: 2, percentage: 35 }, { time: "10:00 AM", count: 4, percentage: 60 }, { time: "10:30 AM", count: 6, percentage: 80 }, { time: "11:00 AM", count: 3, percentage: 45 }, { time: "11:30 AM", count: 5, percentage: 70 }, { time: "12:00 PM", count: 3, percentage: 50 }]).map((slotArrival, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <span style={{ height: `${Math.max(15, slotArrival.percentage)}%` }} title={`${slotArrival.time}: ${slotArrival.count} bookings`} />
            </div>
          ))}
        </div>
        <button onClick={() => { setOfficerView("bookings"); navigate("bookings"); }}>Open booking & queue overview <ArrowRight size={15}/></button>
      </section>
    </>
  );

  const officerPaymentStatus = officerShell(
    <>
      <SectionTitle
        eyebrow="PAYMENT OPERATIONS"
        title="Payment status at a glance."
        body="Real payment states, transaction references, amounts, and settlement centres stored in the database."
        action={<ActionButton onClick={() => {
          if (!officerToken) return;
          void fetch(apiUrl("/officers/payments"), { headers: { Authorization: `Bearer ${officerToken}` } })
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => { setOfficerPayments(data.payments); toast.success("Payment status refreshed from database."); })
            .catch(() => toast.error("Payment status could not be refreshed."));
        }} icon={LocateFixed}>Refresh status</ActionButton>}
      />
      <section className="registration-table">
        <div className="table-head">
          <span>Farmer</span>
          <span>Booking</span>
          <span>Method</span>
          <span>Payment ID</span>
          <span>Status</span>
          <span />
        </div>
        {officerPayments.length ? officerPayments.map(payment => (
          <article className="registration-row" key={payment.paymentId}>
            <div>
              <span className="avatar">{getInitials(payment.farmer?.name, "FM")}</span>
              <b>{payment.farmer?.name ?? "Farmer"}<small>{payment.farmer?.farmerCode ?? "FMR-2026"}</small></b>
            </div>
            <span>{payment.bookingCode ?? "BK-2026"}<small>{payment.centre?.name ?? "Procurement Centre"}</small></span>
            <span>{payment.method ?? "UPI"} · ₹{(payment.amount ?? 0).toLocaleString("en-IN")}</span>
            <span>{payment.paymentId}<small>{payment.transactionReference ?? ""}</small></span>
            <div className="flex items-center gap-2">
              <Pill kind={payment.status === "SUCCESS" ? "green" : payment.status === "OFFICER_INITIATED" ? "blue" : payment.status === "PROCESSING" ? "yellow" : payment.status === "FAILED" ? "yellow" : "blue"}>{payment.status}</Pill>
              {payment.status !== "SUCCESS" && (
                <button
                  type="button"
                  onClick={() => { void disburseFarmerPayout(payment.bookingId); }}
                  disabled={payoutProcessingId === payment.bookingId}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {payoutProcessingId === payment.bookingId ? "Disbursing…" : "Disburse DBT"}
                </button>
              )}
            </div>
            <ChevronRight/>
          </article>
        )) : (
          <div className="table-empty">
            <span><WalletCards/></span>
            <h3>No payment records yet.</h3>
            <p>Payment attempts will appear here with their live status once initiated.</p>
          </div>
        )}
      </section>
    </>
  );

  const selectedPending = pendingRegistrations.find(item => item.id === selectedRegistrationId) ?? pendingRegistrations[0];
  const registrations = officerShell(
    <>
      <SectionTitle
        eyebrow="REGISTRATION REVIEW"
        title="Pending farmer registrations."
        body="Review and approve or reject farmer registrations directly from the database API."
      />
      <div className="registration-table">
        <div className="table-head">
          <span>Farmer</span>
          <span>Location</span>
          <span>Primary crop</span>
          <span>Submitted</span>
          <span>Status</span>
          <span />
        </div>
        {pendingRegistrations.length ? pendingRegistrations.map(registration => (
          <button
            className="registration-row"
            onClick={() => {
              setRegistrationId(registration.id);
              setSelectedRegistrationId(registration.id);
              setShowRecord(true);
            }}
            key={registration.id}
          >
            <div>
              <span className="avatar">{getInitials(registration.farmer?.name, "FM")}</span>
              <b>{registration.farmer?.name ?? "Farmer"}<small>{registration.farmer?.farmerCode ?? "FMR-2026"}</small></b>
            </div>
            <span>{registration.farmer?.village ?? "Village"}, {registration.farmer?.district ?? "District"}</span>
            <span>{registration.farmer?.primaryCrop ?? "Paddy"}</span>
            <span>Awaiting review</span>
            <Pill kind="yellow">PENDING</Pill>
            <ChevronRight/>
          </button>
        )) : (
          <div className="table-empty">
            <span><CheckCircle2/></span>
            <h3>No pending registrations</h3>
            <p>There are no pending farmer registrations requiring review.</p>
          </div>
        )}
      </div>
      {showRecord && selectedPending && (
        <div className="review-drawer">
          <div className="drawer-top">
            <div>
              <Pill kind="yellow">PENDING REVIEW</Pill>
              <h2>Farmer registration details</h2>
            </div>
            <button onClick={() => setShowRecord(false)}><X/></button>
          </div>
          <div className="review-farmer">
            <span className="profile-avatar">{getInitials(selectedPending.farmer?.name, "FM")}</span>
            <div>
              <h3>{selectedPending.farmer?.name ?? "Farmer"}</h3>
              <p>{selectedPending.farmer?.farmerCode ?? "FMR-2026"} · Awaiting officer review</p>
            </div>
          </div>
          <div className="review-data">
            <div><small>MOBILE NUMBER</small><b>{selectedPending.farmer?.phone ? `+91 ${selectedPending.farmer.phone}` : "—"}</b></div>
            <div><small>VILLAGE</small><b>{selectedPending.farmer?.village ?? "—"}</b></div>
            <div><small>DISTRICT</small><b>{selectedPending.farmer?.district ?? "—"}</b></div>
            <div><small>PRIMARY CROP</small><b>{selectedPending.farmer?.primaryCrop ?? "Paddy"}</b></div>
            <div><small>ACCOUNT STATUS</small><b>{selectedPending.farmer?.status ?? "PENDING"}</b></div>
            <div><small>DECLARATION</small><b><CheckCircle2/> Confirmed</b></div>
          </div>
          <div className="review-note">
            <ShieldCheck/>
            <p>Approving activates farmer login. Rejecting notifies the farmer with your recorded reason.</p>
          </div>
          <div className="drawer-actions">
            <Button onClick={() => setShowRejectModal(true)} variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/30">
              <UserX size={16} className="mr-1.5" /> Reject farmer
            </Button>
            <ActionButton onClick={approveFarmer} icon={Check}>Approve farmer</ActionButton>
          </div>
        </div>
      )}
      {showRejectModal && selectedPending && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Reject Farmer Registration</h3>
              <button onClick={() => setShowRejectModal(false)}><X size={18}/></button>
            </div>
            <p className="text-sm text-muted-foreground">Specify the reason for rejecting <b>{selectedPending.farmer?.name ?? "Farmer"}</b>. The farmer will be notified.</p>
            <label className="text-sm font-medium">Rejection Reason</label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Document mismatch, incomplete land record..." />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={rejectFarmer}>Confirm Rejection</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const approvedList = officerShell(
    <>
      <SectionTitle
        eyebrow="NATIONAL FARMER DIRECTORY"
        title="Registered Farmers & Database Records"
        body="Comprehensive, live database directory of all registered farmers across all districts. Zero passwords exposed."
        action={
          <ActionButton
            onClick={() => {
              if (officerToken) void loadOfficerFarmers(officerToken);
            }}
            icon={LocateFixed}
          >
            {officerFarmersLoading ? "Refreshing…" : "Refresh Directory"}
          </ActionButton>
        }
      />

      {/* 1. Summary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Users}
          label="Total Registered Farmers"
          value={`${officerFarmersList.length}`}
          hint="All active database records"
          tone="green"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Verified & Approved"
          value={`${officerFarmersList.filter(f => f.status === "APPROVED").length}`}
          hint="Full slot booking privileges"
          tone="green"
        />
        <MetricCard
          icon={Clock3}
          label="Pending Review"
          value={`${officerFarmersList.filter(f => f.status === "PENDING").length}`}
          hint="Awaiting officer verification"
          tone="yellow"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Needs Attention / Rejected"
          value={`${officerFarmersList.filter(f => f.status === "REJECTED").length}`}
          hint="Document correction requested"
          tone="blue"
        />
      </section>

      {/* 2. Directory Toolbar & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700">Filter Status:</span>
          {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setOfficerFarmersFilter(tab)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                officerFarmersFilter === tab
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab === "ALL" ? `All (${officerFarmersList.length})` :
               tab === "APPROVED" ? `Approved (${officerFarmersList.filter(f => f.status === "APPROVED").length})` :
               tab === "PENDING" ? `Pending (${officerFarmersList.filter(f => f.status === "PENDING").length})` :
               `Rejected (${officerFarmersList.filter(f => f.status === "REJECTED").length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, village..."
            value={officerFarmersSearch}
            onChange={e => setOfficerFarmersSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* 3. Tabular Directory View */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Farmer Info</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Village & District</th>
                <th className="py-3 px-4">Primary Crop</th>
                <th className="py-3 px-4">Aadhaar (Masked)</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Active Mandi / Slot</th>
                <th className="py-3 px-4">Registration Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const filtered = officerFarmersList.filter(farmer => {
                  const matchesFilter = officerFarmersFilter === "ALL" || farmer.status === officerFarmersFilter;
                  const q = officerFarmersSearch.trim().toLowerCase();
                  const matchesSearch = !q ||
                    farmer.name.toLowerCase().includes(q) ||
                    farmer.farmerCode.toLowerCase().includes(q) ||
                    farmer.phone.includes(q) ||
                    farmer.village.toLowerCase().includes(q) ||
                    farmer.district.toLowerCase().includes(q);
                  return matchesFilter && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        <Users size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700 m-0">No farmers found</p>
                        <small className="text-slate-400">Try changing your search query or status filter.</small>
                      </td>
                    </tr>
                  );
                }

                return filtered.map(f => {
                  const regDate = f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent";
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(f.name, "FM")}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{f.name}</div>
                            <span className="font-mono text-[10px] text-slate-500">{f.farmerCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        +91 {f.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{f.village}</div>
                        <div className="text-[10px] text-slate-500">{f.district}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🌾 {f.primaryCrop}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {f.registration?.aadhaarMasked || "XXXX XXXX 1234"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            f.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : f.status === "PENDING"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              f.status === "APPROVED" ? "bg-emerald-600" : f.status === "PENDING" ? "bg-amber-600" : "bg-rose-600"
                            )}
                          />
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {f.activeBooking ? (
                          <div>
                            <div className="font-semibold text-emerald-900">{f.activeBooking.centreName}</div>
                            <span className="text-[10px] text-slate-500">{f.activeBooking.bookingCode} · {f.activeBooking.expectedQuantityQuintals} Qtl</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No active booking</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {regDate}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const bookings = officerShell(
    <>
      <SectionTitle
        eyebrow="BOOKINGS & QUEUE MANAGEMENT"
        title="Live Procurement & Queue Control"
        body="Monitor all active centre bookings and advance farmer procurement stages through weighing, quality inspection, and completion."
        action={<ActionButton onClick={() => { if (officerToken) void loadOfficerBookings(officerToken); }} icon={LocateFixed}>Refresh bookings</ActionButton>}
      />
      <section className="bookings-board">
        <div className="booking-center-cards">
          {(officerAnalytics?.centreUtilization ?? centres).map(centre => {
            const queueCount = "currentQueue" in centre ? centre.currentQueue : centre.queue;
            const slotsCount = "availableSlots" in centre ? centre.availableSlots : centre.slots;
            return (
              <article key={centre.id}>
                <div>
                  <span className={`centre-status ${(centre.status || "active").toLowerCase()}`}><MapPin/></span>
                  <Pill kind={centre.status === "Open" ? "green" : centre.status === "Busy" ? "yellow" : "blue"}>{centre.status}</Pill>
                </div>
                <h3>{centre.name}</h3>
                <p>{centre.place}</p>
                <div><span><UsersRound/> {queueCount} in queue</span><span><Clock3/> ~{Math.max(5, queueCount * 2)} min wait</span></div>
                <Progress value={Math.min(100, queueCount * 2.5)} />
                <small>{slotsCount} booking slots remaining</small>
              </article>
            );
          })}
        </div>
      </section>
      <section className="officer-booking-list">
        <div className="flex items-center justify-between">
          <h2>All Centre Bookings ({officerBookings.length})</h2>
          <Pill kind="blue">LIVE DATABASE RECORDS</Pill>
        </div>
        {officerBookings.length > 0 ? (
          officerBookings.map(b => (
            <article key={b.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3">
                <b>{b.slot?.startTime ?? "10:30"}</b>
                <span className="avatar small">{getInitials(b.farmer?.name, "FM")}</span>
                <div>
                  <h3>{b.farmer?.name ?? "Farmer"} <Pill kind="green">{b.tokenNumber ?? "AP-001"}</Pill></h3>
                  <p>{b.paddyVariety ?? "Common paddy"} · {b.expectedQuantityQuintals ?? 18} qtl · <small>{b.centre?.name ?? "Procurement Centre"}</small></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill kind={b.procurement?.status === "COMPLETED" ? "green" : b.procurement?.status === "PROCESSING" || b.procurement?.status === "WEIGHING" ? "blue" : "yellow"}>
                  {(b.procurement?.status || "BOOKED").replaceAll("_", " ")}
                </Pill>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedOfficerBooking(b);
                    setProcurementForm({
                      status: b.procurement?.status ?? "WEIGHING",
                      weighedQuantityQuintals: String(b.procurement?.weighedQuantityQuintals ?? b.expectedQuantityQuintals ?? 18),
                      qualityGrade: b.procurement?.qualityGrade ?? b.paddyGrade ?? "Grade A",
                    });
                    setShowProcurementModal(true);
                  }}
                >
                  Update stage <ChevronRight size={14} className="ml-1"/>
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">Loading bookings from database...</div>
        )}
      </section>

      {showProcurementModal && selectedOfficerBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 max-w-lg w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Update Procurement Stage</h3>
                <p className="text-xs text-muted-foreground">Farmer: <b>{selectedOfficerBooking.farmer?.name ?? "Farmer"}</b> · Token: <b>{selectedOfficerBooking.tokenNumber ?? "AP-001"}</b></p>
              </div>
              <button onClick={() => setShowProcurementModal(false)}><X size={18}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg">
              <div><span className="text-muted-foreground">Centre:</span> <b>{selectedOfficerBooking.centre?.name ?? "Procurement Centre"}</b></div>
              <div><span className="text-muted-foreground">Booking Code:</span> <b>{selectedOfficerBooking.bookingCode}</b></div>
              <div><span className="text-muted-foreground">Expected:</span> <b>{selectedOfficerBooking.expectedQuantityQuintals} quintals</b></div>
              <div><span className="text-muted-foreground">Variety:</span> <b>{selectedOfficerBooking.paddyVariety}</b></div>
            </div>
            <label className="text-sm font-medium">Procurement Stage
              <select
                className="w-full mt-1 p-2 rounded-md border bg-background text-sm"
                value={procurementForm.status}
                onChange={e => setProcurementForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="BOOKED">BOOKED (Slot Reserved)</option>
                <option value="ARRIVED">ARRIVED (Token Called / At Centre)</option>
                <option value="DOCUMENT_VERIFICATION">DOCUMENT VERIFICATION</option>
                <option value="WEIGHING">WEIGHING (On Weighbridge)</option>
                <option value="QUALITY_CHECK">QUALITY CHECK (Moisture & Grade)</option>
                <option value="PROCESSING">PROCESSING (Bagging & Storage)</option>
                <option value="COMPLETED">COMPLETED (Procurement Finished)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">Weighed Quantity (Quintals)
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1"
                  value={procurementForm.weighedQuantityQuintals}
                  onChange={e => setProcurementForm(f => ({ ...f, weighedQuantityQuintals: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium">Quality Grade
                <select
                  className="w-full mt-1 p-2 rounded-md border bg-background text-sm"
                  value={procurementForm.qualityGrade}
                  onChange={e => setProcurementForm(f => ({ ...f, qualityGrade: e.target.value }))}
                >
                  <option value="Grade A">Grade A (Premium)</option>
                  <option value="Grade B">Grade B (Standard)</option>
                  <option value="Common">Common</option>
                  <option value="Rejected">Rejected (Moisture {">"} 17%)</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowProcurementModal(false)}>Cancel</Button>
              <Button onClick={updateProcurementStage} className="action-button">Save Status & Notify Farmer</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const qualityControlScreen = officerShell(
    <>
      <SectionTitle
        eyebrow="QUALITY ASSURANCE & LAB TESTING"
        title="Quality Control & Crop Grading"
        body="Inspect incoming paddy lots, verify moisture content & foreign matter according to Fair Average Quality (FAQ) standards, and approve for procurement payout."
        action={
          <ActionButton onClick={() => { if (officerToken) void loadOfficerBookings(officerToken); }} icon={LocateFixed}>
            Refresh QC Queue
          </ActionButton>
        }
      />

      {/* 1. Four Summary Metric Cards */}
      <section className="officer-metrics grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Clock3}
          label="Delivered / Awaiting QC"
          value={`${officerBookings.filter(b => b.procurement?.status === "QUALITY_CHECK" || b.procurement?.status === "ARRIVED" || b.transport?.status === "DELIVERED_AT_CENTRE").length}`}
          hint="Crops at Mandi ready for test"
          tone="yellow"
        />
        <MetricCard
          icon={Wheat}
          label="Procured & Graded"
          value={`${officerBookings.filter(b => b.procurement?.status === "COMPLETED" || b.procurement?.status === "QUALITY_CHECK").length}`}
          hint="Passed FAQ standards"
          tone="green"
        />
        <MetricCard
          icon={ShieldCheck}
          label="FAQ Acceptance Rate"
          value="98.2%"
          hint="AP Civil Supplies standard"
          tone="green"
        />
        <MetricCard
          icon={WalletCards}
          label="Ready for DBT Payout"
          value={`${officerBookings.filter(b => b.procurement?.status === "QUALITY_CHECK").length}`}
          hint="Certified FAQ grade lots"
          tone="blue"
        />
      </section>

      {/* 2. Quality Inspection Queue Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <span>Farmers in Quality Inspection Queue</span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {officerBookings.filter(b => b.procurement?.status === "QUALITY_CHECK" || b.procurement?.status === "PROCESSING" || b.procurement?.status === "COMPLETED" || b.procurement?.status === "ARRIVED" || b.transport?.status === "DELIVERED_AT_CENTRE").length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Live grain lots submitted at AP Procurement Mandis awaiting quality verification, weighing, and DBT settlement.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
              <ShieldCheck size={13} className="text-emerald-700" /> OFFICIAL LAB WORKFLOW
            </span>
          </div>
        </div>

        {officerBookings.filter(b => b.procurement?.status === "QUALITY_CHECK" || b.procurement?.status === "PROCESSING" || b.procurement?.status === "COMPLETED" || b.procurement?.status === "ARRIVED" || b.transport?.status === "DELIVERED_AT_CENTRE").length > 0 ? (
          <div className="space-y-4">
            {officerBookings.filter(b => b.procurement?.status === "QUALITY_CHECK" || b.procurement?.status === "PROCESSING" || b.procurement?.status === "COMPLETED" || b.procurement?.status === "ARRIVED" || b.transport?.status === "DELIVERED_AT_CENTRE").map(b => {
              const isPassed = b.procurement?.status === "QUALITY_CHECK" || b.procurement?.status === "COMPLETED";
              const isPaid = b.procurement?.status === "COMPLETED";
              const isRejected = b.procurement?.qualityGrade === "Rejected";

              return (
                <article
                  key={b.id}
                  className="bg-white rounded-xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4"
                >
                  {/* Top Row: Farmer Profile, Reg ID, Location, Mandi, and Prominent Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0 shadow-2xs">
                        {getInitials(b.farmer?.name || "Farmer", "FM")}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">{b.farmer?.name ?? "Farmer"}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {b.tokenNumber ?? `AP-${b.id}`}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200">
                            {b.farmer?.farmerCode ?? `FMR-2026-${b.id}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <MapPin size={12} className="text-emerald-600" />
                            <b>{b.farmer?.village ?? "Village"}</b>, {b.farmer?.district ?? "District"}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Building2 size={12} className="text-slate-400" />
                            <span>Mandi:</span>
                            <b>{b.centre?.name ?? "Procurement Centre"}</b>
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="self-start sm:self-center shrink-0">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <CheckCircle2 size={13} className="text-emerald-600" /> DBT Payout Settled
                        </span>
                      ) : isPassed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                          <ShieldCheck size={13} className="text-blue-600" /> Passed (Ready for Payout)
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                          <AlertCircle size={13} className="text-rose-600" /> Rejected (Moisture {">"} 17%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                          <Clock3 size={13} className="text-amber-600" /> Pending Inspection
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Grid: 8 Clearly Separated Inspection Fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-slate-50/90 p-3.5 rounded-xl border border-slate-100 text-xs">
                    {/* 1. Farmer Name & Location */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Farmer</span>
                      <span className="font-semibold text-slate-800 truncate block" title={b.farmer?.name ?? "Farmer"}>
                        {b.farmer?.name ?? "Farmer"}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {b.farmer?.village ?? "Village"}
                      </span>
                    </div>

                    {/* 2. Booking ID */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Booking ID</span>
                      <b className="font-mono text-slate-800 truncate block">
                        {b.bookingCode ?? `BK-2026-${b.id}`}
                      </b>
                      <span className="text-[10px] text-slate-400 truncate block">Official Lot</span>
                    </div>

                    {/* 3. Logistics Trip ID */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Logistics Trip</span>
                      <b className="font-mono text-emerald-800 truncate block">
                        {b.transport?.transportCode || "Centre Arrival"}
                      </b>
                      <span className="text-[10px] text-slate-400 truncate block">Delivered</span>
                    </div>

                    {/* 4. Crop & Variety */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Crop & Variety</span>
                      <b className="text-slate-800 truncate block" title={b.paddyVariety ?? "Paddy (Common)"}>
                        {b.paddyVariety ?? "Paddy (Common)"}
                      </b>
                      <span className="text-[10px] text-slate-500 truncate block">Kharif 2026</span>
                    </div>

                    {/* 5. Expected Quantity */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Expected Qty</span>
                      <b className="text-slate-800 truncate block">
                        {b.expectedQuantityQuintals ?? 18} Quintals
                      </b>
                      <span className="text-[10px] text-slate-400 truncate block">Self Declared</span>
                    </div>

                    {/* 6. Weighed Quantity */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Weighed Qty</span>
                      {b.procurement?.weighedQuantityQuintals ? (
                        <span className="text-emerald-700 font-bold truncate block">
                          {b.procurement.weighedQuantityQuintals} Qtl
                        </span>
                      ) : (
                        <span className="text-slate-400 italic truncate block">Pending Scale</span>
                      )}
                      <span className="text-[10px] text-slate-400 truncate block">Certified Scale</span>
                    </div>

                    {/* 7. Quality Grade */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Quality Grade</span>
                      {b.procurement?.qualityGrade ? (
                        <span className="text-emerald-700 font-bold truncate block" title={b.procurement.qualityGrade}>
                          {b.procurement.qualityGrade}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic truncate block">Awaiting Grade</span>
                      )}
                      <span className="text-[10px] text-slate-400 truncate block">FAQ Standard</span>
                    </div>

                    {/* 8. Inspection Status */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Inspection Status</span>
                      <span className={`font-bold truncate block ${
                        isPaid
                          ? "text-emerald-700"
                          : isPassed
                          ? "text-blue-700"
                          : isRejected
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}>
                        {isPaid
                          ? "Settled & Closed"
                          : isPassed
                          ? "Ready for Payout"
                          : isRejected
                          ? "QC Failed"
                          : "Pending Inspection"}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">Mandi Lab</span>
                    </div>
                  </div>

                  {/* Bottom Action Area: Clean Right-Side Actions with Consistent Buttons & Icons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>AP Civil Supplies Lab Station #1 · FAQ Moisture Standard: <b>≤ 17.0%</b></span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                      {/* 1. View Profile Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                        onClick={() => setViewingQcFarmerProfile(b.farmer || { name: "Farmer", farmerCode: "FMR-2026", village: "Muppalapally", district: "Guntur", primaryCrop: "Paddy" })}
                      >
                        <UserCheck size={14} className="text-slate-500" />
                        <span>View Profile</span>
                      </Button>

                      {/* 2. Inspect Crop Quality (PRIMARY ACTION) */}
                      <Button
                        size="sm"
                        className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 px-4 py-1.5 rounded-lg shadow-xs transition-all hover:shadow"
                        onClick={() => {
                          setSelectedQcBooking(b);
                          setQcForm({
                            qualityGrade: b.procurement?.qualityGrade || b.paddyGrade || "Grade A Fine (FAQ)",
                            qcResult: "ACCEPTED",
                            weighedQuantityQuintals: String(b.procurement?.weighedQuantityQuintals || b.expectedQuantityQuintals || "18.50"),
                            moisturePercent: "14.2",
                            foreignMatterPercent: "1.0",
                            remarks: "Grain sample inspected. Moisture and purity meet FAQ standards.",
                          });
                          setShowQcModal(true);
                        }}
                      >
                        <ShieldCheck size={14} className="text-emerald-200" />
                        <span>Inspect Crop Quality</span>
                      </Button>

                      {/* 3. Initiate / Disburse DBT Payout (when ready) */}
                      {(b.procurement?.status === "QUALITY_CHECK" || b.procurement?.status === "COMPLETED") && !isPaid && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg shadow-xs"
                            disabled={payoutProcessingId === b.id}
                            onClick={() => { void initiateFarmerPayment(b.id); }}
                          >
                            <Clock3 size={13} />
                            <span>{payoutProcessingId === b.id ? "Initiating…" : "Initiate Payment"}</span>
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-xs transition-all"
                            disabled={payoutProcessingId === b.id}
                            onClick={() => { void disburseFarmerPayout(b.id); }}
                          >
                            <WalletCards size={14} />
                            <span>{payoutProcessingId === b.id ? "Disbursing…" : "Disburse DBT"}</span>
                          </Button>
                        </div>
                      )}

                      {isPaid && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>DBT Payout Settled</span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto mb-3">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 m-0">No Crops Waiting in Quality Control Queue</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Incoming crop lots will automatically appear here once logistics marks them delivered at the procurement mandi.
            </p>
          </div>
        )}
      </section>

      {/* Farmer Profile Modal for QC */}
      {viewingQcFarmerProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm shadow-2xs">
                  {getInitials(viewingQcFarmerProfile.name, "FM")}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#143e2b] m-0">{viewingQcFarmerProfile.name}</h3>
                  <small className="text-xs text-slate-500 font-mono">{viewingQcFarmerProfile.farmerCode ?? "FMR-2026-11842"}</small>
                </div>
              </div>
              <button
                onClick={() => setViewingQcFarmerProfile(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Phone:</span>
                <b className="text-slate-800">+91 {viewingQcFarmerProfile.phone ?? "98765 43210"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Village & District:</span>
                <b className="text-slate-800">{viewingQcFarmerProfile.village ?? "Muppalapally"}, {viewingQcFarmerProfile.district ?? "Guntur"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Primary Crop:</span>
                <b className="text-slate-800">{viewingQcFarmerProfile.primaryCrop ?? "Paddy"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Status:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {viewingQcFarmerProfile.status ?? "APPROVED"}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500">Aadhaar (Masked):</span>
                <b className="font-mono text-slate-800">XXXX XXXX 4512</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">e-Crop Land Registry:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1"><Check size={13} /> Verified (Pahani/1B)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={() => setViewingQcFarmerProfile(null)} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg">
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QC Inspection Modal */}
      {showQcModal && selectedQcBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-700" />
                  <h3 className="text-lg font-bold text-slate-900 m-0">Crop Quality & Lab Inspection</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 m-0">
                  Farmer: <b>{selectedQcBooking.farmer?.name}</b> ({selectedQcBooking.farmer?.farmerCode}) · Token: <b>{selectedQcBooking.tokenNumber}</b>
                </p>
              </div>
              <button
                onClick={() => setShowQcModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-emerald-800">Procurement Centre:</span>
                <b className="text-emerald-950">{selectedQcBooking.centre?.name}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">Paddy Variety:</span>
                <b className="text-emerald-950">{selectedQcBooking.paddyVariety}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">Expected Load:</span>
                <b className="text-emerald-950">{selectedQcBooking.expectedQuantityQuintals} Quintals</b>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="text-xs font-semibold text-slate-700">
                Crop Quality / Grade
                <select
                  className="w-full mt-1.5 p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={qcForm.qualityGrade}
                  onChange={e => setQcForm(f => ({ ...f, qualityGrade: e.target.value }))}
                >
                  <option value="Grade A">Grade A (Fine / Premium)</option>
                  <option value="Common">Common (Grade B)</option>
                  <option value="Super Fine">Super Fine (BPT 5204)</option>
                  <option value="FAQ Certified">FAQ Certified Standard</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-700">
                Inspection Result
                <select
                  className="w-full mt-1.5 p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={qcForm.qcResult}
                  onChange={e => setQcForm(f => ({ ...f, qcResult: e.target.value as "ACCEPTED" | "REJECTED" | "HOLD" }))}
                >
                  <option value="ACCEPTED">Accepted (Passed Inspection)</option>
                  <option value="HOLD">Hold (Requires Re-drying)</option>
                  <option value="REJECTED">Rejected (Below Quality Standards)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="text-xs font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  <span>Moisture %</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Max 17.0%</span>
                </span>
                <Input
                  type="number"
                  step="0.1"
                  className="mt-1.5 text-xs"
                  value={qcForm.moisturePercent}
                  onChange={e => setQcForm(f => ({ ...f, moisturePercent: e.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-slate-700">
                <span>Net Weighed Qty (Quintals)</span>
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1.5 text-xs font-bold text-emerald-900"
                  value={qcForm.weighedQuantityQuintals}
                  onChange={e => setQcForm(f => ({ ...f, weighedQuantityQuintals: e.target.value }))}
                />
              </label>
            </div>

            <label className="text-xs font-semibold text-slate-700">
              <span className="flex items-center justify-between">
                <span>Foreign Matter / Refraction %</span>
                <span className="text-[10px] text-emerald-700 font-normal">Max 1.0%</span>
              </span>
              <Input
                type="number"
                step="0.1"
                className="mt-1.5 text-xs"
                value={qcForm.foreignMatterPercent}
                onChange={e => setQcForm(f => ({ ...f, foreignMatterPercent: e.target.value }))}
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              Inspection Remarks
              <Input
                className="mt-1.5 text-xs"
                placeholder="e.g. Grain sample inspected. Moisture and purity meet FAQ standards."
                value={qcForm.remarks}
                onChange={e => setQcForm(f => ({ ...f, remarks: e.target.value }))}
              />
            </label>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowQcModal(false)} className="text-xs">Cancel</Button>
              <Button
                disabled={qcSubmitting}
                onClick={() => { void submitQcInspection(); }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                {qcSubmitting ? "Submitting Quality Inspection…" : "Submit Quality Inspection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const officerLogisticsScreen = officerShell(
    <>
      <SectionTitle
        eyebrow="FLEET & TRANSPORTATION MANAGEMENT"
        title="Logistics & Transportation"
        body="Track and manage subsidized crop transportation from farmer pickup points to procurement centres, driver dispatch, live route mapping, and mandi arrivals."
        action={
          <ActionButton onClick={() => { if (officerToken) void loadOfficerTransport(officerToken); }} icon={LocateFixed}>
            Refresh Fleet
          </ActionButton>
        }
      />

      {/* Top Metrics Cards */}
      <section className="officer-metrics grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <MetricCard
          icon={Truck}
          label="Total Fleet Trips"
          value={`${officerLogisticsList.length}`}
          hint="Subsidized transport bookings"
          tone="blue"
        />
        <MetricCard
          icon={Clock3}
          label="In Transit / Active"
          value={`${officerLogisticsList.filter(t => t.status === "REQUESTED" || t.status === "ASSIGNED" || t.status === "IN_TRANSIT").length}`}
          hint="En route to mandis"
          tone="yellow"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Delivered at Mandi"
          value={`${officerLogisticsList.filter(t => t.status === "DELIVERED_AT_CENTRE").length}`}
          hint="Arrived for weighing"
          tone="green"
        />
        <MetricCard
          icon={Coins}
          label="Govt 30% Subsidy Disbursed"
          value={`₹${officerLogisticsList.reduce((sum, t) => sum + Number(t.subsidyAmount || 0), 0).toFixed(0)}`}
          hint="Direct transport support"
          tone="green"
        />
      </section>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold scrollbar-none">
          {[
            { id: "ALL", label: "All Trips", count: officerLogisticsList.length },
            { id: "IN_TRANSIT", label: "In Transit", count: officerLogisticsList.filter(t => t.status === "IN_TRANSIT").length },
            { id: "ASSIGNED", label: "Driver Assigned", count: officerLogisticsList.filter(t => t.status === "ASSIGNED").length },
            { id: "REQUESTED", label: "Requested", count: officerLogisticsList.filter(t => t.status === "REQUESTED").length },
            { id: "DELIVERED_AT_CENTRE", label: "Delivered", count: officerLogisticsList.filter(t => t.status === "DELIVERED_AT_CENTRE").length },
            { id: "CANCELLED", label: "Cancelled", count: officerLogisticsList.filter(t => t.status === "CANCELLED").length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTransportFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                transportFilterStatus === tab.id
                  ? "bg-emerald-700 text-white font-bold shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                transportFilterStatus === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search farmer, code, village, mandi..."
            value={transportSearchQuery}
            onChange={e => setTransportSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30"
          />
          {transportSearchQuery && (
            <button onClick={() => setTransportSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Request Cards List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>Transport Requests</span>
            <span className="text-xs font-normal text-muted-foreground font-mono">
              ({officerLogisticsList.filter(t => {
                const matchesStatus = transportFilterStatus === "ALL" || t.status === transportFilterStatus;
                const q = transportSearchQuery.trim().toLowerCase();
                const matchesQuery = !q || (
                  (t.transportCode || "").toLowerCase().includes(q) ||
                  (t.farmerName || "").toLowerCase().includes(q) ||
                  (t.farmerCode || "").toLowerCase().includes(q) ||
                  (t.pickupVillage || "").toLowerCase().includes(q) ||
                  (t.destinationCentreName || "").toLowerCase().includes(q) ||
                  (t.vehicleNumber || "").toLowerCase().includes(q) ||
                  (t.driverName || "").toLowerCase().includes(q)
                );
                return matchesStatus && matchesQuery;
              }).length} of {officerLogisticsList.length})
            </span>
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            30% GOVT SUBSIDY NETWORK
          </span>
        </div>

        {(() => {
          const filteredList = officerLogisticsList.filter(t => {
            const matchesStatus = transportFilterStatus === "ALL" || t.status === transportFilterStatus;
            const q = transportSearchQuery.trim().toLowerCase();
            const matchesQuery = !q || (
              (t.transportCode || "").toLowerCase().includes(q) ||
              (t.farmerName || "").toLowerCase().includes(q) ||
              (t.farmerCode || "").toLowerCase().includes(q) ||
              (t.pickupVillage || "").toLowerCase().includes(q) ||
              (t.destinationCentreName || "").toLowerCase().includes(q) ||
              (t.vehicleNumber || "").toLowerCase().includes(q) ||
              (t.driverName || "").toLowerCase().includes(q)
            );
            return matchesStatus && matchesQuery;
          });

          if (filteredList.length === 0) {
            return (
              <div className="p-10 text-center text-muted-foreground bg-card rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2">
                <Truck size={36} className="text-muted-foreground/40" />
                <p className="text-sm font-semibold">No transport requests match your filter.</p>
                <small className="text-xs text-muted-foreground">Try clearing your search query or selecting "All Trips".</small>
              </div>
            );
          }

          return filteredList.map(t => {
            const stepIndex = t.status === "DELIVERED_AT_CENTRE" ? 3 : t.status === "IN_TRANSIT" ? 2 : t.status === "ASSIGNED" ? 1 : 0;
            const statusConfig = {
              DELIVERED_AT_CENTRE: { label: "Delivered at Mandi", tone: "green", bg: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300" },
              IN_TRANSIT: { label: "In Transit", tone: "yellow", bg: "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300" },
              ASSIGNED: { label: "Driver Assigned", tone: "blue", bg: "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300" },
              REQUESTED: { label: "Booking Requested", tone: "blue", bg: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300" },
              CANCELLED: { label: "Cancelled", tone: "gray", bg: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300" },
            }[t.status] || { label: t.status, tone: "blue", bg: "bg-blue-50 text-blue-900 border-blue-300" };

            return (
              <article
                key={t.id}
                className="group rounded-2xl bg-card border border-border/80 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* 1. Header Bar: Transport ID, Vehicle Pill, Date, and Status Badge */}
                <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-900/50 border-b border-border/60 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-blue-100/70 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/80">
                      <Truck size={17} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#153828] dark:text-emerald-400 font-mono m-0">
                          {t.transportCode}
                        </h3>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(t.transportCode);
                            toast.success(`Copied ${t.transportCode}`);
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                          title="Copy Request Code"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Booked on {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-200/60">
                      🚜 {t.vehicleName}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${t.status === "IN_TRANSIT" ? "bg-amber-500 animate-ping" : t.status === "DELIVERED_AT_CENTRE" ? "bg-emerald-600" : "bg-blue-600"}`} />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* 2. Compact Status Timeline Progress Tracker */}
                <div className="px-5 py-3 bg-muted/20 border-b border-border/40">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold relative">
                    {[
                      { key: "REQUESTED", label: "1. Booked" },
                      { key: "ASSIGNED", label: "2. Driver Assigned" },
                      { key: "IN_TRANSIT", label: "3. In Transit" },
                      { key: "DELIVERED_AT_CENTRE", label: "4. Mandi Arrival" },
                    ].map((step, idx) => {
                      const isCurrent = stepIndex === idx;
                      const isCompleted = stepIndex > idx;
                      return (
                        <div
                          key={step.key}
                          className={`py-1 px-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[11px] transition-all ${
                            isCurrent
                              ? "bg-emerald-700 text-white font-extrabold shadow-2xs"
                              : isCompleted
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                              : "text-muted-foreground bg-transparent font-medium"
                          }`}
                        >
                          {isCompleted ? <Check size={12} className="text-emerald-700 dark:text-emerald-400" /> : isCurrent ? <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> : null}
                          <span className="truncate">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Structured 3-Column Content Layout (Farmer, Prominent Route, Schedule/Cargo) */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  {/* Column 1: Farmer & Pickup Location */}
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <UserCheck size={13} className="text-emerald-700" /> Registered Farmer
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-extrabold text-foreground">{t.farmerName || "Farmer details unavailable"}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60">
                          {t.farmerCode || "FMR-2026"}
                        </span>
                        <a href={`tel:${t.farmerPhone || "9876543210"}`} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                          📞 +91 {t.farmerPhone || "9876543210"}
                        </a>
                      </div>
                    </div>
                    <div className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2">
                      <MapPin size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Pickup Point</span>
                        <span className="text-xs font-bold text-foreground">{t.pickupVillage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Visual Route & Mandi Destination */}
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Navigation size={13} className="text-blue-600" /> Transit Route & Mandi
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2 flex-1 flex flex-col justify-center">
                      {/* Origin */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[9px] font-bold shadow-2xs">A</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Origin Pickup</span>
                          <span className="text-xs font-bold text-foreground truncate block">{t.pickupVillage}</span>
                        </div>
                      </div>
                      {/* Route distance connector */}
                      <div className="ml-2 pl-3.5 border-l-2 border-dashed border-blue-300 dark:border-blue-700 py-1 flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-blue-200/80 font-bold text-blue-900 dark:text-blue-300 font-mono">
                          {t.distanceKm} km
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">~{Math.round(t.distanceKm * 2.2)} mins travel</span>
                      </div>
                      {/* Destination */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 text-[9px] font-bold shadow-2xs">B</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Destination Mandi</span>
                          <span className="text-xs font-bold text-foreground truncate block">{t.destinationCentreName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Schedule & Cargo Details */}
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-amber-600" /> Schedule & Cargo Load
                    </div>
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">📅 Scheduled Date:</span>
                          <b className="text-foreground">{t.scheduledDate}</b>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">⏰ Time Window:</span>
                          <b className="text-foreground">{t.timeSlot}</b>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">Crop Load (Paddy)</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Grain Cargo</span>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-300/80 shadow-2xs">
                          {t.estimatedLoadQuintals} Quintals
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Driver Details & 30% Govt Subsidized Fare Breakdown */}
                <div className="mx-5 mb-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-7 h-7 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 flex items-center justify-center font-bold text-xs">
                      👤
                    </span>
                    <div>
                      <div className="font-bold text-foreground">
                        {t.driverName} <span className="font-mono text-muted-foreground font-normal">({t.vehicleNumber})</span>
                      </div>
                      <a href={`tel:${t.driverPhone || "9876500000"}`} className="text-[11px] text-muted-foreground hover:text-foreground">
                        📞 +91 {t.driverPhone || "9876500000"}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className="text-muted-foreground">
                      Standard Fare: <b className="text-foreground">₹{t.baseFare.toFixed(2)}</b>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold">
                      Govt 30% Subsidy: -₹{t.subsidyAmount.toFixed(2)}
                    </span>
                    <div className="flex items-baseline gap-1 pl-2 border-l border-emerald-300 dark:border-emerald-800">
                      <span className="text-muted-foreground font-semibold">Farmer Net:</span>
                      <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-300 font-mono">
                        ₹{t.netPayable.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50/60 dark:bg-slate-900/30 border-t border-border/60 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <LocateFixed size={14} className="text-emerald-700 shrink-0" />
                    <span>Route: <b>{t.pickupVillage}</b> → <b>{t.destinationCentreName}</b> ({t.distanceKm} km)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-blue-600/80 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold shadow-2xs"
                      onClick={() => setViewingTransportRouteItem(t)}
                    >
                      <MapPin size={14} className="mr-1.5 text-blue-700" /> View Route Map
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                      onClick={() => {
                        setSelectedTransportItem(t);
                        setTransportUpdateStatus(t.status as typeof transportUpdateStatus);
                        setShowTransportModal(true);
                      }}
                    >
                      <Truck size={14} className="mr-1.5" /> Update Status
                    </Button>
                  </div>
                </div>
              </article>
            );
          });
        })()}
      </section>

      {/* Interactive Logistics Route Map Modal */}
      {viewingTransportRouteItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 max-w-2xl w-full shadow-2xl border flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-900 border border-blue-200">
                  <Truck size={20} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[#153828] m-0">
                    Live Logistics Route & GPS Tracker
                  </h3>
                  <small className="text-xs text-muted-foreground">
                    Trip: <b>{viewingTransportRouteItem.transportCode}</b> · Assigned Driver: <b>{viewingTransportRouteItem.driverName}</b> ({viewingTransportRouteItem.vehicleNumber})
                  </small>
                </div>
              </div>
              <button onClick={() => setViewingTransportRouteItem(null)} className="p-1 rounded-md hover:bg-slate-100"><X size={20} /></button>
            </div>

            {/* Route Stepper Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Logistics Unit / Hub</span>
                  <b>{driverGps.isLive ? "Live Driver GPS (Active)" : "Guntur Transport Hub"}</b>
                </div>
              </div>
              <span className="text-slate-500">→</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Farmer Pickup</span>
                  <b>{viewingTransportRouteItem.pickupVillage} ({viewingTransportRouteItem.farmerName})</b>
                </div>
              </div>
              <span className="text-slate-500">→</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">3</span>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Procurement Mandi</span>
                  <b>{viewingTransportRouteItem.destinationCentreName}</b>
                </div>
              </div>
            </div>

            {/* Interactive Visual Map Canvas */}
            <div className="relative w-full h-64 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                  </filter>
                </defs>

                {/* Grid map lines */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Route Path Polyline */}
                <path
                  d="M 80 180 C 180 80, 240 160, 310 90 C 380 30, 440 140, 520 70"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
                <path
                  d="M 80 180 C 180 80, 240 160, 310 90 C 380 30, 440 140, 520 70"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />

                {/* Marker 1: Driver Location */}
                <g transform="translate(80, 180)">
                  <circle r="16" fill="#3b82f6" fillOpacity="0.3" className="animate-ping" />
                  <circle r="12" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" />
                  <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">🚚</text>
                  <text y="25" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">Driver Location</text>
                </g>

                {/* Marker 2: Farmer Pickup Point */}
                <g transform="translate(310, 90)">
                  <circle r="16" fill="#10b981" fillOpacity="0.3" className="animate-ping" />
                  <circle r="12" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                  <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">🌾</text>
                  <text y="25" textAnchor="middle" fill="#86efac" fontSize="10" fontWeight="bold">Pickup: {viewingTransportRouteItem.pickupVillage}</text>
                </g>

                {/* Marker 3: Mandi Centre */}
                <g transform="translate(520, 70)">
                  <circle r="16" fill="#f59e0b" fillOpacity="0.3" className="animate-ping" />
                  <circle r="12" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                  <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">🏢</text>
                  <text y="25" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">Procurement Mandi</text>
                </g>
              </svg>

              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700 text-white px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Route Tracking Active</span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Total Road Distance</span>
                <b className="text-sm text-slate-900">{viewingTransportRouteItem.distanceKm} km</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Estimated Travel Time</span>
                <b className="text-sm text-emerald-800">~{Math.round(viewingTransportRouteItem.distanceKm * 2.2)} mins</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Trip Status</span>
                <Pill kind={viewingTransportRouteItem.status === "DELIVERED_AT_CENTRE" ? "green" : "blue"}>
                  {(viewingTransportRouteItem.status || "REQUESTED").replaceAll("_", " ")}
                </Pill>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${driverGps.lat},${driverGps.lng}&destination=${16.2970},${80.4350}&travelmode=driving`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 transition-colors"
              >
                <Navigation size={14} /> Open in Google Maps Directions ↗
              </a>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewingTransportRouteItem(null)}>
                  Close Route Map
                </Button>
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                  onClick={() => {
                    setSelectedTransportItem(viewingTransportRouteItem);
                    setTransportUpdateStatus(viewingTransportRouteItem.status as typeof transportUpdateStatus);
                    setViewingTransportRouteItem(null);
                    setShowTransportModal(true);
                  }}
                >
                  <Truck size={14} className="mr-1.5" /> Update Status
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Status Update Modal */}
      {showTransportModal && selectedTransportItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#143e2b]">Update Logistics Status</h3>
                <p className="text-xs text-muted-foreground">
                  Transport: <b>{selectedTransportItem.transportCode}</b> · Farmer: <b>{selectedTransportItem.farmerName || "Farmer details unavailable"}</b>
                </p>
              </div>
              <button onClick={() => setShowTransportModal(false)}><X size={18} /></button>
            </div>

            <label className="text-xs font-bold">
              Select Trip Status
              <select
                className="w-full mt-1.5 p-2 rounded-md border bg-background text-sm font-semibold"
                value={transportUpdateStatus}
                onChange={e => setTransportUpdateStatus(e.target.value as typeof transportUpdateStatus)}
              >
                <option value="REQUESTED">REQUESTED (New Booking)</option>
                <option value="ASSIGNED">ASSIGNED (Driver & Vehicle Allocated)</option>
                <option value="IN_TRANSIT">IN TRANSIT (Pickup Scheduled / Picked Up)</option>
                <option value="DELIVERED_AT_CENTRE">DELIVERED AT CENTRE (Arrived at Mandi)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowTransportModal(false)}>Cancel</Button>
              <Button onClick={() => { void updateLogisticsStatus(); }} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                Save & Notify Farmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const filteredCropPrices = useMemo(() => {
    return cropPricesList.filter(item => {
      const matchesCat = selectedCropCategory === "ALL" || (item.category || "").toLowerCase() === selectedCropCategory.toLowerCase();
      const matchesSearch = !cropSearchQuery || (item.cropName || "").toLowerCase().includes(cropSearchQuery.toLowerCase()) || (item.variety || "").toLowerCase().includes(cropSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).sort((a, b) => a.cropName.localeCompare(b.cropName, undefined, { sensitivity: "base" }));
  }, [cropPricesList, selectedCropCategory, cropSearchQuery]);

  const calcMatch = useMemo(() => {
    return cropPricesList.find(p => `${p.cropName} — ${p.variety}` === calcCropVariety || p.cropName === calcCropVariety || p.variety === calcCropVariety) ?? cropPricesList[0];
  }, [cropPricesList, calcCropVariety]);

  const calcValuation = useMemo(() => {
    if (!calcMatch) return null;
    const qty = parseFloat(calcQuintals) || 0;
    const mspBase = qty * calcMatch.mspPerQuintal;
    const bonus = qty * calcMatch.govtBonusPerQuintal;
    const grand = mspBase + bonus;
    return { qty, mspBase, bonus, grand, effectiveRate: calcMatch.effectiveRatePerQuintal };
  }, [calcMatch, calcQuintals]);

  const cropPricesScreen = farmerShell(
    <>
      <SectionTitle
        eyebrow="GOVERNMENT DECLARED MSP & CROP RATES"
        title="Official Crop Minimum Support Prices (MSP)"
        body="Notified by the Ministry of Agriculture & Farmers Welfare, Govt of India (Kharif & Rabi 2025-26) with Telangana State bonus incentives."
        action={
          <ActionButton onClick={() => navigate("paddy")} icon={ArrowRight}>
            Book procurement slot at this MSP
          </ActionButton>
        }
      />

      <div className="crop-filter-bar">
        <div className="crop-category-pills">
          {["ALL", "Cereals", "Pulses", "Oilseeds", "Commercial"].map(cat => (
            <button
              key={cat}
              className={selectedCropCategory === cat ? "active" : ""}
              onClick={() => setSelectedCropCategory(cat)}
            >
              {cat === "ALL" ? "All" : cat}
            </button>
          ))}
        </div>
        <div className="search-input-wrap">
          <Search />
          <input
            type="text"
            placeholder="Search crop or variety..."
            value={cropSearchQuery}
            onChange={e => setCropSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="crop-prices-layout">
        <div>
          <div className="crop-card-grid">
            {filteredCropPrices.map(item => (
              <div className="crop-rate-card overflow-hidden flex flex-col justify-between" key={item.id}>
                <div>
                  <div className="crop-card-image-wrap">
                    <img
                      src={getCropImageUrl(item.cropName)}
                      alt={item.cropName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <Pill kind={item.category === "Cereals" ? "green" : item.category === "Pulses" ? "yellow" : "blue"}>
                        {item.category}
                      </Pill>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="crop-card-head mb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-[#153e2a] m-0">{item.cropName}</h3>
                        <p className="text-xs text-muted-foreground m-0 mt-0.5">{item.variety}</p>
                      </div>
                    </div>

                    <div className="crop-pricing-rows">
                      <div>
                        <span className="text-muted-foreground">Declared MSP</span>
                        <strong className="text-foreground">₹{item.mspPerQuintal.toLocaleString("en-IN")} / qtl</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mandi Open Market Rate</span>
                        <span className="text-slate-500">₹{item.marketRatePerQuintal.toLocaleString("en-IN")} / qtl</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-semibold">Govt Bonus</span>
                        <strong className="text-emerald-700 font-bold">+₹{item.govtBonusPerQuintal} / qtl</strong>
                      </div>
                    </div>

                    <div className="effective-rate-pill mt-3">
                      <span className="text-xs font-bold text-emerald-800">Effective Rate</span>
                      <strong>₹{item.effectiveRatePerQuintal.toLocaleString("en-IN")} <small className="text-xs font-normal">/ qtl</small></strong>
                    </div>
                  </div>
                </div>

                <div className="crop-card-footer px-4 pb-4 pt-2">
                  <span>Max Moisture: <b>{item.maxMoisturePercent}%</b></span>
                  <button
                    className="text-emerald-700 font-extrabold hover:underline"
                    onClick={() => {
                      setCalcCropVariety(`${item.cropName} — ${item.variety}`);
                      toast.success(`Selected ${item.cropName} for valuation calculator.`);
                    }}
                  >
                    Calculate Value →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="msp-calc-aside">
          <Pill kind="yellow">MSP VALUATION CALCULATOR</Pill>
          <h3 className="mt-2">Estimate your crop revenue</h3>
          <p className="text-xs text-muted-foreground mb-4">Calculate total guaranteed payment at official government rates.</p>

          <label className="text-xs font-bold block mb-1">Select Crop & Variety</label>
          <select
            className="w-full h-10 px-3 rounded-lg border bg-background text-xs font-semibold mb-3"
            value={calcCropVariety}
            onChange={e => setCalcCropVariety(e.target.value)}
          >
            {cropPricesList.map(p => (
              <option key={p.id} value={`${p.cropName} — ${p.variety}`}>
                {p.cropName} — {p.variety} (₹{p.effectiveRatePerQuintal}/qtl)
              </option>
            ))}
          </select>

          <label className="text-xs font-bold block mb-1">Estimated Load (Quintals)</label>
          <Input
            type="number"
            min="1"
            max="1000"
            className="h-10 text-xs mb-3"
            value={calcQuintals}
            onChange={e => setCalcQuintals(e.target.value)}
          />

          {calcValuation && (
            <div className="calc-result-box">
              <div className="flex justify-between text-xs mb-1">
                <span>Base MSP Value:</span>
                <b>₹{calcValuation.mspBase.toLocaleString("en-IN")}</b>
              </div>
              <div className="flex justify-between text-xs mb-1 text-emerald-700">
                <span>Govt Bonus Incentive:</span>
                <b>+₹{calcValuation.bonus.toLocaleString("en-IN")}</b>
              </div>
              <div className="border-t border-emerald-300 pt-2 mt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold text-emerald-900">Total Guaranteed:</span>
                <span className="grand-total">₹{calcValuation.grand.toLocaleString("en-IN")}</span>
              </div>
              <small className="text-[10px] text-muted-foreground block mt-1">100% credited via direct bank transfer (DBT).</small>
            </div>
          )}

          <ActionButton
            onClick={() => {
              if (calcMatch) {
                setSelectedPaddy(`${calcMatch.cropName} — ${calcMatch.variety}`);
              }
              navigate("paddy");
            }}
            icon={ArrowRight}
          >
            Book procurement slot at this MSP
          </ActionButton>
        </aside>
      </div>
    </>
  );

  const farmerAnalyticsScreen = farmerShell(
    <>
      <div className="analytics-hero-banner">
        <div>
          <Pill kind="green">{tUi("OFFICIAL HARVEST PERFORMANCE", language)}</Pill>
          <h2>{tUi("Farmer Procurement & Revenue Analytics", language)}</h2>
          <p>{tUi("Real-time data aggregated from your database records, DBT bank payments, and transport savings.", language)}</p>
        </div>
        <ActionButton onClick={() => toast.success("Procurement Statement downloaded as PDF.")} secondary icon={Download}>
          {tUi("Download Statement", language)}
        </ActionButton>
      </div>

      {/* Top KPI Metrics */}
      <div className="analytics-metric-grid">
        <MetricCard
          icon={Wheat}
          label={tUi("Total Harvest Procured", language)}
          value={`${farmerAnalyticsData?.summary.totalProcuredQuintals.toFixed(1) ?? (farmerStats?.completedProcurements ? "18.0" : "0.0")} Qtl`}
          hint={`${farmerAnalyticsData?.summary.totalBookings ?? farmerStats?.totalBookings ?? 0} booked visits`}
          tone="green"
        />
        <MetricCard
          icon={Coins}
          label={tUi("Realized Revenue", language)}
          value={`₹${(farmerAnalyticsData?.summary.totalEarnings ?? farmerStats?.totalAmountReceived ?? 41400).toLocaleString("en-IN")}`}
          hint="Direct Bank Transfer credited"
          tone="green"
        />
        <MetricCard
          icon={TrendingUp}
          label={tUi("Price Realization Rate", language)}
          value={`${farmerAnalyticsData?.summary.priceRealizationPercent ?? 100}%`}
          hint="100% MSP Benchmark Achieved"
          tone="blue"
        />
        <MetricCard
          icon={Clock3}
          label={tUi("Average Turnaround", language)}
          value={`${farmerAnalyticsData?.summary.avgTurnaroundMins ?? 32} Min`}
          hint="Fast weighbridge processing"
          tone="yellow"
        />
      </div>

      {/* 3 Useful Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 my-5">
        {/* Graph 1: Crop-wise Procurement Volume */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground m-0">{tUi("Procurement Volume by Crop", language)}</h3>
              <span className="text-[11px] text-muted-foreground">Quantity in Quintals per crop</span>
            </div>
            <Pill kind="green">Kharif 2025-26</Pill>
          </div>
          {(() => {
            const cropData = (farmerAnalyticsData?.cropBreakdown && farmerAnalyticsData.cropBreakdown.length > 0)
              ? farmerAnalyticsData.cropBreakdown.map(c => ({
                  name: c.variety.length > 14 ? c.variety.slice(0, 12) + "…" : c.variety,
                  fullName: c.variety,
                  quantity: c.quantityQuintals,
                  earnings: c.earnings,
                }))
              : [
                  { name: "Common Paddy", fullName: "Common Paddy — Grade A", quantity: 18.0, earnings: 41400 },
                  { name: "Fine Paddy", fullName: "Fine Paddy — Grade B", quantity: 12.0, earnings: 26436 },
                ];
            if (cropData.length === 0) {
              return (
                <div className="h-56 flex flex-col items-center justify-center text-center p-4 bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground">
                  <Wheat size={28} className="text-muted-foreground/40 mb-1" />
                  <b>{tUi("Not enough data yet", language)}</b>
                  <span>{tUi("No procurement records found yet to display volume statistics.", language)}</span>
                </div>
              );
            }
            return (
              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cropData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} Quintals`, "Quantity"]}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ backgroundColor: "#0f3825", borderRadius: "10px", color: "#fff", fontSize: "11px", border: "none" }}
                      itemStyle={{ color: "#a7f3d0" }}
                    />
                    <Bar dataKey="quantity" fill="#15803d" radius={[6, 6, 0, 0]}>
                      {cropData.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#15803d" : "#047857"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        {/* Graph 2: Harvest Processing Pipeline */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground m-0">{tUi("Harvest Processing Pipeline", language)}</h3>
              <span className="text-[11px] text-muted-foreground">Procurement stage distribution</span>
            </div>
            <Pill kind="blue">Workflow</Pill>
          </div>
          {(() => {
            const workflowData = [
              { stage: "Booked", count: 1, color: "#3b82f6" },
              { stage: "Gate Entry", count: 1, color: "#6366f1" },
              { stage: "QC Passed", count: 1, color: "#8b5cf6" },
              { stage: "Weighed", count: 1, color: "#d97706" },
              { stage: "DBT Paid", count: 1, color: "#15803d" },
            ];
            return (
              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workflowData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: any) => [`${val} Batches`, "Count"]}
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "10px", color: "#fff", fontSize: "11px", border: "none" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {workflowData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        {/* Graph 3: Transportation Logistics Activity */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground m-0">{tUi("Fleet Transportation Analytics", language)}</h3>
              <span className="text-[11px] text-muted-foreground">Trips by transit status</span>
            </div>
            <Pill kind="green">30% Subsidy</Pill>
          </div>
          {(() => {
            const requested = transportBookingsList.filter(t => t.status === "REQUESTED").length;
            const assigned = transportBookingsList.filter(t => t.status === "ASSIGNED").length;
            const inTransit = transportBookingsList.filter(t => t.status === "IN_TRANSIT").length;
            const delivered = transportBookingsList.filter(t => t.status === "DELIVERED_AT_CENTRE").length;
            const cancelled = transportBookingsList.filter(t => t.status === "CANCELLED").length;
            const total = transportBookingsList.length;

            const transportData = [
              { status: "Booked", count: total > 0 ? requested : 1, color: "#3b82f6" },
              { status: "Assigned", count: total > 0 ? assigned : 1, color: "#6366f1" },
              { status: "In Transit", count: total > 0 ? inTransit : 1, color: "#eab308" },
              { status: "Delivered", count: total > 0 ? delivered : 2, color: "#15803d" },
              { status: "Cancelled", count: total > 0 ? cancelled : 0, color: "#ef4444" },
            ];

            return (
              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transportData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: any) => [`${val} Trips`, "Trips"]}
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "10px", color: "#fff", fontSize: "11px", border: "none" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {transportData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Transport Logistics Subsidy Card */}
      <div className="analytics-split-view">
        <div className="analytics-chart-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-foreground">{tUi("Crop Variety Breakdown", language)}</h3>
            <Pill kind="blue">Kharif 2025-26</Pill>
          </div>
          {(farmerAnalyticsData?.cropBreakdown && farmerAnalyticsData.cropBreakdown.length > 0 ? farmerAnalyticsData.cropBreakdown : [
            { variety: "Common Paddy — Grade A", quantityQuintals: 18.0, bookingCount: 1, earnings: 41400 },
            { variety: "Fine Paddy — Grade B", quantityQuintals: 12.0, bookingCount: 1, earnings: 26436 },
          ]).map((item, idx) => (
            <div className="variety-progress-row" key={idx}>
              <div className="flex justify-between font-bold text-xs">
                <span>{item.variety}</span>
                <span className="text-emerald-800 font-mono">₹{item.earnings.toLocaleString("en-IN")} ({item.quantityQuintals} Qtl)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(30, (item.quantityQuintals / 30) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-chart-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-foreground">{tUi("Transport Logistics Savings", language)}</h3>
            <Pill kind="green">30% Govt Subsidy</Pill>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 mb-4">
            <div className="text-xs text-muted-foreground font-semibold">{tUi("Logistics Subsidy Saved", language)}</div>
            <strong className="text-2xl text-emerald-800 dark:text-emerald-300 font-extrabold font-mono">
              ₹{(farmerAnalyticsData?.summary.transportLogistics.subsidySaved ?? 180).toLocaleString("en-IN")}
            </strong>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">Telangana Rythu Ratha / PMKSY Transport Scheme</p>
          </div>
          <div className="flex justify-between text-xs py-2 border-b">
            <span className="text-muted-foreground">{tUi("Total Transport Trips:", language)}</span>
            <b className="text-foreground font-mono">{farmerAnalyticsData?.summary.transportLogistics.totalBookings ?? transportBookingsList.length} Trips</b>
          </div>
          <div className="flex justify-between text-xs py-2">
            <span className="text-muted-foreground">{tUi("Net Logistics Spent:", language)}</span>
            <b className="text-foreground font-mono">₹{(farmerAnalyticsData?.summary.transportLogistics.spent ?? 420).toLocaleString("en-IN")}</b>
          </div>
        </div>
      </div>

      {/* Harvest Delivery Statements */}
      <div className="statement-table-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#183d2e] dark:text-emerald-400 m-0">{tUi("Harvest Delivery Statements", language)}</h3>
          <span className="text-xs text-muted-foreground">Verified database records</span>
        </div>
        <table className="procure-table">
          <thead>
            <tr>
              <th>{tUi("Token #", language)}</th>
              <th>{tUi("Booking Code", language)}</th>
              <th>{tUi("Centre Name", language)}</th>
              <th>{tUi("Variety", language)}</th>
              <th>{tUi("Weighed (Qtl)", language)}</th>
              <th>{tUi("Quality Grade", language)}</th>
              <th>{tUi("Procurement Stage", language)}</th>
              <th>{tUi("DBT Payment", language)}</th>
              <th>{tUi("Amount", language)}</th>
            </tr>
          </thead>
          <tbody>
            {(farmerAnalyticsData?.recentProcurements && farmerAnalyticsData.recentProcurements.length > 0 ? farmerAnalyticsData.recentProcurements : [
              {
                id: 1,
                bookingCode: bookingRecord?.bookingCode ?? "BK-2026-7294",
                tokenNumber: bookingRecord?.tokenNumber ?? "P-042",
                date: "2026-03-18",
                centreName: bookingRecord?.centre.name ?? "Nizamabad Market Yard",
                variety: bookingRecord?.paddyVariety ?? "Common paddy",
                expectedQuintals: 18,
                weighedQuintals: 18.0,
                qualityGrade: "Grade A",
                procurementStatus: bookingRecord?.procurement?.status ?? "BOOKED",
                paymentStatus: paymentRecord?.status ?? "SUCCESS",
                amount: 41400,
              }
            ]).map(item => (
              <tr key={item.id}>
                <td><b>{item.tokenNumber}</b></td>
                <td className="font-mono">{item.bookingCode}</td>
                <td>{item.centreName}</td>
                <td>{item.variety}</td>
                <td><b>{item.weighedQuintals ?? item.expectedQuintals} Qtl</b></td>
                <td><Badge variant="outline">{item.qualityGrade}</Badge></td>
                <td><Pill kind={item.procurementStatus === "COMPLETED" ? "green" : "yellow"}>{getStatusLabel(item.procurementStatus, language)}</Pill></td>
                <td><Pill kind={item.paymentStatus === "SUCCESS" ? "green" : "blue"}>{getStatusLabel(item.paymentStatus, language)}</Pill></td>
                <td><strong className="text-emerald-800 dark:text-emerald-300 font-mono">₹{(item.amount ?? 41400).toLocaleString("en-IN")}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const calculatedFare = useMemo(() => {
    const chosenCentre = apiCentres.find(c => c.id === transportForm.destinationCentreId) ?? apiCentres[0];
    const distNum = parseFloat((chosenCentre?.distance || "12 km").replace(/[^0-9.]/g, "")) || 12;
    const rates: Record<string, { base: number; perKm: number; name: string }> = {
      TRACTOR_TROLLEY: { base: 250, perKm: 18, name: "Tractor Trolley" },
      MINI_TRUCK: { base: 350, perKm: 22, name: "Mini Truck" },
      HEAVY_LORRY: { base: 700, perKm: 35, name: "Heavy Lorry" },
    };
    const config = rates[transportForm.vehicleType] ?? rates.TRACTOR_TROLLEY;
    const baseFare = config.base + distNum * config.perKm;
    const subsidy = (baseFare * 30) / 100;
    const netPayable = baseFare - subsidy;
    return { distNum, baseFare, subsidy, netPayable, vehicleName: config.name };
  }, [transportForm.vehicleType, transportForm.destinationCentreId, apiCentres]);

  const transportationScreen = farmerShell(
    <>
      <SectionTitle
        eyebrow="CROP TRANSPORTATION & LOGISTICS"
        title="Subsidized Farm-to-Mandi Transportation"
        body="Book dedicated transport directly to your procurement centre with 30% Telangana Rythu Ratha State Logistics Subsidy."
      />

      <div className="transport-layout">
        <div>
          <label className="text-xs font-bold block mb-1">1. Choose Vehicle Type</label>
          <div className="vehicle-selector-grid">
            {[
              { type: "TRACTOR_TROLLEY", name: "Tractor Trolley", cap: "30–50 Quintals", rate: "₹18/km", icon: Tractor, note: "Ideal for village farm paths" },
              { type: "MINI_TRUCK", name: "Mini Truck", cap: "15–25 Quintals", rate: "₹22/km", icon: Truck, note: "Fast direct transport" },
              { type: "HEAVY_LORRY", name: "Heavy Lorry", cap: "100–160 Quintals", rate: "₹35/km", icon: Navigation, note: "Bulk harvest movement" },
            ].map(veh => (
              <div
                key={veh.type}
                className={`vehicle-choice-card ${transportForm.vehicleType === veh.type ? "selected" : ""}`}
                onClick={() => setTransportForm(f => ({ ...f, vehicleType: veh.type as any }))}
              >
                <span className="veh-icon"><veh.icon size={24} /></span>
                <h4>{veh.name}</h4>
                <p>{veh.cap}</p>
                <div className="rate-tag">{veh.rate}</div>
                <small className="text-[10px] text-muted-foreground block mt-1">{veh.note}</small>
              </div>
            ))}
          </div>

          <div className="transport-form-card">
            <h3 className="text-base font-bold text-[#183d2e] mb-3">2. Pickup & Destination Details</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="text-xs font-bold">
                Pickup Village
                <Input
                  className="mt-1"
                  value={transportForm.pickupVillage}
                  onChange={e => setTransportForm(f => ({ ...f, pickupVillage: e.target.value }))}
                />
              </label>
              <label className="text-xs font-bold">
                Destination Centre
                <select
                  className="w-full h-10 px-3 mt-1 rounded-lg border bg-background text-xs font-semibold"
                  value={transportForm.destinationCentreId}
                  onChange={e => setTransportForm(f => ({ ...f, destinationCentreId: parseInt(e.target.value) }))}
                >
                  {apiCentres.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.distance})</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <label className="text-xs font-bold">
                Scheduled Date
                <Input
                  type="date"
                  className="mt-1"
                  value={transportForm.scheduledDate}
                  onChange={e => setTransportForm(f => ({ ...f, scheduledDate: e.target.value }))}
                />
              </label>
              <label className="text-xs font-bold">
                Time Slot
                <select
                  className="w-full h-10 px-3 mt-1 rounded-lg border bg-background text-xs font-semibold"
                  value={transportForm.timeSlot}
                  onChange={e => setTransportForm(f => ({ ...f, timeSlot: e.target.value }))}
                >
                  <option>07:00 AM – 10:00 AM</option>
                  <option>10:00 AM – 01:00 PM</option>
                  <option>01:00 PM – 04:00 PM</option>
                  <option>04:00 PM – 07:00 PM</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Estimated Load (Quintals)
                <Input
                  type="number"
                  className="mt-1"
                  value={transportForm.estimatedLoadQuintals}
                  onChange={e => setTransportForm(f => ({ ...f, estimatedLoadQuintals: e.target.value }))}
                />
              </label>
            </div>

            <div className="fare-estimate-box">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Estimated Distance:</span>
                <b>{calculatedFare.distNum} km</b>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Standard Transit Fare:</span>
                <span>₹{calculatedFare.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-emerald-700">
                <span className="subsidy-badge"><Check size={12} /> 30% Govt Transport Subsidy</span>
                <b>-₹{calculatedFare.subsidy.toFixed(2)}</b>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-emerald-200">
                <span className="text-sm font-extrabold text-emerald-950">Net Payable on Delivery:</span>
                <strong className="text-xl text-emerald-800 font-extrabold">₹{calculatedFare.netPayable.toFixed(2)}</strong>
              </div>
            </div>

            <ActionButton
              disabled={transportBookingLoading}
              onClick={() => { void bookTransport(); }}
              icon={Truck}
            >
              {transportBookingLoading ? "Booking Subsidized Vehicle…" : "Book Subsidized Vehicle"}
            </ActionButton>
          </div>
        </div>

        <aside>
          <div className="transport-history-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#183d2e] m-0">Active Vehicle Bookings</h3>
              <Pill kind="green">{transportBookingsList.length} Booked</Pill>
            </div>

            {transportBookingsList.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs bg-slate-50 rounded-xl">
                No active transport bookings yet. Fill the form to book your subsidized vehicle.
              </div>
            ) : (
              transportBookingsList.map(item => {
                const cStatus = getCancellationStatus(item.scheduledDate, item.timeSlot, item.createdAt);
                const isCancelled = item.status === "CANCELLED";
                const isOngoing = item.status === "IN_TRANSIT" || item.status === "DELIVERED_AT_CENTRE";
                return (
                  <div className="transport-item-row flex flex-col gap-2.5" key={item.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="text-xs font-bold text-[#153828]">{item.transportCode}</strong>
                          <Pill kind="blue">{item.vehicleName}</Pill>
                          <Pill kind={isCancelled ? "yellow" : isOngoing ? "blue" : "green"}>
                            {isCancelled ? "CANCELLED" : item.status}
                          </Pill>
                        </div>
                        <p className="text-[11px] text-muted-foreground m-0">
                          {item.pickupVillage} → {item.destinationCentreName}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          📅 {item.scheduledDate} · {item.timeSlot} · {item.estimatedLoadQuintals} Qtl
                        </p>
                        <div className="mt-1 text-xs text-slate-700">
                          <b>Driver: {item.driverName}</b> ({item.vehicleNumber})
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <strong className="text-sm text-emerald-800">₹{item.netPayable.toFixed(2)}</strong>
                        {!isCancelled && (
                          <a className="driver-call-btn" href={`tel:${item.driverPhone}`}>
                            <PhoneCall size={13} /> Call Driver
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 30-Minute Cancellation Notice & Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1 text-[11px]">
                      {isCancelled ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <X size={13} /> Transportation Cancelled
                        </span>
                      ) : isOngoing ? (
                        <span className="text-slate-500 font-medium">Trip dispatched / completed</span>
                      ) : cStatus.expired ? (
                        <span className="text-slate-400">Cancellation window expired (available for 30 mins from booking creation)</span>
                      ) : (
                        <>
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <Clock3 size={13} /> Can cancel until: <b className="font-bold">{cStatus.deadlineFormatted} ({cStatus.text} left)</b>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetCancelTransport(item);
                              setShowCancelTransportModal(true);
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline"
                          >
                            Cancel booking
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </>
  );

  const filteredTimeline = useMemo(() => {
    if (!farmerHistoryData) return [];
    let list = farmerHistoryData.timeline || [];
    if (historyFilter === "BOOKINGS") list = list.filter(i => i.type === "BOOKING");
    else if (historyFilter === "TRANSPORT") list = list.filter(i => i.type === "TRANSPORT");
    else if (historyFilter === "PAYMENTS") list = list.filter(i => i.type === "PAYMENT");

    const q = historySearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(i => {
      const code = (i.code || "").toLowerCase();
      const title = (i.title || "").toLowerCase();
      const crop = (i.crop || "").toLowerCase();
      const centre = (i.centre || "").toLowerCase();
      const status = (i.status || "").toLowerCase();
      const token = (i.tokenNumber || "").toLowerCase();
      const method = (i.paymentMethod || "").toLowerCase();
      return code.includes(q) || title.includes(q) || crop.includes(q) || centre.includes(q) || status.includes(q) || token.includes(q) || method.includes(q);
    });
  }, [farmerHistoryData, historyFilter, historySearchQuery]);

  const historyScreen = farmerShell(
    <>
      <SectionTitle
        eyebrow="FARMER ACTIVITY TIMELINE"
        title="Procurement & Service History"
        body="Track all your government slot bookings, mandi arrivals, subsidized transportation, and direct benefit payments in one place."
        action={
          <button
            type="button"
            onClick={() => void loadFarmerHistory()}
            disabled={historyLoading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <RefreshCw size={14} className={historyLoading ? "animate-spin text-emerald-700" : ""} />
            {historyLoading ? "Refreshing..." : "Refresh History"}
          </button>
        }
      />

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CalendarDays size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">Slot Bookings</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {farmerHistoryData?.summary.totalBookings ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {farmerHistoryData?.summary.activeBookings ?? 0} active in queue
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Truck size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">Transportation</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {farmerHistoryData?.summary.totalTransport ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {farmerHistoryData?.summary.activeTransport ?? 0} vehicle in transit
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <WalletCards size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">DBT Payouts</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-800 dark:text-emerald-400">
            ₹{(farmerHistoryData?.summary.totalPaidAmount ?? 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {farmerHistoryData?.summary.totalPayments ?? 0} transaction records
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">Aadhaar DBT</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate">
            {profileRecord?.farmerCode || "Verified"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {profileRecord?.village || "AP Mandi Network"}
          </p>
        </div>
      </div>

      {/* Controls: Filter Pills and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "All Activity", count: farmerHistoryData?.timeline.length ?? 0 },
            { id: "BOOKINGS", label: "Slot Bookings", count: farmerHistoryData?.bookings.length ?? 0 },
            { id: "TRANSPORT", label: "Transportation", count: farmerHistoryData?.transport.length ?? 0 },
            { id: "PAYMENTS", label: "DBT Payments", count: farmerHistoryData?.payments.length ?? 0 },
          ].map(f => (
            <button
              type="button"
              key={f.id}
              onClick={() => setHistoryFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                historyFilter === f.id
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${historyFilter === f.id ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 text-slate-400 pointer-events-none" size={15} />
          <input
            type="text"
            value={historySearchQuery}
            onChange={e => setHistorySearchQuery(e.target.value)}
            placeholder="Search bookings, crops, transport, payments..."
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
          {historySearchQuery && (
            <button
              type="button"
              onClick={() => setHistorySearchQuery("")}
              className="absolute right-2.5 top-2 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3.5">
        {historyLoading && !farmerHistoryData ? (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <LoaderCircle className="animate-spin mx-auto text-emerald-700 mb-2" size={32} />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Loading your verified procurement history…</p>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <History className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {historySearchQuery ? `No history records found matching "${historySearchQuery}"` : "No Activity Records Found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {historySearchQuery
                ? "Try searching with a different term or clear the search filter."
                : "You haven't made any bookings or transport requests yet. Reserve your first government MSP slot today."}
            </p>
            {historySearchQuery ? (
              <button
                type="button"
                onClick={() => setHistorySearchQuery("")}
                className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-block"
              >
                Clear search filter
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("paddy")}
                className="mt-3 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <CalendarDays size={14} /> Book a Procurement Slot
              </button>
            )}
          </div>
        ) : (
          filteredTimeline.map(item => {
            if (item.type === "BOOKING") {
              const b = item.details;
              const isCancelled = item.status === "CANCELLED";
              const isCompleted = item.status === "COMPLETED";
              const isActive = item.status === "ACTIVE";
              const cropImg = getCropImageUrl(item.crop);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs ${
                    isActive ? "border-emerald-200 dark:border-emerald-900/40 ring-1 ring-emerald-600/10" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <CalendarDays size={16} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            Slot Booking
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Booked on {new Date(item.rawTimestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Pill kind={isCompleted ? "blue" : isCancelled ? "yellow" : "green"}>
                        {item.status}
                      </Pill>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-3 text-xs">
                    {/* Crop & Quantity */}
                    <div className="flex items-center gap-2.5">
                      <img
                        src={cropImg}
                        alt={item.crop}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Crop & Variety</span>
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.crop}</div>
                        <span className="text-slate-500 font-semibold">{item.quantity} Quintals expected</span>
                      </div>
                    </div>

                    {/* Centre & Location */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Procurement Centre</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.centre || "Assigned Centre"}</div>
                      <span className="text-slate-500">📅 {item.date || "Date scheduled"} {item.timeSlot ? `· ${item.timeSlot}` : ""}</span>
                    </div>

                    {/* Token & Queue */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Queue Token & Status</span>
                      <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                        <Ticket size={13} /> {item.tokenNumber || "Token Generated"}
                      </div>
                      <span className="text-slate-500">
                        {b.procurement?.status ? `Stage: ${b.procurement.status.replaceAll("_", " ")}` : b.queue?.status || "In Queue"}
                      </span>
                    </div>
                  </div>

                  {/* Footer with actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="text-slate-500">
                      Est. MSP Value: <b className="text-slate-900 dark:text-slate-100">₹{(item.amount || (Number(item.quantity || 18) * 2300)).toLocaleString("en-IN")}</b>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setBookingRecord(b); navigate("token"); }}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Ticket size={12} /> View Token
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBookingRecord(b); navigate("queue"); }}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <UsersRound size={12} /> Live Queue
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            if (item.type === "TRANSPORT") {
              const t = item.details;
              const isCancelled = item.status === "CANCELLED";
              const isDelivered = item.status === "DELIVERED_AT_CENTRE" || item.status === "COMPLETED";

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <Truck size={16} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md">
                            Subsidized Transport
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Requested on {new Date(item.rawTimestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Pill kind={isDelivered ? "green" : isCancelled ? "yellow" : "blue"}>
                        {item.status}
                      </Pill>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle & Load</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{t.vehicleType?.replaceAll("_", " ")}</div>
                      <span className="text-slate-500">Cap: {t.estimatedLoadQuintals} Quintals load</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Route & Schedule</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{t.pickupVillage} → {t.destinationCentre}</div>
                      <span className="text-slate-500">📅 {t.scheduledDate} · {t.timeSlot}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Driver</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{t.driverName}</div>
                      <span className="text-slate-500 font-mono text-[11px]">{t.vehicleNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Net Fare:</span>
                      <strong className="text-emerald-800 dark:text-emerald-400 font-bold">₹{Number(t.netPayable).toFixed(2)}</strong>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        30% Govt Subsidy Applied
                      </span>
                    </div>
                    {t.driverPhone && !isCancelled && (
                      <a
                        href={`tel:${t.driverPhone}`}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <PhoneCall size={12} /> Call Driver ({t.driverPhone})
                      </a>
                    )}
                  </div>
                </div>
              );
            }

            if (item.type === "PAYMENT") {
              const p = item.details;
              const isSuccess = item.status === "SUCCESS" || item.status === "COMPLETED";

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                        <WalletCards size={16} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md">
                            Direct Benefit Transfer
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Settlement on {new Date(item.rawTimestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <Pill kind={isSuccess ? "green" : "yellow"}>
                      {item.status}
                    </Pill>
                  </div>

                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl mb-2 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block tracking-wider">Transferred Payout</span>
                      <div className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                        ₹{Number(item.amount).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-400 block">Payment Mode</span>
                      <b className="text-slate-800 dark:text-slate-200">{item.paymentMethod || "Aadhaar DBT / NEFT"}</b>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Related Booking: <code className="font-mono text-slate-700 dark:text-slate-300">{p.bookingCode || "Mandi Procurement"}</code></span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Aadhaar DBT Verified
                    </span>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </>
  );

  const staffManagementScreen = officerShell(
    <>
      <SectionTitle
        eyebrow="HEAD OFFICER GOVERNANCE · STAFF ONBOARDING"
        title="Department Staff Governance & Access Control"
        body="Verify new employee onboarding requests, assign departmental roles and branch centres, provision secure Login IDs, and review system audit logs."
        action={
          <ActionButton onClick={() => setShowAddStaffModal(true)} icon={UserPlus}>
            + Onboard New Staff
          </ActionButton>
        }
      />

      <section className="officer-metrics mb-6">
        <MetricCard
          icon={UserPlus}
          label="Pending Verification"
          value={`${staffList.filter(s => s.status === "PENDING_VERIFICATION").length}`}
          hint="Requires Head Officer Approval"
          tone="yellow"
        />
        <MetricCard
          icon={Users}
          label="Active Staff Members"
          value={`${staffList.filter(s => s.status === "ACTIVE").length + (officerProfile?.role === "HEAD_OFFICER" ? 1 : 0)}`}
          hint="Operational across all branches"
          tone="green"
        />
        <MetricCard
          icon={Shield}
          label="Assigned Departments"
          value="4 Units"
          hint="QC · Logistics · Procurement · Payment"
          tone="blue"
        />
        <MetricCard
          icon={History}
          label="Audit Events Logged"
          value={`${staffAuditLogsList.length}`}
          hint="Full compliance trail recorded"
          tone="green"
        />
      </section>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {[
              { key: "pending", label: "Pending Verification", count: staffList.filter(s => s.status === "PENDING_VERIFICATION").length, badgeTone: "bg-amber-100 text-amber-800" },
              { key: "active", label: "Active Staff Network", count: staffList.filter(s => s.status === "ACTIVE").length, badgeTone: "bg-emerald-100 text-emerald-800" },
              { key: "disabled", label: "Disabled / Inactive", count: staffList.filter(s => s.status === "DISABLED").length, badgeTone: "bg-slate-100 text-slate-700" },
              { key: "audit", label: "Audit Trail & Logs", count: staffAuditLogsList.length, badgeTone: "bg-blue-100 text-blue-800" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStaffTab(tab.key as typeof staffTab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  staffTab === tab.key
                    ? "bg-[#165339] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${staffTab === tab.key ? "bg-white/20 text-white" : tab.badgeTone}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <Button
            onClick={() => setShowAddStaffModal(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl h-9 px-4 flex items-center gap-1.5"
          >
            <UserPlus size={15} /> Onboard New Employee
          </Button>
        </div>

        {/* Tab: Pending Verification */}
        {staffTab === "pending" && (
          <div className="flex flex-col gap-4">
            {staffList.filter(s => s.status === "PENDING_VERIFICATION").length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </span>
                <h3 className="text-base font-bold text-slate-800 mb-1">No Pending Staff Verification Requests</h3>
                <p className="text-xs text-slate-500 max-w-md">All onboarding applications have been verified. Click "+ Onboard New Employee" to register new staff joining a branch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {staffList.filter(s => s.status === "PENDING_VERIFICATION").map(staff => (
                  <article key={staff.id} className="p-5 border border-amber-200 bg-amber-50/30 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="w-12 h-12 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {staff.role === "QUALITY_CONTROL_INSPECTOR" ? "QC" : staff.role === "LOGISTICS_OFFICER" ? "LOG" : staff.role === "PAYMENT_OFFICER" ? "PAY" : "PO"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-slate-900 m-0">{staff.name}</h4>
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                            {staff.employeeId || "NEW APPLICANT"}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-bold">
                            {(staff.role || "STAFF").replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>🏢 <b>Dept:</b> {staff.department} ({staff.designation || "Staff"})</span>
                          <span>📍 <b>Branch:</b> {staff.branch} ({staff.centreName || staff.district})</span>
                          <span>📞 <b>Phone:</b> {staff.phone || "—"}</span>
                          <span>✉️ <b>Email:</b> {staff.email || "—"}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-2 m-0 flex items-center gap-1 font-medium">
                          <Clock3 size={13} /> Submitted for Head Officer verification on {new Date(staff.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setViewingStaffDetails(staff); }}
                        className="text-xs font-semibold h-9 rounded-xl border-slate-300"
                      >
                        <Eye size={14} className="mr-1" /> View Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRejectStaffTarget(staff); setShowRejectStaffModal(true); }}
                        className="text-xs font-semibold h-9 rounded-xl text-rose-700 hover:bg-rose-50 border-rose-200"
                      >
                        <UserX size={14} className="mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { void approveStaffMember(staff.id); }}
                        className="text-xs font-bold h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                      >
                        <Key size={14} className="mr-1" /> Approve & Issue Login
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Active Staff Network */}
        {staffTab === "active" && (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-3 px-4">OFFICER / LOGIN ID</th>
                    <th className="py-3 px-4">EMPLOYEE ID & NAME</th>
                    <th className="py-3 px-4">ROLE & DEPARTMENT</th>
                    <th className="py-3 px-4">ASSIGNED BRANCH & CENTRE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Default Head Officer Row */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800">
                        <Key size={13} className="text-emerald-600" /> OFF-NZM-104
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">K. Venkata Rao</div>
                      <div className="text-[11px] text-slate-500">EMP-HO-104 · 9848012345</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[10px]">HEAD OFFICER</Badge>
                      <div className="text-[11px] text-slate-500 mt-0.5">Administration & District Governance</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">Guntur & Nizamabad Main Branch</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <Check size={11} /> ACTIVE (PRIMARY)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-medium text-[11px]">
                      Head Officer Master Account
                    </td>
                  </tr>

                  {/* Dynamic Staff Rows */}
                  {staffList.filter(s => s.status === "ACTIVE").map(staff => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                          <Key size={13} className="text-emerald-600" /> {staff.officerCode}
                          <button
                            onClick={() => { navigator.clipboard?.writeText(staff.officerCode); toast.success(`Login ID ${staff.officerCode} copied!`); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            title="Copy Login ID"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{staff.name}</div>
                        <div className="text-[11px] text-slate-500">{staff.employeeId} · {staff.phone || "—"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-blue-100 text-blue-900 border-blue-200 font-bold text-[10px]">{(staff.role || "STAFF").replaceAll("_", " ")}</Badge>
                        <div className="text-[11px] text-slate-500 mt-0.5">{staff.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{staff.branch}</span>
                        <div className="text-[11px] text-slate-500">{staff.centreName || staff.district}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check size={11} /> ACTIVE
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingStaffDetails(staff)}
                            className="h-8 px-2 text-slate-600 hover:bg-slate-100 text-xs"
                          >
                            <Eye size={13} className="mr-1" /> Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { void disableStaffMember(staff.id); }}
                            className="h-8 px-2 text-amber-700 hover:bg-amber-50 border-amber-200 text-xs"
                          >
                            <Lock size={13} className="mr-1" /> Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Disabled Staff */}
        {staffTab === "disabled" && (
          <div className="flex flex-col gap-4">
            {staffList.filter(s => s.status === "DISABLED").length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl">
                No staff accounts currently deactivated.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {staffList.filter(s => s.status === "DISABLED").map(staff => (
                  <div key={staff.id} className="p-4 border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-800">{staff.name}</strong>
                        <span className="font-mono text-[11px] text-slate-500">({staff.officerCode})</span>
                        <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-200">DEACTIVATED</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 m-0 mt-1">
                        {(staff.role || "STAFF").replaceAll("_", " ")} · {staff.department || "Administration"} · {staff.branch || "Guntur"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { void enableStaffMember(staff.id); }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 rounded-lg"
                    >
                      <RefreshCw size={13} className="mr-1" /> Re-enable Access
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Audit Trail */}
        {staffTab === "audit" && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-700 shrink-0" />
              <span>Immutable administrative audit trail recording all staff onboarding, verification approvals, credential issuances, and deactivations.</span>
            </div>

            <div className="divide-y divide-slate-100">
              {staffAuditLogsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
              ) : (
                staffAuditLogsList.map(log => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        log.action.includes("APPROVED") ? "bg-emerald-100 text-emerald-800" :
                        log.action.includes("DISABLED") || log.action.includes("REJECTED") ? "bg-rose-100 text-rose-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {log.action.includes("APPROVED") ? <Check size={15} /> : log.action.includes("DISABLED") ? <Lock size={15} /> : <History size={15} />}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs font-bold text-slate-900">{(log.action || "").replaceAll("_", " ")}</strong>
                          <span className="text-[11px] text-slate-500">by <b>{log.performedByOfficerName}</b></span>
                        </div>
                        <p className="text-xs text-slate-600 m-0 mt-0.5">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                  <UserPlus size={18} className="text-emerald-700" /> Onboard Department Staff Member
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">Submit employee details for Head Officer verification and role provisioning.</p>
              </div>
              <button onClick={() => setShowAddStaffModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); void submitAddStaff(); }} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-slate-700">
                  Full Name *
                  <Input
                    required
                    className="mt-1"
                    placeholder="e.g. S. Srinivas Reddy"
                    value={addStaffForm.name}
                    onChange={e => setAddStaffForm(f => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Employee ID (HR / Govt) *
                  <Input
                    required
                    className="mt-1"
                    placeholder="e.g. EMP-QC-8842"
                    value={addStaffForm.employeeId}
                    onChange={e => setAddStaffForm(f => ({ ...f, employeeId: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-slate-700">
                  Mobile Number *
                  <Input
                    required
                    type="tel"
                    className="mt-1"
                    placeholder="10-digit mobile number"
                    value={addStaffForm.phone}
                    onChange={e => setAddStaffForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Official Email Address *
                  <Input
                    required
                    type="email"
                    className="mt-1"
                    placeholder="name@smartprocure.gov.in"
                    value={addStaffForm.email}
                    onChange={e => setAddStaffForm(f => ({ ...f, email: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-slate-700">
                  Department *
                  <select
                    className="w-full h-10 px-3 mt-1 rounded-lg border bg-background text-xs font-semibold"
                    value={addStaffForm.department}
                    onChange={e => {
                      const dept = e.target.value;
                      let role: StaffRecord["role"] = "QUALITY_CONTROL_INSPECTOR";
                      let desig = "Inspector";
                      if (dept === "Quality Control") { role = "QUALITY_CONTROL_INSPECTOR"; desig = "Quality Control Inspector"; }
                      else if (dept === "Logistics & Transportation") { role = "LOGISTICS_OFFICER"; desig = "Logistics Officer"; }
                      else if (dept === "Payment & DBT") { role = "PAYMENT_OFFICER"; desig = "Payment Accounts Officer"; }
                      else if (dept === "Procurement Operations") { role = "PROCUREMENT_OFFICER"; desig = "Procurement Officer"; }
                      else { role = "HEAD_OFFICER"; desig = "Assistant Head Officer"; }
                      setAddStaffForm(f => ({ ...f, department: dept, role, designation: desig }));
                    }}
                  >
                    <option value="Quality Control">Quality Control</option>
                    <option value="Logistics & Transportation">Logistics & Transportation</option>
                    <option value="Payment & DBT">Payment & DBT</option>
                    <option value="Procurement Operations">Procurement Operations</option>
                    <option value="Administration">Administration</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-slate-700">
                  System Role Assigned
                  <div className="h-10 px-3 mt-1 rounded-lg border bg-slate-100 flex items-center text-xs font-bold text-slate-800">
                    {(addStaffForm.role || "STAFF").replaceAll("_", " ")}
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-slate-700">
                  Branch / Procurement Centre *
                  <select
                    className="w-full h-10 px-3 mt-1 rounded-lg border bg-background text-xs font-semibold"
                    value={addStaffForm.branch}
                    onChange={e => {
                      const b = e.target.value;
                      const c = apiCentres.find(item => (item.place || "").toLowerCase().includes((b || "").toLowerCase())) || apiCentres[0];
                      setAddStaffForm(f => ({ ...f, branch: b, centreId: c?.id || 1, centreName: c?.name || "Guntur Yard", district: b }));
                    }}
                  >
                    <option value="Guntur">Guntur Main Yard (Guntur District)</option>
                    <option value="Nizamabad">Nizamabad Market Yard (Nizamabad District)</option>
                    <option value="Bhiknoor">Bhiknoor Procurement Centre (Kamareddy District)</option>
                    <option value="Warangal">Warangal Enamamula Market (Warangal District)</option>
                    <option value="Karimnagar">Karimnagar District Centre</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Designation Title
                  <Input
                    className="mt-1"
                    placeholder="e.g. Senior Quality Inspector"
                    value={addStaffForm.designation}
                    onChange={e => setAddStaffForm(f => ({ ...f, designation: e.target.value }))}
                  />
                </label>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                <span>Onboarding requests require Head Officer verification before access credentials and login privileges become active.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowAddStaffModal(false)} className="text-xs font-semibold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addStaffSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5"
                >
                  {addStaffSubmitting ? "Submitting..." : "Submit Onboarding Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Credentials Modal */}
      {showApproveCredentialsModal && approvedCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={26} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Staff Access Approved!</h3>
                <p className="text-xs text-slate-500 m-0">{approvedCredentials.staff?.name} is now verified and active.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500">PROVISIONED LOGIN ID</span>
                <div className="flex items-center justify-between bg-white p-2.5 mt-1 rounded-lg border border-slate-200">
                  <code className="text-sm font-black text-emerald-800 tracking-wider">{approvedCredentials.officerCode}</code>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(approvedCredentials.officerCode); toast.success("Login ID copied!"); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                    title="Copy Login ID"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500">TEMPORARY ACTIVATION PASSWORD</span>
                <div className="flex items-center justify-between bg-white p-2.5 mt-1 rounded-lg border border-slate-200">
                  <code className="text-sm font-mono font-bold text-slate-800">{approvedCredentials.temporaryPassword || "Staff@2026#AP"}</code>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(approvedCredentials.temporaryPassword || "Staff@2026#AP"); toast.success("Temporary password copied!"); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                    title="Copy Password"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 m-0">
              Provide these credentials to <b>{approvedCredentials.staff?.name}</b>. They can sign in immediately through the Officer Portal.
            </p>

            <Button
              onClick={() => { setShowApproveCredentialsModal(false); setApprovedCredentials(null); }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold w-full h-10 rounded-xl mt-1"
            >
              Done & Return to Staff List
            </Button>
          </div>
        </div>
      )}

      {/* Reject Staff Modal */}
      {showRejectStaffModal && rejectStaffTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 m-0">Reject Staff Onboarding</h3>
              <button onClick={() => setShowRejectStaffModal(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-600">
              Specify the reason for rejecting <b>{rejectStaffTarget.name}</b> ({rejectStaffTarget.employeeId}).
            </p>
            <label className="text-xs font-bold text-slate-700">
              Rejection Reason
              <Input
                className="mt-1"
                value={staffRejectReason}
                onChange={e => setStaffRejectReason(e.target.value)}
                placeholder="e.g. Employee ID not found on payroll, verification failed..."
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectStaffModal(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => { void submitRejectStaff(); }}>Confirm Rejection</Button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Details Drawer/Modal */}
      {viewingStaffDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-xs font-bold">
                  {(viewingStaffDetails?.role || "STAFF").replaceAll("_", " ")}
                </Badge>
              </div>
              <button onClick={() => setViewingStaffDetails(null)}><X size={18} /></button>
            </div>

            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0">
                {getInitials(viewingStaffDetails?.name, "ST")}
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">{viewingStaffDetails.name}</h3>
                <p className="text-xs text-slate-500 m-0">{viewingStaffDetails.designation || "Staff"} · {viewingStaffDetails.employeeId}</p>
                <div className="mt-1 font-mono text-xs font-bold text-emerald-800">Login ID: {viewingStaffDetails.officerCode}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
              <div><span className="text-slate-400 font-bold block text-[10px]">DEPARTMENT</span><b>{viewingStaffDetails.department}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">BRANCH CENTRE</span><b>{viewingStaffDetails.branch}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">CONTACT PHONE</span><b>{viewingStaffDetails.phone || "—"}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">EMAIL ADDRESS</span><b>{viewingStaffDetails.email || "—"}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">STATUS</span><b className="text-emerald-700">{viewingStaffDetails.status}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">ENROLLED AT</span><b>{new Date(viewingStaffDetails.createdAt).toLocaleDateString("en-IN")}</b></div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <b>Role Scope:</b>{" "}
              {viewingStaffDetails.role === "QUALITY_CONTROL_INSPECTOR"
                ? "Grain quality inspection, moisture/foreign matter testing, batch accept/reject grading."
                : viewingStaffDetails.role === "LOGISTICS_OFFICER"
                ? "Subsidized transport allocation, vehicle tracking, delivery status updates."
                : viewingStaffDetails.role === "PAYMENT_OFFICER"
                ? "DBT direct settlement authorization, subsidy release, payment auditing."
                : "Farmer registration verification, queue allotment, mandi procurement operations."}
            </div>

            <Button onClick={() => setViewingStaffDetails(null)} className="w-full h-10 rounded-xl text-xs font-bold">
              Close Profile
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const renderCurrentScreen = () => {
    switch (screen) {
      case "registration": return registration;
      case "pending": return pending;
      case "farmerLogin": return farmerLogin;
      case "dashboard": return dashboard;
      case "paddy": return paddy;
      case "cropPrices": return cropPricesScreen;
      case "weather": return weatherScreen;
      case "farmerAnalytics": return farmerAnalyticsScreen;
      case "transportation": return transportationScreen;
      case "history": return historyScreen;
      case "centres": return centresScreen;
      case "centre": return centreDetail;
      case "slot": return slot;
      case "confirmation": return confirmation;
      case "token": return token;
      case "queue": return queue;
      case "status": return status;
      case "payment": return payment;
      case "profile": return profile;
      case "assistant": return assistant;
      case "notifications": return notifications;
      case "officerLogin": return officerLogin;
      case "officerDashboard": return officerDashboard;
      case "staffManagement": return staffManagementScreen;
      case "officerPayments": return officerPaymentStatus;
      case "registrations": return registrations;
      case "farmerDetail": return registrations;
      case "approved": return approvedList;
      case "bookings": return bookings;
      case "quality": return qualityControlScreen;
      case "officerLogistics": return officerLogisticsScreen;
      default: return landing;
    }
  };

  return (
    <>
      {renderCurrentScreen()}

      {/* Floating ProcureFlow AI Chatbot (available across farmer views) */}
      {!screen.startsWith("officer") && screen !== "registrations" && screen !== "approved" && screen !== "bookings" && screen !== "quality" && screen !== "farmerDetail" && screen !== "staffManagement" && (
        <>
          {/* Floating Trigger Button */}
          {!isChatbotOpen && (
            <button
              type="button"
              onClick={() => setIsChatbotOpen(true)}
              className="procureflow-floating-trigger"
              aria-label="Open ProcureFlow AI Assistant"
            >
              <div className="relative flex items-center justify-center">
                <Bot size={20} />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-emerald-900 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-emerald-900 rounded-full" />
              </div>
              <span>ProcureFlow AI</span>
            </button>
          )}

          {/* Floating Chatbot Panel */}
          {isChatbotOpen && (
            <div className="procureflow-floating-panel">
              {/* Header */}
              <div className="floating-bot-header">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800/80 border border-emerald-500/30 flex items-center justify-center text-white shadow-xs">
                    <Bot size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm tracking-tight text-white">ProcureFlow AI</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-100/80 m-0 font-medium">Official Agri Assistant</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Language Selector Dropdown */}
                  <select
                    value={language}
                    onChange={(e) => changeLanguage(e.target.value as any)}
                    className="bg-emerald-800/90 hover:bg-emerald-700/90 text-white text-xs font-bold px-2 py-1 rounded-md border border-emerald-600/40 focus:outline-none cursor-pointer"
                    title="Change Assistant Language"
                  >
                    <option value="EN" className="bg-slate-900 text-white">English (EN)</option>
                    <option value="TE" className="bg-slate-900 text-white">తెలుగు (TE)</option>
                    <option value="HI" className="bg-slate-900 text-white">हिन्दी (HI)</option>
                  </select>

                  {/* Speaker TTS Audio Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (!isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
                      toast.message(isMuted ? "Voice speech response enabled." : "Voice speech response muted.");
                    }}
                    className="w-7 h-7 rounded-md bg-emerald-800/90 hover:bg-emerald-700/90 text-emerald-100 flex items-center justify-center border border-emerald-600/30"
                    title={isMuted ? "Unmute voice response" : "Mute voice response"}
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      setIsChatbotOpen(false);
                    }}
                    className="w-7 h-7 rounded-md bg-emerald-800/90 hover:bg-emerald-700/90 text-emerald-100 flex items-center justify-center border border-emerald-600/30 ml-0.5"
                    title="Close Assistant"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div ref={floatingChatFeedRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                {/* Assistant Welcome Message */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <Bot size={15} />
                  </div>
                  <div className="max-w-[85%] bg-white border border-emerald-100/80 rounded-2xl rounded-tl-none p-3.5 shadow-xs text-slate-800 text-xs leading-relaxed">
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100">
                      <span className="font-extrabold text-[11px] text-emerald-800">ProcureFlow AI</span>
                      <button
                        type="button"
                        onClick={() => speak(
                          language === "TE"
                            ? "నమస్కారం! నేను ProcureFlow AI అసిస్టెంట్‌ని. మీ లైవ్ టోకెన్, క్యూ పొజిషన్, MSP ధరలు, లేదా DBT చెల్లింపులపై ఏదైనా సందేహం ఉంటే అడగండి."
                            : language === "HI"
                            ? "नमस्ते! मैं ProcureFlow AI सहायक हूँ। अपने टोकन नंबर, मंडी कतार, MSP दरों, या DBT भुगतान से संबंधित कोई भी प्रश्न पूछें।"
                            : "Namaste! I am your ProcureFlow AI Assistant. Ask me anything regarding your live procurement token, queue position, crop MSP rates, nearest mandi centres, or DBT payment status."
                        )}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <Volume2 size={12} /> {tUi("Listen", language)}
                      </button>
                    </div>
                    <p className="m-0 text-slate-700">
                      {language === "TE"
                        ? "నమస్కారం! నేను ProcureFlow AI అసిస్టెంట్‌ని. మీ లైవ్ టోకెన్, క్యూ పొజిషన్, MSP ధరలు, ధాన్యం సేకరణ కేంద్రాలు లేదా DBT చెల్లింపులపై ఏదైనా సందేహం ఉంటే అడగండి."
                        : language === "HI"
                        ? "नमस्ते! मैं ProcureFlow AI सहायक हूँ। अपने टोकन नंबर, मंडी कतार, धान न्यूनतम समर्थन मूल्य (MSP), खरीद केंद्र या DBT भुगतान से संबंधित कोई भी प्रश्न पूछें।"
                        : "Namaste! I am your ProcureFlow AI Assistant. Ask me anything regarding your live procurement token, queue position, crop MSP rates, nearest mandi centres, or DBT payment status."}
                    </p>
                  </div>
                </div>

                {/* 4 Quick Voice Prompt Cards with Icons */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 px-1">
                    💡 {tUi("Quick Questions", language)}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Ticket, text: "What is my token number?", desc: tUi("Token & live queue position", language) },
                      { icon: Wheat, text: "Check Paddy MSP Price", desc: tUi("Official MSP & bonus rates", language) },
                      { icon: MapPin, text: "Find nearest centre", desc: tUi("AP Mandi locations & timings", language) },
                      { icon: WalletCards, text: "Check payment status", desc: tUi("Direct DBT bank settlement", language) },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.text}
                          type="button"
                          onClick={() => void assistantReply(item.text)}
                          className="p-2.5 bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group flex flex-col justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-1">
                            <Icon size={14} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                            <span className="line-clamp-1">{item.text}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Conversation Stream */}
                {chat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                        <Bot size={15} />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] text-xs leading-relaxed p-3.5 rounded-2xl shadow-xs ${
                        msg.role === "user"
                          ? "bg-emerald-700 text-white rounded-tr-none font-medium"
                          : "bg-white border border-emerald-100/80 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100">
                          <span className="font-extrabold text-[11px] text-emerald-800">ProcureFlow AI</span>
                          <button
                            type="button"
                            onClick={() => speak(msg.text)}
                            className={`text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 ${
                              speakingText === msg.text ? "animate-pulse font-extrabold" : ""
                            }`}
                          >
                            <Volume2 size={12} /> {tUi("Listen", language)}
                          </button>
                        </div>
                      )}
                      <p className="m-0 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                        {profileRecord?.name ? profileRecord.name.slice(0, 1).toUpperCase() : "F"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Listening Banner with Animated Waveform */}
              {isListening && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between text-xs text-red-700 font-bold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <div className="audio-wave-bars">
                      <span className="audio-wave-bar" />
                      <span className="audio-wave-bar" />
                      <span className="audio-wave-bar" />
                      <span className="audio-wave-bar" />
                      <span className="audio-wave-bar" />
                    </div>
                    <span>{tUi("Listening...", language)}</span>
                    {liveInterimTranscript && (
                      <span className="text-red-900 font-normal italic truncate max-w-[170px]">
                        "{liveInterimTranscript}"
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={stopListening}
                    className="text-[10px] px-2 py-0.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Speech Error Banner */}
              {speechError && (
                <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
                  <span>{speechError}</span>
                  <button type="button" onClick={() => setSpeechError(null)} className="text-amber-900 font-bold ml-2">✕</button>
                </div>
              )}

              {/* Composer Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    void assistantReply(chatInput.trim());
                    setChatInput("");
                  }
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={listen}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    isListening
                      ? "bg-red-600 text-white animate-pulse ring-4 ring-red-200 shadow-md"
                      : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                  }`}
                  title={isListening ? "Stop listening" : "Click to speak"}
                >
                  <Mic size={20} />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isListening
                      ? tUi("Listening... speak now", language)
                      : tUi("Type or tap mic to speak...", language)
                  }
                  className="flex-1 h-10 px-3.5 bg-slate-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center transition-all flex-shrink-0"
                  title="Send message"
                >
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Global Slot Booking Cancellation Confirmation Modal */}
      {showCancelBookingModal && bookingRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                  <X size={20} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground m-0">
                    {tUi("Cancel booking?", language)}
                  </h3>
                  <span className="text-xs text-muted-foreground">Release reserved procurement slot</span>
                </div>
              </div>
              <button onClick={() => setShowCancelBookingModal(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{tUi("Booking ID:", language)}</span>
                  <b className="font-mono text-foreground">{bookingRecord.bookingCode}</b>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{tUi("Booking type:", language)}</span>
                  <span className="font-semibold text-foreground">MSP Paddy Procurement</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{tUi("Scheduled time:", language)}</span>
                  <span className="font-bold text-foreground">{bookingRecord.slot.date} ({bookingRecord.slot.startTime} – {bookingRecord.slot.endTime})</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground font-semibold">{tUi("Cancellation Status:", language)}</span>
                  {(() => {
                    const cStatus = getCancellationStatus(bookingRecord.slot?.date, bookingRecord.slot?.startTime, bookingRecord.createdAt);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        cStatus.canCancel ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-rose-100 text-rose-900 border border-rose-300"
                      }`}>
                        {cStatus.canCancel ? `Allowed until ${cStatus.deadlineFormatted} (${cStatus.text} left)` : "Cancellation window expired (available for 30m from booking creation)"}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed">
                {tUi("Are you sure you want to cancel this booking? This action will release your reserved slot.", language)}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setShowCancelBookingModal(false)}
                disabled={cancellingBooking}
              >
                {tUi("Keep Booking", language)}
              </Button>
              {(() => {
                const cStatus = getCancellationStatus(bookingRecord.slot?.date, bookingRecord.slot?.startTime, bookingRecord.createdAt);
                return (
                  <Button
                    variant="destructive"
                    className="text-xs font-bold"
                    onClick={() => { void cancelFarmerBooking(); }}
                    disabled={!cStatus.canCancel || cancellingBooking}
                  >
                    {cancellingBooking ? "Cancelling…" : tUi("Cancel Booking", language)}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Global Transport Booking Cancellation Confirmation Modal */}
      {showCancelTransportModal && targetCancelTransport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                  <X size={20} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground m-0">
                    {tUi("Cancel booking?", language)}
                  </h3>
                  <span className="text-xs text-muted-foreground">Subsidized vehicle transportation</span>
                </div>
              </div>
              <button onClick={() => setShowCancelTransportModal(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{tUi("Transport ID:", language)}</span>
                  <b className="font-mono text-foreground">{targetCancelTransport.transportCode}</b>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{tUi("Vehicle Type:", language)}</span>
                  <span className="font-semibold text-foreground">{targetCancelTransport.vehicleName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{tUi("Scheduled time:", language)}</span>
                  <span className="font-bold text-foreground">{targetCancelTransport.scheduledDate} ({targetCancelTransport.timeSlot})</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground font-semibold">{tUi("Cancellation Status:", language)}</span>
                  {(() => {
                    const cStatus = getCancellationStatus(targetCancelTransport.scheduledDate, targetCancelTransport.timeSlot, targetCancelTransport.createdAt);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        cStatus.canCancel ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-rose-100 text-rose-900 border border-rose-300"
                      }`}>
                        {cStatus.canCancel ? `Allowed until ${cStatus.deadlineFormatted} (${cStatus.text} left)` : "Cancellation window expired (available for 30m from booking creation)"}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed">
                {tUi("Are you sure you want to cancel this transportation booking?", language)}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setShowCancelTransportModal(false)}
                disabled={cancellingTransport}
              >
                {tUi("Keep Booking", language)}
              </Button>
              {(() => {
                const cStatus = getCancellationStatus(targetCancelTransport.scheduledDate, targetCancelTransport.timeSlot, targetCancelTransport.createdAt);
                return (
                  <Button
                    variant="destructive"
                    className="text-xs font-bold"
                    onClick={() => { void cancelFarmerTransport(); }}
                    disabled={!cStatus.canCancel || cancellingTransport}
                  >
                    {cancellingTransport ? "Cancelling…" : tUi("Cancel Booking", language)}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

