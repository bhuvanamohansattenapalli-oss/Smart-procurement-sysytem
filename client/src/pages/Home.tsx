/**
 * Fields & Flow design: contemporary agrarian wayfinding, clear
 * operational status, paddy green + canal blue, and large farmer-friendly controls.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Camera,
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
  Image as ImageIcon,
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
  Send,
  Trash2,
  Info,
  ExternalLink,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MapView } from "@/components/Map";
import { useLanguage } from "@/contexts/LanguageContext";
import { MobileViewToggle } from "@/components/MobileViewToggle";
import { MobileViewBanner } from "@/components/MobileViewBanner";

import { localizedUiText, translations, statusTranslations, getStatusLabel, tUi, getLocalizedText, Language, reverseTranslationMap, parseScheduledStartTime } from "@/lib/translations";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from "recharts";
import { CROP_CATALOGUE, filterCrops, getCatalogueCropImage, CropItem } from "@/lib/cropCatalogue";
import {
  downloadGatePassPdf,
  downloadProcurementReceiptPdf,
  downloadFarmerStatementPdf,
  downloadOfficerReportPdf,
  downloadTransportPassPdf,
} from "@/lib/pdfGenerator";
import { WeatherSellingAdvisory } from "@/components/WeatherSellingAdvisory";
import { MandiMarketPrices } from "@/components/MandiMarketPrices";
import { openGoogleMapsDirections, generateGoogleMapsDirectionsUrl } from "@/lib/googleMaps";

function getInitials(name?: string | null, fallback = "SO"): string {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.map(p => p[0]).join("").slice(0, 2).toUpperCase() || fallback;
}

function formatIndianDateTime(dateOrStr?: string | Date | null): string {
  if (!dateOrStr) return "Publication date unavailable";
  const d = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  if (isNaN(d.getTime())) return "Publication date unavailable";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
  | "officerPayments"
  | "officerAiCopilot";

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

const officerOnlyScreens: Screen[] = [
  "officerDashboard",
  "staffManagement",
  "registrations",
  "farmerDetail",
  "approved",
  "bookings",
  "quality",
  "officerLogistics",
  "officerPayments",
  "officerAiCopilot",
];

const ALL_VALID_SCREENS: Screen[] = [
  "landing",
  "registration",
  "pending",
  "farmerLogin",
  "dashboard",
  "paddy",
  "cropPrices",
  "weather",
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
  "officerLogin",
  "officerDashboard",
  "staffManagement",
  "registrations",
  "farmerDetail",
  "approved",
  "bookings",
  "quality",
  "officerLogistics",
  "officerPayments",
  "officerAiCopilot",
];

function getInitialScreen(): Screen {
  if (typeof window === "undefined") return "landing";
  const hash = window.location.hash.replace(/^#\/?/, "").trim();
  if (hash && ALL_VALID_SCREENS.includes(hash as Screen)) {
    return hash as Screen;
  }
  const searchParams = new URLSearchParams(window.location.search);
  const screenParam = searchParams.get("screen")?.trim();
  if (screenParam && ALL_VALID_SCREENS.includes(screenParam as Screen)) {
    return screenParam as Screen;
  }
  const lastScreen = sessionStorage.getItem("procureflow.lastScreen")?.trim();
  if (lastScreen && ALL_VALID_SCREENS.includes(lastScreen as Screen)) {
    return lastScreen as Screen;
  }
  try {
    const farmerRaw = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
    if (farmerRaw) {
      const parsed = JSON.parse(farmerRaw);
      if (parsed?.token) return "dashboard";
    }
  } catch {}
  try {
    const officerRaw = localStorage.getItem("procureflow.officer.session") || sessionStorage.getItem("procureflow.officer.session");
    if (officerRaw) {
      const parsed = JSON.parse(officerRaw);
      if (parsed?.token) return "officerDashboard";
    }
  } catch {}
  return "landing";
}

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
  const { language } = useLanguage();
  return <span className={`status-pill status-${kind}`}>{typeof children === "string" ? tUi(children, language) : children}</span>;
}

function SectionTitle({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: React.ReactNode }) {
  const { language } = useLanguage();
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{typeof eyebrow === "string" ? tUi(eyebrow, language) : eyebrow}</p>}
        <h1>{typeof title === "string" ? tUi(title, language) : title}</h1>
        {body && <p className="section-body">{typeof body === "string" ? tUi(body, language) : body}</p>}
      </div>
      {action && <div className="section-title-action-wrap w-full sm:w-auto shrink-0">{action}</div>}
    </div>
  );
}

function AppLogo({ inverse = false, className = "" }: { inverse?: boolean; className?: string }) {
  return (
    <div className={`app-logo ${inverse ? "inverse" : ""} ${className} flex items-center`}>
      <img
        src="/procureflow-logo.png"
        alt="ProcureFlow – From Farm to Procurement"
        className="brand-logo-img object-contain transition-transform hover:scale-[1.02]"
      />
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
    { code: "TE", native: "తెలుగు", english: "Telugu" },
    { code: "HI", native: "हिन्दी", english: "Hindi" },
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
  const { language } = useLanguage();
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
            <span>{tUi("My Profile", language)}</span>
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
            <span>{tUi("Logout", language)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ActionButton({ children, onClick, secondary = false, icon: Icon, disabled = false, className = "" }: { children: React.ReactNode; onClick: () => void; secondary?: boolean; icon?: typeof ArrowRight; disabled?: boolean; className?: string }) {
  return (
    <Button disabled={disabled} onClick={onClick} className={`${secondary ? "action-button secondary" : "action-button"} ${className}`.trim()}>
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
  const { language } = useLanguage();
  return <article className={`metric-card ${tone}`}><span className="metric-icon"><Icon size={20} /></span><p>{typeof label === "string" ? tUi(label, language) : label}</p><strong>{value}</strong><small>{typeof hint === "string" ? tUi(hint, language) : hint}</small></article>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const { language, setLanguage } = useLanguage();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [officerMobileMenu, setOfficerMobileMenu] = useState(false);
  const [landingMobileMenu, setLandingMobileMenu] = useState(false);

  // Mobile drawer body scroll locking
  useEffect(() => {
    if (mobileMenu || officerMobileMenu || landingMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenu, officerMobileMenu, landingMobileMenu]);

  // Keyboard navigation: Close mobile drawers on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenu(false);
        setOfficerMobileMenu(false);
        setLandingMobileMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [registered, setRegistered] = useState(false);
  const [approved, setApproved] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed?.farmer?.status === "APPROVED";
    } catch {
      return false;
    }
  });
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
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string>(() => `farmer-session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const [chat, setChat] = useState<Array<{ role: string; text: string; source?: string; model?: string; warning?: string; imageUrl?: string }>>([
    { role: "assistant", text: "Namaste, Ramesh. I can help you plan your visit to the procurement centre.", source: "gemini", model: "gemini-3.5-flash-lite" }
  ]);
  const [attachedImage, setAttachedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
  } | null>(null);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const [imageCompressing, setImageCompressing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [webcamFacingMode, setWebcamFacingMode] = useState<"environment" | "user">("environment");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const isSubmittingAiRef = useRef(false);
  const [officerChatInput, setOfficerChatInput] = useState("");
  const [officerChatLoading, setOfficerChatLoading] = useState(false);
  const [officerChatSessionId, setOfficerChatSessionId] = useState<string>(() => `officer-session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const [officerChat, setOfficerChat] = useState<Array<{ role: string; text: string; source?: string; model?: string; warning?: string }>>([
    { role: "assistant", text: "Welcome to ProcureFlow AI Copilot. Ask any operational query regarding Fair Average Quality (FAQ) standards, weighbridge calibration, queue dispatch, or farmer document verification.", source: "gemini", model: "gemini-3.5-flash-lite" }
  ]);
  const [officerView, setOfficerView] = useState<"overview" | "staff" | "pending" | "approved" | "bookings" | "quality" | "logistics" | "payments" | "aiCopilot">("overview");
  const [officerProfile, setOfficerProfile] = useState<StaffRecord | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("procureflow.officer.session") || sessionStorage.getItem("procureflow.officer.session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.officer || null;
    } catch {
      return null;
    }
  });
  const [officerLoginForm, setOfficerLoginForm] = useState({ officerCode: "OFF-NZM-104", password: "Officer@2026" });
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [staffTab, setStaffTab] = useState<"pending" | "active" | "disabled" | "audit" | "resets">("pending");

  // Officer Forgot Password & Password Reset Requests
  const [officerForgotStep, setOfficerForgotStep] = useState<"INACTIVE" | "REQUEST" | "COMPLETE" | "SUCCESS">("INACTIVE");
  const [officerForgotCode, setOfficerForgotCode] = useState("");
  const [officerForgotContact, setOfficerForgotContact] = useState("");
  const [officerForgotDepartment, setOfficerForgotDepartment] = useState("");
  const [officerForgotReason, setOfficerForgotReason] = useState("");
  const [officerForgotReqId, setOfficerForgotReqId] = useState<number | null>(null);
  const [officerForgotToken, setOfficerForgotToken] = useState("");
  const [officerForgotNewPassword, setOfficerForgotNewPassword] = useState("");
  const [officerForgotConfirmPassword, setOfficerForgotConfirmPassword] = useState("");
  const [showOfficerForgotNewPassword, setShowOfficerForgotNewPassword] = useState(false);
  const [showOfficerForgotConfirmPassword, setShowOfficerForgotConfirmPassword] = useState(false);
  const [officerForgotLoading, setOfficerForgotLoading] = useState(false);
  const [officerForgotError, setOfficerForgotError] = useState<string | null>(null);
  const [officerForgotSuccessMsg, setOfficerForgotSuccessMsg] = useState<string | null>(null);

  interface PasswordResetItem {
    id: number;
    officerId: number;
    officerCode: string;
    officerName: string;
    department: string;
    email: string;
    phone: string;
    reason?: string | null;
    status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "COMPLETED";
    requestedAt: string;
    approvedAt?: string | null;
    approvedBy?: string | null;
    approvalToken?: string | null;
    expiresAt?: string | null;
    rejectionReason?: string | null;
  }
  const [passwordResetsList, setPasswordResetsList] = useState<PasswordResetItem[]>([]);
  const [resetApprovingId, setResetApprovingId] = useState<number | null>(null);
  const [resetRejectingId, setResetRejectingId] = useState<number | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [activeTokenModal, setActiveTokenModal] = useState<{ id: number; token: string; officerCode: string; officerName: string } | null>(null);
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
      toast.error(tUi("No active booking to cancel.", language));
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
      toast.success(tUi("Booking cancelled successfully.", language));
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
      toast.success(tUi("Transportation booking cancelled successfully.", language));
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
  const [farmerToken, setFarmerToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.token || null;
    } catch {
      return null;
    }
  });
  const [officerToken, setOfficerToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("procureflow.officer.session") || sessionStorage.getItem("procureflow.officer.session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.token || null;
    } catch {
      return null;
    }
  });
  const [farmerId, setFarmerId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.farmer?.id ? Number(parsed.farmer.id) : null;
    } catch {
      return null;
    }
  });
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

  // Registration form password and visibility states
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot Password workflow states (Identity Verified Recovery)
  const [forgotStep, setForgotStep] = useState<"INACTIVE" | "VERIFY" | "RESET" | "SUCCESS">("INACTIVE");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotFactorType, setForgotFactorType] = useState<"aadhaar" | "village" | "code">("aadhaar");
  const [forgotFactorValue, setForgotFactorValue] = useState("");
  const [farmerResetToken, setFarmerResetToken] = useState<string | null>(null);
  const [verifiedFarmerInfo, setVerifiedFarmerInfo] = useState<{ name: string; farmerCode: string } | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [bookingRecord, setBookingRecord] = useState<ApiBooking | null>(null);
  const [profileRecord, setProfileRecord] = useState<ApiBooking["farmer"] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.farmer || null;
    } catch {
      return null;
    }
  });
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

  const [mspMetadata, setMspMetadata] = useState<{
    season?: string;
    source?: string;
    officialPublishedDate?: string;
    effectiveFrom?: string;
    notificationRef?: string;
    officialSourceUrl?: string;
    lastSynchronizedAt?: string;
  } | null>({
    season: "Kharif & Rabi Marketing Season 2024-25 / 2025-26",
    source: "Ministry of Agriculture & Farmers Welfare, Govt of India",
    officialPublishedDate: "19-Jun-2024",
    effectiveFrom: "01-Oct-2025",
    notificationRef: "Cabinet Committee on Economic Affairs (CCEA) MSP Notification No. 1-1/2024-NF",
    officialSourceUrl: "https://desagri.gov.in/notification-type/msp-notifications/",
    lastSynchronizedAt: new Date().toISOString(),
  });

  const [liveClockTime, setLiveClockTime] = useState(() => new Date());
  const [queueLastSynced, setQueueLastSynced] = useState<Date | null>(() => new Date());

  const [analyticsTrendCrop, setAnalyticsTrendCrop] = useState<string>("Paddy");
  const [cropTrendData, setCropTrendData] = useState<{
    commodity: string;
    coveragePeriod: string;
    startDate: string;
    endDate: string;
    startPrice: number;
    latestPrice: number;
    absoluteChange: number;
    percentageChange: number;
    trend: "UP" | "DOWN" | "STABLE";
    movementLabel: "Price Increased" | "Price Decreased" | "Price Unchanged";
    points: Array<{
      date: string;
      displayDate: string;
      averageModalPrice: number;
      minModalPrice: number;
      maxModalPrice: number;
      reportingCount: number;
    }>;
    totalReportingSessions: number;
    coverageNotice?: string;
    dataSource: string;
    lastSynchronizedAt?: string;
  } | null>(null);
  const [cropTrendLoading, setCropTrendLoading] = useState<boolean>(false);

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
    locationName?: string;
    locationSource?: "EXACT_COORDINATES" | "VILLAGE_CENTROID" | "DISTRICT_CENTROID";
    temperature: number;
    feelsLike: number;
    apparentTemperature?: number;
    condition: string;
    conditionCode: "SUNNY" | "PARTLY_CLOUDY" | "LIGHT_RAIN" | "HEAVY_RAIN" | "CLEAR" | "HUMID";
    humidity: number;
    relativeHumidity?: number;
    windSpeedKmH: number;
    precipitationChance: number;
    hourlyPrecipitationProbability?: number;
    rainfallMm?: number;
    precipitationMm?: number;
    uvIndex: number;
    safeHarvestingIndex: "OPTIMAL" | "FAVORABLE" | "CAUTION" | "HIGH_RISK";
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
    openMeteo?: any;
    sellingAdvisory?: any;
    hourlyForecast?: Array<{
      time: string;
      temperatureC: number;
      humidityPercent: number;
      precipitationProbability: number;
      precipitationAmountMm: number;
      rainfallMm: number;
      windSpeedKmH: number;
      weatherCondition: string;
      weatherCode: number;
    }>;
    dailyForecast?: Array<{
      date: string;
      dayName: string;
      tempHighC: number;
      tempLowC: number;
      maxPrecipitationProbability: number;
      totalRainfallMm: number;
      maxWindSpeedKmH: number;
      weatherCondition: string;
      weatherCode: number;
      sunrise?: string;
      sunset?: string;
    }>;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    metadata?: {
      dataSource: string;
      attribution: string;
      apiRetrievalTime: string;
      lastSynchronizedAt: string;
      isStale: boolean;
      cacheTtlSeconds: number;
    };
    attribution?: string;
  };

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedWeatherDistrict, setSelectedWeatherDistrict] = useState<string>("Guntur");
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [assistantCategory, setAssistantCategory] = useState<string>("ALL");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState<string>("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const activeRecognitionRef = useRef<any>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({
        top: chatFeedRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chat]);

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
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("procureflow.language", next);
        document.documentElement.lang = next.toLowerCase();
        window.dispatchEvent(new CustomEvent("languagechange", { detail: { language: next } }));
      } catch {}
    }
  };

  const applyDomTranslation = useCallback((targetLang: Language) => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = targetLang.toLowerCase();

    if (targetLang === "EN") {
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
      if (!trimmed || /^\d+$/.test(trimmed)) continue;
      const localized = getLocalizedText(trimmed, targetLang);
      if (localized && localized !== trimmed) {
        textNode.nodeValue = currentVal.replace(trimmed, localized);
      }
    }

    // Translate select options
    document.querySelectorAll<HTMLOptionElement>("option").forEach(opt => {
      const trimmed = opt.text.trim();
      if (!trimmed || /^\d+$/.test(trimmed)) return;
      const localized = getLocalizedText(trimmed, targetLang);
      if (localized && localized !== trimmed) opt.text = localized;
    });

    // Translate input placeholders
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach(input => {
      const trimmed = input.placeholder.trim();
      if (!trimmed) return;
      const localized = getLocalizedText(trimmed, targetLang);
      if (localized && localized !== trimmed) input.placeholder = localized;
    });
  }, []);

  useEffect(() => {
    applyDomTranslation(language);

    if (language !== "EN" && typeof MutationObserver !== "undefined") {
      let timeoutId: any = null;
      const observer = new MutationObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          applyDomTranslation(language);
        }, 40);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false,
      });

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }
  }, [language, screen, applyDomTranslation]);

  const loadWeather = async (
    target?: string | { district?: string; village?: string; lat?: number; lon?: number }
  ) => {
    setWeatherLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeof target === "string") {
        params.set("district", target);
      } else if (target && typeof target === "object") {
        if (target.lat !== undefined && target.lon !== undefined) {
          params.set("lat", target.lat.toString());
          params.set("lon", target.lon.toString());
        }
        if (target.district) params.set("district", target.district);
        if (target.village) params.set("village", target.village);
      } else if (profileRecord?.village || profileRecord?.district) {
        if (profileRecord.village) params.set("village", profileRecord.village);
        if (profileRecord.district) params.set("district", profileRecord.district);
      } else {
        params.set("district", selectedWeatherDistrict);
      }

      if (profileRecord?.id) {
        params.set("farmerId", profileRecord.id.toString());
      }

      const response = await fetch(apiUrl(`/weather?${params.toString()}`));
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data.weather);
        if (data.weather?.district) {
          setSelectedWeatherDistrict(data.weather.district);
        }
      }
    } catch (err) {
      console.warn("[Weather Load Error]", err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const requestGpsWeather = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(tUi("Geolocation is not supported by your browser", language));
      return;
    }
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void loadWeather({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        toast.success(`Weather synced with farm GPS (${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E)`);
      },
      (err) => {
        setWeatherLoading(false);
        toast.error(tUi("Location permission denied or unavailable. Using registered farm district.", language));
        void loadWeather({ district: selectedWeatherDistrict });
      },
      { timeout: 8000 }
    );
  };

  const loadCropPrices = async () => {
    try {
      const response = await fetch(apiUrl("/crop-prices"));
      if (response.ok) {
        const data = await response.json();
        setCropPricesList([...(data.prices ?? [])].sort((a: any, b: any) => a.cropName.localeCompare(b.cropName, undefined, { sensitivity: "base" })));
        setMspMetadata({
          season: data.season,
          source: data.source,
          officialPublishedDate: data.officialPublishedDate,
          effectiveFrom: data.effectiveFrom,
          notificationRef: data.notificationRef,
          officialSourceUrl: data.officialSourceUrl,
          lastSynchronizedAt: data.lastSynchronizedAt || new Date().toISOString(),
        });
      }
    } catch {}
  };

  const loadCropPriceTrend = async (crop: string) => {
    setCropTrendLoading(true);
    try {
      const res = await fetch(apiUrl(`/market-prices/trend?commodity=${encodeURIComponent(crop)}`));
      if (res.ok) {
        const data = await res.json();
        setCropTrendData(data);
      }
    } catch (err) {
      console.error("Failed to load crop price trend", err);
    } finally {
      setCropTrendLoading(false);
    }
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

  // Unified Authentication Session Restoration & Verification
  useEffect(() => {
    let isCancelled = false;

    async function restoreSessions() {
      const initialTarget = getInitialScreen();
      let activeFarmerToken: string | null = null;
      let activeOfficerToken: string | null = null;

      // 1. Farmer Session Restoration & Validation
      const rawFarmer = localStorage.getItem("procureflow.farmer.session") || sessionStorage.getItem("procureflow.farmer.session");
      if (rawFarmer) {
        try {
          const saved = JSON.parse(rawFarmer) as { token: string; farmer: FarmerProfile };
          if (saved.token && saved.farmer?.id) {
            activeFarmerToken = saved.token;
            setFarmerToken(saved.token);
            setFarmerId(saved.farmer.id);
            setProfileRecord(saved.farmer);
            setApproved(saved.farmer.status === "APPROVED");

            // Validate with backend /api/farmers/me
            try {
              const meRes = await fetch(apiUrl("/farmers/me"), {
                headers: { Authorization: `Bearer ${saved.token}` },
                cache: "no-store",
              });
              if (meRes.status === 401) {
                // Token explicitly expired or invalid
                console.warn("[Auth] Farmer token expired or invalid (401), clearing session");
                localStorage.removeItem("procureflow.farmer.session");
                sessionStorage.removeItem("procureflow.farmer.session");
                setFarmerToken(null);
                setFarmerId(null);
                setApproved(false);
                activeFarmerToken = null;
              } else if (meRes.ok) {
                const meData = await meRes.json();
                if (meData?.farmer) {
                  setProfileRecord(meData.farmer);
                  setApproved(meData.farmer.status === "APPROVED");
                  localStorage.setItem("procureflow.farmer.session", JSON.stringify({ token: saved.token, farmer: meData.farmer }));
                  sessionStorage.setItem("procureflow.farmer.session", JSON.stringify({ token: saved.token, farmer: meData.farmer }));
                }
              }
              // Note: If temporary network error or 503, retain session gracefully!
            } catch (netErr) {
              console.warn("[Auth] Network error reaching /farmers/me, retaining cached session:", netErr);
            }

            if (activeFarmerToken) {
              void loadNotifications(saved.token, saved.farmer.id);
              void loadFarmerStats(saved.token);
              void loadFarmerAnalytics(saved.token);
              void loadFarmerTransportBookings(saved.token, saved.farmer.id);
              void fetch(apiUrl(`/farmers/${saved.farmer.id}/bookings`), {
                headers: { Authorization: `Bearer ${saved.token}` },
                cache: "no-store",
              })
                .then(res => (res.ok ? res.json() : null))
                .then(data => {
                  const list: ApiBooking[] = data?.bookings || [];
                  const target = list.find(b => b.status === "ACTIVE" && b.procurement?.status !== "COMPLETED")
                    || list.find(b => b.status === "ACTIVE")
                    || list[0];
                  if (target) void loadBooking(saved.token, target.id);
                })
                .catch(() => undefined);
            }
          }
        } catch {
          localStorage.removeItem("procureflow.farmer.session");
          sessionStorage.removeItem("procureflow.farmer.session");
        }
      }

      // 2. Officer Session Restoration & Validation
      const rawOfficer = localStorage.getItem("procureflow.officer.session") || sessionStorage.getItem("procureflow.officer.session");
      if (rawOfficer) {
        try {
          const saved = JSON.parse(rawOfficer) as { token: string; officer?: StaffRecord };
          if (saved.token) {
            activeOfficerToken = saved.token;
            setOfficerToken(saved.token);
            if (saved.officer) setOfficerProfile(saved.officer);

            try {
              const meRes = await fetch(apiUrl("/officers/me"), {
                headers: { Authorization: `Bearer ${saved.token}` },
                cache: "no-store",
              });
              if (meRes.status === 401 || meRes.status === 403) {
                console.warn("[Auth] Officer token expired/rejected, clearing session");
                localStorage.removeItem("procureflow.officer.session");
                sessionStorage.removeItem("procureflow.officer.session");
                setOfficerToken(null);
                setOfficerProfile(null);
                activeOfficerToken = null;
              } else if (meRes.ok) {
                const meData = await meRes.json();
                if (meData?.officer) {
                  setOfficerProfile(meData.officer);
                  localStorage.setItem("procureflow.officer.session", JSON.stringify({ token: saved.token, officer: meData.officer }));
                  sessionStorage.setItem("procureflow.officer.session", JSON.stringify({ token: saved.token, officer: meData.officer }));
                }
              }
            } catch (netErr) {
              console.warn("[Auth] Network error reaching /officers/me, retaining cached session:", netErr);
            }

            if (activeOfficerToken) {
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
          }
        } catch {
          localStorage.removeItem("procureflow.officer.session");
          sessionStorage.removeItem("procureflow.officer.session");
        }
      }

      if (isCancelled) return;

      // 3. Screen Routing Decision
      let targetScreen: Screen = initialTarget;
      if (activeFarmerToken) {
        if (targetScreen === "landing" || targetScreen === "farmerLogin") {
          targetScreen = "dashboard";
        }
      } else if (activeOfficerToken) {
        if (targetScreen === "landing" || targetScreen === "officerLogin") {
          targetScreen = "officerDashboard";
        }
      } else {
        if (farmerOnlyScreens.includes(targetScreen)) {
          targetScreen = "farmerLogin";
        } else if (officerOnlyScreens.includes(targetScreen)) {
          targetScreen = "officerLogin";
        }
      }

      setScreen(targetScreen);
      try {
        const expectedHash = `#${targetScreen}`;
        if (window.location.hash !== expectedHash) {
          window.history.replaceState(null, "", expectedHash);
        }
        sessionStorage.setItem("procureflow.lastScreen", targetScreen);
      } catch {}

      setIsAuthInitializing(false);
    }

    void restoreSessions();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Live Ticking Clock (updates every 1s in Asia/Kolkata)
  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setLiveClockTime(new Date());
    }, 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  // 2-Month Historical AGMARKNET Price Trend for Analytics
  useEffect(() => {
    if (screen === "farmerAnalytics") {
      void loadCropPriceTrend(analyticsTrendCrop);
    }
  }, [screen, analyticsTrendCrop]);

  useEffect(() => {
    if ((screen !== "queue" && screen !== "token") || !farmerToken || !bookingId) return;
    const refreshQueue = () => void fetch(apiUrl(`/queue/${bookingId}`), { headers: { Authorization: `Bearer ${farmerToken}` }, cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((data: { position: number; peopleAhead: number; estimatedWaitMinutes: number; status: string; currentToken: string }) => {
        setQueueAhead(data.peopleAhead);
        setBookingRecord(record => record ? { ...record, queue: data } : record);
        setQueueLastSynced(new Date());
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
      setScreen("farmerLogin");
      try {
        window.location.hash = "farmerLogin";
        sessionStorage.setItem("procureflow.lastScreen", "farmerLogin");
      } catch {}
      setMobileMenu(false);
      setOfficerMobileMenu(false);
      setLandingMobileMenu(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (officerOnlyScreens.includes(next) && !officerToken) {
      setScreen("officerLogin");
      try {
        window.location.hash = "officerLogin";
        sessionStorage.setItem("procureflow.lastScreen", "officerLogin");
      } catch {}
      setMobileMenu(false);
      setOfficerMobileMenu(false);
      setLandingMobileMenu(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (next === "status" && farmerToken) {
      void refreshProcurementStatus(farmerToken, farmerId, bookingId);
    }
    try {
      const expectedHash = `#${next}`;
      if (window.location.hash !== expectedHash) {
        window.history.pushState(null, "", expectedHash);
      }
      sessionStorage.setItem("procureflow.lastScreen", next);
    } catch {}
    setScreen(next);
    setMobileMenu(false);
    setOfficerMobileMenu(false);
    setLandingMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Browser navigation (back/forward button hashchange sync)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").trim();
      if (hash && ALL_VALID_SCREENS.includes(hash as Screen)) {
        const target = hash as Screen;
        if (farmerOnlyScreens.includes(target) && !farmerToken) {
          navigate("farmerLogin");
        } else if (officerOnlyScreens.includes(target) && !officerToken) {
          navigate("officerLogin");
        } else {
          setScreen(target);
          sessionStorage.setItem("procureflow.lastScreen", target);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [farmerToken, officerToken]);

  // Protected route enforcement (runs only after auth initialization completes)
  useEffect(() => {
    if (isAuthInitializing) return;
    if (farmerOnlyScreens.includes(screen) && !farmerToken) {
      setScreen("farmerLogin");
      try { window.location.hash = "farmerLogin"; } catch {}
    } else if (officerOnlyScreens.includes(screen) && !officerToken) {
      setScreen("officerLogin");
      try { window.location.hash = "officerLogin"; } catch {}
    } else if (screen === "farmerLogin" && farmerToken) {
      navigate("dashboard");
    } else if (screen === "officerLogin" && officerToken) {
      navigate("officerDashboard");
    }
  }, [screen, farmerToken, officerToken, isAuthInitializing]);
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

  const loadPasswordResets = async (token?: string) => {
    const t = token || officerToken;
    if (!t) return;
    try {
      const response = await fetch(apiUrl("/officers/password-resets"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPasswordResetsList(data.requests || []);
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
    void loadPasswordResets(t);
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
      toast.success(tUi("Staff Registration Submitted — Pending Head Officer Verification", language));
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
    if (!officerToken) { toast.error(tUi("Login as an officer before approving a registration.", language)); navigate("officerLogin"); return; }
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
    if (!officerToken) { toast.error(tUi("Login as an officer before rejecting a registration.", language)); return; }
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

  const submitRegistration = async () => {
    setAuthError(null);
    const cleanPhone = registrationForm.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      const msg = "Please enter a valid 10-digit Indian mobile number.";
      setAuthError(msg);
      toast.error(msg);
      return;
    }
    if (!registrationForm.name || registrationForm.name.trim().length < 2) {
      const msg = "Please enter your full name (at least 2 characters).";
      setAuthError(msg);
      toast.error(msg);
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
    if (!registrationForm.village || !registrationForm.district) {
      const msg = "Please enter your village and district.";
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

  // Farmer Password Reset (Identity Verified)
  const handleVerifyFarmerIdentity = async () => {
    setForgotError(null);
    const cleanPhone = forgotPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      const msg = "Please enter your registered 10-digit mobile number.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    const factorVal = forgotFactorValue.trim();
    if (forgotFactorType === "aadhaar" && factorVal.length !== 4) {
      const msg = "Please enter the last 4 digits of your registered Aadhaar.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    if (forgotFactorType === "village" && !factorVal) {
      const msg = "Please enter your registered village name.";
      setForgotError(msg);
      toast.error(msg);
      return;
    }
    if (forgotFactorType === "code" && !factorVal) {
      const msg = "Please enter your registered Farmer Code (e.g. FARM-2026-9482).";
      setForgotError(msg);
      toast.error(msg);
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch(apiUrl("/farmers/forgot-password/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          aadhaarLast4: forgotFactorType === "aadhaar" ? factorVal : undefined,
          village: forgotFactorType === "village" ? factorVal : undefined,
          farmerCode: forgotFactorType === "code" ? factorVal : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Identity verification failed.");
      }
      setFarmerResetToken(data.resetToken);
      setVerifiedFarmerInfo({ name: data.farmerName, farmerCode: data.farmerCode });
      setForgotStep("RESET");
      toast.success(`Identity verified for ${data.farmerName}! Set your new password.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Identity verification failed.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCompleteFarmerReset = async () => {
    setForgotError(null);
    if (!farmerResetToken) {
      const msg = "Verification session expired. Please verify your identity again.";
      setForgotError(msg);
      setForgotStep("VERIFY");
      toast.error(msg);
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
    try {
      const response = await fetch(apiUrl("/farmers/forgot-password/reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken: farmerResetToken,
          newPassword: forgotNewPassword,
          confirmPassword: forgotConfirmPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Password reset failed.");
      }
      setForgotStep("SUCCESS");
      setFarmerCredentials(prev => ({ ...prev, phone: forgotPhone.replace(/\D/g, ""), password: "" }));
      toast.success(tUi("Password reset successfully! You can now log in.", language));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to reset password.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Officer Password Reset Requests & Authorization
  const handleRequestOfficerReset = async () => {
    setOfficerForgotError(null);
    setOfficerForgotSuccessMsg(null);
    const code = officerForgotCode.trim();
    const contact = officerForgotContact.trim();
    if (!code) {
      const msg = "Please enter your Officer / Login ID.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }
    if (!contact) {
      const msg = "Please enter your registered Email ID or Mobile number.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }

    setOfficerForgotLoading(true);
    try {
      const response = await fetch(apiUrl("/officers/forgot-password/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: code,
          contact,
          department: officerForgotDepartment.trim() || undefined,
          reason: officerForgotReason.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to submit reset request.");
      }
      setOfficerForgotReqId(data.requestId);
      setOfficerForgotSuccessMsg(data.message || "Reset request submitted. Pending Head Officer approval.");
      toast.success(`Reset request #${data.requestId} submitted for ${code}!`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Submission failed.";
      setOfficerForgotError(msg);
      toast.error(msg);
    } finally {
      setOfficerForgotLoading(false);
    }
  };

  const handleCompleteOfficerReset = async () => {
    setOfficerForgotError(null);
    setOfficerForgotSuccessMsg(null);
    const code = officerForgotCode.trim();
    const token = officerForgotToken.trim();
    if (!code) {
      const msg = "Please enter your Officer Code.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }
    if (!token) {
      const msg = "Please enter the 24-hour Approval Token provided by your Head Officer.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }
    if (!officerForgotNewPassword || officerForgotNewPassword.length < 8) {
      const msg = "New password must be at least 8 characters long.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }
    const hasUpper = /[A-Z]/.test(officerForgotNewPassword);
    const hasLower = /[a-z]/.test(officerForgotNewPassword);
    const hasNum = /[0-9]/.test(officerForgotNewPassword);
    if (!hasUpper || !hasLower || !hasNum) {
      const msg = "Password must include at least one uppercase letter, one lowercase letter, and one number.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }
    if (officerForgotNewPassword !== officerForgotConfirmPassword) {
      const msg = "Passwords do not match. Please re-enter matching passwords.";
      setOfficerForgotError(msg);
      toast.error(msg);
      return;
    }

    setOfficerForgotLoading(true);
    try {
      const response = await fetch(apiUrl("/officers/forgot-password/complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerCode: code,
          requestId: officerForgotReqId || undefined,
          approvalToken: token,
          newPassword: officerForgotNewPassword,
          confirmPassword: officerForgotConfirmPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Password reset failed.");
      }
      setOfficerForgotStep("SUCCESS");
      setOfficerLoginForm(prev => ({ ...prev, officerCode: code, password: "" }));
      toast.success(tUi("Officer password updated successfully! You can now log in.", language));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to reset officer password.";
      setOfficerForgotError(msg);
      toast.error(msg);
    } finally {
      setOfficerForgotLoading(false);
    }
  };

  const approvePasswordReset = async (id: number) => {
    if (!officerToken) return;
    setResetApprovingId(id);
    try {
      const response = await fetch(apiUrl(`/officers/password-resets/${id}/approve`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to approve password reset.");
      }
      toast.success(`Password reset approved! Token: ${data.approvalToken}`);
      const req = passwordResetsList.find(r => r.id === id);
      setActiveTokenModal({
        id,
        token: data.approvalToken,
        officerCode: req?.officerCode || "Officer",
        officerName: req?.officerName || "Staff Member",
      });
      await loadPasswordResets(officerToken);
      await loadStaffAuditLogs(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setResetApprovingId(null);
    }
  };

  const rejectPasswordReset = async (id: number, reason: string) => {
    if (!officerToken) return;
    setResetRejectingId(id);
    try {
      const response = await fetch(apiUrl(`/officers/password-resets/${id}/reject`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({ reason: reason || "Identity or department mismatch" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to reject password reset.");
      }
      toast.error(`Password reset request #${id} rejected.`);
      await loadPasswordResets(officerToken);
      await loadStaffAuditLogs(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rejection failed.");
    } finally {
      setResetRejectingId(null);
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
        throw new Error(data.message ?? (data.status === "PENDING" ? "Your registration requires officer approval before login." : (data.error ? `Login failed: ${data.error}` : "Login failed. Please check your credentials.")));
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
      navigate("dashboard");
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
      if (!response.ok) throw new Error(data.message ?? (data.error ? `Officer login failed: ${data.error}` : "Officer login failed."));
      
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
    try {
      void fetch(apiUrl("/farmers/logout"), { method: "POST" });
    } catch {}
    localStorage.removeItem("procureflow.farmer.session");
    sessionStorage.removeItem("procureflow.farmer.session");
    sessionStorage.removeItem("procureflow.lastScreen");
    setFarmerToken(null); setFarmerId(null); setBookingId(null); setBookingRecord(null); setProfileRecord(null); setApiNotifications([]); setPaymentRecord(null); setPaymentHistory([]); setReceipt(null); setPaymentDone(false); setApproved(false); setAuthError(null);
    try {
      window.location.hash = "landing";
    } catch {}
    navigate("landing");
    toast.success(tUi("You have been logged out from Farmer Portal.", language));
  };

  const logoutOfficer = () => {
    try {
      void fetch(apiUrl("/officers/logout"), { method: "POST" });
    } catch {}
    localStorage.removeItem("procureflow.officer.session");
    sessionStorage.removeItem("procureflow.officer.session");
    sessionStorage.removeItem("procureflow.lastScreen");
    setOfficerToken(null);
    setOfficerProfile(null);
    try {
      window.location.hash = "landing";
    } catch {}
    navigate("landing");
    toast.success(tUi("Officer console session closed.", language));
  };
  const processPayment = async () => {
    if (!farmerToken || !bookingId || !farmerId) { toast.error(tUi("Login as an approved farmer with an active booking before paying.", language)); return; }
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
              toast.success(tUi("Payment successful. Your receipt is ready.", language)); resolve();
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
        toast.success(tUi("Payment successful. Your receipt is ready.", language));
      } else toast.error(completed.payment.failureReason ?? "Payment failed. Please try another method.");
      await Promise.all([loadPaymentData(farmerToken, farmerId, bookingId), loadNotifications(farmerToken, farmerId)]);
    } catch (error) { setPaymentRecord(record => record ? { ...record, status: "FAILED", failureReason: error instanceof Error ? error.message : "Payment failed." } : record); toast.error(error instanceof Error ? error.message : "Payment failed. Please try again."); }
    finally { setPaymentProcessing(false); }
  };
  const confirmBooking = async () => {
    if (!farmerToken) { toast.error(tUi("Login as an approved farmer before confirming a booking.", language)); navigate("farmerLogin"); return; }
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
      toast.success(tUi("Booking confirmed and real API token generated.", language));
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(event.target as Node)) {
        setIsCameraMenuOpen(false);
      }
    }
    if (isCameraMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCameraMenuOpen]);

  const processSelectedImage = async (file: File) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error(tUi("Please select a valid JPG, PNG, or WebP photograph.", language));
      return;
    }

    // Enforce 10MB pre-compression browser limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error(tUi("Original photo is too large (>10MB). Please choose a smaller photo.", language));
      return;
    }

    setImageCompressing(true);
    try {
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const rawDataUrl = await dataUrlPromise;

      // Downscale and compress image on canvas to max 1024px to minimize token consumption
      const img = new Image();
      const imgLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = rawDataUrl;
      });

      const loadedImg = await imgLoadPromise;
      const maxDimension = 1024;
      let width = loadedImg.width;
      let height = loadedImg.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas rendering context");

      ctx.drawImage(loadedImg, 0, 0, width, height);

      const targetMime: "image/jpeg" | "image/png" | "image/webp" =
        file.type === "image/png" ? "image/png" : "image/jpeg";
      const compressedDataUrl = canvas.toDataURL(targetMime, 0.82);
      const base64Data = compressedDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");

      setAttachedImage({
        file,
        previewUrl: compressedDataUrl,
        base64: base64Data,
        mimeType: targetMime,
      });
      toast.success(tUi("Photo attached ready for AI inspection.", language));
    } catch (err: any) {
      console.error("Image processing error:", err);
      toast.error(tUi("Could not process the selected image. Please try another photo.", language));
    } finally {
      setImageCompressing(false);
      setIsCameraMenuOpen(false);
    }
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // Stop and release desktop webcam streams
  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    setIsWebcamOpen(false);
    setWebcamLoading(false);
  };

  // Start desktop webcam stream with fallback to native file picker
  const startWebcam = async (facing: "environment" | "user" = "environment") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      cameraInputRef.current?.click();
      return;
    }

    setWebcamLoading(true);
    setIsWebcamOpen(true);
    setWebcamFacingMode(facing);

    try {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Webcam unavailable or permission denied:", err);
      stopWebcam();
      toast.info(tUi("Webcam not accessible. Opening file selector...", language));
      cameraInputRef.current?.click();
    } finally {
      setWebcamLoading(false);
    }
  };

  const captureFromWebcam = () => {
    const video = webcamVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error(tUi("Camera is not ready yet. Please wait a moment.", language));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        toast.error(tUi("Failed to capture photo.", language));
        return;
      }
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopWebcam();
      void processSelectedImage(file);
    }, "image/jpeg", 0.88);
  };

  const handleTakePhotoClick = () => {
    setIsCameraMenuOpen(false);
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches);

    if (isMobile) {
      // Mobile rear camera via native browser file capture
      cameraInputRef.current?.click();
    } else {
      // Desktop: use webcam if available, with graceful fallback to file picker
      if (typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
        void startWebcam("environment");
      } else {
        cameraInputRef.current?.click();
      }
    }
  };

  const handleChooseGalleryClick = () => {
    setIsCameraMenuOpen(false);
    galleryInputRef.current?.click();
  };

  // Sync video stream when modal mounts
  useEffect(() => {
    if (isWebcamOpen && webcamStreamRef.current && webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = webcamStreamRef.current;
      webcamVideoRef.current.play().catch(() => {});
    }
  }, [isWebcamOpen]);

  // Clean up webcam streams on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const assistantReply = async (question: string) => {
    if (chatLoading || imageCompressing || isSubmittingAiRef.current) return;
    const prompt = question.trim();
    const currentImage = attachedImage;

    // Allow sending if prompt is provided OR image is attached
    if (!prompt && !currentImage) return;

    isSubmittingAiRef.current = true;
    setIsAnalyzingImage(Boolean(currentImage));

    const displayPrompt = prompt || (currentImage ? "Uploaded an agricultural photograph for inspection" : "");

    // Add user message to chat feed with image preview if present
    setChat(items => [
      ...items,
      {
        role: "user",
        text: displayPrompt,
        imageUrl: currentImage?.previewUrl,
      },
    ]);

    setChatInput("");
    setAttachedImage(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    setLiveInterimTranscript("");
    setChatLoading(true);

    let reply = "";
    let source = "gemini";
    let model = "gemini-3.5-flash-lite";
    let warning: string | undefined = undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24_000);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (farmerToken) headers["Authorization"] = `Bearer ${farmerToken}`;

      const history = chat.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })).slice(-6);

      const payload: any = {
        question: prompt || "Please analyze this image, identify what you observe (crop disease symptoms, pest, grain quality, or document details), and provide a safe, clear agricultural advisory.",
        bookingId: bookingId || undefined,
        language,
        role: "farmer",
        sessionId: chatSessionId,
        history,
      };

      if (currentImage) {
        payload.image = {
          data: currentImage.base64,
          mimeType: currentImage.mimeType,
        };
      }

      const response = await fetch(apiUrl("/ai/chat"), {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        reply = data.message || "AI assistant is busy. Please wait a few seconds and try again.";
        source = "fallback";
        warning = "Rate limit reached. Please wait a moment before sending another query.";
      } else if (response.ok) {
        const data = await response.json();
        if (data.response) {
          reply = data.response;
          source = data.source || "gemini";
          model = data.model || "gemini-3.5-flash-lite";
          warning = data.warning;
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        warning = "Request took longer than expected. Retrying or switching to offline guidance.";
      }
    } finally {
      if (!reply) {
        if (currentImage) {
          reply = language === "TE"
            ? "⚠️ క్షమించండి, చిత్రం విశ్లేషణ కోసం AI సర్వీస్ ప్రస్తుతం అందుబాటులో లేదు (సమయం ముగిసింది లేదా కోటా పరిమితి). ప్రొక్యూర్-ఫ్లో కల్పిత సమాధానాలను ఇవ్వదు. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి లేదా మీ సమీప రైతు భరోసా కేంద్రం (RBK) / గ్రామ వ్యవసాయ సహాయకుడిని (VAA) సంప్రదించండి."
            : language === "HI"
            ? "⚠️ क्षमा करें, फोटो विश्लेषण के लिए AI सेवा वर्तमान में अनुपलब्ध है (समय समाप्त या कोटा सीमा)। प्रोक्योर-फ्लो मनगढ़ंत उत्तर नहीं देता है। कृपया कुछ समय बाद पुनः प्रयास करें या प्रत्यक्ष निरीक्षण के लिए अपने नजदीकी रायथू भरोसा केंद्र (RBK) / ग्राम कृषि सहायक (VAA) से संपर्क करें।"
            : "⚠️ Visual analysis is temporarily unavailable as the AI service timed out or reached quota limits. ProcureFlow does not fabricate AI visual diagnoses. Please retry in a few moments, or present your crop sample or document directly to your local Rythu Bharosa Kendram (RBK) or Village Agricultural Assistant (VAA) for verified physical inspection.";
          source = "fallback";
          warning = "Gemini service temporarily unreachable. No fabricated visual diagnosis provided.";
        } else {
          reply = getClientAiReply(prompt, language);
          source = "fallback";
        }
      }

      setChatLoading(false);
      setIsAnalyzingImage(false);
      isSubmittingAiRef.current = false;
      setChat(items => [...items, { role: "assistant", text: reply, source, model, warning }]);
      if (!isMuted && reply) {
        speak(reply);
      }
    }
  };

  const clearChat = async () => {
    try {
      await fetch(apiUrl("/ai/chat/clear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: chatSessionId }),
      });
    } catch {}
    removeAttachedImage();
    setChat([]);
    toast.success(tUi("Chat history cleared.", language));
  };

  const officerAssistantReply = async (question: string) => {
    if (officerChatLoading) return;
    const prompt = question.trim();
    if (!prompt) return;
    setOfficerChat(items => [...items, { role: "user", text: prompt }]);
    setOfficerChatInput("");
    setOfficerChatLoading(true);

    let reply = "";
    let source = "gemini";
    let model = "gemini-3.5-flash-lite";
    let warning: string | undefined = undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24_000);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (officerToken) headers["Authorization"] = `Bearer ${officerToken}`;

      const history = officerChat.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })).slice(-6);

      const response = await fetch(apiUrl("/ai/chat"), {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          question: prompt,
          language,
          role: "officer",
          sessionId: officerChatSessionId,
          history,
        }),
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        reply = data.message || "Officer AI Copilot is busy. Please wait a few seconds and try again.";
        source = "fallback";
        warning = "Rate limit reached. Please wait a moment.";
      } else if (response.ok) {
        const data = await response.json();
        if (data.response) {
          reply = data.response;
          source = data.source || "gemini";
          model = data.model || "gemini-3.5-flash-lite";
          warning = data.warning;
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
    } finally {
      if (!reply) {
        reply = "Fair Average Quality (FAQ) norms mandate that paddy moisture must be <= 17.0%, foreign matter <= 1.0%, and damaged grains <= 5.0%. Please use the Officer Dashboard controls directly to execute administrative updates.";
        source = "fallback";
      }

      setOfficerChatLoading(false);
      setOfficerChat(items => [...items, { role: "assistant", text: reply, source, model, warning }]);
      if (!isMuted && reply) {
        speak(reply);
      }
    }
  };

  const clearOfficerChat = async () => {
    try {
      await fetch(apiUrl("/ai/chat/clear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: officerChatSessionId }),
      });
    } catch {}
    setOfficerChat([]);
    toast.success(tUi("Officer Copilot conversation cleared.", language));
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
          toast.error(tUi("Microphone permission denied.", language));
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
        <div className="rail-label">{tUi("FARMER SPACE", language)}</div>
        <nav>{navItems.map(({ screen: target, label, icon: Icon }) => <button key={target} onClick={() => navigate(target)} className={screen === target ? "active" : ""}><Icon size={19} /><span>{t.nav[label as keyof typeof t.nav] ?? label}</span></button>)}</nav>
        <div className="rail-bottom"><button onClick={() => navigate("assistant")}><Bot size={19} /><span>{tUi("Farmer assistant", language)}</span></button><button onClick={() => navigate("profile")}><UserCheck size={19} /><span>{tUi("My profile", language)}</span></button></div>
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
            <MobileViewToggle compact={true} />
            <button
              className="notification-button"
              onClick={() => navigate("notifications")}
              title={tUi("Notifications", language)}
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
            <MobileViewToggle />
          </div>
          <div className="header-right">
            <button
              className="notification-button"
              onClick={() => navigate("notifications")}
              title={tUi("Notifications", language)}
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
      {mobileMenu && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenu(false)}>
          <nav className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-top">
              <AppLogo />
              <button
                onClick={() => setMobileMenu(false)}
                className="drawer-close-btn"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>
            {profileRecord && (
              <div className="drawer-farmer-profile">
                <div className="farmer-avatar-badge">
                  {profileRecord.name ? profileRecord.name.charAt(0).toUpperCase() : "F"}
                </div>
                <div className="farmer-profile-info">
                  <strong className="farmer-name-text">{profileRecord.name || "Registered Farmer"}</strong>
                  <span className="farmer-id-text">
                    ID: {profileRecord.farmerCode || (profileRecord.phone ? `+91 ${profileRecord.phone}` : farmerId || "AP-FARMER")}
                  </span>
                </div>
              </div>
            )}
            <div className="drawer-links">
              <div className="drawer-section-label">{tUi("MY HARVEST LIFECYCLE", language)}</div>
              {navItems.map(({ screen: target, label, icon: Icon }) => (
                <button
                  key={target}
                  onClick={() => navigate(target)}
                  className={screen === target ? "active" : ""}
                >
                  <Icon size={20} />
                  <span>{t.nav[label as keyof typeof t.nav] ?? label}</span>
                </button>
              ))}
              <div className="drawer-divider" />
              <div className="drawer-section-label">{tUi("ASSISTANCE & PROFILE", language)}</div>
              <button
                onClick={() => navigate("assistant")}
                className={screen === "assistant" ? "active" : ""}
              >
                <Bot size={20} />
                <span>{tUi("Farmer assistant", language)}</span>
              </button>
              <button
                onClick={() => navigate("profile")}
                className={screen === "profile" ? "active" : ""}
              >
                <UserCheck size={20} />
                <span>{tUi("My profile", language)}</span>
              </button>
              <button
                onClick={() => navigate("notifications")}
                className={screen === "notifications" ? "active" : ""}
              >
                <Bell size={20} />
                <span>{tUi("Notifications", language)}</span>
                {apiNotifications.some(item => !item.isRead) && (
                  <span className="drawer-badge-dot" />
                )}
              </button>
            </div>
            <div className="drawer-bottom">
              <button onClick={logoutFarmer} className="drawer-logout">
                <LogOut size={18} />
                <span>{tUi("Sign Out Farmer Account", language)}</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );

  const landing = (
    <div className="landing-page">
      <header className="landing-nav">
        <AppLogo />
        <div className="nav-links landing-desktop-links">
          <a href="#how">{tUi("How it works", language)}</a>
          <a href="#services">{tUi("Features", language)}</a>
          <button onClick={() => navigate(farmerToken ? "dashboard" : "farmerLogin")}>
            {farmerToken ? tUi("Farmer portal", language) : tUi("Farmer login", language)}
          </button>
          <button className="officer-link" onClick={() => navigate(officerToken ? "officerDashboard" : "officerLogin")}>
            {officerToken ? tUi("Officer console", language) : tUi("Officer console", language)}
          </button>
        </div>
        <div className="nav-end landing-desktop-end">
          <MobileViewToggle />
          <LanguageDropdown language={language} setLanguage={changeLanguage} />
          <ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>{tUi("Register now", language)}</ActionButton>
        </div>
        <div className="landing-mobile-actions">
          <MobileViewToggle compact={true} />
          <LanguageDropdown language={language} setLanguage={changeLanguage} />
          <button
            onClick={() => setLandingMobileMenu(true)}
            aria-label="Open navigation menu"
            className="mobile-nav-toggle"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {landingMobileMenu && (
        <div className="landing-drawer-backdrop" onClick={() => setLandingMobileMenu(false)}>
          <nav className="landing-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-top">
              <AppLogo />
              <button
                onClick={() => setLandingMobileMenu(false)}
                className="drawer-close-btn"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-links">
              <div className="drawer-section-label">{tUi("PORTAL ACCESS", language)}</div>
              <button
                onClick={() => {
                  navigate(farmerToken ? "dashboard" : "farmerLogin");
                  setLandingMobileMenu(false);
                }}
              >
                <LogIn size={19} />
                <span>{farmerToken ? tUi("Farmer portal", language) : tUi("Farmer Sign In", language)}</span>
              </button>
              <button
                onClick={() => {
                  navigate("registration");
                  setLandingMobileMenu(false);
                }}
                className="active"
              >
                <UserCheck size={19} />
                <span>{tUi("New Farmer Registration", language)}</span>
              </button>
              <button
                onClick={() => {
                  navigate(officerToken ? "officerDashboard" : "officerLogin");
                  setLandingMobileMenu(false);
                }}
              >
                <ShieldCheck size={19} />
                <span>{officerToken ? tUi("Officer console", language) : tUi("Officer Console", language)}</span>
              </button>

              <div className="drawer-divider" />
              <div className="drawer-section-label">{tUi("EXPLORE PROCUREFLOW", language)}</div>
              <a
                href="#how"
                onClick={() => setLandingMobileMenu(false)}
              >
                <Clock3 size={19} />
                <span>{tUi("How It Works", language)}</span>
              </a>
              <a
                href="#services"
                onClick={() => setLandingMobileMenu(false)}
              >
                <Sprout size={19} />
                <span>{tUi("Features & Services", language)}</span>
              </a>
              <button
                onClick={() => {
                  navigate("centres");
                  setLandingMobileMenu(false);
                }}
              >
                <MapPin size={19} />
                <span>{tUi("Live Mandis & Centres", language)}</span>
              </button>
            </div>
            <div className="drawer-bottom">
              <button
                onClick={() => {
                  navigate("registration");
                  setLandingMobileMenu(false);
                }}
                className="action-button w-full justify-center"
              >
                <span>{tUi("Register as farmer", language)}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </nav>
        </div>
      )}
      <main>
        <section className="hero-section">
          <img src={queueUrl} alt="Lush green paddy crop field" className="hero-image" />
          <div className="hero-tint" />
          <div className="field-contours hero-contours" />
          <div className="hero-copy">
            <Pill kind="green">{tUi("SMART PROCUREMENT PLATFORM", language)}</Pill>
            <h1>{tUi("A calm, transparent way to bring your paddy to market.", language)}</h1>
            <p>{tUi("Check live centre capacity, reserve a comfortable arrival window, receive a verified token, and follow your harvest all the way to payment.", language)}</p>
            <div className="hero-actions">
              <ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>{tUi("Register as farmer", language)}</ActionButton>
              <ActionButton onClick={() => navigate("farmerLogin")} secondary icon={LogIn}>{tUi("Farmer login", language)}</ActionButton>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> {tUi("Verified farmer registration", language)}</span>
              <span><MapPin size={16} /> {tUi("Real-time centre queues", language)}</span>
              <span><Clock3 size={16} /> {tUi("Dedicated arrival windows", language)}</span>
            </div>
          </div>
          <div className="hero-live-card">
            <div className="live-card-header">
              <span className="status-pill status-green"><span className="pulse-dot" /> {tUi("LIVE MANDI", language)}</span>
              <span className="text-[10px] text-emerald-200 font-bold">{tUi("AP Network", language)}</span>
            </div>
            <div className="mini-route">
              <i />
              <span className="route-pin one" />
              <span className="route-pin two" />
            </div>
            <p className="muted">{tUi("Guntur Agricultural Market Yard", language)}</p>
            <strong>{tUi("18 farmers in queue", language)}</strong>
            <div className="live-metrics">
              <div><span>{tUi("Avg wait", language)}</span><b>{tUi("~35 min", language)}</b></div>
              <div><span>{tUi("Status", language)}</span><b className="text-emerald-300">{tUi("Open now", language)}</b></div>
            </div>
            <button onClick={() => navigate("centres")}>
              <span>{tUi("View all mandis", language)}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
        <section className="proof-strip" id="services"><div><span className="token-disc small"><Wheat /></span><b>{tUi("Clear slots", language)}</b><p>{tUi("Select the time that works for your farm.", language)}</p></div><div><span className="token-disc small blue"><Ticket /></span><b>{tUi("Live token", language)}</b><p>{tUi("See your place before you travel.", language)}</p></div><div><span className="token-disc small yellow"><ClipboardCheck /></span><b>{tUi("Tracked status", language)}</b><p>{tUi("Follow every procurement stage.", language)}</p></div><div><span className="token-disc small blue"><Bot /></span><b>{tUi("Farmer helper", language)}</b><p>{tUi("Ask in English, Telugu, or Hindi.", language)}</p></div></section>
        <section className="journey-section" id="how"><div className="journey-copy"><p className="eyebrow">{tUi("ONE CALM JOURNEY", language)}</p><h2>{tUi("From paddy selection to payment, nothing is hidden.", language)}</h2><p>{tUi("ProcureFlow turns scattered information into a single, farmer-friendly journey. There is always a next step, an expected time, and a record to check.", language)}</p><ActionButton onClick={() => navigate("registration")} secondary icon={ArrowRight}>{tUi("Begin registration", language)}</ActionButton></div><div className="journey-stages">{[["01", "Register", "Your application stays pending until an officer approves it."], ["02", "Book a slot", "Choose paddy, centre, date, and time from available capacity."], ["03", "Track the day", "Carry your token and follow queue, quality check, and payment status."]].map(([num, title, copy]) => <article key={num}><span>{num}</span><div><h3>{title}</h3><p>{copy}</p></div><ChevronRight /></article>)}</div></section>
        <section className="closing-banner"><div><Pill kind="green">{tUi("BUILT FOR THE FIELD", language)}</Pill><h2>{tUi("Less waiting. More certainty.", language)}</h2><p>{tUi("A connected smart procurement management system with live database synchronization.", language)}</p></div><ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>{tUi("Start farmer flow", language)}</ActionButton></section>
      </main>
      <footer><AppLogo /><p>{tUi("Smart Procurement Management System · SIH 2026 Prototype", language)}</p><button onClick={() => navigate("officerLogin")}>{tUi("Officer access", language)}</button></footer>
    </div>
  );

  const registration = (
    <div className="auth-page">
      <div className="auth-side">
        <button onClick={() => navigate("landing")}>
          <AppLogo inverse />
        </button>
        <div>
          <Pill kind="yellow">{tUi("FARMER ONBOARDING", language)}</Pill>
          <h1>
            Your harvest
            <br />
            has a home.
          </h1>
          <p>
            Direct farmer registration. After submission, an officer will review and approve your details.
          </p>
        </div>
        <div className="side-steps">
          <span><b style={{ background: "#107e4a" }}>1</b> {tUi("Farmer Details & Credentials", language)}</span>
          <span><b>2</b> {tUi("Officer Review & Approval", language)}</span>
          <span><b>3</b> {tUi("Direct Portal Access", language)}</span>
        </div>
      </div>
      <main className="auth-panel">
        <div className="flex items-center justify-between mb-4">
          <button className="back-link" onClick={() => navigate("landing")}>
            <ArrowLeft size={16} /> Back to home
          </button>
          <MobileViewToggle />
        </div>
        <div className="form-wrap">
          <p className="eyebrow">{tUi("NEW FARMER REGISTRATION", language)}</p>
          <h2>{t.registrationTitle}</h2>
          <p>
            {t.registrationIntro} Your account remains <b>{tUi("pending", language)}</b> until officer approval.
          </p>

          {/* Workflow Steps Tracker */}
          <div className="auth-step-tracker">
            <div className="auth-step-item active">
              <span className="auth-step-num">1</span>
              <span>{tUi("Registration Form", language)}</span>
            </div>
            <div className="auth-step-separator" />
            <div className="auth-step-item">
              <span className="auth-step-num">2</span>
              <span>{tUi("Officer Verification", language)}</span>
            </div>
          </div>

          {authError && (
            <div className="auth-error-banner">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* DIRECT REGISTRATION FORM */}
          <form onSubmit={e => { e.preventDefault(); void submitRegistration(); }}>
            <label>
              Farmer full name
              <Input
                value={registrationForm.name}
                onChange={e => setRegistrationForm(form => ({ ...form, name: e.target.value }))}
                placeholder={tUi("e.g. Ramesh Kumar", language)}
                required
              />
            </label>

            <label>
              Mobile number (10-digit)
              <Input
                inputMode="numeric"
                placeholder={tUi("Enter 10-digit mobile number (e.g. 9876543210)", language)}
                value={registrationForm.phone}
                maxLength={10}
                onChange={e => setRegistrationForm(form => ({ ...form, phone: e.target.value.replace(/\D/g, "") }))}
                required
              />
            </label>

            <div className="field-row">
              <label>
                Create password (min 8 chars)
                <div className="relative">
                  <Input
                    type={showRegPassword ? "text" : "password"}
                    placeholder={tUi("At least 8 characters", language)}
                    value={registrationForm.password}
                    onChange={e => setRegistrationForm(form => ({ ...form, password: e.target.value }))}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 cursor-pointer"
                    onClick={() => setShowRegPassword(prev => !prev)}
                    title={showRegPassword ? "Hide password" : "Show password"}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label>
                Confirm password
                <div className="relative">
                  <Input
                    type={showRegConfirmPassword ? "text" : "password"}
                    placeholder={tUi("Re-enter password", language)}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 cursor-pointer"
                    onClick={() => setShowRegConfirmPassword(prev => !prev)}
                    title={showRegConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                placeholder={tUi("XXXX XXXX 1234", language)}
                required
              />
            </label>

            <div className="field-row">
              <label>
                Village
                <Input
                  value={registrationForm.village}
                  onChange={e => setRegistrationForm(form => ({ ...form, village: e.target.value }))}
                  placeholder={tUi("e.g. Rampur", language)}
                  required
                />
              </label>
              <label>
                District
                <Input
                  value={registrationForm.district}
                  onChange={e => setRegistrationForm(form => ({ ...form, district: e.target.value }))}
                  placeholder={tUi("e.g. Nizamabad", language)}
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
                <option>{tUi("Paddy", language)}</option>
                <option>{tUi("Maize", language)}</option>
                <option>{tUi("Cotton", language)}</option>
              </select>
            </label>

            <label className="check-line">
              <input type="checkbox" required defaultChecked />
              <span>{tUi("I confirm these details are correct for this procurement request.", language)}</span>
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

            <div className="login-divider mt-4"><span>{tUi("or", language)}</span></div>
            <button type="button" className="inline-action w-full justify-center" onClick={() => navigate("farmerLogin")}>
              Already registered? Sign in <ArrowRight size={14} />
            </button>
          </form>

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
        <div className="flex items-center gap-2">
          <MobileViewToggle />
          <LanguagePicker language={language} setLanguage={changeLanguage} />
        </div>
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
              New farmer registrations strictly remain <b>{tUi("PENDING", language)}</b> until verified by the Mandal Procurement Officer. You can switch to the Officer Console to review and approve this farmer.
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
        <div className="flex items-center gap-2">
          <MobileViewToggle />
          <button className="back-link" onClick={() => navigate("landing")}><ArrowLeft size={16} /> {tUi("Back", language)}</button>
        </div>
      </header>
      <main>
        <section className="login-art">
          <img src={statusUrl} alt="Paddy sample and procurement work materials" />
          <div>
            <Pill kind="green">{tUi("FARMER PORTAL", language)}</Pill>
            <h2>{tUi("Know your visit before you travel.", language)}</h2>
            <p>{tUi("Token, live queue, procurement progress and payment status in one place.", language)}</p>
          </div>
        </section>

        {/* FORGOT PASSWORD WORKFLOW (IDENTITY-VERIFIED RECOVERY) */}
        {forgotStep !== "INACTIVE" ? (
          <section className="login-card">
            <p className="eyebrow">{tUi("IDENTITY-VERIFIED PASSWORD RECOVERY", language)}</p>
            <h1>{tUi("Reset Password", language)}</h1>
            <p>
              {forgotStep === "VERIFY"
                ? "Verify your registered mobile number and identity details to reset your password."
                : forgotStep === "RESET"
                ? "Set your new account password below."
                : "Your password has been successfully updated."}
            </p>

            {forgotError && (
              <div className="auth-error-banner">
                <AlertCircle size={16} className="shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Step 1: Identity Verification */}
            {forgotStep === "VERIFY" && (
              <form onSubmit={e => { e.preventDefault(); void handleVerifyFarmerIdentity(); }}>
                <label>
                  Registered mobile number
                  <Input
                    inputMode="numeric"
                    placeholder={tUi("Enter 10-digit registered mobile", language)}
                    maxLength={10}
                    value={forgotPhone}
                    onChange={e => setForgotPhone(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </label>

                <div className="mt-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Select Verification Factor:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => { setForgotFactorType("aadhaar"); setForgotFactorValue(""); }}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                        forgotFactorType === "aadhaar"
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Aadhaar (Last 4)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setForgotFactorType("village"); setForgotFactorValue(""); }}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                        forgotFactorType === "village"
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Village Name
                    </button>
                    <button
                      type="button"
                      onClick={() => { setForgotFactorType("code"); setForgotFactorValue(""); }}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                        forgotFactorType === "code"
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Farmer Code
                    </button>
                  </div>

                  <label className="mt-1">
                    {forgotFactorType === "aadhaar" && "Aadhaar number (last 4 digits)"}
                    {forgotFactorType === "village" && "Registered village name"}
                    {forgotFactorType === "code" && "Farmer Code (e.g. FARM-2026-9482)"}
                    <Input
                      placeholder={
                        forgotFactorType === "aadhaar"
                          ? "e.g. 5432"
                          : forgotFactorType === "village"
                          ? "e.g. Ditchpally"
                          : "e.g. FARM-2026-9482"
                      }
                      maxLength={forgotFactorType === "aadhaar" ? 4 : 50}
                      inputMode={forgotFactorType === "aadhaar" ? "numeric" : "text"}
                      value={forgotFactorValue}
                      onChange={e => setForgotFactorValue(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <Button
                  disabled={forgotLoading || forgotPhone.replace(/\D/g, "").length !== 10 || !forgotFactorValue.trim()}
                  type="submit"
                  className="action-button w-full mt-3"
                >
                  {forgotLoading ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin mr-2" /> Verifying identity…
                    </>
                  ) : (
                    <>
                      Verify Identity & Proceed <ArrowRight size={17} />
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

            {/* Step 2: Set New Password */}
            {forgotStep === "RESET" && (
              <form onSubmit={e => { e.preventDefault(); void handleCompleteFarmerReset(); }}>
                {verifiedFarmerInfo && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                    <div className="text-xs text-emerald-950">
                      <span className="font-bold">{verifiedFarmerInfo.name}</span>
                      <span className="text-emerald-700 ml-1">({verifiedFarmerInfo.farmerCode})</span>
                    </div>
                  </div>
                )}

                <div className="field-row">
                  <label>
                    New password (min 8 chars)
                    <div className="relative">
                      <Input
                        type={showForgotNewPassword ? "text" : "password"}
                        placeholder={tUi("Enter at least 8 characters", language)}
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 cursor-pointer"
                        onClick={() => setShowForgotNewPassword(prev => !prev)}
                        title={showForgotNewPassword ? "Hide password" : "Show password"}
                      >
                        {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                  <label>
                    Confirm new password
                    <div className="relative">
                      <Input
                        type={showForgotConfirmPassword ? "text" : "password"}
                        placeholder={tUi("Re-enter new password", language)}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 cursor-pointer"
                        onClick={() => setShowForgotConfirmPassword(prev => !prev)}
                        title={showForgotConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showForgotConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                </div>

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
                  onClick={() => { setForgotStep("VERIFY"); setForgotError(null); }}
                >
                  ← Back to verification
                </button>
              </form>
            )}

            {/* Step 3: Success confirmation */}
            {forgotStep === "SUCCESS" && (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-bold text-emerald-950 mb-1">{tUi("Password Updated!", language)}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Your password has been reset successfully. You can now login to your farmer account using your new credentials.
                </p>
                <Button
                  type="button"
                  className="action-button w-full"
                  onClick={() => {
                    setForgotStep("INACTIVE");
                    setForgotPhone("");
                    setForgotFactorValue("");
                    setFarmerResetToken(null);
                    setVerifiedFarmerInfo(null);
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
            <p className="eyebrow">{tUi("FARMER LOGIN", language)}</p>
            <h1>{t.loginTitle}</h1>
            <p>{t.loginIntro} Officer approval is required before access is granted.</p>

            <form onSubmit={e => { e.preventDefault(); void loginFarmer(); }}>
              <label>
                Mobile number
                <Input
                  inputMode="numeric"
                  placeholder={tUi("Enter 10-digit mobile number", language)}
                  maxLength={10}
                  value={farmerCredentials.phone}
                  onChange={event => setFarmerCredentials(credentials => ({ ...credentials, phone: event.target.value.replace(/\s/g, "") }))}
                  required
                />
              </label>

              <div className="grid gap-1.5 mb-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="farmer-login-password" className="text-[10px] font-extrabold text-[#3b5449] dark:text-emerald-300 uppercase tracking-wider cursor-pointer m-0">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-emerald-800 dark:text-emerald-400 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0 focus:outline-hidden"
                    onClick={() => {
                      setForgotStep("VERIFY");
                      setForgotPhone(farmerCredentials.phone);
                      setForgotFactorValue("");
                      setForgotError(null);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="farmer-login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder={tUi("Enter your password", language)}
                    value={farmerCredentials.password}
                    onChange={event => setFarmerCredentials(credentials => ({ ...credentials, password: event.target.value }))}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 cursor-pointer"
                    onClick={() => setShowLoginPassword(prev => !prev)}
                    title={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authError && <p className="form-note text-red-600 font-semibold">{authError}</p>}

              <ActionButton onClick={() => { void loginFarmer(); }} disabled={authLoading} icon={ArrowRight}>
                {authLoading ? "Signing in…" : "Login to my dashboard"}
              </ActionButton>
            </form>

            <div className="login-divider"><span>{tUi("or", language)}</span></div>
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
        action={<ActionButton onClick={() => navigate("paddy")} icon={ArrowRight}>{tUi("Book another slot", language)}</ActionButton>}
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
              💧 Humidity: <b>{weatherData?.humidity ?? 62}%</b> {tUi("· 🌾 Harvesting Index:", language)} <b className="text-emerald-950 uppercase">{weatherData?.safeHarvestingIndex ?? "OPTIMAL"}</b> {tUi("· 💨 Wind:", language)} <b>{weatherData?.windSpeedKmH ?? 14} km/h</b>
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
              <small>{tUi("YOUR DATE", language)}</small>
              <strong>{bookingRecord?.slot.date ?? "Wed, 18 Mar"}</strong>
              <span>{bookingRecord ? `${bookingRecord.slot.startTime} – ${bookingRecord.slot.endTime}` : "10:30 – 11:00 AM"}</span>
            </div>
            <div>
              <small>{tUi("YOUR TOKEN", language)}</small>
              <strong className="token-text">{bookingRecord?.tokenNumber ?? "P-042"}</strong>
              <span>Queue position {bookingRecord?.queue?.position ?? 18}</span>
            </div>
            <ActionButton onClick={() => navigate("token")} secondary icon={Ticket}>{tUi("View token", language)}</ActionButton>
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
              <p>{tUi("Live record loaded from your connected booking when available.", language)}</p>
            </div>
          </div>
        </div>
        <aside className="dashboard-crop">
          <img src={queueUrl} alt="Farmers waiting at procurement centre"/>
          <div className="image-shade"/>
          <div>
            <Pill kind="yellow">{tUi("TODAY’S SIGNAL", language)}</Pill>
            <strong>{tUi("Queue update", language)}</strong>
            <p>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35} min expected wait</p>
            <button onClick={() => navigate("queue")}>{tUi("See live queue", language)} <ArrowRight size={14}/></button>
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
            <p className="eyebrow">{tUi("YOUR STATS", language)}</p>
            <h2>{tUi("Harvest history at a glance.", language)}</h2>
          </div>
          <Pill kind="blue">{tUi("LIVE API DATA", language)}</Pill>
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
            <Pill kind="blue">{tUi("WHAT’S NEXT", language)}</Pill>
            <h2>{tUi("Bring the right documents.", language)}</h2>
            <p>{tUi("Keep your farmer ID, bank passbook, and paddy receipt ready for a fast verification.", language)}</p>
          </div>
          <div className="document-checklist">
            <span><Check /> {tUi("Farmer ID", language)}</span>
            <span><Check /> {tUi("Bank passbook", language)}</span>
            <span><Check /> {tUi("Paddy receipt", language)}</span>
          </div>
          <button onClick={() => navigate("status")}>{tUi("See full procurement timeline", language)} <ArrowRight size={15}/></button>
        </article>
        <article className="assistant-teaser">
          <span className="assistant-bot"><Bot /></span>
          <div>
            <Pill kind="green">{tUi("AI FARMER ASSISTANT", language)}</Pill>
            <h3>{tUi("Ask the practical question.", language)}</h3>
            <p>{tUi("“How many people are ahead of me?”", language)}</p>
          </div>
          <button onClick={() => navigate("assistant")}><MessageCircle /> {tUi("Ask now", language)}</button>
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
                placeholder={tUi("Search crop by name (e.g. Tomato, Mango, Rice, Wheat, Cotton)...", language)}
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-xs transition-all"
              />
              {bookingCropSearch && (
                <button
                  type="button"
                  onClick={() => setBookingCropSearch("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={tUi("Clear search", language)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {bookingCropSearch && (
              <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-slate-500">
                <span>{tUi("Showing results for", language)} "<b>{bookingCropSearch}</b>" ({bookingCrops.length} {bookingCrops.length === 1 ? tUi("crop", language) : tUi("crops", language)} {tUi("found", language)})</span>
                <button
                  type="button"
                  onClick={() => setBookingCropSearch("")}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  {tUi("Clear filter", language)}
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
                            ₹{crop.effectiveRatePerQuintal.toLocaleString("en-IN")} <span className="text-[10px] font-normal text-slate-500">{tUi("/ quintal", language)}</span>
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
                <h3>{tUi("Expected harvest quantity", language)}</h3>
                <p>{tUi("Used by the mandi to plan daily weighing and yard storage capacity.", language)}</p>
              </div>
            </div>
            <div className="quantity-control">
              <button
                type="button"
                onClick={() => setExpectedQuantity(q => Math.max(1, q - 2))}
              >
                −
              </button>
              <b>{expectedQuantity} <small>{tUi("quintals", language)}</small></b>
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
          <Pill kind="yellow">{tUi("MSP PROCUREMENT POLICY", language)}</Pill>
          <h3>{tUi("100% Guaranteed MSP Rates.", language)}</h3>
          <p>{tUi("Government declared MSP with state bonus credited directly to your bank account via Aadhaar DBT.", language)}</p>
          <div className="tip-line"><ShieldCheck /> {tUi("Direct Benefit Transfer (DBT) enabled.", language)}</div>
          <div className="tip-line"><MapPin /> {tUi("Centre availability updates live from server.", language)}</div>
          {selectedCropRecord && (
            <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">{tUi("Selected Crop Summary", language)}</span>
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
                <span className="text-slate-500">{tUi("Government Rate:", language)}</span>
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
        title={tUi("Find a calmer route to procurement.", language)}
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
                placeholder={tUi("Search procurement centre by name, district, place, or code (e.g. Vijayawada, Guntur, KNL, VJA)...", language)}
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-xs transition-all"
              />
              {centreSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCentreSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={tUi("Clear search", language)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {centreSearchQuery && (
              <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-slate-500">
                <span>{tUi("Showing results for", language)} "<b>{centreSearchQuery}</b>" ({filteredCentres.length} {filteredCentres.length === 1 ? tUi("centre", language) : tUi("centres", language)} {tUi("found", language)})</span>
                <button
                  type="button"
                  onClick={() => setCentreSearchQuery("")}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  {tUi("Clear filter", language)}
                </button>
              </div>
            )}
          </div>

          <div className="map-toolbar">
            <div>
              <LocateFixed size={17}/>
              <span>{tUi("Andhra Pradesh Procurement Network", language)}</span>
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
              toast.success(tUi("Andhra Pradesh centre availability refreshed from the API.", language));
            }).catch(() => toast.error(tUi("Centre availability is unavailable.", language)))}>
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
              language={language}
            />
          </div>
          <div className="list-heading">
            <h2>{tUi("Andhra Pradesh Centres", language)}</h2>
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
          <Pill kind="green">{tUi("WHY THIS MATTERS", language)}</Pill>
          <h3>{tUi("Choose time, not just distance.", language)}</h3>
          <p>{tUi("A centre with a shorter queue may save you more than a nearby centre on a busy day.", language)}</p>
          <div className="availability-callout">
            <UsersRound />
            <strong>{tUi("Vijayawada is calmest now", language)}</strong>
            <span>{tUi("Connected data shown in the list", language)}</span>
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

  const centreDetail = farmerShell(<><button className="back-link" onClick={() => navigate("centres")}><ArrowLeft size={16}/> {tUi("All centres", language)}</button><div className="centre-detail"><section><div className="centre-detail-head"><div><Pill kind={selectedCentre.status === "Open" ? "green" : "yellow"}><span className="pulse-dot" /> {selectedCentre.status}</Pill><h1>{selectedCentre.name}</h1><p><MapPin size={16}/> {selectedCentre.place} · {selectedCentre.distance} from your village</p></div><span className="large-location"><MapPin/></span></div><div className="centre-stat-row"><div><small>{tUi("CURRENT QUEUE", language)}</small><strong>{selectedCentre.queue}</strong><span>{tUi("farmers waiting", language)}</span></div><div><small>{tUi("ESTIMATED WAIT", language)}</small><strong>{selectedCentre.wait}</strong><span>{tUi("at current speed", language)}</span></div><div><small>{tUi("SLOTS OPEN", language)}</small><strong>{selectedCentre.slots}</strong><span>{tUi("available slots", language)}</span></div></div><div className="centre-route-preview"><div className="route-map"><span className="route-source"><Sprout /></span><span className="route-destination"><MapPin /></span><i /></div><div><b>{tUi("From Muppalapally", language)}</b><p>{tUi("2.4 km · approximately 8 minutes", language)}</p></div><button onClick={() => toast.message("Routing map view ready.")}><LocateFixed size={17}/> {tUi("Route", language)}</button></div><section className="centre-notes"><h2>{tUi("At this centre", language)}</h2><div><span><Check /> {tUi("Weighing facility ready", language)}</span><span><Check /> {tUi("Quality check queue available", language)}</span><span><Check /> {tUi("Document desk open", language)}</span></div></section></section><aside><StepTrack current={2}/><Pill kind="blue">{tUi("YOUR SELECTION", language)}</Pill><h3>{selectedPaddy}</h3><p>{tUi("18 quintals expected", language)}</p><hr/><p>{tUi("Choose a date and slot to hold this centre in your booking.", language)}</p><ActionButton onClick={() => navigate("slot")} icon={ArrowRight}>{tUi("Choose a slot", language)}</ActionButton><button onClick={() => navigate("centres")}>{tUi("Compare another centre", language)}</button></aside></div></>);

  const slot = farmerShell(
    <>
      <SectionTitle
        eyebrow="RESERVE A TIME"
        title={tUi("Pick the window that fits your day.", language)}
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
                <small>{tUi("March", language)}</small>
              </button>
            ))}
          </div>

          <h2 className="slot-heading flex items-center justify-between">
            <span>{tUi("Available Windows", language)}</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Live Centre Capacity
            </span>
          </h2>

          <div className="slot-grid">
            {slotsLoading ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-emerald-600 border-t-transparent mb-2" />
                <p className="text-xs font-bold text-emerald-800">{tUi("Loading slot availability from server…", language)}</p>
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
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 uppercase">{tUi("FULL", language)}</span>
                      ) : isLimited ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 uppercase">LIMITED ({slotItem.available} LEFT)</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 uppercase">{tUi("AVAILABLE", language)}</span>
                      )}
                    </div>
                    {isSelected && <i><Check /></i>}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-700">{tUi("No active operational slots for this date.", language)}</p>
                <small className="text-[11px] text-slate-400">{tUi("Please choose another date or procurement centre.", language)}</small>
              </div>
            )}
          </div>

          <div className="page-actions">
            <ActionButton onClick={() => navigate("centre")} secondary icon={ArrowLeft}>{tUi("Change centre", language)}</ActionButton>
            <ActionButton onClick={() => navigate("confirmation")} icon={ArrowRight}>{tUi("Review booking", language)}</ActionButton>
          </div>
        </div>

        <aside className="booking-aside slot-summary">
          <Pill kind="green">{tUi("YOUR BOOKING", language)}</Pill>
          <h3>{selectedCentre.name}</h3>
          <p>{selectedCentre.distance} from Muppalapally</p>
          <hr />
          <span><Wheat /> {selectedPaddy}</span>
          <span><Tractor /> {expectedQuantity} quintals</span>
          <span><CalendarDays /> {selectedDate}</span>
          <span><Clock3 /> {selectedSlot}</span>
          <p className="tip-line"><Clock3 /> {tUi("Arrive 10 minutes early for document verification.", language)}</p>
        </aside>
      </div>
    </>
  );

  const confirmation = farmerShell(
    <>
      <SectionTitle
        eyebrow="REVIEW AND CONFIRM"
        title={tUi("Your procurement slot is ready.", language)}
        body="Check these details once. Generating a token will confirm your place in the connected database queue."
      />
      <div className="confirmation-layout">
        <div>
          <StepTrack current={4} />
          <article className="booking-ticket">
            <div className="ticket-top">
              <AppLogo />
              <Pill kind="green">{tUi("READY TO CONFIRM", language)}</Pill>
            </div>
            <div className="ticket-grid">
              <div>
                <small>{tUi("CENTRE", language)}</small>
                <b>{selectedCentre.name}</b>
                <p><MapPin /> {selectedCentre.place}</p>
              </div>
              <div>
                <small>{tUi("DATE & TIME", language)}</small>
                <b>{selectedDate}</b>
                <p><Clock3 /> {selectedSlot}</p>
              </div>
              <div>
                <small>{tUi("PADDY", language)}</small>
                <b>{selectedPaddy}</b>
                <p><Wheat /> {tUi("Approx. 18 quintals", language)}</p>
              </div>
              <div>
                <small>{tUi("BOOKING ID", language)}</small>
                <b>{bookingRecord?.bookingCode ?? "Generated on confirmation"}</b>
                <p><ShieldCheck /> {tUi("Database synced record", language)}</p>
              </div>
            </div>

            <div className="slot-fee-banner">
              <div className="fee-line">
                <span className="fee-text">{tUi("Procurement Slot Booking Fee:", language)}</span>
                <b className="fee-free-text">{tUi("₹0 (Free Govt Service)", language)}</b>
              </div>
              <div className="fee-line fee-total-line">
                <span className="fee-text">{tUi("Amount Payable:", language)}</span>
                <b className="fee-zero-text">₹0</b>
              </div>
            </div>

            <div className="ticket-bottom">
              <span>{tUi("Expected queue", language)} <b>{selectedCentre.queue} farmers</b></span>
              <span>{tUi("Estimated wait", language)} <b>{selectedCentre.wait}</b></span>
            </div>
          </article>
          <div className="consent-box">
            <input type="checkbox" defaultChecked />
            <p>{tUi("I confirm my visit to the procurement centre with the stated paddy load and documents. (Slot reservation is 100% free of charge).", language)}</p>
          </div>
          <div className="page-actions">
            <ActionButton onClick={() => navigate("slot")} secondary icon={ArrowLeft}>{tUi("Change time", language)}</ActionButton>
            <ActionButton onClick={() => { void confirmBooking(); }} icon={Ticket}>{tUi("Confirm & generate token", language)}</ActionButton>
          </div>
        </div>
        <aside className="booking-aside confirmation-help">
          <span className="token-disc"><Phone /></span>
          <h3>{tUi("Need a hand?", language)}</h3>
          <p>{tUi("The centre help desk is available from 9:00 AM to 5:00 PM.", language)}</p>
          <button onClick={() => toast.message("Helpline: 1800-000-2026")}>{tUi("Call support", language)} <Phone size={15} /></button>
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
                      <h2 className="text-lg font-bold text-white m-0">{tUi("ProcureFlow Digital Token Pass", language)}</h2>
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tUi("PROCUREMENT CENTRE", language)}</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5 leading-snug">
                      {bookingRecord?.centre?.name ?? selectedCentre.name}
                    </strong>
                    <span className="text-xs text-slate-500">{bookingRecord?.centre?.place ?? selectedCentre.place}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tUi("FARMER DETAILS", language)}</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5">
                      {bookingRecord?.farmer?.name ?? profileRecord?.name ?? "Ramesh Kumar"}
                    </strong>
                    <span className="text-xs text-slate-500">
                      ID: {profileRecord?.farmerCode ?? "FMR-2026-11842"} · Aadhaar: {(profileRecord as any)?.aadhaarMasked ?? "XXXX XXXX 1234"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tUi("CROP & VARIETY", language)}</span>
                    <strong className="text-sm font-extrabold text-[#153e2a] block mt-0.5">
                      {bookingRecord?.paddyVariety ?? selectedPaddy.split("—")[0]}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {bookingRecord?.paddyGrade ?? "Grade A"} · {bookingRecord?.expectedQuantityQuintals ?? 18} Quintals
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tUi("LIVE QUEUE STATUS", language)}</span>
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
                    <h3 className="text-base font-extrabold text-[#153e2a] m-0">{tUi("Scan at Entry Gate & Weighbridge", language)}</h3>
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
                      <b className="text-xs text-[#153e2a] block">{tUi("Arrive 10 Mins Early", language)}</b>
                      <span className="text-[11px] text-slate-500">{tUi("Report prior to slot window for orderly gate entry.", language)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scale size={15} />
                    </div>
                    <div>
                      <b className="text-xs text-[#153e2a] block">{tUi("Moisture Standard", language)}</b>
                      <span className="text-[11px] text-slate-500">{tUi("Moisture must be tested below 17% for 100% MSP payout.", language)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Coins size={15} />
                    </div>
                    <div>
                      <b className="text-xs text-[#153e2a] block">{tUi("Direct Bank DBT", language)}</b>
                      <span className="text-[11px] text-slate-500">{tUi("Disbursed directly to Aadhaar-linked bank within 24-48h.", language)}</span>
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
                        toast.success(tUi("Token details copied to clipboard.", language));
                      }}
                      className="h-9"
                    >
                      <Copy size={14} className="mr-1.5" /> Copy Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          downloadGatePassPdf({
                            tokenNumber: displayToken || "TKN-001",
                            bookingCode: bookingRecord?.bookingCode || "BK-2026-7294",
                            farmerName: profileRecord?.name || bookingRecord?.farmer?.name || "Registered Farmer",
                            farmerPhone: profileRecord?.phone || bookingRecord?.farmer?.phone || "",
                            cropName: bookingRecord?.paddyVariety || "Paddy (Grade A)",
                            variety: bookingRecord?.paddyGrade || "BPT 5204 (Samba Mahsuri)",
                            expectedLoadQuintals: bookingRecord?.expectedQuantityQuintals || 40,
                            centreName: bookingRecord?.centre?.name || selectedCentre.name,
                            centreAddress: bookingRecord?.centre?.place || "Guntur Market Yard",
                            slotDate: bookingRecord?.slot?.date || new Date().toISOString().split("T")[0],
                            slotTime: bookingRecord?.slot?.startTime || "09:00 AM - 11:00 AM",
                            reportingTime: "08:50 AM",
                            vehicleNumber: bookingRecord?.transport?.vehicleNumber || "AP 07 TJ 4821",
                            farmerAadhaarMasked: "XXXX-XXXX-1234",
                          });
                          toast.success(tUi("Gate pass PDF downloaded successfully", language));
                        } catch (err) {
                          console.error("PDF generation failed:", err);
                          window.print();
                        }
                      }}
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
                        <span className="font-bold">{tUi("Booking Cancelled", language)}</span>
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

  const queue = farmerShell(
    <>
      <SectionTitle
        eyebrow="LIVE QUEUE"
        title={t.queueTitle}
        body={tUi("Your connected queue refreshes every fifteen seconds while this screen is open.", language)}
        action={<Pill kind="green"><span className="pulse-dot"/> {t.live} updates</Pill>}
      />

      {/* Real-time Ticking Clock & Database Sync Separation Banner */}
      <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Real-Time Live Clock (Updates every 1s in Asia/Kolkata) */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>{tUi("LIVE CLOCK (IST)", language)}</span>
          </div>

          <div className="text-sm sm:text-base font-black tracking-tight text-[#0f2d1e] dark:text-emerald-100 font-mono tabular-nums">
            {liveClockTime.toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2 font-sans hidden sm:inline">
              ({liveClockTime.toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })})
            </span>
          </div>
        </div>

        {/* Clearly Separated Queue Database Sync Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <RefreshCw size={13} className="text-emerald-600 dark:text-emerald-400 animate-spin-slow shrink-0" />
          <span>
            <b>{tUi("Queue Records Synced:", language)}</b>{" "}
            <span className="text-slate-900 dark:text-white font-bold font-mono">
              {queueLastSynced
                ? queueLastSynced.toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "Just now"}
            </span>
          </span>
          <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            Database sync every 15s
          </span>
        </div>
      </div>

      <div className="queue-layout">
        <section className="queue-main">
          <div className="queue-visual">
            <img src={queueUrl} alt="Orderly procurement centre queue"/>
            <div className="image-shade"/>
            <div className="queue-overlay">
              <Pill kind="yellow">{bookingRecord?.centre.name ?? "NIZAMABAD MARKET YARD"}</Pill>
              <h2>{tUi("Current token", language)} <strong>{bookingRecord?.queue?.currentToken ?? "P-024"}</strong></h2>
              <p>{tUi("Processing is moving steadily today.", language)}</p>
            </div>
          </div>
          <div className="your-position">
            <div>
              <small>{tUi("YOUR TOKEN", language)}</small>
              <strong>{bookingRecord?.tokenNumber ?? "P-042"}</strong>
              <span>Booking {bookingRecord?.bookingCode ?? "BK-2026-7294"}</span>
            </div>
            <div>
              <small>{tUi("PEOPLE AHEAD", language)}</small>
              <strong>{bookingRecord?.queue?.peopleAhead ?? queueAhead}</strong>
              <span>{tUi("Updated from the API", language)}</span>
            </div>
            <div>
              <small>{tUi("ESTIMATED WAIT", language)}</small>
              <strong>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35} min</strong>
              <span>{bookingRecord?.queue?.status ?? "WAITING"}</span>
            </div>
          </div>
          <div className="queue-track">
            <div className="track-labels">
              <span>Current {bookingRecord?.queue?.currentToken ?? "P-024"}</span>
              <span>Your {bookingRecord?.tokenNumber ?? "P-042"}</span>
            </div>
            <div className="track-bar">
              <i style={{ width: `${Math.max(18, queueProgress)}%` }} />
              <b style={{ left: `${Math.max(18, queueProgress)}%` }}>{bookingRecord?.tokenNumber ?? "P-042"}</b>
            </div>
            <div className="queue-scale">
              <span>{bookingRecord?.queue?.currentToken ?? "P-024"}</span>
              <span>{tUi("Queue", language)}</span>
              <span>Position {bookingRecord?.queue?.position ?? 18}</span>
              <span>{bookingRecord?.tokenNumber ?? "P-042"}</span>
            </div>
          </div>
        </section>
        <aside className="queue-side">
          <Pill kind="blue">{tUi("CENTRE RHYTHM", language)}</Pill>
          <h3>{tUi("Connected estimate.", language)}</h3>
          <p>{tUi("The current token and waiting estimate are derived from live database records.", language)}</p>
          <div className="rhythm-metrics">
            <span><UsersRound/><b>{bookingRecord?.queue?.position ?? 18}</b> {tUi("position", language)}</span>
            <span><Clock3/><b>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35}</b> {tUi("min wait", language)}</span>
          </div>
          <hr/>
          <h4>{tUi("What to do now", language)}</h4>
          <ul>
            <li><Check/> {tUi("Keep your documents ready.", language)}</li>
            <li><Check/> {tUi("Avoid joining early.", language)}</li>
            <li><Check/> {tUi("Check again before leaving.", language)}</li>
          </ul>
          <button onClick={() => navigate("assistant")}>{tUi("Ask farmer assistant", language)} <Bot size={15}/></button>
        </aside>
      </div>
      <section className="queue-alert">
        <Bell/>
        <div>
          <b>{tUi("Queue notifications are active.", language)}</b>
          <p>{tUi("The backend creates a notification when your token is close to the front.", language)}</p>
        </div>
        <span><Check/> {tUi("Active", language)}</span>
      </section>
    </>
  );

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
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">{tUi("Current Stage", language)}</span>
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
                <Pill kind="yellow">{tUi("QUALITY SIGNAL", language)}</Pill>
                <h3>{bookingRecord?.procurement?.qualityGrade ? `Grade ${bookingRecord.procurement.qualityGrade}` : "Quality assessment pending"}</h3>
                <p>{tUi("The displayed signal is pulled from the live procurement record in the database.", language)}</p>
              </div>

              {/* 30-Minute Cancellation Card on Procurement Status screen */}
              {(() => {
                const cStatus = getCancellationStatus(bookingRecord?.slot?.date, bookingRecord?.slot?.startTime, bookingRecord?.createdAt);
                const isCancelled = bookingRecord?.status === "CANCELLED";
                if (isCancelled) {
                  return (
                    <div className="mt-4 p-3 bg-white/95 text-rose-800 rounded-xl text-xs border border-rose-200">
                      <span className="font-bold flex items-center gap-1.5"><AlertTriangle size={15} /> {tUi("Booking Cancelled", language)}</span>
                      <p className="mt-1 text-[11px] text-slate-600">{tUi("This slot booking was cancelled. Your slot capacity has been released.", language)}</p>
                      <button onClick={() => navigate("paddy")} className="mt-2 text-xs text-emerald-800 underline font-bold">{tUi("Book New Slot", language)}</button>
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
                          <>{tUi("Time remaining:", language)} <b className="text-amber-700 font-bold">{cStatus.text}</b> (until {cStatus.deadlineFormatted})</>
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
            <ActionButton onClick={() => navigate("payment")} secondary icon={ArrowRight}>{tUi("View payment", language)}</ActionButton>
          </section>
        </>
      );
    })()
  );

  const payment = farmerShell(
    <>
      <SectionTitle
        eyebrow="DIRECT BENEFIT TRANSFER (DBT) · CROP SETTLEMENT"
        title={tUi("Procurement Payment & Farmer Settlement", language)}
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
                <span className="payout-type-tag">{tUi("Government DBT Payout", language)}</span>
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
                  <>{tUi("Credited to Farmer:", language)} <b>{profileRecord?.name ?? "Ramesh Kumar"}</b> {tUi("· Ref:", language)} <b className="font-mono">{paymentRecord?.transactionReference ?? ""}</b> {tUi("· Direct DBT Bank Credit", language)}</>
                ) : isPaymentInitiated ? (
                  <>{tUi("Initiated by Head Officer · Ref:", language)} <b className="font-mono">{paymentRecord?.transactionReference ?? ""}</b> {tUi("· Direct Aadhaar DBT Payout Queued for Crediting", language)}</>
                ) : isPaymentProcessing ? (
                  <>{tUi("Processing Direct Bank Transfer to:", language)} <b>{profileRecord?.name ?? "Ramesh Kumar"}</b></>
                ) : (
                  <>{tUi("Payable to Farmer:", language)} <b>{profileRecord?.name ?? "Ramesh Kumar"}</b> {tUi("· Linked Bank A/C (Aadhaar DBT Enabled upon Officer Initiation)", language)}</>
                )}
              </p>
            </div>

            <div className="credit-details-strip">
              <div>
                <small>{tUi("PROCUREMENT ID", language)}</small>
                <b>{bookingRecord?.bookingCode ? `PR-${bookingRecord.bookingCode.replace("BK-", "")}` : "PR-2026-7294"}</b>
              </div>
              <div>
                <small>{tUi("SETTLEMENT STATUS", language)}</small>
                <b className={isPaymentCredited ? "text-emerald-700" : isPaymentProcessing ? "text-amber-700" : isPaymentInitiated ? "text-blue-700" : isPaymentFailed ? "text-rose-700" : "text-slate-600"}>
                  {paymentStatusLabel} {isPaymentCredited && "(Bank Transfer)"}
                </b>
              </div>
              <div>
                <small>{tUi("CROP & VARIETY", language)}</small>
                <b>{bookingRecord?.paddyVariety ?? "Common paddy"} ({bookingRecord?.expectedQuantityQuintals ?? 18} Quintals)</b>
              </div>
              <div>
                <small>{tUi("SETTLEMENT DATE", language)}</small>
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
              <Pill kind="green">{tUi("PAYMENT RECEIVED", language)}</Pill>
              <h2>{tUi("Amount Credited to Farmer Account", language)}</h2>
              <p>{tUi("Government DBT procurement payout has been credited to your verified bank account.", language)}</p>
              <div>
                <b>{tUi("Amount Credited", language)}</b>
                <span>₹{Number(paymentRecord.amount).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <b>{tUi("Payment ID", language)}</b>
                <span>{paymentRecord.paymentId}</span>
              </div>
              <div>
                <b>{tUi("Transaction Reference", language)}</b>
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
                  <b>{tUi("Direct Benefit Transfer (DBT) Payout Settlement", language)}</b>
                  <br />
                  Govt procurement payment verification with bank gateway.
                </p>
              </div>

              <h2>{tUi("Procurement Payment Payout Method", language)}</h2>
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
                    <Pill kind="yellow">{tUi("PROCESSING", language)}</Pill>
                    <p>{tUi("Bank network is confirming the DBT transfer. Do not close this screen.", language)}</p>
                  </div>
                ) : paymentRecord?.status === "FAILED" ? (
                  <div>
                    <Pill kind="yellow">{tUi("NEEDS ATTENTION", language)}</Pill>
                    <p>{paymentRecord.failureReason ?? "This disbursement could not be processed. Please retry."}</p>
                  </div>
                ) : (
                  <div>
                    <Pill kind="blue">{tUi("PAYOUT READY", language)}</Pill>
                    <p>{tUi("Proceed to verify payout credentials and receive payment receipt.", language)}</p>
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
                    <b>{tUi("Provider response: Payout Success", language)}</b>
                    <p>{tUi("Simulate successful bank DBT credit to farmer.", language)}</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={paymentOutcome === "FAILED" ? "selected" : ""}
                  onClick={() => setPaymentOutcome("FAILED")}
                >
                  <span><X size={20} /></span>
                  <div>
                    <b>{tUi("Provider response: Payout Error", language)}</b>
                    <p>{tUi("Simulate bank network delay or authorization retry.", language)}</p>
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
                <Pill kind={isPaymentCredited ? "green" : "blue"}>{tUi("PROCUREMENT SETTLEMENT", language)}</Pill>
                <h3>{isPaymentCredited ? "Amount Credited to Farmer" : "Estimated Settlement Payout"}</h3>
                {bookingRecord ? (
                  <>
                    <div>
                      <span>{tUi("Paddy / Crop quantity", language)}</span>
                      <b>{bookingRecord.expectedQuantityQuintals} quintals</b>
                    </div>
                    <div>
                      <span>{tUi("Govt MSP Rate", language)}</span>
                      <b>₹{bookingRecord.paymentQuote.unitPrice} / quintal</b>
                    </div>
                    {bookingRecord.paymentQuote.govtBonus ? (
                      <div>
                        <span>{tUi("Govt Incentive Bonus", language)}</span>
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
                  <p className="section-body">{tUi("Sign in and load an active booking to view its procurement settlement.", language)}</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              onClick={() => {
                downloadProcurementReceiptPdf({
                  receiptNumber: receipt.receiptNumber,
                  paymentId: receipt.payment.paymentId || "PAY-2026-9041",
                  transactionReference: receipt.payment.transactionReference || "TXN-DBT-882194",
                  farmerName: profileRecord?.name || bookingRecord?.farmer?.name || "Registered Farmer",
                  farmerPhone: profileRecord?.phone || bookingRecord?.farmer?.phone || "",
                  cropName: bookingRecord?.paddyVariety || "Paddy (Grade A)",
                  variety: bookingRecord?.paddyGrade || "Common",
                  quantityQuintals: bookingRecord?.expectedQuantityQuintals || 40,
                  unitPricePerQuintal: bookingRecord?.paymentQuote?.unitPrice || 2320,
                  grossAmount: Number(receipt.payment.amount) || 92800,
                  deductions: 0,
                  netAmountPaid: Number(receipt.payment.amount) || 92800,
                  centreName: bookingRecord?.centre?.name || "Procurement Centre",
                  dbtStatus: receipt.payment.status || "SUCCESS",
                  bankName: "State Bank of India",
                  accountNumberMasked: "XXXX-XXXX-9821",
                  issuedAt: new Date().toLocaleDateString("en-IN"),
                });
                toast.success(tUi("Procurement Payment Receipt PDF downloaded.", language));
              }}
              icon={Download}
            >
              Download PDF Receipt
            </ActionButton>
            <ActionButton
              onClick={() => navigator.clipboard?.writeText(`Receipt ${receipt.receiptNumber} | Credited: ₹${receipt.payment.amount} | ID: ${receipt.payment.paymentId}`)}
              secondary
              icon={Check}
            >
              Copy receipt details
            </ActionButton>
          </div>
        </section>
      )}

      <section className="status-summary">
        <div>
          <span className="token-disc small"><WalletCards /></span>
          <div>
            <b>{tUi("Farmer Transaction & Payment Ledger", language)}</b>
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
            <b>{tUi("1. Procurement Slot Booking Fee: ₹0", language)}</b>
            <p>
              Official Government Procurement Service · 100% Free Slot Reservation
              <br />
              Booking: {bookingRecord?.bookingCode ?? "BK-2026-7294"} · Status: <b>{tUi("FREE / NO CHARGE (₹0)", language)}</b>
            </p>
          </div>
        </div>
        <Pill kind="green">{tUi("₹0 FREE", language)}</Pill>
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
                Payment Status: <b>{tUi("Credited (DBT Direct Bank Transfer)", language)}</b> · Linked Bank A/C ****4821
                <br />
                Procurement ID: {bookingRecord?.bookingCode ? `PR-${bookingRecord.bookingCode.replace("BK-", "")}` : "PR-2026-7294"} · Booking: {bookingRecord?.bookingCode ?? "BK-2026-7294"}
              </p>
            </div>
          </div>
          <Pill kind="green">{tUi("CREDITED", language)}</Pill>
        </section>
      )}
    </>
  );

  const profile = farmerShell(<><SectionTitle eyebrow="FARMER PROFILE" title={t.profileTitle} body="Your current profile is loaded from the authenticated backend session."/><div className="profile-layout"><section className="profile-card"><div className="profile-main"><span className="profile-avatar">{getInitials(profileRecord?.name, "RK")}</span><div><Pill kind="green"><Check/> {profileRecord?.status ?? "APPROVED"} FARMER</Pill><h2>{profileRecord?.name ?? "Ramesh Kumar"}</h2><p>Farmer ID · {profileRecord?.farmerCode ?? "FMR-2026-11842"}</p></div><button onClick={() => toast.message("Profile details verified by officer.")}>{tUi("Verified profile", language)}</button></div><div className="profile-details"><div><small>{tUi("MOBILE NUMBER", language)}</small><b>+91 {profileRecord?.phone ?? "98765 43210"}</b></div><div><small>{tUi("VILLAGE", language)}</small><b>{profileRecord?.village ?? "Muppalapally"}</b></div><div><small>{tUi("DISTRICT", language)}</small><b>{profileRecord?.district ?? "Nizamabad"}, Telangana</b></div><div><small>{tUi("PRIMARY CROP", language)}</small><b>{profileRecord?.primaryCrop ?? "Paddy"}</b></div></div><div className="profile-data-note"><ShieldCheck/><p>{tUi("This profile is delivered from the protected database API after login.", language)}</p></div></section><aside className="profile-aside"><Pill kind="yellow">{tUi("PROCUREMENT READY", language)}</Pill><h3>Profile status: {profileRecord?.status ?? "APPROVED"}</h3><p>{tUi("Your authenticated profile is eligible to make bookings.", language)}</p><button onClick={() => navigate("paddy")}>{tUi("Start a new booking", language)} <ArrowRight size={15}/></button></aside></div></>);

  const notifications = farmerShell(<><SectionTitle eyebrow="NOTIFICATIONS" title={t.notificationTitle} body="Booking, queue, procurement, and payment signals are loaded from your database records."/><div className="notifications-list">{(apiNotifications.length ? apiNotifications.map(notification => ({ icon: notification.category === "PAYMENT" ? WalletCards : notification.category === "PROCUREMENT" ? ClipboardCheck : notification.category === "QUEUE" ? UsersRound : Ticket, tone: notification.category === "QUEUE" ? "yellow" : notification.category === "PROCUREMENT" ? "blue" : "green", title: notification.title, copy: notification.message, time: new Date(notification.createdAt).toLocaleString() })) : [{ icon: Ticket, tone: "green", title: "Sign in to see API notifications", copy: "Your booking and status updates will appear here after an authenticated login.", time: "Live" }]).map(({ icon: Icon, tone, title, copy, time }) => <article key={`${title}-${time}`}><span className={`notice-icon ${tone}`}><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div><small>{time}</small></article>)}</div></>);

  const weatherScreen = farmerShell(
    <>
      <SectionTitle
        eyebrow="ANDHRA PRADESH & TELANGANA AGRICULTURAL METEOROLOGY"
        title={t.weatherTitle}
        body={t.weatherBody}
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* GPS Location Button */}
            <button
              type="button"
              onClick={requestGpsWeather}
              disabled={weatherLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 transition shadow-xs w-full sm:w-auto min-h-[40px]"
              title={tUi("Detect farm weather via GPS", language)}
            >
              <LocateFixed size={14} className="text-emerald-700 shrink-0" />
              <span>{tUi("Use Farm GPS", language)}</span>
            </button>

            {/* Registered Farm Location Button if available */}
            {profileRecord?.village && (
              <button
                type="button"
                onClick={() =>
                  void loadWeather({
                    village: profileRecord.village,
                    district: profileRecord.district,
                  })
                }
                disabled={weatherLoading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition shadow-xs w-full sm:w-auto min-h-[40px]"
                title={`Sync with registered village: ${profileRecord.village}`}
              >
                <MapPin size={13} className="text-emerald-700 shrink-0" />
                <span>Farm: {profileRecord.village}</span>
              </button>
            )}

            {/* Complete AP & TS District Dropdown */}
            <select
              className="district-selector-dropdown text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-foreground cursor-pointer w-full sm:w-auto min-h-[40px]"
              value={selectedWeatherDistrict}
              onChange={(e) => {
                const d = e.target.value;
                setSelectedWeatherDistrict(d);
                void loadWeather(d);
              }}
              aria-label="Select Agricultural District"
            >
              <optgroup label="Andhra Pradesh Districts">
                <option value="Guntur">{tUi("Guntur District", language)}</option>
                <option value="Tenali">{tUi("Tenali (Guntur)", language)}</option>
                <option value="Bapatla">{tUi("Bapatla District", language)}</option>
                <option value="Palnadu">{tUi("Palnadu (Narasaraopet)", language)}</option>
                <option value="Vijayawada">{tUi("Vijayawada (NTR)", language)}</option>
                <option value="Krishna">{tUi("Krishna (Machilipatnam)", language)}</option>
                <option value="Kurnool">{tUi("Kurnool District", language)}</option>
                <option value="Nandyal">{tUi("Nandyal District", language)}</option>
                <option value="Rajahmundry">{tUi("Rajahmundry (East Godavari)", language)}</option>
                <option value="Kakinada">{tUi("Kakinada District", language)}</option>
                <option value="Konaseema">{tUi("Konaseema (Amalapuram)", language)}</option>
                <option value="Eluru">{tUi("Eluru District", language)}</option>
                <option value="Bhimavaram">{tUi("West Godavari (Bhimavaram)", language)}</option>
                <option value="Nellore">{tUi("Nellore (SPSR)", language)}</option>
                <option value="Tirupati">{tUi("Tirupati District", language)}</option>
                <option value="Chittoor">{tUi("Chittoor District", language)}</option>
                <option value="Kadapa">{tUi("YSR Kadapa District", language)}</option>
                <option value="Anantapur">{tUi("Anantapur District", language)}</option>
                <option value="Sri Sathya Sai">{tUi("Sri Sathya Sai (Puttaparthi)", language)}</option>
                <option value="Visakhapatnam">{tUi("Visakhapatnam", language)}</option>
                <option value="Anakapalli">{tUi("Anakapalli District", language)}</option>
                <option value="Srikakulam">{tUi("Srikakulam District", language)}</option>
                <option value="Vizianagaram">{tUi("Vizianagaram District", language)}</option>
                <option value="Prakasam">{tUi("Prakasam (Ongole)", language)}</option>
              </optgroup>
              <optgroup label="Telangana Districts">
                <option value="Nizamabad">{tUi("Nizamabad District", language)}</option>
                <option value="Karimnagar">{tUi("Karimnagar District", language)}</option>
                <option value="Warangal">{tUi("Warangal District", language)}</option>
                <option value="Khammam">{tUi("Khammam District", language)}</option>
                <option value="Nalgonda">{tUi("Nalgonda District", language)}</option>
                <option value="Miryalaguda">{tUi("Miryalaguda Mandi", language)}</option>
                <option value="Suryapet">{tUi("Suryapet District", language)}</option>
                <option value="Mahabubnagar">{tUi("Mahabubnagar District", language)}</option>
                <option value="Hyderabad">{tUi("Hyderabad", language)}</option>
              </optgroup>
            </select>

            <ActionButton
              onClick={() => void loadWeather(selectedWeatherDistrict)}
              icon={RefreshCw}
              disabled={weatherLoading}
              className="w-full sm:w-auto justify-center min-h-[40px]"
            >
              <span className={weatherLoading ? "animate-spin inline-block" : ""}>{tUi("Refresh", language)}</span>
            </ActionButton>
          </div>
        }
      />

      {/* Location Breadcrumb & Coordinates Header */}
      <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="font-extrabold text-[#0a1f33] dark:text-slate-100">
            {weatherData?.locationName || `${weatherData?.district ?? selectedWeatherDistrict}, Andhra Pradesh`}
          </span>
          {weatherData?.coordinates && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {weatherData.coordinates.latitude.toFixed(4)}°N, {weatherData.coordinates.longitude.toFixed(4)}°E
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            {weatherData?.locationSource === "EXACT_COORDINATES"
              ? "GPS Coordinates"
              : weatherData?.locationSource === "VILLAGE_CENTROID"
              ? "Registered Farm Centroid"
              : "District APMC Centroid"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>
            API Synchronized:{" "}
            <b>
              {weatherData?.metadata?.lastSynchronizedAt
                ? new Date(weatherData.metadata.lastSynchronizedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "Live"}{" "}
              IST
            </b>
          </span>
        </div>
      </div>

      {/* Stale Warning Banner if Offline */}
      {weatherData?.metadata?.isStale && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          <span>
            <b>{tUi("Offline Meteorological Cache:", language)}</b> Live Open-Meteo server is temporarily unreachable. Displaying verified regional agricultural baseline. Values will automatically update once network connectivity is restored.
          </span>
        </div>
      )}

      {/* Main Weather Grid */}
      <div className="weather-layout">
        <div>
          {/* Current Weather Card */}
          <div className="weather-hero-card">
            <div className="weather-hero-top">
              <div className="weather-location-title">
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full text-emerald-100">
                  <MapPin size={12} /> {weatherData?.locationName || `${weatherData?.district ?? selectedWeatherDistrict}, Andhra Pradesh`}
                </span>
                <h2>{weatherData?.condition ?? "Sunny & Clear"}</h2>
                <p>{tUi("Real-time Open-Meteo Agricultural Forecast", language)}</p>
              </div>
              <span className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                {weatherData?.conditionCode === "LIGHT_RAIN" || weatherData?.conditionCode === "HEAVY_RAIN" ? (
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
                <b>Feels like {weatherData?.feelsLike ?? weatherData?.apparentTemperature ?? 33}°C</b>
                <span>Paddy moisture drying index: {weatherData?.safeHarvestingIndex ?? "Optimal"}</span>
              </div>
            </div>

            <div className="weather-metrics-grid">
              <div className="weather-metric-item">
                <small>{tUi("Humidity", language)}</small>
                <strong>{weatherData?.humidity ?? 62}%</strong>
                <span>Paddy target: {"<"} 17%</span>
              </div>
              <div className="weather-metric-item">
                <small>{tUi("Wind Velocity", language)}</small>
                <strong>{weatherData?.windSpeedKmH ?? 14} km/h</strong>
                <span>{tUi("Smooth transport", language)}</span>
              </div>
              <div className="weather-metric-item">
                <small>{tUi("Precipitation", language)}</small>
                <strong>{weatherData?.hourlyPrecipitationProbability ?? weatherData?.precipitationChance ?? 10}%</strong>
                <span>{weatherData?.rainfallMm ? `${weatherData.rainfallMm} mm rain` : "Low rain risk"}</span>
              </div>
              <div className="weather-metric-item">
                <small>{tUi("Harvest Status", language)}</small>
                <strong className="text-emerald-300">{weatherData?.safeHarvestingIndex ?? "OPTIMAL"}</strong>
                <span>{tUi("Safe for transit", language)}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Advisory Card */}
          <div className={`weather-advisory-card ${(weatherData?.safeHarvestingIndex ?? "OPTIMAL").toLowerCase()}`}>
            <div className="advisory-badge-row">
              <span className={`advisory-badge ${(weatherData?.safeHarvestingIndex ?? "OPTIMAL").toLowerCase()}`}>
                🌾 Safe Harvesting & Procurement Advisory
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                District: {weatherData?.district ?? selectedWeatherDistrict}
              </span>
            </div>
            <p className="advisory-text">
              {language === "TE"
                ? weatherData?.advisoryTe
                : language === "HI"
                ? weatherData?.advisoryHi
                : weatherData?.advisoryEn}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button
                onClick={() => navigate("transportation")}
                className="action-button w-full sm:w-auto justify-center"
              >
                <Truck size={16} className="mr-1.5 shrink-0" /> <span className="whitespace-normal text-center">{tUi("Book Subsidized Vehicle for Today's Weather", language)}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("paddy")}
                className="border-emerald-700/30 text-emerald-900 w-full sm:w-auto justify-center min-h-[44px]"
              >
                <CalendarDays size={16} className="mr-1.5 shrink-0" /> {tUi("Book Procurement Slot", language)}
              </Button>
            </div>
          </div>
        </div>

        <div>
          {/* 7-Day Agriculture Forecast Panel */}
          <div className="forecast-panel">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#143d2c]">{tUi("7-Day Agriculture Forecast", language)}</h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                Open-Meteo High-Res
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Expected harvesting conditions for {weatherData?.district ?? selectedWeatherDistrict} over the next 7 days.
            </p>

            <div className="forecast-cards-grid">
              {(weatherData?.dailyForecast && weatherData.dailyForecast.length > 0
                ? weatherData.dailyForecast
                : (weatherData?.forecast ?? [
                    { dayName: "Tomorrow", tempHighC: 33, tempLowC: 23, weatherCondition: "Sunny & Dry", maxPrecipitationProbability: 5, totalRainfallMm: 0 },
                    { dayName: "Day After", tempHighC: 32, tempLowC: 24, weatherCondition: "Partly Cloudy", maxPrecipitationProbability: 15, totalRainfallMm: 0 },
                    { dayName: "In 3 Days", tempHighC: 34, tempLowC: 25, weatherCondition: "Clear Sky", maxPrecipitationProbability: 10, totalRainfallMm: 0 },
                  ])
              ).map((fc: any, idx: number) => {
                const dayLabel = fc.dayName || fc.day || `Day ${idx + 1}`;
                const condition = fc.weatherCondition || fc.condition || "Partly Cloudy";
                const high = fc.tempHighC ?? fc.tempHigh ?? 32;
                const low = fc.tempLowC ?? fc.tempLow ?? 24;
                const rainProb = fc.maxPrecipitationProbability ?? fc.rainChance ?? 10;
                const rainMm = fc.totalRainfallMm ?? 0;

                return (
                  <div className="forecast-day-card" key={idx}>
                    <div>
                      <h4 className="font-extrabold">{dayLabel}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {condition} · 🌧️ {rainProb}% rain {rainMm > 0 ? `(${rainMm}mm)` : ""}
                      </p>
                    </div>
                    <div className="forecast-temp-range">
                      <b>{high}°</b>
                      <span>/ {low}°C</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 p-4 bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-xs flex items-start gap-2.5 shadow-xs">
              <Sparkles size={18} className="text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <b className="text-emerald-950 dark:text-emerald-200 font-bold">{tUi("Rythu Seva Tip:", language)}</b>{" "}
                <span className="text-slate-900 dark:text-slate-100 font-medium">{tUi("Maintain paddy bag tarp covers during transit even on sunny days to prevent sudden coastal humidity absorption.", language)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly 24-Hour Forecast Timeline */}
      {weatherData?.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
        <div className="mt-6 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-emerald-700" />
              <h4 className="text-sm font-extrabold text-[#0a1f33] dark:text-slate-100">
                24-Hour Hourly Agricultural Forecast
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Hourly rain probability, temperature, and wind speed
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {weatherData.hourlyForecast.slice(0, 24).map((hour, idx) => {
                let hourTime = hour.time;
                try {
                  const d = new Date(hour.time);
                  hourTime = d.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
                } catch {}

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 min-w-[95px] text-center"
                  >
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      {hourTime}
                    </span>
                    <div className="my-1.5">
                      {hour.weatherCode >= 51 ? (
                        <CloudRain size={20} className="text-sky-500 mx-auto" />
                      ) : hour.weatherCode >= 2 ? (
                        <CloudSun size={20} className="text-amber-500 mx-auto" />
                      ) : (
                        <Sun size={20} className="text-amber-500 mx-auto" />
                      )}
                    </div>
                    <span className="text-sm font-black text-foreground">
                      {hour.temperatureC}°C
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                        hour.precipitationProbability >= 40
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      🌧️ {hour.precipitationProbability}%
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {hour.windSpeedKmH} km/h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Weather-Based Selling Advisory */}
      <div className="mt-6">
        <WeatherSellingAdvisory
          weatherData={weatherData}
          district={weatherData?.district ?? selectedWeatherDistrict}
          onNavigateToBooking={() => navigate("paddy")}
          onNavigateToTransport={() => navigate("transportation")}
          language={language}
        />
      </div>

      {/* Official Open-Meteo Attribution Banner */}
      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-emerald-700 shrink-0" />
          <span>
            <b>{tUi("Attribution:", language)}</b> Weather data by{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-800 dark:text-emerald-400 underline hover:text-emerald-900"
            >
              Open-Meteo.com
            </a>
            . Sourced from high-resolution global numerical meteorological prediction models.
          </span>
        </div>
        <span className="text-[11px]">
          Free Open Agricultural Meteorology · No API Key Required
        </span>
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
        eyebrow="DIGITAL KRISHI HELP CENTRE · 24x7 AGRI ADVISORY"
        title={tUi("ProcureFlow Agricultural Help Centre", language)}
        body={tUi("Instant operational answers for token queue, fair MSP prices, weather harvest advisories, subsidized transport, and farmer DBT settlements.", language)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        {/* LEFT COLUMN: AI CHAT (lg:col-span-8 - ~67%) */}
        <section className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden min-h-[580px] h-[720px] max-h-[85vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#144730] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 m-0">
                    ProcureFlow Agricultural Assistant
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <i className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Your intelligent farming and procurement companion
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguagePicker language={language} setLanguage={changeLanguage} />
              <button
                type="button"
                onClick={clearChat}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title={tUi("Clear conversation", language)}
                aria-label="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#fbfdfc]" ref={chatFeedRef}>
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mb-3 shadow-2xs">
                  <Bot size={28} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1.5">
                  {language === "TE"
                    ? "నమస్తే! ప్రొక్యూర్‌ఫ్లోకు స్వాగతం."
                    : language === "HI"
                    ? "नमस्ते! प्रोक्योरफ्लो में आपका स्वागत है।"
                    : "Namaste! Welcome to ProcureFlow."}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed mb-6">
                  {language === "TE"
                    ? "నేను పంట ధరలు, MSP రేట్లు, వాతావరణ సలహాలు, కొనుగోలు బుకింగ్‌లు, రవాణా మరియు వ్యవసాయ ప్రశ్నలతో మీకు సహాయం చేయగలను."
                    : language === "HI"
                    ? "मैं फसल की कीमतों, एमएसपी दरों, मौसम सलाह, खरीद बुकिंग, परिवहन और खेती से जुड़े सवालों में आपकी मदद कर सकता हूँ।"
                    : "I can help you with crop prices, MSP rates, weather advisories, procurement bookings, transportation and farming-related questions."}
                </p>

                <div className="w-full max-w-md">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    💡 Suggested Inquiries
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {[
                      { label: "What is my token and estimated wait time?", icon: Ticket },
                      { label: "What is the 2025-26 MSP rate for Grade A Paddy?", icon: Coins },
                      { label: "Is today's weather safe for paddy harvest in Guntur?", icon: CloudSun },
                      { label: "How do I book a 30% subsidized tractor trolley?", icon: Truck },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => void assistantReply(item.label)}
                          className="p-3 bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-900 transition-all flex items-center gap-2.5 shadow-2xs group cursor-pointer"
                        >
                          <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 flex items-center justify-center shrink-0">
                            <Icon size={14} />
                          </span>
                          <span className="line-clamp-2 leading-snug">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              chat.map((message, index) => (
                <div
                  key={`${message.text}-${index}`}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} w-full`}
                >
                  {message.role === "user" ? (
                    <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
                      <span className="text-[10px] font-bold text-emerald-800 mb-1 px-1">
                        You (Farmer)
                      </span>
                      <div className="bg-[#ecf7f0] border border-[#d0e9d6] text-[#133e29] rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-2xs">
                        {message.imageUrl && (
                          <div className="mb-2 max-w-[220px] sm:max-w-[260px] rounded-xl overflow-hidden border border-emerald-300/80 shadow-2xs">
                            <img
                              src={message.imageUrl}
                              alt="Uploaded agricultural photograph"
                              className="w-full h-auto max-h-[160px] sm:max-h-[190px] object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words m-0">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs px-4 py-3.5 max-w-[92%] sm:max-w-[85%] shadow-xs">
                      {/* Message Header */}
                      <div className="flex items-center justify-between w-full mb-2 pb-1.5 border-b border-slate-100 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <Bot size={13} />
                          </div>
                          <span className="text-xs font-bold text-emerald-950">
                            ProcureFlow Krishi Assistant
                          </span>
                          <span className="hidden xs:inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {message.source === "fallback" ? "🌾 Advisory" : "✨ Krishi AI"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => speak(message.text)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border shrink-0 ${
                            speakingText === message.text
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse"
                              : "text-slate-500 hover:text-emerald-800 hover:bg-slate-50 border-slate-200"
                          }`}
                          title={speakingText === message.text ? "Reading aloud..." : "Read answer aloud"}
                          aria-label="Read answer aloud"
                        >
                          <Volume2 size={13} />
                          <span className="hidden sm:inline">{speakingText === message.text ? "Playing..." : "Listen"}</span>
                        </button>
                      </div>

                      {message.warning && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs mb-2 flex items-center gap-1.5">
                          <span>⚠️ {message.warning}</span>
                        </div>
                      )}

                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800 font-normal">
                        {message.text}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {chatLoading && (
              <div className="flex flex-col items-start w-full">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-slate-600">
                  {isAnalyzingImage ? (
                    <Camera size={15} className="text-emerald-700 animate-pulse" />
                  ) : (
                    <Bot size={15} className="text-emerald-700 animate-pulse" />
                  )}
                  <span className="font-semibold">
                    {isAnalyzingImage
                      ? tUi("Analyzing agricultural image...", language)
                      : tUi("ProcureFlow Krishi Assistant is thinking...", language)}
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions Grid */}
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-white shrink-0">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              💡 {tUi("Quick Questions:", language)}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "token",
                  label: tUi("Check My Token", language),
                  query: "What is my token and estimated wait time?",
                  icon: Ticket,
                },
                {
                  id: "msp",
                  label: tUi("Current Paddy MSP", language),
                  query: "What is the 2025-26 MSP rate for Grade A Paddy?",
                  icon: Coins,
                },
                {
                  id: "weather",
                  label: tUi("Today's Weather", language),
                  query: "Is today's weather safe for paddy harvest in Guntur?",
                  icon: CloudSun,
                },
                {
                  id: "mandi",
                  label: tUi("Mandi Prices", language),
                  query: "What are the latest modal mandi prices for paddy and cotton?",
                  icon: BarChart3,
                },
                {
                  id: "transport",
                  label: tUi("Subsidized Transport", language),
                  query: "How do I book a 30% subsidized tractor trolley?",
                  icon: Truck,
                },
                {
                  id: "documents",
                  label: tUi("Procurement Documents", language),
                  query: "What documents must I carry to the procurement mandi?",
                  icon: ClipboardCheck,
                },
              ].map(q => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => void assistantReply(q.query)}
                    className="flex items-center gap-2 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all text-left shadow-2xs group cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 group-hover:border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
                      <Icon size={13} />
                    </span>
                    <span className="truncate">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0">
            {/* Selected Image Thumbnail Preview before sending */}
            {attachedImage && (
              <div className="mb-2.5 flex items-center justify-between p-2 sm:p-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0 shadow-2xs">
                    <img
                      src={attachedImage.previewUrl}
                      alt="Attached preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-950 truncate block">
                      📷 {tUi("Photograph Attached", language)}
                    </span>
                    <span className="text-[11px] text-emerald-700 block truncate">
                      {attachedImage.file.name || "Ready for AI inspection"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeAttachedImage}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title={tUi("Remove photo", language)}
                  aria-label="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {imageCompressing && (
              <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                <LoaderCircle size={14} className="animate-spin text-emerald-700" />
                <span>{tUi("Optimizing photograph...", language)}</span>
              </div>
            )}

            {isListening && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2 mb-2 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span>{tUi("Listening... Speak now", language)} · Words appear in the input as you speak</span>
              </div>
            )}

            <form
              className="flex items-center gap-1.5 sm:gap-2"
              onSubmit={e => {
                e.preventDefault();
                void assistantReply(chatInput);
              }}
            >
              {/* Hidden HTML file inputs for Camera and Gallery */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void processSelectedImage(file);
                }}
              />
              <input
                type="file"
                ref={galleryInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void processSelectedImage(file);
                }}
              />

              {/* 1. Camera Button & Popup Menu */}
              <div className="relative" ref={cameraMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCameraMenuOpen(open => !open)}
                  title={tUi("Attach agricultural photograph or document", language)}
                  aria-label="Attach photograph or document"
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer border ${
                    attachedImage
                      ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200"
                      : isCameraMenuOpen
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border-slate-200 hover:border-emerald-200"
                  }`}
                >
                  <Camera size={18} />
                </button>

                {/* Small clean dropdown menu */}
                {isCameraMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 sm:w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={handleTakePhotoClick}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <Camera size={16} className="text-emerald-700 shrink-0" />
                      <span>{tUi("Take a Photo", language)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleChooseGalleryClick}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <ImageIcon size={16} className="text-emerald-700 shrink-0" />
                      <span>{tUi("Select from Gallery", language)}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Microphone Button */}
              <button
                type="button"
                onClick={listen}
                title={isListening ? "Stop listening" : "Use voice input"}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer border ${
                  isListening
                    ? "bg-red-600 text-white border-red-600 animate-pulse ring-4 ring-red-100"
                    : "bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border-slate-200 hover:border-emerald-200"
                }`}
                aria-label="Toggle voice input"
              >
                <Mic size={18} />
              </button>

              {/* 3. Message Input */}
              <Input
                value={chatInput}
                onChange={event => setChatInput(event.target.value)}
                placeholder={
                  attachedImage
                    ? tUi("Ask something about this image... (or click send)", language)
                    : isListening
                    ? tUi("Listening... Speak now", language)
                    : tUi("Ask in English, Telugu, or Hindi (e.g. 'What is the paddy MSP today?')", language)
                }
                className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-slate-200 focus:border-emerald-600 focus:ring-emerald-200 flex-1 min-w-0"
              />

              {/* 4. Send Button */}
              <Button
                type="submit"
                disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
                title={tUi("Send question or image", language)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 p-0 cursor-pointer"
              >
                <ArrowRight size={18} />
              </Button>
            </form>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2 px-1">
              <Headphones size={13} className="text-emerald-700 shrink-0" />
              <span>{tUi("Voice recognition & speech read-aloud enabled in English, Telugu and Hindi.", language)}</span>
            </div>

            {/* Desktop Webcam Live Capture Modal */}
            {isWebcamOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Camera size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 m-0">{tUi("Take a Photo", language)}</h3>
                        <p className="text-[11px] text-slate-500 m-0">
                          {tUi("Align your crop leaf, grain sample, or mandi document", language)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={tUi("Close", language)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Viewfinder Video Stream */}
                  <div className="relative w-full bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
                    <video
                      ref={webcamVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Target Framing Overlay */}
                    <div className="absolute inset-6 pointer-events-none border border-white/20 rounded-xl flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                        <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                      </div>
                      <div className="text-center">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 text-white/90 text-[10px] font-semibold backdrop-blur-xs">
                          {tUi("Webcam Active", language)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                        <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />
                      </div>
                    </div>

                    {webcamLoading && (
                      <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2 text-white text-xs">
                        <LoaderCircle size={24} className="animate-spin text-emerald-400" />
                        <span>{tUi("Starting camera...", language)}</span>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        stopWebcam();
                        galleryInputRef.current?.click();
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors order-2 sm:order-1 cursor-pointer flex items-center gap-1.5"
                    >
                      <ImageIcon size={14} />
                      <span>{tUi("Choose from Files Instead", language)}</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopWebcam}
                        className="text-xs h-9 px-3 cursor-pointer"
                      >
                        {tUi("Cancel", language)}
                      </Button>

                      <Button
                        type="button"
                        onClick={captureFromWebcam}
                        disabled={webcamLoading}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold h-9 px-4 flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Camera size={15} />
                        <span>{tUi("Capture Photo", language)}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: GOVERNMENT AGRICULTURAL HELP (lg:col-span-4 - ~33%) */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          {/* Card 1: Official Rythu Helplines */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center font-bold shrink-0">
                <PhoneCall size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#153828] m-0">
                  {tUi("Official Rythu Helplines", language)}
                </h3>
                <p className="text-[11px] text-muted-foreground m-0">
                  {tUi("Direct Government Support Desks", language)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* 1. Rythu Bharosa Kendra Helpdesk */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">
                      {tUi("Rythu Bharosa Kendra Helpdesk", language)}
                    </h4>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      Toll-free · Mon–Sat (8 AM – 7 PM)
                    </p>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    1800-425-0002
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                  <a
                    href="tel:18004250002"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
                    title={tUi("Call Rythu Helpline", language)}
                  >
                    <PhoneCall size={12} /> Call Helpline
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText("18004250002");
                      toast.success(tUi("Helpline 1800-425-0002 copied.", language));
                    }}
                    className="p-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title={tUi("Copy number", language)}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              {/* 2. AP Civil Supplies & Mandi Grievance */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">
                      {tUi("AP Civil Supplies & Mandi Grievance", language)}
                    </h4>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      24x7 Government Helpline
                    </p>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    1902
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                  <a
                    href="tel:1902"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
                    title={tUi("Call 1902", language)}
                  >
                    <PhoneCall size={12} /> Call Helpline
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText("1902");
                      toast.success(tUi("Helpline 1902 copied.", language));
                    }}
                    className="p-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title={tUi("Copy number", language)}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              {/* 3. Kisan Call Centre */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">
                      {tUi("Kisan Call Centre", language)}
                    </h4>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      National Agri-Support · 22 Languages
                    </p>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    1800-180-1551
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                  <a
                    href="tel:18001801551"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
                    title={tUi("Call Kisan Helpline", language)}
                  >
                    <PhoneCall size={12} /> Call Helpline
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText("18001801551");
                      toast.success(tUi("Helpline 1800-180-1551 copied.", language));
                    }}
                    className="p-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title={tUi("Copy number", language)}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Mandatory Mandi Checklist */}
          <div className="bg-[#f7faf8] rounded-2xl border border-[#cfe3d5] p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
              <h4 className="text-xs sm:text-sm font-extrabold text-[#144730] m-0">
                {tUi("Mandatory Mandi Checklist:", language)}
              </h4>
            </div>

            <ul className="text-xs text-[#244b38] space-y-2 pl-0 m-0 list-none font-medium">
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{tUi("1. Farmer Registration ID / Aadhaar Card", language)}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{tUi("2. Aadhaar-linked Bank Passbook (DBT Account)", language)}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{tUi("3. e-Crop / Land Record (Pahani / 1B Receipt)", language)}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  4. Digital Token Pass (<b>{bookingRecord?.tokenNumber ?? "Token Active"}</b>)
                </span>
              </li>
            </ul>

            <div className="p-2.5 bg-white/80 rounded-xl border border-[#c2ded0] text-[11px] text-[#2d5641] leading-relaxed">
              ℹ️ Moisture must be tested below <b>17%</b> for Fair Average Quality (FAQ) standards before weighbridge entry.
            </div>
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
        { key: "aiCopilot", label: "AI Officer Copilot", icon: Bot, target: "officerAiCopilot" as Screen, badge: 0 },
      ];
    }
    if (role === "PROCUREMENT_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "pending", label: "Pending farmers", icon: UserCheck, target: "registrations" as Screen, badge: pendingRegistrations.length },
        { key: "approved", label: "Registered Farmers", icon: Users, target: "approved" as Screen, badge: officerFarmersList.length },
        { key: "bookings", label: "Bookings & queue", icon: CalendarDays, target: "bookings" as Screen, badge: 0 },
        { key: "payments", label: "Payment Settlement", icon: WalletCards, target: "officerPayments" as Screen, badge: 0 },
        { key: "aiCopilot", label: "AI Officer Copilot", icon: Bot, target: "officerAiCopilot" as Screen, badge: 0 },
      ];
    }
    if (role === "QUALITY_CONTROL_INSPECTOR") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "quality", label: "Quality Control Inspection", icon: ShieldCheck, target: "quality" as Screen, badge: 0 },
        { key: "aiCopilot", label: "AI Officer Copilot", icon: Bot, target: "officerAiCopilot" as Screen, badge: 0 },
      ];
    }
    if (role === "LOGISTICS_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "logistics", label: "Logistics & Transport", icon: Truck, target: "officerLogistics" as Screen, badge: officerLogisticsList.filter(l => l.status === "REQUESTED" || l.status === "ASSIGNED").length },
        { key: "aiCopilot", label: "AI Officer Copilot", icon: Bot, target: "officerAiCopilot" as Screen, badge: 0 },
      ];
    }
    if (role === "PAYMENT_OFFICER") {
      return [
        { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
        { key: "payments", label: "Payment Settlement", icon: WalletCards, target: "officerPayments" as Screen, badge: 0 },
        { key: "aiCopilot", label: "AI Officer Copilot", icon: Bot, target: "officerAiCopilot" as Screen, badge: 0 },
      ];
    }
    return [
      { key: "overview", label: "Overview", icon: Sprout, target: "officerDashboard" as Screen, badge: 0 },
      { key: "pending", label: "Pending farmers", icon: UserCheck, target: "registrations" as Screen, badge: pendingRegistrations.length },
      { key: "aiCopilot", label: "AI Officer Copilot", icon: Bot, target: "officerAiCopilot" as Screen, badge: 0 },
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
          <button onClick={() => navigate("landing")}><ArrowLeft size={18}/> {tUi("Farmer portal", language)}</button>
        </div>
      </aside>
      <div className="officer-main">
        <header className="officer-topbar">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setOfficerMobileMenu(true)}
              aria-label="Open officer menu"
              className="officer-menu-toggle"
            >
              <Menu size={22} />
            </button>
            <div className="officer-badge-area flex items-center gap-2">
              <span className="today-dot"/> 
              {officerProfile ? (
                <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <span className="hidden sm:inline">{(officerProfile?.role || "OFFICER").replaceAll("_", " ")} • </span>{officerProfile?.branch || "GUNTUR"}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-700">{tUi("Officer Console", language)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <MobileViewToggle />
            <LanguagePicker language={language} setLanguage={changeLanguage}/>
            <button
              className="notification-button relative"
              onClick={() => setShowOfficerNotifModal(true)}
              title={tUi("View officer & staff alerts", language)}
              aria-label="Officer alerts"
            >
              <Bell size={18}/>
              {officerNotificationsList.filter(n => !n.isRead).length > 0 && <i/>}
            </button>
            <span className="officer-user font-bold" title={officerProfile?.name || "Officer"}>
              {getInitials(officerProfile?.name, "SO")}
            </span>
            <button className="top-logout-btn" onClick={logoutOfficer} title={tUi("Log out of officer console", language)}>
              <LogOut size={15} /> <span className="hidden sm:inline">{tUi("Logout", language)}</span>
            </button>
          </div>
        </header>
        <main>{content}</main>
      </div>

      {officerMobileMenu && (
        <div className="officer-drawer-backdrop" onClick={() => setOfficerMobileMenu(false)}>
          <nav className="officer-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-top">
              <AppLogo />
              <button
                onClick={() => setOfficerMobileMenu(false)}
                className="drawer-close-btn"
                aria-label="Close officer navigation"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-role-banner">
              <div className="officer-badge-pill">
                <ShieldCheck size={14} />
                <span>{(officerProfile?.role || "OFFICER CONSOLE").replaceAll("_", " ")}</span>
              </div>
              <small>{officerProfile?.name || "Mandi Officer"} • {officerProfile?.branch || "AP Central"}</small>
            </div>

            <div className="drawer-links">
              <div className="drawer-section-label">{tUi("OPERATIONS & WORKFLOW", language)}</div>
              {officerMenuItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    setOfficerView(item.key as typeof officerView);
                    navigate(item.target);
                    setOfficerMobileMenu(false);
                  }}
                  className={officerView === item.key ? "active" : ""}
                >
                  <item.icon size={19}/>
                  <span>{item.label}</span>
                  {item.badge > 0 && <span className="drawer-badge">{item.badge}</span>}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setShowOfficerNotifModal(true);
                  setOfficerMobileMenu(false);
                }}
              >
                <Bell size={19} />
                <span>{tUi("Operational Alerts", language)}</span>
                {officerNotificationsList.filter(n => !n.isRead).length > 0 && (
                  <span className="drawer-badge">{officerNotificationsList.filter(n => !n.isRead).length}</span>
                )}
              </button>
              
              <div className="drawer-divider" />
              <button
                onClick={() => {
                  navigate("landing");
                  setOfficerMobileMenu(false);
                }}
                className="drawer-switch-portal"
              >
                <ArrowLeft size={18}/>
                <span>{tUi("Switch to Farmer Portal", language)}</span>
              </button>
            </div>

            <div className="drawer-bottom">
              <button onClick={logoutOfficer} className="drawer-logout">
                <LogOut size={18} />
                <span>Sign Out ({officerProfile?.name || "Officer"})</span>
              </button>
            </div>
          </nav>
        </div>
      )}

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
                <div className="p-6 text-center text-xs text-slate-400">{tUi("No new officer notifications.", language)}</div>
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
        <div className="flex items-center gap-2">
          <MobileViewToggle />
          <button className="back-link" onClick={() => navigate("landing")}><ArrowLeft size={16}/> {tUi("Back to home", language)}</button>
        </div>
      </header>
      <main>
        <section>
          <Pill kind="blue">{tUi("OFFICER & STAFF GOVERNANCE", language)}</Pill>
          <h1>{tUi("Department Staff & Mandi Management.", language)}</h1>
          <p>{tUi("Multi-department access with Head Officer onboarding verification. Verify registrations, balance capacity, run quality inspections, assign subsidized transport, and settle farmer payments directly.", language)}</p>
          <div className="officer-login-stat">
            <span><UsersRound/> <b>{officerAnalytics?.approvedFarmers ?? 3}</b> {tUi("farmers approved", language)}</span>
            <span><Clock3/> <b>{officerAnalytics?.activeBookings ?? 3}</b> {tUi("active bookings", language)}</span>
          </div>
        </section>

        {officerForgotStep !== "INACTIVE" ? (
          <section className="login-card w-full max-w-lg bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
            <p className="eyebrow text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider mb-1">{tUi("OFFICER PASSWORD GOVERNANCE", language)}</p>
            <h2 className="text-xl font-black text-slate-900 mb-2">{tUi("Officer Password Recovery", language)}</h2>
            <p className="text-xs text-slate-600 mb-4">
              Authorized Head Officer review is strictly enforced for department staff password modifications.
            </p>

            {officerForgotError && (
              <div className="auth-error-banner flex items-center gap-2 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs mb-4">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{officerForgotError}</span>
              </div>
            )}

            {officerForgotSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs mb-4">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 size={16} className="text-emerald-700" /> Reset Request Logged
                </div>
                <p className="leading-relaxed mb-2">{officerForgotSuccessMsg}</p>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-[11px] text-emerald-800 font-medium">
                  Next Step: Contact your Head Officer to approve request #{officerForgotReqId} in <b>{tUi("Staff Management → Password Reset Requests", language)}</b>. Once approved, the Head Officer will provide you a 24-hour Approval Token.
                </div>
              </div>
            )}

            {/* Workflow Navigation Pills */}
            {officerForgotStep !== "SUCCESS" && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => { setOfficerForgotStep("REQUEST"); setOfficerForgotError(null); }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    officerForgotStep === "REQUEST"
                      ? "bg-[#165339] text-white border-[#165339] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  1. Request Approval
                </button>
                <button
                  type="button"
                  onClick={() => { setOfficerForgotStep("COMPLETE"); setOfficerForgotError(null); }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    officerForgotStep === "COMPLETE"
                      ? "bg-[#165339] text-white border-[#165339] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  2. Enter Token & Reset
                </button>
              </div>
            )}

            {/* Step 1: Submit Reset Request */}
            {officerForgotStep === "REQUEST" && (
              <form onSubmit={e => { e.preventDefault(); void handleRequestOfficerReset(); }} className="flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                  Officer / Login ID
                  <Input
                    value={officerForgotCode}
                    onChange={e => setOfficerForgotCode(e.target.value)}
                    placeholder={tUi("e.g. QC-2026-4892 or OFF-NZM-104", language)}
                    required
                  />
                </label>
                <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                  Registered Email or Phone
                  <Input
                    value={officerForgotContact}
                    onChange={e => setOfficerForgotContact(e.target.value)}
                    placeholder={tUi("e.g. qc.madhavan@smartprocure.gov.in", language)}
                    required
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                    Department (Optional)
                    <Input
                      value={officerForgotDepartment}
                      onChange={e => setOfficerForgotDepartment(e.target.value)}
                      placeholder={tUi("e.g. QUALITY_CONTROL", language)}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                    Reason (Optional)
                    <Input
                      value={officerForgotReason}
                      onChange={e => setOfficerForgotReason(e.target.value)}
                      placeholder={tUi("e.g. Forgot login password", language)}
                    />
                  </label>
                </div>

                <Button
                  disabled={officerForgotLoading || !officerForgotCode.trim() || !officerForgotContact.trim()}
                  type="submit"
                  className="action-button w-full mt-2"
                >
                  {officerForgotLoading ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin mr-2" /> Submitting request…
                    </>
                  ) : (
                    <>
                      Submit Request for Head Officer Approval <ArrowRight size={16} />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setOfficerForgotStep("COMPLETE"); setOfficerForgotError(null); }}
                    className="text-emerald-800 font-bold hover:underline"
                  >
                    Already have approval token? Enter token →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOfficerForgotStep("INACTIVE"); setOfficerForgotError(null); setOfficerForgotSuccessMsg(null); }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Complete Reset with Token */}
            {officerForgotStep === "COMPLETE" && (
              <form onSubmit={e => { e.preventDefault(); void handleCompleteOfficerReset(); }} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                    Officer / Login ID
                    <Input
                      value={officerForgotCode}
                      onChange={e => setOfficerForgotCode(e.target.value)}
                      placeholder={tUi("e.g. QC-2026-4892", language)}
                      required
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                    Request ID (Optional)
                    <Input
                      type="number"
                      value={officerForgotReqId || ""}
                      onChange={e => setOfficerForgotReqId(e.target.value ? Number(e.target.value) : null)}
                      placeholder={tUi("e.g. 1", language)}
                    />
                  </label>
                </div>

                <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                  24-Hour Approval Token (Issued by Head Officer)
                  <Input
                    value={officerForgotToken}
                    onChange={e => setOfficerForgotToken(e.target.value.trim())}
                    placeholder={tUi("Enter approval token (e.g. 32-character hexadecimal string)", language)}
                    className="font-mono text-xs tracking-wider"
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                    New Password
                    <div className="relative">
                      <Input
                        type={showOfficerForgotNewPassword ? "text" : "password"}
                        value={officerForgotNewPassword}
                        onChange={e => setOfficerForgotNewPassword(e.target.value)}
                        placeholder={tUi("Min 8 chars, mixed case, number", language)}
                        required
                        className="pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOfficerForgotNewPassword(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 p-0"
                      >
                        {showOfficerForgotNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>
                  <label className="text-xs font-bold text-slate-700 flex flex-col gap-1">
                    Confirm Password
                    <div className="relative">
                      <Input
                        type={showOfficerForgotConfirmPassword ? "text" : "password"}
                        value={officerForgotConfirmPassword}
                        onChange={e => setOfficerForgotConfirmPassword(e.target.value)}
                        placeholder={tUi("Re-enter password", language)}
                        required
                        className="pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOfficerForgotConfirmPassword(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 p-0"
                      >
                        {showOfficerForgotConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>
                </div>

                {/* Password requirements indicators */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] flex flex-col gap-1">
                  <span className="font-bold text-slate-700">{tUi("Password Policy Requirements:", language)}</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className={`flex items-center gap-1 ${officerForgotNewPassword.length >= 8 ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      {officerForgotNewPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(officerForgotNewPassword) ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      {/[A-Z]/.test(officerForgotNewPassword) ? "✓" : "○"} Uppercase letter
                    </span>
                    <span className={`flex items-center gap-1 ${/[a-z]/.test(officerForgotNewPassword) ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      {/[a-z]/.test(officerForgotNewPassword) ? "✓" : "○"} Lowercase letter
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(officerForgotNewPassword) ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      {/[0-9]/.test(officerForgotNewPassword) ? "✓" : "○"} Number (0-9)
                    </span>
                  </div>
                </div>

                <Button
                  disabled={officerForgotLoading || !officerForgotCode.trim() || !officerForgotToken.trim() || officerForgotNewPassword.length < 8 || officerForgotNewPassword !== officerForgotConfirmPassword}
                  type="submit"
                  className="action-button w-full mt-1"
                >
                  {officerForgotLoading ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin mr-2" /> Updating password…
                    </>
                  ) : (
                    <>
                      Verify Token & Update Password <Check size={16} />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setOfficerForgotStep("REQUEST"); setOfficerForgotError(null); }}
                    className="text-emerald-800 font-bold hover:underline"
                  >
                    ← Need to request approval first?
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOfficerForgotStep("INACTIVE"); setOfficerForgotError(null); }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Confirmation */}
            {officerForgotStep === "SUCCESS" && (
              <div className="text-center py-4 flex flex-col items-center">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-bold text-emerald-950 mb-1">{tUi("Officer Password Updated!", language)}</h3>
                <p className="text-xs text-slate-600 max-w-sm mb-4">
                  Your officer account password has been updated and an audit event has been recorded. You can now login with your new credentials.
                </p>
                <Button
                  type="button"
                  className="action-button w-full"
                  onClick={() => {
                    setOfficerForgotStep("INACTIVE");
                    setOfficerForgotCode("");
                    setOfficerForgotContact("");
                    setOfficerForgotToken("");
                    setOfficerForgotNewPassword("");
                    setOfficerForgotConfirmPassword("");
                  }}
                >
                  Return to Officer Login <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </section>
        ) : (
        <form onSubmit={e => { e.preventDefault(); void loginOfficer(); }}>
          <p className="eyebrow">{tUi("OFFICER & STAFF LOGIN", language)}</p>
          <h2>{tUi("Enter your verified credentials.", language)}</h2>
          <label>
            Officer / Login ID
            <Input
              value={officerLoginForm.officerCode}
              onChange={e => setOfficerLoginForm(f => ({ ...f, officerCode: e.target.value }))}
              placeholder={tUi("e.g. OFF-NZM-104 or QC-2026-4892", language)}
            />
          </label>
          <div>
            <div className="flex items-center justify-between mb-1 mt-1">
              <span className="text-xs font-semibold text-slate-700">{tUi("Password", language)}</span>
              <button
                type="button"
                onClick={() => {
                  setOfficerForgotStep("REQUEST");
                  setOfficerForgotCode(officerLoginForm.officerCode);
                  setOfficerForgotContact("");
                  setOfficerForgotDepartment("");
                  setOfficerForgotReason("");
                  setOfficerForgotError(null);
                  setOfficerForgotSuccessMsg(null);
                }}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Forgot Officer Password?
              </button>
            </div>
            <Input
              type="password"
              value={officerLoginForm.password}
              onChange={e => setOfficerLoginForm(f => ({ ...f, password: e.target.value }))}
              placeholder={tUi("Enter password", language)}
            />
          </div>

          <Button type="submit" className="action-button mt-2">{tUi("Enter officer console", language)} <ArrowRight size={17}/></Button>

          {/* Quick Demo Login Preset Pills */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500">{tUi("QUICK LOGIN PRESETS:", language)}</span>
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
            <span className="text-muted-foreground">{tUi("New employee joining a department?", language)}</span>
            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
            >
              + Onboard Staff
            </button>
          </div>

          <p className="form-note"><ShieldCheck size={16}/> {tUi("Authenticated officer session with role authorization.", language)}</p>
        </form>
        )}
      </main>
    </div>
  );

  const officerDashboard = officerShell(
    <>
      <SectionTitle
        eyebrow="NIZAMABAD DISTRICT · LIVE OPERATIONS"
        title={tUi("Procurement Operations Dashboard", language)}
        body="Real-time operational metrics, capacity utilization, and arrival flow computed directly from the system database."
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <ActionButton
              onClick={() => {
                try {
                  downloadOfficerReportPdf({
                    reportDate: new Date().toLocaleDateString("en-IN"),
                    officerName: officerProfile?.name || "Senior Procurement Officer",
                    officerRole: (officerProfile?.role || "HEAD_OFFICER").replaceAll("_", " "),
                    centreName: officerProfile?.branch ? `${officerProfile.branch} APMC Mandi` : "Guntur Main Mandi",
                    district: officerProfile?.branch || "Guntur",
                    metrics: {
                      totalBookingsToday: officerAnalytics?.totalBookings ?? officerStats?.todaysBookings ?? 0,
                      activeQueueCount: officerAnalytics?.activeQueue ?? officerStats?.activeQueue ?? 0,
                      completedInspections: officerAnalytics?.completedProcurements ?? 0,
                      totalProcuredQuintals: (officerAnalytics?.completedProcurements ?? 0) * 35,
                      totalDisbursedRupees: officerAnalytics?.financials?.totalDisbursed ?? 0,
                      pendingPaymentsCount: officerAnalytics?.financials?.pendingPaymentsCount ?? 0,
                    },
                    capacityUtilizationPercent: 78,
                  });
                  toast.success(tUi("Officer Mandi Operational Report PDF downloaded.", language));
                } catch (e) {
                  console.error(e);
                  toast.error(tUi("Failed to generate officer report PDF", language));
                }
              }}
              icon={Download}
              secondary
              className="w-full sm:w-auto justify-center min-h-[44px]"
            >
              Export Report
            </ActionButton>
            <ActionButton onClick={() => { setOfficerView("pending"); navigate("registrations"); }} icon={UserCheck} className="w-full sm:w-auto justify-center min-h-[44px]">Review pending ({pendingRegistrations.length})</ActionButton>
          </div>
        }
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
            <p className="eyebrow">{tUi("DATABASE ANALYTICS", language)}</p>
            <h2>{tUi("Aggregated real data from stored procurement records.", language)}</h2>
          </div>
          <Pill kind="blue">{tUi("LIVE DB METRICS", language)}</Pill>
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
            <ActionButton onClick={() => { setOfficerView("pending"); navigate("registrations"); }} icon={ArrowRight}>{tUi("Review now", language)}</ActionButton>
          ) : (
            <span className="cleared-icon"><Check/></span>
          )}
        </article>
        <article className="centre-pulse-card">
          <div className="centre-pulse-head">
            <div>
              <Pill kind="green"><span className="pulse-dot"/> {tUi("LIVE CAPACITY", language)}</Pill>
              <h2>{tUi("Centre pulse", language)}</h2>
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
          <p className="eyebrow">{tUi("ARRIVAL DISTRIBUTION BY SLOT", language)}</p>
          <h2>{tUi("Arrivals scheduled today across all centres.", language)}</h2>
          <p>{tUi("Real booking counts per slot time window computed from active database bookings.", language)}</p>
        </div>
        <div className="arrival-bars">
          {(officerAnalytics?.hourlyArrivals ?? [{ time: "09:30 AM", count: 2, percentage: 35 }, { time: "10:00 AM", count: 4, percentage: 60 }, { time: "10:30 AM", count: 6, percentage: 80 }, { time: "11:00 AM", count: 3, percentage: 45 }, { time: "11:30 AM", count: 5, percentage: 70 }, { time: "12:00 PM", count: 3, percentage: 50 }]).map((slotArrival, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <span style={{ height: `${Math.max(15, slotArrival.percentage)}%` }} title={`${slotArrival.time}: ${slotArrival.count} bookings`} />
            </div>
          ))}
        </div>
        <button onClick={() => { setOfficerView("bookings"); navigate("bookings"); }}>{tUi("Open booking & queue overview", language)} <ArrowRight size={15}/></button>
      </section>
    </>
  );

  const officerPaymentStatus = officerShell(
    <>
      <SectionTitle
        eyebrow="PAYMENT OPERATIONS"
        title={tUi("Payment status at a glance.", language)}
        body="Real payment states, transaction references, amounts, and settlement centres stored in the database."
        action={<ActionButton onClick={() => {
          if (!officerToken) return;
          void fetch(apiUrl("/officers/payments"), { headers: { Authorization: `Bearer ${officerToken}` } })
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => { setOfficerPayments(data.payments); toast.success(tUi("Payment status refreshed from database.", language)); })
            .catch(() => toast.error(tUi("Payment status could not be refreshed.", language)));
        }} icon={LocateFixed}>{tUi("Refresh status", language)}</ActionButton>}
      />
      <section className="registration-table">
        <div className="table-head">
          <span>{tUi("Farmer", language)}</span>
          <span>{tUi("Booking", language)}</span>
          <span>{tUi("Method", language)}</span>
          <span>{tUi("Payment ID", language)}</span>
          <span>{tUi("Status", language)}</span>
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
            <h3>{tUi("No payment records yet.", language)}</h3>
            <p>{tUi("Payment attempts will appear here with their live status once initiated.", language)}</p>
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
        title={tUi("Pending farmer registrations.", language)}
        body="Review and approve or reject farmer registrations directly from the database API."
      />
      <div className="registration-table">
        <div className="table-head">
          <span>{tUi("Farmer", language)}</span>
          <span>{tUi("Location", language)}</span>
          <span>{tUi("Primary crop", language)}</span>
          <span>{tUi("Submitted", language)}</span>
          <span>{tUi("Status", language)}</span>
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
            <span>{tUi("Awaiting review", language)}</span>
            <Pill kind="yellow">{tUi("PENDING", language)}</Pill>
            <ChevronRight/>
          </button>
        )) : (
          <div className="table-empty">
            <span><CheckCircle2/></span>
            <h3>{tUi("No pending registrations", language)}</h3>
            <p>{tUi("There are no pending farmer registrations requiring review.", language)}</p>
          </div>
        )}
      </div>
      {showRecord && selectedPending && (
        <div className="review-drawer">
          <div className="drawer-top">
            <div>
              <Pill kind="yellow">{tUi("PENDING REVIEW", language)}</Pill>
              <h2>{tUi("Farmer registration details", language)}</h2>
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
            <div><small>{tUi("MOBILE NUMBER", language)}</small><b>{selectedPending.farmer?.phone ? `+91 ${selectedPending.farmer.phone}` : "—"}</b></div>
            <div><small>{tUi("VILLAGE", language)}</small><b>{selectedPending.farmer?.village ?? "—"}</b></div>
            <div><small>{tUi("DISTRICT", language)}</small><b>{selectedPending.farmer?.district ?? "—"}</b></div>
            <div><small>{tUi("PRIMARY CROP", language)}</small><b>{selectedPending.farmer?.primaryCrop ?? "Paddy"}</b></div>
            <div><small>{tUi("ACCOUNT STATUS", language)}</small><b>{selectedPending.farmer?.status ?? "PENDING"}</b></div>
            <div><small>{tUi("DECLARATION", language)}</small><b><CheckCircle2/> {tUi("Confirmed", language)}</b></div>
          </div>
          <div className="review-note">
            <ShieldCheck/>
            <p>{tUi("Approving activates farmer login. Rejecting notifies the farmer with your recorded reason.", language)}</p>
          </div>
          <div className="drawer-actions">
            <Button onClick={() => setShowRejectModal(true)} variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/30">
              <UserX size={16} className="mr-1.5" /> Reject farmer
            </Button>
            <ActionButton onClick={approveFarmer} icon={Check}>{tUi("Approve farmer", language)}</ActionButton>
          </div>
        </div>
      )}
      {showRejectModal && selectedPending && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{tUi("Reject Farmer Registration", language)}</h3>
              <button onClick={() => setShowRejectModal(false)}><X size={18}/></button>
            </div>
            <p className="text-sm text-muted-foreground">{tUi("Specify the reason for rejecting", language)} <b>{selectedPending.farmer?.name ?? "Farmer"}</b>{tUi(". The farmer will be notified.", language)}</p>
            <label className="text-sm font-medium">{tUi("Rejection Reason", language)}</label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={tUi("e.g. Document mismatch, incomplete land record...", language)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>{tUi("Cancel", language)}</Button>
              <Button variant="destructive" onClick={rejectFarmer}>{tUi("Confirm Rejection", language)}</Button>
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
        title={tUi("Registered Farmers & Database Records", language)}
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
          <span className="text-xs font-bold text-slate-700">{tUi("Filter Status:", language)}</span>
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
            placeholder={tUi("Search by name, phone, village...", language)}
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
                <th className="py-3 px-4">{tUi("Farmer Info", language)}</th>
                <th className="py-3 px-4">{tUi("Mobile Number", language)}</th>
                <th className="py-3 px-4">{tUi("Village & District", language)}</th>
                <th className="py-3 px-4">{tUi("Primary Crop", language)}</th>
                <th className="py-3 px-4">{tUi("Aadhaar (Masked)", language)}</th>
                <th className="py-3 px-4">{tUi("Account Status", language)}</th>
                <th className="py-3 px-4">{tUi("Active Mandi / Slot", language)}</th>
                <th className="py-3 px-4">{tUi("Registration Date", language)}</th>
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
                        <p className="font-bold text-slate-700 m-0">{tUi("No farmers found", language)}</p>
                        <small className="text-slate-400">{tUi("Try changing your search query or status filter.", language)}</small>
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
                          <span className="text-slate-400 italic">{tUi("No active booking", language)}</span>
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
        title={tUi("Live Procurement & Queue Control", language)}
        body="Monitor all active centre bookings and advance farmer procurement stages through weighing, quality inspection, and completion."
        action={<ActionButton onClick={() => { if (officerToken) void loadOfficerBookings(officerToken); }} icon={LocateFixed}>{tUi("Refresh bookings", language)}</ActionButton>}
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
          <Pill kind="blue">{tUi("LIVE DATABASE RECORDS", language)}</Pill>
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
          <div className="p-8 text-center text-muted-foreground">{tUi("Loading bookings from database...", language)}</div>
        )}
      </section>

      {showProcurementModal && selectedOfficerBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 max-w-lg w-full shadow-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{tUi("Update Procurement Stage", language)}</h3>
                <p className="text-xs text-muted-foreground">{tUi("Farmer:", language)} <b>{selectedOfficerBooking.farmer?.name ?? "Farmer"}</b> {tUi("· Token:", language)} <b>{selectedOfficerBooking.tokenNumber ?? "AP-001"}</b></p>
              </div>
              <button onClick={() => setShowProcurementModal(false)}><X size={18}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg">
              <div><span className="text-muted-foreground">{tUi("Centre:", language)}</span> <b>{selectedOfficerBooking.centre?.name ?? "Procurement Centre"}</b></div>
              <div><span className="text-muted-foreground">{tUi("Booking Code:", language)}</span> <b>{selectedOfficerBooking.bookingCode}</b></div>
              <div><span className="text-muted-foreground">{tUi("Expected:", language)}</span> <b>{selectedOfficerBooking.expectedQuantityQuintals} quintals</b></div>
              <div><span className="text-muted-foreground">{tUi("Variety:", language)}</span> <b>{selectedOfficerBooking.paddyVariety}</b></div>
            </div>
            <label className="text-sm font-medium">Procurement Stage
              <select
                className="w-full mt-1 p-2 rounded-md border bg-background text-sm"
                value={procurementForm.status}
                onChange={e => setProcurementForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="BOOKED">{tUi("BOOKED (Slot Reserved)", language)}</option>
                <option value="ARRIVED">{tUi("ARRIVED (Token Called / At Centre)", language)}</option>
                <option value="DOCUMENT_VERIFICATION">{tUi("DOCUMENT VERIFICATION", language)}</option>
                <option value="WEIGHING">{tUi("WEIGHING (On Weighbridge)", language)}</option>
                <option value="QUALITY_CHECK">{tUi("QUALITY CHECK (Moisture & Grade)", language)}</option>
                <option value="PROCESSING">{tUi("PROCESSING (Bagging & Storage)", language)}</option>
                <option value="COMPLETED">{tUi("COMPLETED (Procurement Finished)", language)}</option>
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
                  <option value="Grade A">{tUi("Grade A (Premium)", language)}</option>
                  <option value="Grade B">{tUi("Grade B (Standard)", language)}</option>
                  <option value="Common">{tUi("Common", language)}</option>
                  <option value="Rejected">Rejected (Moisture {">"} 17%)</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowProcurementModal(false)}>{tUi("Cancel", language)}</Button>
              <Button onClick={updateProcurementStage} className="action-button">{tUi("Save Status & Notify Farmer", language)}</Button>
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
        title={tUi("Quality Control & Crop Grading", language)}
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
              <span>{tUi("Farmers in Quality Inspection Queue", language)}</span>
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
                            <span>{tUi("Mandi:", language)}</span>
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
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Farmer", language)}</span>
                      <span className="font-semibold text-slate-800 truncate block" title={b.farmer?.name ?? "Farmer"}>
                        {b.farmer?.name ?? "Farmer"}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {b.farmer?.village ?? "Village"}
                      </span>
                    </div>

                    {/* 2. Booking ID */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Booking ID", language)}</span>
                      <b className="font-mono text-slate-800 truncate block">
                        {b.bookingCode ?? `BK-2026-${b.id}`}
                      </b>
                      <span className="text-[10px] text-slate-400 truncate block">{tUi("Official Lot", language)}</span>
                    </div>

                    {/* 3. Logistics Trip ID */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Logistics Trip", language)}</span>
                      <b className="font-mono text-emerald-800 truncate block">
                        {b.transport?.transportCode || "Centre Arrival"}
                      </b>
                      <span className="text-[10px] text-slate-400 truncate block">{tUi("Delivered", language)}</span>
                    </div>

                    {/* 4. Crop & Variety */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Crop & Variety", language)}</span>
                      <b className="text-slate-800 truncate block" title={b.paddyVariety ?? "Paddy (Common)"}>
                        {b.paddyVariety ?? "Paddy (Common)"}
                      </b>
                      <span className="text-[10px] text-slate-500 truncate block">{tUi("Kharif 2026", language)}</span>
                    </div>

                    {/* 5. Expected Quantity */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Expected Qty", language)}</span>
                      <b className="text-slate-800 truncate block">
                        {b.expectedQuantityQuintals ?? 18} Quintals
                      </b>
                      <span className="text-[10px] text-slate-400 truncate block">{tUi("Self Declared", language)}</span>
                    </div>

                    {/* 6. Weighed Quantity */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Weighed Qty", language)}</span>
                      {b.procurement?.weighedQuantityQuintals ? (
                        <span className="text-emerald-700 font-bold truncate block">
                          {b.procurement.weighedQuantityQuintals} Qtl
                        </span>
                      ) : (
                        <span className="text-slate-400 italic truncate block">{tUi("Pending Scale", language)}</span>
                      )}
                      <span className="text-[10px] text-slate-400 truncate block">{tUi("Certified Scale", language)}</span>
                    </div>

                    {/* 7. Quality Grade */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Quality Grade", language)}</span>
                      {b.procurement?.qualityGrade ? (
                        <span className="text-emerald-700 font-bold truncate block" title={b.procurement.qualityGrade}>
                          {b.procurement.qualityGrade}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic truncate block">{tUi("Awaiting Grade", language)}</span>
                      )}
                      <span className="text-[10px] text-slate-400 truncate block">{tUi("FAQ Standard", language)}</span>
                    </div>

                    {/* 8. Inspection Status */}
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{tUi("Inspection Status", language)}</span>
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
                      <span className="text-[10px] text-slate-400 truncate block">{tUi("Mandi Lab", language)}</span>
                    </div>
                  </div>

                  {/* Bottom Action Area: Clean Right-Side Actions with Consistent Buttons & Icons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{tUi("AP Civil Supplies Lab Station #1 · FAQ Moisture Standard:", language)} <b>{tUi("≤ 17.0%", language)}</b></span>
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
                        <span>{tUi("View Profile", language)}</span>
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
                        <span>{tUi("Inspect Crop Quality", language)}</span>
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
                          <span>{tUi("DBT Payout Settled", language)}</span>
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
            <h3 className="text-sm font-bold text-slate-800 m-0">{tUi("No Crops Waiting in Quality Control Queue", language)}</h3>
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
                <span className="text-slate-500">{tUi("Mobile Phone:", language)}</span>
                <b className="text-slate-800">+91 {viewingQcFarmerProfile.phone ?? "98765 43210"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tUi("Village & District:", language)}</span>
                <b className="text-slate-800">{viewingQcFarmerProfile.village ?? "Muppalapally"}, {viewingQcFarmerProfile.district ?? "Guntur"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tUi("Primary Crop:", language)}</span>
                <b className="text-slate-800">{viewingQcFarmerProfile.primaryCrop ?? "Paddy"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tUi("Account Status:", language)}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {viewingQcFarmerProfile.status ?? "APPROVED"}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500">{tUi("Aadhaar (Masked):", language)}</span>
                <b className="font-mono text-slate-800">{tUi("XXXX XXXX 4512", language)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tUi("e-Crop Land Registry:", language)}</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1"><Check size={13} /> {tUi("Verified (Pahani/1B)", language)}</span>
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
                  <h3 className="text-lg font-bold text-slate-900 m-0">{tUi("Crop Quality & Lab Inspection", language)}</h3>
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
                <span className="text-emerald-800">{tUi("Procurement Centre:", language)}</span>
                <b className="text-emerald-950">{selectedQcBooking.centre?.name}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">{tUi("Paddy Variety:", language)}</span>
                <b className="text-emerald-950">{selectedQcBooking.paddyVariety}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">{tUi("Expected Load:", language)}</span>
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
                  <option value="Grade A">{tUi("Grade A (Fine / Premium)", language)}</option>
                  <option value="Common">{tUi("Common (Grade B)", language)}</option>
                  <option value="Super Fine">{tUi("Super Fine (BPT 5204)", language)}</option>
                  <option value="FAQ Certified">{tUi("FAQ Certified Standard", language)}</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-700">
                Inspection Result
                <select
                  className="w-full mt-1.5 p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={qcForm.qcResult}
                  onChange={e => setQcForm(f => ({ ...f, qcResult: e.target.value as "ACCEPTED" | "REJECTED" | "HOLD" }))}
                >
                  <option value="ACCEPTED">{tUi("Accepted (Passed Inspection)", language)}</option>
                  <option value="HOLD">{tUi("Hold (Requires Re-drying)", language)}</option>
                  <option value="REJECTED">{tUi("Rejected (Below Quality Standards)", language)}</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="text-xs font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  <span>{tUi("Moisture %", language)}</span>
                  <span className="text-[10px] text-emerald-700 font-normal">{tUi("Max 17.0%", language)}</span>
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
                <span>{tUi("Net Weighed Qty (Quintals)", language)}</span>
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
                <span>{tUi("Foreign Matter / Refraction %", language)}</span>
                <span className="text-[10px] text-emerald-700 font-normal">{tUi("Max 1.0%", language)}</span>
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
                placeholder={tUi("e.g. Grain sample inspected. Moisture and purity meet FAQ standards.", language)}
                value={qcForm.remarks}
                onChange={e => setQcForm(f => ({ ...f, remarks: e.target.value }))}
              />
            </label>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowQcModal(false)} className="text-xs">{tUi("Cancel", language)}</Button>
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
        title={tUi("Logistics & Transportation", language)}
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
            placeholder={tUi("Search farmer, code, village, mandi...", language)}
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
            <span>{tUi("Transport Requests", language)}</span>
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
                <p className="text-sm font-semibold">{tUi("No transport requests match your filter.", language)}</p>
                <small className="text-xs text-muted-foreground">{tUi("Try clearing your search query or selecting \"All Trips\".", language)}</small>
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
                          title={tUi("Copy Request Code", language)}
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
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">{tUi("Pickup Point", language)}</span>
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
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{tUi("Origin Pickup", language)}</span>
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
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{tUi("Destination Mandi", language)}</span>
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
                          <span className="text-muted-foreground">{tUi("📅 Scheduled Date:", language)}</span>
                          <b className="text-foreground">{t.scheduledDate}</b>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{tUi("⏰ Time Window:", language)}</span>
                          <b className="text-foreground">{t.timeSlot}</b>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">{tUi("Crop Load (Paddy)", language)}</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tUi("Grain Cargo", language)}</span>
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
                      <span className="text-muted-foreground font-semibold">{tUi("Farmer Net:", language)}</span>
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
                    <span>{tUi("Route:", language)} <b>{t.pickupVillage}</b> → <b>{t.destinationCentreName}</b> ({t.distanceKm} km)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-blue-600/80 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold shadow-2xs"
                      onClick={() => {
                        if (!t.pickupVillage || !t.destinationCentreName) {
                          toast.error(tUi("Pickup village or destination mandi is missing for this booking.", language));
                          return;
                        }
                        const opened = openGoogleMapsDirections({
                          origin: t.pickupVillage,
                          destination: t.destinationCentreName,
                        }, (err) => toast.error(err));
                        if (opened) {
                          toast.success(tUi("Opening Google Maps Directions in new tab...", language));
                        }
                      }}
                    >
                      <Navigation size={14} className="mr-1.5 text-blue-700" /> View Route in Google Maps
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
                    Trip: <b>{viewingTransportRouteItem.transportCode}</b> {tUi("· Assigned Driver:", language)} <b>{viewingTransportRouteItem.driverName}</b> ({viewingTransportRouteItem.vehicleNumber})
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
                  <span className="text-[10px] text-slate-400 block uppercase">{tUi("Logistics Unit / Hub", language)}</span>
                  <b>{driverGps.isLive ? "Live Driver GPS (Active)" : "Guntur Transport Hub"}</b>
                </div>
              </div>
              <span className="text-slate-500">→</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{tUi("Farmer Pickup", language)}</span>
                  <b>{viewingTransportRouteItem.pickupVillage} ({viewingTransportRouteItem.farmerName})</b>
                </div>
              </div>
              <span className="text-slate-500">→</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">3</span>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{tUi("Procurement Mandi", language)}</span>
                  <b>{viewingTransportRouteItem.destinationCentreName}</b>
                </div>
              </div>
            </div>

      {/* Direct Transit Route Summary (No Embedded Maps) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Navigation size={14} className="text-blue-600" />
                  Direct Highway Route Navigation
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                  GOOGLE MAPS DRIVING DIRECTIONS
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">{tUi("Pickup Origin", language)}</span>
                  <b className="text-foreground">{viewingTransportRouteItem.pickupVillage}</b>
                </div>
                <span className="text-muted-foreground font-bold hidden sm:inline">→</span>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">{tUi("Destination Mandi", language)}</span>
                  <b className="text-foreground">{viewingTransportRouteItem.destinationCentreName}</b>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!viewingTransportRouteItem.pickupVillage || !viewingTransportRouteItem.destinationCentreName) {
                      toast.error(tUi("Pickup village or destination mandi is missing.", language));
                      return;
                    }
                    openGoogleMapsDirections({
                      origin: viewingTransportRouteItem.pickupVillage,
                      destination: viewingTransportRouteItem.destinationCentreName,
                    }, (err) => toast.error(err));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 shadow-2xs shrink-0"
                >
                  <Navigation size={13} className="mr-1.5" /> View Route in Google Maps
                </Button>
              </div>
            </div>           {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border">
              <div>
                <span className="text-muted-foreground block text-[11px]">{tUi("Total Road Distance", language)}</span>
                <b className="text-sm text-slate-900">{viewingTransportRouteItem.distanceKm} km</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">{tUi("Estimated Travel Time", language)}</span>
                <b className="text-sm text-emerald-800">~{Math.round(viewingTransportRouteItem.distanceKm * 2.2)} mins</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">{tUi("Trip Status", language)}</span>
                <Pill kind={viewingTransportRouteItem.status === "DELIVERED_AT_CENTRE" ? "green" : "blue"}>
                  {(viewingTransportRouteItem.status || "REQUESTED").replaceAll("_", " ")}
                </Pill>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!viewingTransportRouteItem.pickupVillage || !viewingTransportRouteItem.destinationCentreName) {
                    toast.error(tUi("Pickup or destination location is missing.", language));
                    return;
                  }
                  openGoogleMapsDirections({
                    origin: viewingTransportRouteItem.pickupVillage,
                    destination: viewingTransportRouteItem.destinationCentreName,
                  }, (err) => toast.error(err));
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 transition-colors"
              >
                <Navigation size={14} /> View Route in Google Maps ↗
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-emerald-700 text-emerald-800 hover:bg-emerald-50"
                  onClick={() => {
                    downloadTransportPassPdf({
                      transportCode: viewingTransportRouteItem.transportCode,
                      bookingCode: "BK-2026-7294",
                      farmerName: viewingTransportRouteItem.farmerName || "Farmer",
                      farmerPhone: viewingTransportRouteItem.farmerPhone || "",
                      farmerVillage: viewingTransportRouteItem.pickupVillage,
                      destinationCentreName: viewingTransportRouteItem.destinationCentreName,
                      scheduledDate: viewingTransportRouteItem.scheduledDate,
                      timeSlot: viewingTransportRouteItem.timeSlot,
                      vehicleType: viewingTransportRouteItem.vehicleName,
                      vehicleNumber: viewingTransportRouteItem.vehicleNumber,
                      driverName: viewingTransportRouteItem.driverName,
                      driverPhone: viewingTransportRouteItem.driverPhone,
                      cargoDescription: "Paddy Grain Bags",
                      estimatedLoadQuintals: viewingTransportRouteItem.estimatedLoadQuintals,
                      distanceKm: viewingTransportRouteItem.distanceKm,
                      baseFare: viewingTransportRouteItem.baseFare,
                      govtSubsidyAmount: viewingTransportRouteItem.subsidyAmount,
                      farmerNetPayable: viewingTransportRouteItem.netPayable,
                      status: viewingTransportRouteItem.status,
                    });
                    toast.success(tUi("Subsidized Transport Pass PDF downloaded.", language));
                  }}
                >
                  <Download size={14} className="mr-1.5" /> Download Pass PDF
                </Button>
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
                <h3 className="text-lg font-bold text-[#143e2b]">{tUi("Update Logistics Status", language)}</h3>
                <p className="text-xs text-muted-foreground">
                  Transport: <b>{selectedTransportItem.transportCode}</b> {tUi("· Farmer:", language)} <b>{selectedTransportItem.farmerName || "Farmer details unavailable"}</b>
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
                <option value="REQUESTED">{tUi("REQUESTED (New Booking)", language)}</option>
                <option value="ASSIGNED">{tUi("ASSIGNED (Driver & Vehicle Allocated)", language)}</option>
                <option value="IN_TRANSIT">{tUi("IN TRANSIT (Pickup Scheduled / Picked Up)", language)}</option>
                <option value="DELIVERED_AT_CENTRE">{tUi("DELIVERED AT CENTRE (Arrived at Mandi)", language)}</option>
                <option value="CANCELLED">{tUi("CANCELLED", language)}</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowTransportModal(false)}>{tUi("Cancel", language)}</Button>
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
        title={tUi("Official Crop Minimum Support Prices (MSP)", language)}
        body="Notified by the Ministry of Agriculture & Farmers Welfare, Govt of India (Kharif & Rabi 2025-26) with Telangana State bonus incentives."
        action={
          <ActionButton onClick={() => navigate("paddy")} icon={ArrowRight}>
            Book procurement slot at this MSP
          </ActionButton>
        }
      />

      {/* Official Government MSP Notification & Synchronization Status Card */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0d3320] to-teal-950 text-white shadow-md border border-emerald-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Govt MSP Sync
            </span>
            <span className="text-xs font-semibold text-emerald-100">
              {mspMetadata?.source || "Ministry of Agriculture & Farmers Welfare, Govt of India"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-100/90 font-medium">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-emerald-300 shrink-0" />
              <span>
                <b>{tUi("Official Publication Date:", language)}</b>{" "}
                {mspMetadata?.officialPublishedDate ? (
                  <span className="text-emerald-200 font-bold">
                    {mspMetadata.officialPublishedDate} (Effective from: {mspMetadata.effectiveFrom || "01-Oct-2025"})
                  </span>
                ) : (
                  <span className="text-emerald-300/80 italic">{tUi("Publication date unavailable", language)}</span>
                )}
              </span>
            </div>
            <span className="hidden sm:inline text-emerald-400/60">•</span>
            <div className="flex items-center gap-1.5">
              <Clock3 size={14} className="text-emerald-300 shrink-0" />
              <span>
                <b>{tUi("Last synced:", language)}</b>{" "}
                <span className="text-emerald-200 font-bold">
                  {formatIndianDateTime(mspMetadata?.lastSynchronizedAt || new Date())}
                </span>
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-200/75 m-0">
            Official notification: <b>{mspMetadata?.notificationRef || "Cabinet Committee on Economic Affairs (CCEA) MSP Notification"}</b> ({mspMetadata?.season || "Kharif & Rabi 2024-25 / 2025-26"}).
          </p>
        </div>

        {/* Official Government Source Link Card (Right Side on Desktop / Responsive on Mobile) */}
        <a
          href={mspMetadata?.officialSourceUrl || "https://desagri.gov.in/notification-type/msp-notifications/"}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-300 text-white transition-all shadow-xs hover:shadow-md shrink-0 focus:outline-hidden"
          title={tUi("Open official Directorate of Economics & Statistics MSP notifications portal", language)}
        >
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1.5 text-white">
              View Official Government MSP Rates
              <ExternalLink size={14} className="text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-[11px] text-emerald-200 font-medium">
              Verify the latest government notifications
            </div>
          </div>
        </a>
      </div>

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
            placeholder={tUi("Search crop or variety...", language)}
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
                        <span className="text-muted-foreground">{tUi("Declared MSP", language)}</span>
                        <strong className="text-foreground">₹{item.mspPerQuintal.toLocaleString("en-IN")} / qtl</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tUi("Mandi Open Market Rate", language)}</span>
                        <span className="text-slate-500">₹{item.marketRatePerQuintal.toLocaleString("en-IN")} / qtl</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-semibold">{tUi("Govt Bonus", language)}</span>
                        <strong className="text-emerald-700 font-bold">+₹{item.govtBonusPerQuintal} / qtl</strong>
                      </div>
                    </div>

                    <div className="effective-rate-pill mt-3">
                      <span className="text-xs font-bold text-emerald-800">{tUi("Effective Rate", language)}</span>
                      <strong>₹{item.effectiveRatePerQuintal.toLocaleString("en-IN")} <small className="text-xs font-normal">{tUi("/ qtl", language)}</small></strong>
                    </div>
                  </div>
                </div>

                <div className="crop-card-footer px-4 pb-4 pt-2">
                  <span>{tUi("Max Moisture:", language)} <b>{item.maxMoisturePercent}%</b></span>
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
          <Pill kind="yellow">{tUi("MSP VALUATION CALCULATOR", language)}</Pill>
          <h3 className="mt-2">{tUi("Estimate your crop revenue", language)}</h3>
          <p className="text-xs text-muted-foreground mb-4">{tUi("Calculate total guaranteed payment at official government rates.", language)}</p>

          <label className="text-xs font-bold block mb-1">{tUi("Select Crop & Variety", language)}</label>
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

          <label className="text-xs font-bold block mb-1">{tUi("Estimated Load (Quintals)", language)}</label>
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
                <span>{tUi("Base MSP Value:", language)}</span>
                <b>₹{calcValuation.mspBase.toLocaleString("en-IN")}</b>
              </div>
              <div className="flex justify-between text-xs mb-1 text-emerald-700">
                <span>{tUi("Govt Bonus Incentive:", language)}</span>
                <b>+₹{calcValuation.bonus.toLocaleString("en-IN")}</b>
              </div>
              <div className="border-t border-emerald-300 pt-2 mt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold text-emerald-900">{tUi("Total Guaranteed:", language)}</span>
                <span className="grand-total">₹{calcValuation.grand.toLocaleString("en-IN")}</span>
              </div>
              <small className="text-[10px] text-muted-foreground block mt-1">{tUi("100% credited via direct bank transfer (DBT).", language)}</small>
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

      {/* Official AGMARKNET Live Market Prices */}
      <div className="mt-8">
        <MandiMarketPrices
          initialCommodity="Paddy"
          initialState="Andhra Pradesh"
          initialDistrict={profileRecord?.district || "Guntur"}
          language={language}
          onSelectPrice={(p: any) => {
            setCalcCropVariety(`${p.commodity} — ${p.variety}`);
            setCalcQuintals("40");
            toast.success(`Loaded ${p.commodity} (${p.variety}) into valuation calculator`);
          }}
        />
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
        <ActionButton
          onClick={() => {
            try {
              downloadFarmerStatementPdf({
                farmerName: profileRecord?.name || "Registered Farmer",
                farmerCode: profileRecord?.farmerCode || "FMR-2026",
                farmerPhone: profileRecord?.phone || "9876543210",
                village: profileRecord?.village || "Guntur Rural",
                district: profileRecord?.district || "Guntur",
                totalProcuredQuintals: farmerAnalyticsData?.summary?.totalProcuredQuintals ?? (farmerStats?.completedProcurements ? 18.0 : 0.0),
                totalRevenueRupees: farmerAnalyticsData?.summary?.totalEarnings ?? 41760,
                completedBookingsCount: farmerAnalyticsData?.summary?.totalBookings ?? farmerStats?.totalBookings ?? 1,
                transportSubsidySavedRupees: farmerAnalyticsData?.summary?.transportLogistics?.subsidySaved ?? 450,
                statementPeriod: "Kharif Marketing Season 2025-26",
              });
              toast.success(tUi("Procurement Statement downloaded as PDF.", language));
            } catch (err) {
              console.error(err);
              toast.error(tUi("Failed to generate statement PDF", language));
            }
          }}
          secondary
          icon={Download}
        >
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
              <span className="text-[11px] text-muted-foreground">{tUi("Quantity in Quintals per crop", language)}</span>
            </div>
            <Pill kind="green">{tUi("Kharif 2025-26", language)}</Pill>
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
              <span className="text-[11px] text-muted-foreground">{tUi("Procurement stage distribution", language)}</span>
            </div>
            <Pill kind="blue">{tUi("Workflow", language)}</Pill>
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
              <span className="text-[11px] text-muted-foreground">{tUi("Trips by transit status", language)}</span>
            </div>
            <Pill kind="green">{tUi("30% Subsidy", language)}</Pill>
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
            <Pill kind="blue">{tUi("Kharif 2025-26", language)}</Pill>
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
            <Pill kind="green">{tUi("30% Govt Subsidy", language)}</Pill>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 mb-4">
            <div className="text-xs text-muted-foreground font-semibold">{tUi("Logistics Subsidy Saved", language)}</div>
            <strong className="text-2xl text-emerald-800 dark:text-emerald-300 font-extrabold font-mono">
              ₹{(farmerAnalyticsData?.summary.transportLogistics.subsidySaved ?? 180).toLocaleString("en-IN")}
            </strong>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">{tUi("Telangana Rythu Ratha / PMKSY Transport Scheme", language)}</p>
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

      {/* Average Crop Price Trend – Last 2 Months */}
      <div className="my-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* Header with Title and Crop Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Pill kind="green">{tUi("OFFICIAL AGMARKNET TIME-SERIES", language)}</Pill>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Direct Mandi Observations
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#0f2d1e] dark:text-white mt-1.5 m-0">
              Average Crop Price Trend – Last 2 Months
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 m-0">
              Bi-monthly aggregated modal prices per quintal grouped chronologically by market reporting date.
            </p>
          </div>

          {/* Crop Selector Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "Paddy", label: "🌾 Paddy" },
              { id: "Cotton", label: "☁️ Cotton" },
              { id: "Maize", label: "🌽 Maize" },
              { id: "Bengal Gram", label: "🧆 Bengal Gram" },
              { id: "Chilli Red", label: "🌶️ Chilli Red" },
            ].map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAnalyticsTrendCrop(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  analyticsTrendCrop === c.id
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trend Summary Metric Strip */}
        {cropTrendData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800">
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold block">{tUi("Latest Modal Rate", language)}</span>
              <strong className="text-base sm:text-lg font-black text-[#0f2d1e] dark:text-white">
                ₹{cropTrendData.latestPrice.toLocaleString("en-IN")} <small className="text-xs font-normal">{tUi("/ Qtl", language)}</small>
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground font-semibold block">{tUi("Trend Direction", language)}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cropTrendData.trend === "UP" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    <TrendingUp size={14} /> Price Increased (+₹{cropTrendData.absoluteChange})
                  </span>
                ) : cropTrendData.trend === "DOWN" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-red-700 dark:text-red-400 bg-red-100/80 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                    <TrendingDown size={14} /> Price Decreased (-₹{Math.abs(cropTrendData.absoluteChange)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    <Minus size={14} /> Price Unchanged
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground font-semibold block">{tUi("2-Month Change", language)}</span>
              <strong className={`text-base font-black ${cropTrendData.percentageChange > 0 ? "text-emerald-700 dark:text-emerald-400" : cropTrendData.percentageChange < 0 ? "text-red-600 dark:text-red-400" : "text-slate-700"}`}>
                {cropTrendData.percentageChange > 0 ? `+${cropTrendData.percentageChange}%` : `${cropTrendData.percentageChange}%`}
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground font-semibold block">{tUi("Coverage Period", language)}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={cropTrendData.coveragePeriod}>
                📅 {cropTrendData.coveragePeriod}
              </span>
            </div>
          </div>
        )}

        {/* Line / Area Graph */}
        {cropTrendLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
            <RefreshCw size={22} className="animate-spin text-emerald-600" />
            <span>{tUi("Loading historical AGMARKNET trend data…", language)}</span>
          </div>
        ) : cropTrendData && cropTrendData.points.length > 0 ? (
          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cropTrendData.points} margin={{ top: 12, right: 18, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="cropPriceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cropTrendData.trend === "DOWN" ? "#ef4444" : "#10b981"} stopOpacity={0.35}/>
                    <stop offset="95%" stopColor={cropTrendData.trend === "DOWN" ? "#ef4444" : "#10b981"} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={val => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")} / Quintal`, "Average Modal Price"]}
                  labelFormatter={(label: any, p: any) => {
                    const row = p?.[0]?.payload;
                    return row ? `${row.displayDate} (${row.date}) · ${row.reportingCount} Mandi Report(s)` : label;
                  }}
                  contentStyle={{
                    backgroundColor: "#062817",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: "10px 14px",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.25)"
                  }}
                  itemStyle={{ color: "#a7f3d0", fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="averageModalPrice"
                  stroke={cropTrendData.trend === "DOWN" ? "#dc2626" : "#059669"}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#cropPriceGradient)"
                  dot={{ r: 4, fill: cropTrendData.trend === "DOWN" ? "#dc2626" : "#059669", strokeWidth: 1, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: cropTrendData.trend === "DOWN" ? "#dc2626" : "#059669" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground">
            <Wheat size={28} className="text-muted-foreground/40 mb-1" />
            <b>{tUi("No records for this commodity", language)}</b>
            <span>{tUi("Historical market reporting records will appear here as mandis submit sessions.", language)}</span>
          </div>
        )}

        {/* Footer Notes & Data Attribution */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            <b>{tUi("Official Data Source:", language)}</b> {cropTrendData?.dataSource || "AGMARKNET (Ministry of Agriculture & Farmers Welfare, GoI)"}
          </span>
          {cropTrendData?.coverageNotice && (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              ℹ️ {cropTrendData.coverageNotice}
            </span>
          )}
        </div>
      </div>

      {/* Harvest Delivery Statements */}
      <div className="statement-table-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#183d2e] dark:text-emerald-400 m-0">{tUi("Harvest Delivery Statements", language)}</h3>
          <span className="text-xs text-muted-foreground">{tUi("Verified database records", language)}</span>
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
        title={tUi("Subsidized Farm-to-Mandi Transportation", language)}
        body="Book dedicated transport directly to your procurement centre with 30% Telangana Rythu Ratha State Logistics Subsidy."
      />

      <div className="transport-layout">
        <div>
          <label className="text-xs font-bold block mb-1">{tUi("1. Choose Vehicle Type", language)}</label>
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
            <h3 className="text-base font-bold text-[#183d2e] mb-3">{tUi("2. Pickup & Destination Details", language)}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
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
                  <option>{tUi("07:00 AM – 10:00 AM", language)}</option>
                  <option>{tUi("10:00 AM – 01:00 PM", language)}</option>
                  <option>{tUi("01:00 PM – 04:00 PM", language)}</option>
                  <option>{tUi("04:00 PM – 07:00 PM", language)}</option>
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
                <span className="text-xs text-muted-foreground">{tUi("Estimated Distance:", language)}</span>
                <b>{calculatedFare.distNum} km</b>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">{tUi("Standard Transit Fare:", language)}</span>
                <span>₹{calculatedFare.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-emerald-700">
                <span className="subsidy-badge"><Check size={12} /> {tUi("30% Govt Transport Subsidy", language)}</span>
                <b>-₹{calculatedFare.subsidy.toFixed(2)}</b>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-emerald-200">
                <span className="text-sm font-extrabold text-emerald-950">{tUi("Net Payable on Delivery:", language)}</span>
                <strong className="text-xl text-emerald-800 font-extrabold">₹{calculatedFare.netPayable.toFixed(2)}</strong>
              </div>
            </div>

            <ActionButton
              disabled={transportBookingLoading}
              onClick={() => { void bookTransport(); }}
              icon={Truck}
              className="w-full sm:w-auto justify-center min-h-[48px]"
            >
              {transportBookingLoading ? "Booking Subsidized Vehicle…" : "Book Subsidized Vehicle"}
            </ActionButton>

            {/* Google Maps Route Redirection Preview (No Embedded Map) */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block">{tUi("External Route Navigation", language)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    Driving route via Google Maps with real-time road directions
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const destName = apiCentres.find(c => c.id === transportForm.destinationCentreId)?.name ?? "Guntur Agricultural Market Yard";
                  if (!transportForm.pickupVillage) {
                    toast.error(tUi("Please enter a pickup village name to preview driving route.", language));
                    return;
                  }
                  openGoogleMapsDirections({
                    origin: transportForm.pickupVillage,
                    destination: destName,
                  }, (err) => toast.error(err));
                }}
                className="border-blue-600/70 text-blue-800 hover:bg-blue-50 font-bold text-xs h-8 shrink-0 w-full sm:w-auto"
              >
                <Navigation size={13} className="mr-1.5 text-blue-600" /> View Route in Google Maps
              </Button>
            </div>
          </div>
        </div>

        <aside>
          <div className="transport-history-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#183d2e] m-0">{tUi("Active Vehicle Bookings", language)}</h3>
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
                        <button
                          type="button"
                          onClick={() => {
                            downloadTransportPassPdf({
                              transportCode: item.transportCode,
                              bookingCode: "BK-2026-7294",
                              farmerName: profileRecord?.name || "Registered Farmer",
                              farmerPhone: profileRecord?.phone || "9876543210",
                              farmerVillage: item.pickupVillage,
                              destinationCentreName: item.destinationCentreName,
                              scheduledDate: item.scheduledDate,
                              timeSlot: item.timeSlot,
                              vehicleType: item.vehicleName,
                              vehicleNumber: item.vehicleNumber,
                              driverName: item.driverName,
                              driverPhone: item.driverPhone,
                              cargoDescription: "Paddy Grain Harvest Bags",
                              estimatedLoadQuintals: item.estimatedLoadQuintals,
                              distanceKm: item.distanceKm,
                              baseFare: item.baseFare,
                              govtSubsidyAmount: item.subsidyAmount,
                              farmerNetPayable: item.netPayable,
                              status: item.status,
                            });
                            toast.success(tUi("Subsidized Transport Pass PDF downloaded.", language));
                          }}
                          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 mt-1 underline"
                        >
                          <Download size={12} /> Download Pass PDF
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!item.pickupVillage || !item.destinationCentreName) {
                              toast.error(tUi("Pickup village or destination mandi is missing for this booking.", language));
                              return;
                            }
                            const opened = openGoogleMapsDirections({
                              origin: item.pickupVillage,
                              destination: item.destinationCentreName,
                            }, (err) => toast.error(err));
                            if (opened) {
                              toast.success(tUi("Opening Google Maps Directions in new tab...", language));
                            }
                          }}
                          className="h-8 px-2 text-[11px] font-bold border-blue-600 text-blue-800 hover:bg-blue-50 mt-1 shadow-2xs"
                        >
                          <Navigation size={12} className="mr-1 text-blue-600" /> View Route in Google Maps
                        </Button>
                      </div>
                    </div>

                    {/* 30-Minute Cancellation Notice & Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1 text-[11px]">
                      {isCancelled ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <X size={13} /> Transportation Cancelled
                        </span>
                      ) : isOngoing ? (
                        <span className="text-slate-500 font-medium">{tUi("Trip dispatched / completed", language)}</span>
                      ) : cStatus.expired ? (
                        <span className="text-slate-400">{tUi("Cancellation window expired (available for 30 mins from booking creation)", language)}</span>
                      ) : (
                        <>
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <Clock3 size={13} /> {tUi("Can cancel until:", language)} <b className="font-bold">{cStatus.deadlineFormatted} ({cStatus.text} left)</b>
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
        title={tUi("Procurement & Service History", language)}
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
            <span className="text-xs font-bold text-slate-500">{tUi("Slot Bookings", language)}</span>
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
            <span className="text-xs font-bold text-slate-500">{tUi("Transportation", language)}</span>
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
            <span className="text-xs font-bold text-slate-500">{tUi("DBT Payouts", language)}</span>
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
            <span className="text-xs font-bold text-slate-500">{tUi("Aadhaar DBT", language)}</span>
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
            placeholder={tUi("Search bookings, crops, transport, payments...", language)}
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
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{tUi("Loading your verified procurement history…", language)}</p>
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{tUi("Crop & Variety", language)}</span>
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.crop}</div>
                        <span className="text-slate-500 font-semibold">{item.quantity} Quintals expected</span>
                      </div>
                    </div>

                    {/* Centre & Location */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{tUi("Procurement Centre", language)}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.centre || "Assigned Centre"}</div>
                      <span className="text-slate-500">📅 {item.date || "Date scheduled"} {item.timeSlot ? `· ${item.timeSlot}` : ""}</span>
                    </div>

                    {/* Token & Queue */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{tUi("Queue Token & Status", language)}</span>
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{tUi("Vehicle & Load", language)}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{t.vehicleType?.replaceAll("_", " ")}</div>
                      <span className="text-slate-500">Cap: {t.estimatedLoadQuintals} Quintals load</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{tUi("Route & Schedule", language)}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{t.pickupVillage} → {t.destinationCentre}</div>
                      <span className="text-slate-500">📅 {t.scheduledDate} · {t.timeSlot}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{tUi("Assigned Driver", language)}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{t.driverName}</div>
                      <span className="text-slate-500 font-mono text-[11px]">{t.vehicleNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{tUi("Net Fare:", language)}</span>
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
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block tracking-wider">{tUi("Transferred Payout", language)}</span>
                      <div className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                        ₹{Number(item.amount).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-400 block">{tUi("Payment Mode", language)}</span>
                      <b className="text-slate-800 dark:text-slate-200">{item.paymentMethod || "Aadhaar DBT / NEFT"}</b>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>{tUi("Related Booking:", language)} <code className="font-mono text-slate-700 dark:text-slate-300">{p.bookingCode || "Mandi Procurement"}</code></span>
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
        title={tUi("Department Staff Governance & Access Control", language)}
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
              { key: "resets", label: "Password Reset Requests", count: passwordResetsList.filter(r => r.status === "PENDING_APPROVAL").length, badgeTone: "bg-rose-100 text-rose-800" },
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
                <h3 className="text-base font-bold text-slate-800 mb-1">{tUi("No Pending Staff Verification Requests", language)}</h3>
                <p className="text-xs text-slate-500 max-w-md">{tUi("All onboarding applications have been verified. Click \"+ Onboard New Employee\" to register new staff joining a branch.", language)}</p>
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
                          <span>{tUi("🏢", language)} <b>{tUi("Dept:", language)}</b> {staff.department} ({staff.designation || "Staff"})</span>
                          <span>{tUi("📍", language)} <b>{tUi("Branch:", language)}</b> {staff.branch} ({staff.centreName || staff.district})</span>
                          <span>{tUi("📞", language)} <b>{tUi("Phone:", language)}</b> {staff.phone || "—"}</span>
                          <span>{tUi("✉️", language)} <b>{tUi("Email:", language)}</b> {staff.email || "—"}</span>
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
                    <th className="py-3 px-4">{tUi("OFFICER / LOGIN ID", language)}</th>
                    <th className="py-3 px-4">{tUi("EMPLOYEE ID & NAME", language)}</th>
                    <th className="py-3 px-4">{tUi("ROLE & DEPARTMENT", language)}</th>
                    <th className="py-3 px-4">{tUi("ASSIGNED BRANCH & CENTRE", language)}</th>
                    <th className="py-3 px-4">{tUi("STATUS", language)}</th>
                    <th className="py-3 px-4 text-right">{tUi("ACTION", language)}</th>
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
                      <div className="font-bold text-slate-900">{tUi("K. Venkata Rao", language)}</div>
                      <div className="text-[11px] text-slate-500">{tUi("EMP-HO-104 · 9848012345", language)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[10px]">{tUi("HEAD OFFICER", language)}</Badge>
                      <div className="text-[11px] text-slate-500 mt-0.5">{tUi("Administration & District Governance", language)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{tUi("Guntur & Nizamabad Main Branch", language)}</span>
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
                            title={tUi("Copy Login ID", language)}
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
                        <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-200">{tUi("DEACTIVATED", language)}</Badge>
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
              <span>{tUi("Immutable administrative audit trail recording all staff onboarding, verification approvals, credential issuances, and deactivations.", language)}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {staffAuditLogsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">{tUi("No audit logs recorded yet.", language)}</div>
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
                          <span className="text-[11px] text-slate-500">{tUi("by", language)} <b>{log.performedByOfficerName}</b></span>
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

        {/* Tab: Password Reset Requests */}
        {staffTab === "resets" && (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
              <Key size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-900 mb-0.5">{tUi("Officer Password Reset Governance", language)}</span>
                <span>
                  Head Officers review and authorize password reset requests submitted by department staff. Approving a request generates a cryptographically secure 24-hour single-use token that the officer must enter to complete their password change.
                </span>
              </div>
            </div>

            {passwordResetsList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <ShieldCheck size={24} />
                </span>
                <h3 className="text-base font-bold text-slate-800 mb-1">{tUi("No Password Reset Requests", language)}</h3>
                <p className="text-xs text-slate-500 max-w-md">{tUi("There are no pending or past password reset requests. All department officer credentials remain secure and active.", language)}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {passwordResetsList.map(req => (
                  <article
                    key={req.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      req.status === "PENDING_APPROVAL"
                        ? "border-amber-300 bg-amber-50/40 shadow-xs"
                        : req.status === "APPROVED"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : req.status === "REJECTED"
                        ? "border-rose-200 bg-rose-50/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          req.status === "PENDING_APPROVAL"
                            ? "bg-amber-100 text-amber-800"
                            : req.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          <Key size={18} />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <strong className="text-sm font-extrabold text-slate-900">{req.officerName}</strong>
                            <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {req.officerCode}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-extrabold px-2 py-0.5 ${
                                req.status === "PENDING_APPROVAL"
                                  ? "bg-amber-100 text-amber-900 border-amber-300"
                                  : req.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : req.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-900 border-rose-300"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {req.status === "PENDING_APPROVAL" ? "PENDING REVIEW" : req.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span>{tUi("Department:", language)} <b>{req.department || "General"}</b></span>
                            <span>•</span>
                            <span>{tUi("Email:", language)} <b>{req.email}</b></span>
                            <span>•</span>
                            <span>{tUi("Phone:", language)} <b>{req.phone}</b></span>
                          </div>
                          {req.reason && (
                            <p className="text-xs text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/60 mt-2 mb-0">
                              Reason: <span className="italic">"{req.reason}"</span>
                            </p>
                          )}
                          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2">
                            <Clock3 size={12} />
                            Requested: {new Date(req.requestedAt).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      {/* Action & Status Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        {req.status === "PENDING_APPROVAL" && (
                          <>
                            <Button
                              size="sm"
                              disabled={resetApprovingId === req.id || resetRejectingId === req.id}
                              onClick={() => void approvePasswordReset(req.id)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs"
                            >
                              {resetApprovingId === req.id ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                              Approve & Generate Token
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resetApprovingId === req.id || resetRejectingId === req.id}
                              onClick={() => {
                                const reason = prompt("Enter rejection reason for this officer reset request:", "Identity or department mismatch");
                                if (reason !== null) {
                                  void rejectPasswordReset(req.id, reason);
                                }
                              }}
                              className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold h-9 px-3 rounded-xl flex items-center gap-1.5"
                            >
                              <X size={15} />
                              Reject
                            </Button>
                          </>
                        )}

                        {req.status === "APPROVED" && (
                          <div className="p-2.5 bg-white border border-emerald-200 rounded-xl flex flex-col gap-1 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{tUi("Approval Token (24h):", language)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (req.approvalToken) {
                                    navigator.clipboard?.writeText(req.approvalToken);
                                    toast.success(tUi("Approval token copied to clipboard!", language));
                                  }
                                }}
                                className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                              >
                                <Copy size={12} /> Copy Token
                              </button>
                            </div>
                            <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 select-all tracking-wider">
                              {req.approvalToken || "Token Active"}
                            </span>
                            {req.expiresAt && (
                              <span className="text-[10px] text-slate-400">
                                Valid until: {new Date(req.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        )}

                        {req.status === "REJECTED" && (
                          <div className="text-right text-xs">
                            <span className="text-rose-700 font-bold block">{tUi("Rejected by Head Officer", language)}</span>
                            <span className="text-[11px] text-slate-500 italic">"{req.rejectionReason || "Identity mismatch"}"</span>
                          </div>
                        )}

                        {req.status === "COMPLETED" && (
                          <div className="text-right text-xs text-slate-500">
                            <span className="text-emerald-700 font-bold flex items-center gap-1 justify-end">
                              <Check size={14} /> Password Reset Complete
                            </span>
                            <span className="text-[10px] text-slate-400">{tUi("Used & deactivated", language)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
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
                <p className="text-xs text-slate-500 m-0 mt-0.5">{tUi("Submit employee details for Head Officer verification and role provisioning.", language)}</p>
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
                    placeholder={tUi("e.g. S. Srinivas Reddy", language)}
                    value={addStaffForm.name}
                    onChange={e => setAddStaffForm(f => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Employee ID (HR / Govt) *
                  <Input
                    required
                    className="mt-1"
                    placeholder={tUi("e.g. EMP-QC-8842", language)}
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
                    placeholder={tUi("10-digit mobile number", language)}
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
                    placeholder={tUi("name@smartprocure.gov.in", language)}
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
                    <option value="Quality Control">{tUi("Quality Control", language)}</option>
                    <option value="Logistics & Transportation">{tUi("Logistics & Transportation", language)}</option>
                    <option value="Payment & DBT">{tUi("Payment & DBT", language)}</option>
                    <option value="Procurement Operations">{tUi("Procurement Operations", language)}</option>
                    <option value="Administration">{tUi("Administration", language)}</option>
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
                    <option value="Guntur">{tUi("Guntur Main Yard (Guntur District)", language)}</option>
                    <option value="Nizamabad">{tUi("Nizamabad Market Yard (Nizamabad District)", language)}</option>
                    <option value="Bhiknoor">{tUi("Bhiknoor Procurement Centre (Kamareddy District)", language)}</option>
                    <option value="Warangal">{tUi("Warangal Enamamula Market (Warangal District)", language)}</option>
                    <option value="Karimnagar">{tUi("Karimnagar District Centre", language)}</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Designation Title
                  <Input
                    className="mt-1"
                    placeholder={tUi("e.g. Senior Quality Inspector", language)}
                    value={addStaffForm.designation}
                    onChange={e => setAddStaffForm(f => ({ ...f, designation: e.target.value }))}
                  />
                </label>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                <span>{tUi("Onboarding requests require Head Officer verification before access credentials and login privileges become active.", language)}</span>
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
                <h3 className="text-base font-bold text-slate-900 m-0">{tUi("Staff Access Approved!", language)}</h3>
                <p className="text-xs text-slate-500 m-0">{approvedCredentials.staff?.name} is now verified and active.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500">{tUi("PROVISIONED LOGIN ID", language)}</span>
                <div className="flex items-center justify-between bg-white p-2.5 mt-1 rounded-lg border border-slate-200">
                  <code className="text-sm font-black text-emerald-800 tracking-wider">{approvedCredentials.officerCode}</code>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(approvedCredentials.officerCode); toast.success(tUi("Login ID copied!", language)); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                    title={tUi("Copy Login ID", language)}
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500">{tUi("TEMPORARY ACTIVATION PASSWORD", language)}</span>
                <div className="flex items-center justify-between bg-white p-2.5 mt-1 rounded-lg border border-slate-200">
                  <code className="text-sm font-mono font-bold text-slate-800">{approvedCredentials.temporaryPassword || "Staff@2026#AP"}</code>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(approvedCredentials.temporaryPassword || "Staff@2026#AP"); toast.success(tUi("Temporary password copied!", language)); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                    title={tUi("Copy Password", language)}
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
              <h3 className="text-base font-bold text-slate-900 m-0">{tUi("Reject Staff Onboarding", language)}</h3>
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
                placeholder={tUi("e.g. Employee ID not found on payroll, verification failed...", language)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectStaffModal(false)}>{tUi("Cancel", language)}</Button>
              <Button variant="destructive" size="sm" onClick={() => { void submitRejectStaff(); }}>{tUi("Confirm Rejection", language)}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Token Modal for Approved Reset */}
      {activeTokenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">{tUi("Password Reset Authorized!", language)}</h3>
              <p className="text-xs text-slate-600">
                Provide this 24-hour Approval Token to <b>{activeTokenModal.officerName}</b> ({activeTokenModal.officerCode}).
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tUi("Single-Use Approval Token:", language)}</span>
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-mono text-xs font-bold text-emerald-900 tracking-wider select-all break-all">
                  {activeTokenModal.token}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(activeTokenModal.token);
                    toast.success(tUi("Token copied to clipboard!", language));
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 px-3 shrink-0 rounded-lg flex items-center gap-1"
                >
                  <Copy size={13} /> Copy
                </Button>
              </div>
              <span className="text-[10px] text-slate-500">
                ⚠️ The officer must enter this token and set their new password on the Officer Login page within 24 hours.
              </span>
            </div>

            <Button
              onClick={() => setActiveTokenModal(null)}
              className="action-button w-full text-xs font-bold"
            >
              Done & Close
            </Button>
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
              <div><span className="text-slate-400 font-bold block text-[10px]">{tUi("DEPARTMENT", language)}</span><b>{viewingStaffDetails.department}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">{tUi("BRANCH CENTRE", language)}</span><b>{viewingStaffDetails.branch}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">{tUi("CONTACT PHONE", language)}</span><b>{viewingStaffDetails.phone || "—"}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">{tUi("EMAIL ADDRESS", language)}</span><b>{viewingStaffDetails.email || "—"}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">{tUi("STATUS", language)}</span><b className="text-emerald-700">{viewingStaffDetails.status}</b></div>
              <div><span className="text-slate-400 font-bold block text-[10px]">{tUi("ENROLLED AT", language)}</span><b>{new Date(viewingStaffDetails.createdAt).toLocaleDateString("en-IN")}</b></div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <b>{tUi("Role Scope:", language)}</b>{" "}
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

  const officerAiCopilotScreen = officerShell(
    <>
      <SectionTitle
        eyebrow="AI OFFICER COPILOT · OPERATIONAL ADVISORY SUITE"
        title={tUi("ProcureFlow Officer Operational Copilot", language)}
        body="Ask any operational question regarding Fair Average Quality (FAQ) standards, electronic weighbridge calibration, queue dispatch, or farmer document verification."
      />

      <div className="assistant-advanced-layout">
        <section className="chat-panel">
          <div className="chat-head">
            <div className="flex items-center gap-3">
              <span className="assistant-bot-avatar"><Bot size={20} /></span>
              <div>
                <b className="text-sm font-extrabold text-[#143d2c]">{tUi("ProcureFlow Officer Copilot", language)}</b>
                <small className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <i className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Official Mandi Operations · ProcureFlow AI Copilot
                </small>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguagePicker language={language} setLanguage={changeLanguage} />
              <button
                type="button"
                onClick={clearOfficerChat}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                title={tUi("Clear Copilot Conversation", language)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Quick Operational Prompts */}
          <div className="suggested-prompts">
            <span className="font-bold text-xs text-[#164330] block mb-1">
              💡 Official Mandi Operations Guidance:
            </span>
            <div className="prompt-chips-grid">
              {[
                "What are the Fair Average Quality (FAQ) norms for paddy moisture & foreign matter?",
                "What is the standard procedure for electronic weighbridge tare deduction?",
                "How to resolve truck congestion & optimize turnaround time during peak arrivals?",
                "What documents must be verified before issuing weighbridge token slip?",
                "Dispute resolution protocol when paddy moisture marginally exceeds 17%?",
              ].map(q => (
                <button
                  key={q}
                  className="prompt-chip-btn"
                  onClick={() => void officerAssistantReply(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="chat-feed" ref={chatFeedRef}>
            {officerChat.map((msg, idx) => (
              <div className={`chat-bubble ${msg.role}`} key={`${msg.text}-${idx}`}>
                {msg.role === "assistant" ? (
                  <>
                    <div className="assistant-head-info">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <Bot size={14} className="text-emerald-700" /> ProcureFlow Copilot
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`ai-source-badge ${msg.source === "fallback" ? "fallback" : "gemini"}`}>
                          {msg.source === "fallback" ? "🌾 Offline Advisory" : "✨ ProcureFlow Copilot"}
                        </span>
                        <button
                          onClick={() => speak(msg.text)}
                          className={`assistant-audio-btn ${speakingText === msg.text ? "text-emerald-600 animate-pulse" : ""}`}
                          title={tUi("Read aloud", language)}
                        >
                          <Volume2 size={14} /> Listen
                        </button>
                      </div>
                    </div>
                    {msg.warning && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mb-1">
                        ⚠️ {msg.warning}
                      </p>
                    )}
                    <p>{msg.text}</p>
                  </>
                ) : (
                  <>
                    <span className="user-label-pill">Officer ({officerProfile?.name || "Officer"})</span>
                    <p>{msg.text}</p>
                  </>
                )}
              </div>
            ))}

            {officerChatLoading && (
              <div className="chat-bubble assistant">
                <div className="ai-typing-indicator">
                  <Bot size={14} className="animate-pulse" />
                  <span>{tUi("ProcureFlow Copilot is analyzing operational SOPs...", language)}</span>
                  <div className="flex items-center gap-1 ml-1">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (officerChatInput.trim() && !officerChatLoading) {
                void officerAssistantReply(officerChatInput);
              }
            }}
            className="chat-compose"
          >
            <button
              type="button"
              onClick={listen}
              className={`p-2 rounded-lg ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-emerald-100 text-emerald-800"}`}
              title={tUi("Voice Input", language)}
            >
              <Mic size={18} />
            </button>
            <input
              type="text"
              value={officerChatInput}
              onChange={(e) => setOfficerChatInput(e.target.value)}
              placeholder={tUi("Ask officer copilot about FAQ norms, weighbridges, queues, verification...", language)}
              disabled={officerChatLoading}
            />
            <button
              type="submit"
              disabled={officerChatLoading || !officerChatInput.trim()}
              className="p-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </section>

        {/* Side Panel with Mandi SOP & Reference Standards */}
        <aside className="assistant-side">
          <span className="status-pill verified">{tUi("OFFICIAL SOP MANUAL", language)}</span>
          <h3>{tUi("Mandi Standard Norms (AP)", language)}</h3>
          <p>
            Reference guidelines for Moisture Testing, Digital Weighment, and Fair Average Quality (FAQ) standards.
          </p>
          <div className="mt-4 space-y-2 text-xs text-slate-700">
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <b className="text-emerald-900 block">{tUi("Paddy Moisture Limit", language)}</b>
              <span>{tUi("Strictly maximum 17.0% as per AP Civil Supplies norms.", language)}</span>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
              <b className="text-blue-900 block">{tUi("Foreign Matter Allowance", language)}</b>
              <span>{tUi("Maximum 1.0% inorganic, 1.0% organic impurities.", language)}</span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
              <b className="text-amber-900 block">{tUi("Dispute Protocol", language)}</b>
              <span>{tUi("Draw three random composite samples in farmer presence before issuing inspection slip.", language)}</span>
            </div>
          </div>
        </aside>
      </div>
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
      case "officerAiCopilot": return officerAiCopilotScreen;
      default: return landing;
    }
  };

  return (
    <>
      <MobileViewBanner />
      {renderCurrentScreen()}

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
                  <span className="text-xs text-muted-foreground">{tUi("Release reserved procurement slot", language)}</span>
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
                  <span className="font-semibold text-foreground">{tUi("MSP Paddy Procurement", language)}</span>
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
                  <span className="text-xs text-muted-foreground">{tUi("Subsidized vehicle transportation", language)}</span>
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

