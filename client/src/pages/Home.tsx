/**
 * Fields & Flow design: contemporary agrarian wayfinding, clear
 * operational status, paddy green + canal blue, and large farmer-friendly controls.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
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
  Headphones,
  HelpCircle,
  Landmark,
  Leaf,
  LoaderCircle,
  LocateFixed,
  LogIn,
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
  UserX,
  UsersRound,
  Volume2,
  VolumeX,
  WalletCards,
  Wheat,
  Wind,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { MapView } from "@/components/Map";

type Language = "EN" | "TE" | "HI";
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
  | "registrations"
  | "farmerDetail"
  | "approved"
  | "bookings"
  | "officerPayments";


type Centre = {
  id: number;
  name: string;
  place: string;
  distance: string;
  queue: number;
  wait: string;
  slots: number;
  status: "Open" | "Busy" | "Limited";
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
  farmer: { id: number; farmerCode: string; name: string; phone: string; village: string; district: string; primaryCrop: string; status: string };
  centre: { id: number; name: string; place: string; distanceKm: number };
  slot: { id: number; date: string; startTime: string; endTime: string };
  queue: { position: number; peopleAhead: number; estimatedWaitMinutes: number; status: string; currentToken: string } | null;
  procurement: { status: string; weighedQuantityQuintals: number | null; qualityGrade: string | null } | null;
  paymentQuote: { unitPrice: number; qualityAdjustment: number; demoPayable: number; currency: string; isOfficial: boolean };
};

type PaymentRecord = {
  paymentId: string;
  transactionReference: string;
  receiptNumber: string | null;
  amount: number;
  method: "UPI" | "CARD" | "NET_BANKING";
  gateway: string;
  gatewayPaymentId: string | null;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
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

type PendingRegistration = { id: number; status: "PENDING" | "APPROVED" | "REJECTED"; farmer: FarmerProfile };
const farmerOnlyScreens: Screen[] = [
  "dashboard",
  "paddy",
  "cropPrices",
  "farmerAnalytics",
  "transportation",
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

const centres: Centre[] = [
  { id: 1, name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", distance: "2.4 km", queue: 18, wait: "30 min", slots: 10, status: "Open", position: "left-[48%] top-[42%]", latitude: 16.2970, longitude: 80.4350 },
  { id: 2, name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", distance: "4.8 km", queue: 8, wait: "15 min", slots: 14, status: "Open", position: "left-[52%] top-[38%]", latitude: 16.5417, longitude: 80.5847 },
  { id: 3, name: "Kurnool Rythu Bharosa Kendra", place: "C-Camp Agri Centre", distance: "6.5 km", queue: 28, wait: "50 min", slots: 4, status: "Busy", position: "left-[25%] top-[55%]", latitude: 15.8281, longitude: 78.0373 },
  { id: 4, name: "Rajahmundry Godavari Collection Point", place: "Katheru Road", distance: "8.2 km", queue: 12, wait: "25 min", slots: 8, status: "Limited", position: "left-[65%] top-[25%]", latitude: 17.0005, longitude: 81.8040 },
  { id: 5, name: "Eluru District Procurement Yard", place: "Sanivarapupeta", distance: "10.5 km", queue: 6, wait: "10 min", slots: 16, status: "Open", position: "left-[56%] top-[34%]", latitude: 16.7107, longitude: 81.0952 },
  { id: 6, name: "Nellore Coastal Paddy Mandi", place: "Podalakur Road", distance: "13.8 km", queue: 15, wait: "30 min", slots: 7, status: "Open", position: "left-[45%] top-[78%]", latitude: 14.4426, longitude: 79.9865 },
  { id: 7, name: "Tirupati Rayalaseema Grain Yard", place: "Renigunta Road", distance: "15.2 km", queue: 32, wait: "55 min", slots: 3, status: "Busy", position: "left-[40%] top-[88%]", latitude: 13.6288, longitude: 79.4192 },
  { id: 8, name: "Visakhapatnam Anandapuram Yard", place: "Anandapuram Junction", distance: "18.5 km", queue: 9, wait: "20 min", slots: 12, status: "Open", position: "left-[80%] top-[12%]", latitude: 17.8864, longitude: 83.3980 },
];

const navItems: { screen: Screen; label: string; icon: typeof Sprout }[] = [
  { screen: "dashboard", label: "Overview", icon: Sprout },
  { screen: "paddy", label: "New booking", icon: CalendarDays },
  { screen: "cropPrices", label: "Govt MSP Rates", icon: Wheat },
  { screen: "weather", label: "Live Weather", icon: CloudSun },
  { screen: "farmerAnalytics", label: "Analytics", icon: BarChart3 },
  { screen: "transportation", label: "Transportation", icon: Truck },
  { screen: "token", label: "My token", icon: Ticket },
  { screen: "queue", label: "Live queue", icon: UsersRound },
  { screen: "status", label: "Procurement", icon: ClipboardCheck },
  { screen: "payment", label: "Payments", icon: WalletCards },
  { screen: "assistant", label: "AI Help Centre", icon: Bot },
];
const localizedUiText: Record<Exclude<Language, "EN">, Record<string, string>> = {
  HI: {
    "Back to home": "होम पर लौटें",
    "Farmer name": "किसान का नाम",
    "Full name": "पूरा नाम",
    "Mobile number": "मोबाइल नंबर",
    "Create password": "पासवर्ड बनाएँ",
    "Farmer ID / Aadhaar": "किसान आईडी / आधार",
    "Aadhaar Number": "आधार संख्या",
    "Total Land Area (Acres)": "कुल भूमि (एकड़)",
    "Total Land Area": "कुल कृषि भूमि",
    "Acres": "एकड़",
    "Password": "पासवर्ड",
    Village: "गाँव",
    District: "ज़िला",
    "Primary crop": "मुख्य फसल",
    "Submit registration": "पंजीकरण जमा करें",
    "Return to farmer login": "किसान लॉगिन पर लौटें",
    "Book another slot": "एक और स्लॉट बुक करें",
    "View token": "टोकन देखें",
    "See live queue": "लाइव कतार देखें",
    "Choose a centre": "केंद्र चुनें",
    "Review booking": "बुकिंग की समीक्षा करें",
    "Confirm & generate token": "पुष्टि करें और टोकन बनाएँ",
    "Open live queue": "लाइव कतार खोलें",
    "Complete your procurement payment.": "अपनी खरीद का भुगतान पूरा करें।",
    "Select payment method": "भुगतान विधि चुनें",
    "Payment received.": "भुगतान प्राप्त हुआ।",
    "Payment history": "भुगतान इतिहास",
    "Your registration is under review.": "आपका पंजीकरण समीक्षा में है।",
    "Registration must be approved by an officer.": "पंजीकरण अधिकारी द्वारा स्वीकृत होना चाहिए।",
    "Login to my dashboard": "मेरे डैशबोर्ड में लॉगिन करें",
    "Sign in and load an active booking to view its payment summary.": "भुगतान सारांश देखने के लिए लॉगिन करके सक्रिय बुकिंग लोड करें।",
    "Edit details": "विवरण संपादित करें",
    "My profile": "मेरी प्रोफ़ाइल",
    "Farmer assistant": "किसान सहायक",
    "AI Help Centre": "एआई सहायता केंद्र",
    "AI FARMER ASSISTANT & HELP CENTRE": "एआई किसान सहायक व सहायता केंद्र",
    "AI FARMER ASSISTANT": "एआई किसान सहायक",
    "ProcureFlow AI Assistant": "प्रोक्योरफ्लो एआई सहायक",
    "Live Weather": "लाइव मौसम",
    "Reject farmer": "पंजीकरण अस्वीकार करें",
    "Approve farmer": "पंजीकरण स्वीकृत करें",
    "Update stage": "दशा बदलें",
    "Procurement stage": "खरीद चरण",
    "Save status": "स्थिति सुरक्षित करें",
    "Govt MSP Rates": "सरकारी समर्थन मूल्य दरें",
    "Analytics": "एनालिटिक्स",
    "Transportation": "फसल परिवहन",
    "Overview": "अवलोकन",
    "New booking": "नई बुकिंग",
    "My token": "मेरा टोकन",
    "Live queue": "लाइव कतार",
    "Procurement": "खरीद",
    "Payments": "भुगतान",
    "YOUR DATE": "आपकी तिथि",
    "YOUR TOKEN": "आपका टोकन",
    "ACTIVE API BOOKING": "सक्रिय एपीआई बुकिंग",
    "DEMO BOOKING": "डेमो बुकिंग",
    "PEOPLE AHEAD": "आगे किसान",
    "ESTIMATED WAIT": "अनुमानित प्रतीक्षा",
    "PADDY SELECTED": "चुना हुआ धान",
    "PROCUREMENT STAGE": "खरीद चरण",
    "TODAY’S SIGNAL": "आज की सूचना",
    "WHAT’S NEXT": "आगे का कदम",
    "YOUR STATS": "आपके आँकड़े",
    "Total bookings": "कुल बुकिंग",
    "Completed procurement": "पूर्ण खरीद",
    "Current position": "वर्तमान स्थिति",
    "Amount received": "प्राप्त राशि",
    "Bring the right documents.": "उचित दस्तावेज़ साथ लाएँ।",
    "Keep your farmer ID, bank passbook, and paddy receipt ready for a fast verification.": "त्वरित सत्यापन के लिए किसान आईडी, बैंक पासबुक और धान रसीद तैयार रखें।",
    "Ask now": "अभी पूछें",
    "See full procurement timeline": "पूरी खरीद समयरेखा देखें",
    "FARMER SPACE": "किसान पोर्टल",
    "Open today": "आज खुला है",
    "Log out": "लॉग आउट",
    "Logout": "लॉग आउट",
    "Govt Bonus": "सरकारी बोनस",
    "Max Moisture": "अधिकतम नमी",
    "Effective Rate": "प्रभावी दर",
    "Subsidy": "सब्सिडी",
    "Tractor Trolley": "ट्रैक्टर ट्रॉली",
    "Mini Truck": "मिनी ट्रक",
    "Heavy Lorry": "भारी लॉरी",
    "Book Subsidized Transport": "सब्सिडी वाला परिवहन बुक करें",
    "Calculate MSP Valuation": "न्यूनतम समर्थन मूल्य गणना करें",
    "Realized Revenue": "प्राप्त आय",
    "Benchmark Achieved": "मानक प्राप्त",
    "Turnaround Speed": "औसत समय",
    "Transport Savings": "परिवहन बचत",
    "Download Statement": "स्टेटमेंट डाउनलोड करें",
    "Driver": "चालक",
    "Phone": "फ़ोन",
    "Vehicle Number": "वाहन संख्या",
    "Distance": "दूरी",
    "Base Fare": "मूल किराया",
    "Net Payable": "किसान देय राशि",
    "Assigned": "आवंटित",
    "In Transit": "मार्ग में",
    "Delivered": "पहुँच गया",
    "All": "सभी",
    "Cereals": "अनाज",
    "Pulses": "दालें",
    "Oilseeds": "तिलहन",
    "Commercial": "वाणिज्यिक",
    "Search crop or variety...": "फसल या किस्म खोजें...",
    "Book procurement slot at this MSP": "इस समर्थन मूल्य पर स्लॉट बुक करें",
    "Book Subsidized Vehicle": "सब्सिडी वाला वाहन बुक करें",
    "Estimated Load (Quintals)": "अनुमानित भार (क्विंटल)",
    "Pickup Village": "गाँव से उठाव",
    "Destination Centre": "गंतव्य खरीद केंद्र",
    "Scheduled Date": "निर्धारित तिथि",
    "Time Slot": "समय स्लॉट",
    "Total Harvest Procured": "कुल खरीदी गई फसल",
    "Price Realization Rate": "मूल्य प्राप्ति दर",
    "Average Turnaround": "औसत समय",
    "Logistics Subsidy Saved": "बचाई गई परिवहन सब्सिडी",
    "Harvest Delivery Statements": "फसल खरीद विवरण तालिका",
    "Active Vehicle Bookings": "सक्रिय वाहन बुकिंग",
    "Normal Map": "सामान्य मानचित्र",
    "Satellite Map": "सैटेलाइट मानचित्र",
    "Andhra Pradesh Network": "आंध्र प्रदेश नेटवर्क",
    "Andhra Pradesh Centres": "आंध्र प्रदेश केंद्र",
    "Fit AP": "AP फ़िट करें",
    "Select this Centre": "यह केंद्र चुनें",
    "Choose time, not just distance.": "सिर्फ़ दूरी नहीं, समय भी चुनें।",
    "Vijayawada is calmest now": "विजयवाड़ा केंद्र पर सबसे कम भीड़ है",
    "View Vijayawada Centre": "विजयवाड़ा केंद्र देखें",
    "Live Agricultural Weather & Safe Harvest Report": "लाइव कृषि मौसम व सुरक्षित कटाई रिपोर्ट",
    "Agricultural Meteorology": "कृषि मौसम विज्ञान",
    "Safe Harvesting Advisory": "सुरक्षित फसल कटाई सलाह",
    "3-Day Agriculture Forecast": "3-दिवसीय कृषि पूर्वानुमान",
    "Humidity": "नमी / आर्द्रता",
    "Wind Velocity": "हवा की गति",
    "Precipitation": "वर्षा की संभावना",
    "Harvest Status": "कटाई स्थिति",
    "Feels like": "महसूस तापमान",
    "Clear Sky": "साफ आसमान",
    "Sunny & Dry": "शुष्क व धूप",
    "Partly Cloudy": "आंशिक बादल",
    "Optimal": "उत्कृष्ट",
    "Favorable": "अनुकूल",
    "Caution": "सावधानी",
    "Officer console": "अधिकारी कंसोल",
    "Pending farmers": "लंबित किसान",
    "Approved farmers": "स्वीकृत किसान",
    "Bookings & queue": "बुकिंग व कतार",
    "Payment status": "भुगतान स्थिति",
    "Farmer portal": "किसान पोर्टल",
    "Procurement window": "खरीद विंडो",
    "Total Registrations": "कुल पंजीकरण",
    "Pending Review": "समीक्षा हेतु लंबित",
    "Active Bookings": "सक्रिय बुकिंग",
    "Completed Today": "आज पूर्ण",
    "Approve": "स्वीकृत करें",
    "Reject": "अस्वीकार करें",
    "Aadhaar": "आधार",
    "Primary Crop": "मुख्य फसल",
    "Rythu Bharosa Toll-Free": "रायथू भरोसा टोल-फ्री",
    "Call Helpline": "कॉल करें",
    "Copy Number": "नंबर कॉपी करें",
    "Mandatory Mandi Checklist": "मंडी हेतु अनिवार्य दस्तावेज़ सूची",
    "Mandatory Mandi Checklist:": "मंडी हेतु अनिवार्य दस्तावेज़ सूची:",
    "1. Farmer Registration ID / Aadhaar": "1. किसान पंजीकरण आईडी / आधार",
    "2. Aadhaar-linked Bank Passbook (DBT)": "2. आधार से जुड़ी बैंक पासबुक (DBT)",
    "3. e-Crop / Land Record (Pahani/1B)": "3. ई-फसल / भूमि रिकॉर्ड (1B)",
    "4. Digital Token Pass": "4. डिजिटल टोकन पास",
    "Official Rythu Helplines": "आधिकारिक किसान हेल्पलाइन",
    "Direct Government Support Desks": "प्रत्यक्ष सरकारी सहायता डेस्क",
    "Rythu Bharosa Kendra Helpdesk": "रायथू भरोसा केंद्र हेल्पडेस्क",
    "AP Civil Supplies & Mandi Grievance": "एपी नागरिक आपूर्ति एवं मंडी शिकायत",
    "Try asking": "पूछ कर देखें",
    "What is my token?": "मेरा टोकन क्या है?",
    "How many people are ahead of me?": "मेरे आगे कितने किसान हैं?",
    "When should I reach the centre?": "मुझे केंद्र कब पहुँचना चाहिए?",
    "Which centre has less waiting?": "किस केंद्र में कम प्रतीक्षा है?",
    "Is today's weather safe for harvest?": "क्या आज फसल काटना सुरक्षित है?",
    "How do I book 30% subsidized transport?": "30% सब्सिडी वाला वाहन कैसे बुक करें?",
    "Common paddy": "साधारण धान",
    "Fine paddy": "उत्कृष्ट धान",
    "Parboiled paddy": "उबला हुआ धान",
    "Grade A": "ग्रेड A",
    "Grade B": "ग्रेड B",
    "Expected quantity": "अपेक्षित मात्रा",
    "quintals": "क्विंटल",
    "Save for later": "बाद के लिए सुरक्षित करें",
    "Good selection means a smoother morning.": "सही चयन से खरीद यात्रा सुगम होती है।",
    "Centre availability updates live from the server.": "केंद्र की उपलब्धता सर्वर से लाइव अपडेट होती है।",
    "Morning Slot": "सुबह का स्लॉट",
    "Afternoon Slot": "दोपहर का स्लॉट",
    "Evening Slot": "शाम का स्लॉट",
    "Confirm Slot": "स्लॉट पक्का करें",
    "Booking confirmed": "बुकिंग पक्की हो गई",
    "Digital token": "डिजिटल टोकन",
    "Print / Save Token": "टोकन प्रिंट / सुरक्षित करें",
    "Return to dashboard": "डैशबोर्ड पर लौटें",
    "Processing": "प्रक्रिया जारी",
    "Completed": "पूर्ण",
    "Pending": "लंबित",
    "Failed": "विफल",
    "Success": "सफल",
    "BOOKED": "बुक किया गया",
    "ARRIVED": "केंद्र पर पहुँचे",
    "WEIGHED": "वजन संपन्न",
    "QUALITY_CHECK": "गुणवत्ता जाँच",
    "COMPLETED": "पूर्ण",
    "Card": "कार्ड",
    "Net Banking": "नेट बैंकिंग",
    "UPI": "यूपीआई",
    "Procurement settlement": "खरीद निपटान",
    "Amount payable": "देय राशि",
    "Copy receipt details": "रसीद विवरण कॉपी करें",
    "Receipt": "रसीद",
    "Farmer ID": "किसान आईडी",
    "Verified profile": "सत्यापित प्रोफ़ाइल",
    "Start a new booking": "नई बुकिंग शुरू करें",
    "Full Weather Report": "पूरी मौसम रिपोर्ट",
    "Safe Harvesting & Procurement Advisory": "सुरक्षित फसल कटाई व खरीद सलाह",
    "Book Subsidized Vehicle for Today's Weather": "आज के मौसम अनुसार सब्सिडी वाहन बुक करें",
    "Book Procurement Slot": "खरीद स्लॉट बुक करें",
    "Tomorrow": "कल",
    "Day After": "परसों",
    "In 3 Days": "3 दिन में",
    "AP Agromet": "आंध्र एग्रोमेट",
    "🌟 All Topics": "🌟 सभी विषय",
    "🎫 Token & Queue": "🎫 टोकन व कतार",
    "🌧️ Weather & Advisory": "🌧️ मौसम व सलाह",
    "🌾 Crop MSP Rates": "🌾 समर्थन मूल्य दरें",
    "🚚 30% Subsidized Transport": "🚚 30% सब्सिडी परिवहन",
    "📞 Helplines & Docs": "📞 हेल्पलाइन व दस्तावेज़",
    "Select a quick question:": "त्वरित सवाल चुनें:",
    "Type your question in English, Telugu, or Hindi…": "अपना सवाल यहाँ लिखें (अंग्रेज़ी, तेलुगु या हिन्दी)…",
    "Voice recognition & speech read-aloud enabled in English, Telugu and Hindi.": "आवाज़ पहचान और बोलकर सुनने की सुविधा उपलब्ध है।",
    "Call": "कॉल करें",
    "Copy": "कॉपी करें",
    "Toll-free": "टोल-फ्री",
    "24x7 Government Helpline": "24x7 सरकारी हेल्पलाइन",
    "Mon–Sat (8 AM – 7 PM)": "सोम–शनि (सुबह 8 – शाम 7)",
    "Paddy": "धान",
    "Cotton": "कपास",
    "Maize": "मक्का",
    "Red Gram": "अरहर (तूर दाल)",
    "Groundnut": "मूँगफली",
    "Soyabean": "सोयाबीन",
    "Wheat": "गेहूँ",
    "Gram": "चना",
    "Guntur Agricultural Market Yard": "गुंटूर कृषि मंडी यार्ड",
    "Vijayawada Central Paddy Hub": "विजयवाड़ा केंद्रीय धान केंद्र",
    "Kurnool Rayalaseema Mandi": "कर्नूल रायलसीमा मंडी",
    "Rajahmundry Godavari Yard": "राजामहेंद्री गोदावरी यार्ड",
    "Eluru Coastal Procurement Yard": "एलुरु तटीय खरीद यार्ड",
    "Nellore Swarnamukhi Yard": "नेल्लूर स्वर्णमुखी यार्ड",
    "Tirupati Balaji Mandi Hub": "तिरुपति बालाजी मंडी केंद्र",
    "Visakhapatnam Port Mandi": "विशाखापट्टनम पोर्ट मंडी",
  },
  TE: {
    "Back to home": "హోమ్‌కు తిరిగి వెళ్లండి",
    "Farmer name": "రైతు పేరు",
    "Full name": "పూర్తి పేరు",
    "Mobile number": "మొబైల్ నంబర్",
    "Create password": "పాస్‌వర్డ్ సృష్టించండి",
    "Farmer ID / Aadhaar": "రైతు ఐడి / ఆధార్",
    "Aadhaar Number": "ఆధార్ సంఖ్య",
    "Total Land Area (Acres)": "మొత్తం భూమి (ఎకరాలు)",
    "Total Land Area": "మొత్తం సాగు భూమి",
    "Acres": "ఎకరాలు",
    "Password": "పాస్‌వర్డ్",
    Village: "గ్రామం",
    District: "జిల్లా",
    "Primary crop": "ప్రధాన పంట",
    "Submit registration": "నమోదును సమర్పించండి",
    "Return to farmer login": "రైతు లాగిన్‌కు తిరిగి వెళ్లండి",
    "Book another slot": "మరో స్లాట్ బుక్ చేయండి",
    "View token": "టోకెన్ చూడండి",
    "See live queue": "ప్రత్యక్ష క్యూ చూడండి",
    "Choose a centre": "కేంద్రాన్ని ఎంచుకోండి",
    "Review booking": "బుకింగ్‌ను సమీక్షించండి",
    "Confirm & generate token": "నిర్ధారించి టోకెన్ సృష్టించండి",
    "Open live queue": "ప్రత్యక్ష క్యూ తెరవండి",
    "Complete your procurement payment.": "మీ కొనుగోలు చెల్లింపును పూర్తి చేయండి.",
    "Select payment method": "చెల్లింపు విధానాన్ని ఎంచుకోండి",
    "Payment received.": "చెల్లింపు అందింది.",
    "Payment history": "చెల్లింపు చరిత్ర",
    "Your registration is under review.": "మీ నమోదు సమీక్షలో ఉంది.",
    "Registration must be approved by an officer.": "నమోదును అధికారి ఆమోదించాలి.",
    "Login to my dashboard": "నా డ్యాష్‌బోర్డ్‌లో లాగిన్ చేయండి",
    "Sign in and load an active booking to view its payment summary.": "చెల్లింపు సారాంశం కోసం లాగిన్ చేసి క్రియాశీల బుకింగ్‌ను లోడ్ చేయండి.",
    "Edit details": "వివరాలను సవరించండి",
    "My profile": "నా ప్రొఫైల్",
    "Farmer assistant": "రైతు సహాయకుడు",
    "AI Help Centre": "AI సహాయ కేంద్రం",
    "AI FARMER ASSISTANT & HELP CENTRE": "AI రైతు సహాయకుడు & సహాయ కేంద్రం",
    "AI FARMER ASSISTANT": "AI రైతు సహాయకుడు",
    "ProcureFlow AI Assistant": "ప్రోక్యూర్ ఫ్లో AI సహాయకుడు",
    "Live Weather": "ప్రత్యక్ష వాతావరణం",
    "Reject farmer": "నమోదును తిరస్కరించండి",
    "Approve farmer": "నమోదును ఆమోదించండి",
    "Update stage": "దశను మార్చండి",
    "Procurement stage": "సేకరణ దశ",
    "Save status": "స్థితిని భద్రపరచండి",
    "Govt MSP Rates": "ప్రభుత్వ మద్దతు ధరలు",
    "Analytics": "విశ్లేషణ",
    "Transportation": "పంట రవాణా",
    "Overview": "అవలోకనం",
    "New booking": "కొత్త బుకింగ్",
    "My token": "నా టోకెన్",
    "Live queue": "ప్రత్యక్ష క్యూ",
    "Procurement": "కొనుగోలు",
    "Payments": "చెల్లింపులు",
    "YOUR DATE": "మీ తేదీ",
    "YOUR TOKEN": "మీ టోకెన్",
    "ACTIVE API BOOKING": "ప్రత్యక్ష బుకింగ్",
    "DEMO BOOKING": "నమూనా బుకింగ్",
    "PEOPLE AHEAD": "ముందున్న రైతులు",
    "ESTIMATED WAIT": "అంచనా సమయం",
    "PADDY SELECTED": "ఎంచుకున్న వరి",
    "PROCUREMENT STAGE": "సేకరణ దశ",
    "TODAY’S SIGNAL": "నేటి సమాచారం",
    "WHAT’S NEXT": "తదుపరి దశ",
    "YOUR STATS": "మీ గణాంకాలు",
    "Total bookings": "మొత్తం బుకింగ్‌లు",
    "Completed procurement": "పూర్తయిన సేకరణ",
    "Current position": "ప్రస్తుత స్థానం",
    "Amount received": "అందిన మొత్తం",
    "Bring the right documents.": "సరైన పత్రాలు తీసుకురండి.",
    "Keep your farmer ID, bank passbook, and paddy receipt ready for a fast verification.": "త్వరిత ధృవీకరణ కోసం మీ రైతు ఐడి, బ్యాంక్ పాస్‌బుక్ మరియు రసీదు సిద్ధంగా ఉంచుకోండి.",
    "Ask now": "ఇప్పుడే అడగండి",
    "See full procurement timeline": "పూర్తి సేకరణ కాలక్రమం చూడండి",
    "FARMER SPACE": "రైతు విభాగం",
    "Open today": "ఈరోజు తెరిచి ఉంది",
    "Log out": "లాగ్ అవుట్",
    "Logout": "లాగ్ అవుట్",
    "Govt Bonus": "ప్రభుత్వ బోనస్",
    "Max Moisture": "గరిష్ట తేమ",
    "Effective Rate": "అమలులో ఉన్న ధర",
    "Subsidy": "రాయితీ",
    "Tractor Trolley": "ట్రాక్టర్ ట్రాలీ",
    "Mini Truck": "మినీ ట్రక్",
    "Heavy Lorry": "భారీ లారీ",
    "Book Subsidized Transport": "రాయితీ రవాణా బుక్ చేయండి",
    "Calculate MSP Valuation": "మద్దతు ధర విలువ లెక్కించండి",
    "Realized Revenue": "పొందిన ఆదాయం",
    "Benchmark Achieved": "మద్దతు ధర సాధించబడింది",
    "Turnaround Speed": "కేంద్రంలో సమయం",
    "Transport Savings": "రవాణా ఆదా",
    "Download Statement": "స్టేట్‌మెంట్ డౌన్‌లోడ్ చేయండి",
    "Driver": "డ్రైవర్",
    "Phone": "ఫోన్",
    "Vehicle Number": "వాహనం సంఖ్య",
    "Distance": "దూరం",
    "Base Fare": "ప్రాథమిక రుసుము",
    "Net Payable": "రైతు చెల్లించాల్సిన మొత్తం",
    "Assigned": "కేటాయించబడింది",
    "In Transit": "దారిలో ఉంది",
    "Delivered": "చేరింది",
    "All": "అన్నీ",
    "Cereals": "ధాన్యాలు",
    "Pulses": "పప్పుదినుసులు",
    "Oilseeds": "నూనెగింజలు",
    "Commercial": "వాణిజ్య పంటలు",
    "Search crop or variety...": "పంట లేదా రకం వెతకండి...",
    "Book procurement slot at this MSP": "ఈ మద్దతు ధర వద్ద స్లాట్ బుక్ చేయండి",
    "Book Subsidized Vehicle": "రాయితీ వాహనం బుక్ చేయండి",
    "Estimated Load (Quintals)": "అంచనా బరువు (క్వింటాళ్ళు)",
    "Pickup Village": "తీసుకునే గ్రామం",
    "Destination Centre": "చేరవలసిన సేకరణ కేంద్రం",
    "Scheduled Date": "తేదీ",
    "Time Slot": "సమయ స్లాట్",
    "Total Harvest Procured": "మొత్తం సేకరించిన పంట",
    "Price Realization Rate": "మద్దతు ధర పొందిన శాతం",
    "Average Turnaround": "కేంద్రంలో సగటు సమయం",
    "Logistics Subsidy Saved": "ఆదా అయిన రవాణా రాయితీ",
    "Harvest Delivery Statements": "పంట డెలివరీ & చెల్లింపు స్టేట్‌మెంట్లు",
    "Active Vehicle Bookings": "క్రియాశీల వాహన బుకింగ్‌లు",
    "Normal Map": "సాధారణ మ్యాప్",
    "Satellite Map": "శాటిలైట్ మ్యాప్",
    "Andhra Pradesh Network": "ఆంధ్రప్రదేశ్ నెట్‌వర్క్",
    "Andhra Pradesh Centres": "ఆంధ్రప్రదేశ్ కేంద్రాలు",
    "Fit AP": "AP సరిచేయి",
    "Select this Centre": "ఈ కేంద్రాన్ని ఎంచుకోండి",
    "Choose time, not just distance.": "దూరం మాత్రమే కాదు, సమయాన్ని కూడా ఎంచుకోండి.",
    "Vijayawada is calmest now": "విజయవాడ కేంద్రం ప్రస్తుతం అత్యంత ప్రశాంతంగా ఉంది",
    "View Vijayawada Centre": "విజయవాడ కేంద్రం చూడండి",
    "Live Agricultural Weather & Safe Harvest Report": "ప్రత్యక్ష వ్యవసాయ వాతావరణం & పంట కోత నివేదిక",
    "Agricultural Meteorology": "వ్యవసాయ వాతావరణ విభాగం",
    "Safe Harvesting Advisory": "సురక్షిత పంట కోత సలహా",
    "3-Day Agriculture Forecast": "3-రోజుల వ్యవసాయ వాతావరణ అంచనా",
    "Humidity": "తేమ శాతం",
    "Wind Velocity": "గాలి వేగం",
    "Precipitation": "వర్షం సంభావ్యత",
    "Harvest Status": "కోత స్థితి",
    "Feels like": "అనిపించే ఉష్ణోగ్రత",
    "Clear Sky": "నిర్మలమైన ఆకాశం",
    "Sunny & Dry": "పొడి ఎండ వాతావరణం",
    "Partly Cloudy": "పాక్షిక మేఘావృతం",
    "Optimal": "అత్యంత అనుకూలం",
    "Favorable": "అనుకూలం",
    "Caution": "హెచ్చరిక / జాగ్రత్త",
    "Officer console": "అధికారి కన్సోల్",
    "Pending farmers": "పెండింగ్ రైతులు",
    "Approved farmers": "ఆమోదించబడిన రైతులు",
    "Bookings & queue": "బుకింగ్‌లు & క్యూ",
    "Payment status": "చెల్లింపు స్థితి",
    "Farmer portal": "రైతు పోర్టల్",
    "Procurement window": "సేకరణ సమయం",
    "Total Registrations": "మొత్తం నమోదులు",
    "Pending Review": "సమీక్షలో ఉన్నవి",
    "Active Bookings": "క్రియాశీల బుకింగ్‌లు",
    "Completed Today": "ఈరోజు పూర్తయినవి",
    "Approve": "ఆమోదించండి",
    "Reject": "తిరస్కరించండి",
    "Aadhaar": "ఆధార్",
    "Primary Crop": "ప్రధాన పంట",
    "Rythu Bharosa Toll-Free": "రైతు భరోసా టోల్-ఫ్రీ",
    "Call Helpline": "కాల్ చేయండి",
    "Copy Number": "నంబర్ కాపీ చేయండి",
    "Mandatory Mandi Checklist": "మండీకి అవసరమైన పత్రాల జాబితా",
    "Mandatory Mandi Checklist:": "మండీకి అవసరమైన పత్రాల జాబితా:",
    "1. Farmer Registration ID / Aadhaar": "1. రైతు నమోదు ఐడి / ఆధార్",
    "2. Aadhaar-linked Bank Passbook (DBT)": "2. ఆధార్-లింక్డ్ బ్యాంక్ పాస్‌బుక్ (DBT)",
    "3. e-Crop / Land Record (Pahani/1B)": "3. ఈ-క్రాప్ / భూమి రికార్డు (1B)",
    "4. Digital Token Pass": "4. డిజిటల్ టోకెన్ పాస్",
    "Official Rythu Helplines": "అధికారిక రైతు హెల్ప్‌లైన్లు",
    "Direct Government Support Desks": "ప్రత్యక్ష ప్రభుత్వ సహాయ డెస్క్‌లు",
    "Rythu Bharosa Kendra Helpdesk": "రైతు భరోసా కేంద్రం హెల్ప్‌డెస్క్",
    "AP Civil Supplies & Mandi Grievance": "AP పౌరసరఫరాలు & మార్కెట్ యార్డ్ ఫిర్యాదులు",
    "Try asking": "ఇలా అడిగి చూడండి",
    "What is my token?": "నా టోకెన్ ఏమిటి?",
    "How many people are ahead of me?": "నా ముందు ఎంత మంది రైతులు ఉన్నారు?",
    "When should I reach the centre?": "నేను కేంద్రానికి ఎప్పుడు చేరుకోవాలి?",
    "Which centre has less waiting?": "ఏ కేంద్రంలో తక్కువ నిరీక్షణ ఉంది?",
    "Is today's weather safe for harvest?": "ఈరోజు పంట కోత సురక్షితమేనా?",
    "How do I book 30% subsidized transport?": "30% రాయితీ రవాణాను ఎలా బుక్ చేయాలి?",
  },
};

const translations = {
  EN: {
    view: "View",
    continue: "Continue",
    back: "Back",
    booking: "Book a slot",
    home: "Home",
    live: "Live",
    select: "Select",
    dashboardTitle: "Your procurement day, made visible.",
    dashboardBody: "Here is the live picture for your current paddy booking.",
    bookingTitle: "What paddy are you bringing?",
    bookingBody: "Choose the variety and approximate quantity for your slot request.",
    tokenTitle: "Your token is ready.",
    queueTitle: "Your place, without the guesswork.",
    statusTitle: "Your procurement journey, step by step.",
    paymentTitle: "Complete your procurement payment.",
    profileTitle: "Your procurement identity.",
    notificationTitle: "Only the information that helps.",
    assistantTitle: "Ask the question on your mind.",
    weatherTitle: "Live Agricultural Weather & Safe Harvest Report",
    weatherBody: "Real-time temperature, humidity, wind velocity, and safe harvesting advisories for Andhra Pradesh procurement districts.",
    registrationTitle: "Let’s set up your farmer profile.",
    registrationIntro: "Register your details. Your application will be sent directly to the procurement officer for verification.",
    loginTitle: "Welcome back.",
    loginIntro: "Enter the mobile number and password used when you registered.",
    nav: {
      Overview: "Overview",
      "New booking": "New booking",
      "Govt MSP Rates": "Govt MSP Rates",
      "Live Weather": "Live Weather",
      Analytics: "Analytics",
      Transportation: "Transportation",
      "My token": "My token",
      "Live queue": "Live queue",
      Procurement: "Procurement",
      Payments: "Payments",
      "AI Help Centre": "AI Help Centre",
    },
  },
  TE: {
    view: "చూడండి",
    continue: "కొనసాగించండి",
    back: "వెనుకకు",
    booking: "స్లాట్ బుక్ చేయండి",
    home: "హోమ్",
    live: "ప్రత్యక్షం",
    select: "ఎంచుకోండి",
    dashboardTitle: "మీ కొనుగోలు రోజు, స్పష్టంగా.",
    dashboardBody: "మీ ప్రస్తుత వరి బుకింగ్ యొక్క ప్రత్యక్ష వివరాలు ఇక్కడ ఉన్నాయి.",
    bookingTitle: "మీరు ఏ వరిని తీసుకువస్తున్నారు?",
    bookingBody: "మీ స్లాట్ కోసం రకం మరియు అంచనా పరిమాణాన్ని ఎంచుకోండి.",
    tokenTitle: "మీ టోకెన్ సిద్ధంగా ఉంది.",
    queueTitle: "అంచనా లేకుండా మీ స్థానం.",
    statusTitle: "మీ కొనుగోలు ప్రయాణం, దశలవారీగా.",
    paymentTitle: "మీ కొనుగోలు చెల్లింపును పూర్తి చేయండి.",
    profileTitle: "మీ కొనుగోలు గుర్తింపు.",
    notificationTitle: "ఉపయోగపడే సమాచారం మాత్రమే.",
    assistantTitle: "మీ ప్రశ్న అడగండి.",
    weatherTitle: "ప్రత్యక్ష వ్యవసాయ వాతావరణం & పంట కోత నివేదిక",
    weatherBody: "ఆంధ్రప్రదేశ్ జిల్లాల్లో తాజా ఉష్ణోగ్రత, తేమ, గాలి వేగం మరియు సురక్షిత పంట కోత సలహాలు.",
    registrationTitle: "మీ రైతు ప్రొఫైల్‌ను ఏర్పాటు చేద్దాం.",
    registrationIntro: "మీ వివరాలను నమోదు చేయండి. మీ దరఖాస్తు ధృవీకరణ కోసం నేరుగా సేకరణ అధికారికి పంపబడుతుంది.",
    loginTitle: "స్వాగతం.",
    loginIntro: "రిజిస్ట్రేషన్ సమయంలో ఉపయోగించిన మొబైల్ మరియు పాస్‌వర్డ్ నమోదు చేయండి.",
    nav: {
      Overview: "అవలోకనం",
      "New booking": "కొత్త బుకింగ్",
      "Govt MSP Rates": "ప్రభుత్వ మద్దతు ధరలు",
      "Live Weather": "ప్రత్యక్ష వాతావరణం",
      Analytics: "విశ్లేషణ",
      Transportation: "పంట రవాణా",
      "My token": "నా టోకెన్",
      "Live queue": "ప్రత్యక్ష క్యూ",
      Procurement: "కొనుగోలు",
      Payments: "చెల్లింపులు",
      "AI Help Centre": "AI సహాయ కేంద్రం",
    },
  },
  HI: {
    view: "देखें",
    continue: "आगे बढ़ें",
    back: "वापस",
    booking: "स्लॉट बुक करें",
    home: "होम",
    live: "लाइव",
    select: "चुनें",
    dashboardTitle: "आपका खरीद दिन, साफ़ तस्वीर के साथ।",
    dashboardBody: "आपकी मौजूदा धान बुकिंग की लाइव जानकारी यहाँ है।",
    bookingTitle: "आप कौन सा धान ला रहे हैं?",
    bookingBody: "अपने स्लॉट के लिए किस्म और अनुमानित मात्रा चुनें।",
    tokenTitle: "आपका टोकन तैयार है।",
    queueTitle: "बिना अनुमान के आपकी जगह।",
    statusTitle: "आपकी खरीद यात्रा, हर चरण में।",
    paymentTitle: "अपनी खरीद का भुगतान पूरा करें।",
    profileTitle: "आपकी खरीद पहचान।",
    notificationTitle: "सिर्फ़ काम की जानकारी।",
    assistantTitle: "अपने मन का सवाल पूछें।",
    weatherTitle: "लाइव कृषि मौसम व सुरक्षित कटाई रिपोर्ट",
    weatherBody: "आंध्र प्रदेश खरीद जिलों के लिए वास्तविक समय तापमान, आर्द्रता, हवा की गति और सुरक्षित कटाई सलाह।",
    registrationTitle: "अपना किसान प्रोफ़ाइल तैयार करें।",
    registrationIntro: "अपना विवरण दर्ज करें। आपका आवेदन सत्यापन के लिए सीधे खरीद अधिकारी को भेजा जाएगा।",
    loginTitle: "वापसी पर स्वागत है।",
    loginIntro: "पंजीकरण के समय इस्तेमाल किया गया मोबाइल और पासवर्ड दर्ज करें।",
    nav: {
      Overview: "अवलोकन",
      "New booking": "नई बुकिंग",
      "Govt MSP Rates": "सरकारी समर्थन मूल्य",
      "Live Weather": "लाइव मौसम",
      Analytics: "एनालिटिक्स",
      Transportation: "फसल परिवहन",
      "My token": "मेरा टोकन",
      "Live queue": "लाइव कतार",
      Procurement: "खरीद",
      Payments: "भुगतान",
      "AI Help Centre": "एआई सहायता केंद्र",
    },
  },
} as const;

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

function LanguagePicker({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  return (
    <div className="language-picker" aria-label="Choose interface language">
      {(["EN", "TE", "HI"] as Language[]).map((lang) => (
        <button key={lang} className={language === lang ? "active" : ""} onClick={() => setLanguage(lang)}>{lang}</button>
      ))}
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
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [queueAhead, setQueueAhead] = useState(18);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState([{ role: "assistant", text: "Namaste, Ramesh. I can help you plan your visit to the procurement centre." }]);
  const [officerView, setOfficerView] = useState<"overview" | "pending" | "approved" | "bookings">("overview");
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
  const [bookingRecord, setBookingRecord] = useState<ApiBooking | null>(null);
  const [profileRecord, setProfileRecord] = useState<ApiBooking["farmer"] | null>(null);
  const [apiNotifications, setApiNotifications] = useState<Array<{ id: number; title: string; message: string; category: string; isRead: number; createdAt: string }>>([]);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Array<PaymentRecord & { bookingCode: string; bookingId: number }>>([]);
  const [receipt, setReceipt] = useState<{ receiptNumber: string; issuedAt: string; payment: PaymentRecord } | null>(null);
  const [officerPayments, setOfficerPayments] = useState<Array<PaymentRecord & { bookingCode: string; farmer: { name: string; farmerCode: string }; centre: { name: string } }>>([]);
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
  const t = translations[language];
  const changeLanguage = (next: Language) => { setLanguage(next); localStorage.setItem("procureflow.language", next); };

  const originalTextMap = useRef(new WeakMap<Text, string>());

  useEffect(() => {
    const savedLanguage = localStorage.getItem("procureflow.language") as Language | null;
    if (savedLanguage === "EN" || savedLanguage === "TE" || savedLanguage === "HI") setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    const dictionary = language === "EN" ? null : localizedUiText[language];
    
    // Helper to escape special characters for regex
    const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    
    // Precompile regexes sorted by length descending so longer phrases match first
    const compiledEntries = dictionary
      ? Object.entries(dictionary)
          .sort((a, b) => b[0].length - a[0].length)
          .map(([key, val]) => ({
            regex: new RegExp(escapeRegex(key), "gi"),
            val,
            key,
          }))
      : [];

    let isRunning = false;
    const localize = () => {
      if (isRunning) return;
      isRunning = true;
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const textNode = node as Text;
          const parent = textNode.parentElement;
          if (parent && (parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.tagName === "NOSCRIPT")) {
            continue;
          }

          if (!originalTextMap.current.has(textNode)) {
            originalTextMap.current.set(textNode, textNode.nodeValue ?? "");
          }
          const orig = originalTextMap.current.get(textNode) ?? "";
          if (!dictionary) {
            if (textNode.nodeValue !== orig) {
              textNode.nodeValue = orig;
            }
            continue;
          }

          const trimmed = orig.trim();
          if (trimmed && dictionary[trimmed]) {
            const nextText = orig.replace(trimmed, dictionary[trimmed]);
            if (textNode.nodeValue !== nextText) textNode.nodeValue = nextText;
          } else if (trimmed) {
            let modified = orig;
            for (const { regex, val } of compiledEntries) {
              if (regex.test(modified)) {
                regex.lastIndex = 0;
                modified = modified.replace(regex, val);
              }
            }
            if (textNode.nodeValue !== modified) {
              textNode.nodeValue = modified;
            }
          }
        }

        // Translate select options
        document.querySelectorAll<HTMLOptionElement>("option").forEach(opt => {
          if (!opt.dataset.originalText) {
            opt.dataset.originalText = opt.text;
          }
          const orig = opt.dataset.originalText;
          if (!dictionary) {
            opt.text = orig;
          } else if (dictionary[orig.trim()]) {
            opt.text = dictionary[orig.trim()];
          } else {
            let mod = orig;
            for (const { regex, val } of compiledEntries) {
              if (regex.test(mod)) {
                regex.lastIndex = 0;
                mod = mod.replace(regex, val);
              }
            }
            opt.text = mod;
          }
        });

        // Translate inputs and placeholders
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach(input => {
          if (!input.dataset.originalPlaceholder) {
            input.dataset.originalPlaceholder = input.placeholder;
          }
          const orig = input.dataset.originalPlaceholder;
          if (!dictionary) {
            input.placeholder = orig;
          } else if (dictionary[orig.trim()]) {
            input.placeholder = dictionary[orig.trim()];
          } else {
            let mod = orig;
            for (const { regex, val } of compiledEntries) {
              if (regex.test(mod)) {
                regex.lastIndex = 0;
                mod = mod.replace(regex, val);
              }
            }
            input.placeholder = mod;
          }
        });

        // Translate titles & aria-labels
        document.querySelectorAll<HTMLElement>("[title]").forEach(elem => {
          if (!elem.dataset.originalTitle) {
            elem.dataset.originalTitle = elem.title;
          }
          const orig = elem.dataset.originalTitle;
          if (!dictionary) {
            elem.title = orig;
          } else if (dictionary[orig.trim()]) {
            elem.title = dictionary[orig.trim()];
          }
        });
      } finally {
        isRunning = false;
      }
    };

    localize();
    const observer = new MutationObserver(localize);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
        setCropPricesList(data.prices ?? []);
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
    const activeFarmerId = fId ?? farmerId;
    if (!activeToken || !activeFarmerId) return;
    try {
      const response = await fetch(apiUrl(`/farmers/${activeFarmerId}/transport`), {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransportBookingsList(data.transportBookings ?? []);
      }
    } catch {}
  };

  const bookTransport = async () => {
    if (!farmerToken) {
      toast.error("Please login as a verified farmer to book crop transportation.");
      navigate("farmerLogin");
      return;
    }
    setTransportBookingLoading(true);
    try {
      const centre = apiCentres.find(c => c.id === transportForm.destinationCentreId) ?? apiCentres[0];
      const distNum = parseFloat(centre.distance.replace(/[^0-9.]/g, "")) || 12;

      const response = await fetch(apiUrl("/transport/book"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${farmerToken}`,
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Transportation booking failed.");

      toast.success("Transportation booked! 30% Govt subsidy applied and driver assigned.");
      await Promise.all([
        loadFarmerTransportBookings(farmerToken, farmerId ?? undefined),
        loadNotifications(farmerToken, farmerId ?? undefined),
        loadFarmerAnalytics(farmerToken),
      ]);
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
      .then(({ centres: responseCentres }: { centres: Array<{ id: number; name: string; place: string; distanceKm: number; currentQueue: number; availableSlots: number; status: string; latitude?: number; longitude?: number }> }) => {
        const statusMap: Record<string, Centre["status"]> = { OPEN: "Open", BUSY: "Busy", LIMITED: "Limited", CLOSED: "Limited" };
        setApiCentres(responseCentres.map((centre, index) => ({ id: centre.id, name: centre.name, place: centre.place, distance: `${centre.distanceKm} km`, queue: centre.currentQueue, wait: `${Math.max(2, centre.currentQueue * 2)} min`, slots: centre.availableSlots, status: statusMap[centre.status] ?? "Limited", position: centres[index]?.position ?? "left-[47%] top-[45%]", latitude: centre.latitude, longitude: centre.longitude })));
      })
      .catch(() => undefined);
  }, []);

  const loadCentreSlots = async (centreId: number, dateStr?: string) => {
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
    } catch {}
  };

  useEffect(() => {
    if (selectedCentre?.id) {
      void loadCentreSlots(selectedCentre.id, selectedDate);
    }
  }, [selectedCentre?.id, selectedDate]);

  useEffect(() => {
    const rawSession = sessionStorage.getItem("procureflow.farmer.session");
    if (!rawSession) return;
    try {
      const saved = JSON.parse(rawSession) as { token: string; farmer: FarmerProfile };
      if (!saved.token || !saved.farmer?.id) throw new Error("Invalid session");
      setFarmerToken(saved.token); setFarmerId(saved.farmer.id); setProfileRecord(saved.farmer); setApproved(saved.farmer.status === "APPROVED");
      void loadNotifications(saved.token, saved.farmer.id);
      void loadFarmerStats(saved.token);
      void loadFarmerAnalytics(saved.token);
      void loadFarmerTransportBookings(saved.token, saved.farmer.id);
      void fetch(apiUrl(`/farmers/${saved.farmer.id}/bookings`), { headers: { Authorization: `Bearer ${saved.token}` } })
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(data => data.bookings?.[0] ? loadBooking(saved.token, data.bookings[0].id) : undefined)
        .catch(() => sessionStorage.removeItem("procureflow.farmer.session"));
    } catch { sessionStorage.removeItem("procureflow.farmer.session"); }
  }, []);

  useEffect(() => {
    const rawOfficerSession = sessionStorage.getItem("procureflow.officer.session");
    if (!rawOfficerSession) return;
    try {
      const saved = JSON.parse(rawOfficerSession) as { token: string };
      if (saved.token) {
        setOfficerToken(saved.token);
        void loadPendingRegistrations(saved.token);
        void loadOfficerBookings(saved.token);
        void loadOfficerAnalytics(saved.token);
        void loadOfficerStats(saved.token);
      }
    } catch { sessionStorage.removeItem("procureflow.officer.session"); }
  }, []);

  useEffect(() => {
    if (screen !== "queue" || !farmerToken || !bookingId) return;
    const refreshQueue = () => void fetch(apiUrl(`/queue/${bookingId}`), { headers: { Authorization: `Bearer ${farmerToken}` } })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((data: { position: number; peopleAhead: number; estimatedWaitMinutes: number; status: string; currentToken: string }) => {
        setQueueAhead(data.peopleAhead);
        setBookingRecord(record => record ? { ...record, queue: data } : record);
      })
      .catch(() => undefined);
    refreshQueue();
    const timer = window.setInterval(refreshQueue, 15000);
    return () => window.clearInterval(timer);
  }, [screen, farmerToken, bookingId]);

  const queueProgress = useMemo(() => Math.round(((28 - queueAhead) / 28) * 100), [queueAhead]);

  const navigate = (next: Screen) => {
    if (farmerOnlyScreens.includes(next) && !farmerToken) {
      setAuthError("Please login with your approved farmer account to continue.");
      setScreen("farmerLogin"); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); return;
    }
    setScreen(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (farmerOnlyScreens.includes(screen) && !farmerToken) setScreen("farmerLogin");
  }, [screen, farmerToken]);
  const loadNotifications = async (token: string, id?: number) => {
    if (!id) return;
    const response = await fetch(apiUrl(`/farmers/${id}/notifications`), { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setApiNotifications((await response.json()).notifications);
  };
  const loadBooking = async (token: string, id: number) => {
    const response = await fetch(apiUrl(`/bookings/${id}`), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Booking data is unavailable.");
    const data: { booking: ApiBooking } = await response.json();
    setBookingId(data.booking.id); setBookingRecord(data.booking); setProfileRecord(data.booking.farmer); setQueueAhead(data.booking.queue?.peopleAhead ?? 0);
    return data.booking;
  };
  const loadPaymentData = async (token: string, id: number, booking?: number) => {
    const [historyResponse, currentResponse] = await Promise.all([
      fetch(apiUrl(`/farmers/${id}/payments`), { headers: { Authorization: `Bearer ${token}` } }),
      booking ? fetch(apiUrl(`/payments/${booking}`), { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
    ]);
    if (historyResponse.ok) setPaymentHistory((await historyResponse.json()).payments);
    if (currentResponse?.ok) setPaymentRecord((await currentResponse.json()).payment);
  };
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
  const loadPendingRegistrations = async (token: string) => {
    const response = await fetch(apiUrl("/officers/registrations/pending"), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Pending registrations could not be loaded.");
    const data = await response.json();
    setPendingRegistrations(data.registrations ?? []);
    return data.registrations ?? [];
  };
  useEffect(() => {
    if (!officerToken) return;
    void loadPendingRegistrations(officerToken).catch(() => undefined);
    void loadOfficerBookings(officerToken).catch(() => undefined);
    void loadOfficerAnalytics(officerToken).catch(() => undefined);
    if (officerView !== "pending" && officerView !== "bookings") return;
    const intervalId = window.setInterval(() => {
      void loadPendingRegistrations(officerToken).catch(() => undefined);
      void loadOfficerBookings(officerToken).catch(() => undefined);
      void loadOfficerAnalytics(officerToken).catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [officerToken, officerView]);

  const approveFarmer = async () => {
    if (!officerToken) { toast.error("Login as an officer before approving a registration."); navigate("officerLogin"); return; }
    try {
      const targetId = selectedRegistrationId ?? pendingRegistrations[0]?.id;
      if (!targetId) throw new Error("No pending registration found.");
      const response = await fetch(apiUrl(`/officers/registrations/${targetId}/approve`), { method: "PUT", headers: { Authorization: `Bearer ${officerToken}` } });
      if (!response.ok) throw new Error("Approval failed.");
      setApproved(true); setRegistrationStatus("APPROVED"); setPendingRegistrations(items => items.filter(item => item.id !== targetId)); setShowRecord(false); toast.success("Registration approved through the API. The farmer can now login."); setOfficerView("approved");
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Approval could not be completed."); }
  };

  const rejectFarmer = async () => {
    if (!officerToken) { toast.error("Login as an officer before rejecting a registration."); return; }
    try {
      const targetId = selectedRegistrationId ?? pendingRegistrations[0]?.id;
      if (!targetId) throw new Error("No pending registration selected.");
      const response = await fetch(apiUrl(`/officers/registrations/${targetId}/reject`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!response.ok) throw new Error("Rejection failed.");
      setRegistrationStatus("REJECTED");
      setPendingRegistrations(items => items.filter(item => item.id !== targetId));
      setShowRecord(false);
      setShowRejectModal(false);
      toast.success("Farmer registration rejected with recorded notes.");
      await loadOfficerAnalytics(officerToken);
      await loadOfficerStats(officerToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rejection failed.");
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
      toast.success(`Procurement stage updated to ${procurementForm.status.replaceAll("_", " ")}.`);
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
    setAuthLoading(true);
    try {
      const response = await fetch(apiUrl("/registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registrationForm,
          phone: registrationForm.phone.replace(/\s/g, ""),
          declarationAccepted: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Registration could not be submitted.");
      setRegistered(true);
      setRegistrationId(data.registrationId ?? null);
      setRegistrationStatus("PENDING");
      setPendingFarmer(data.farmer);
      setFarmerCredentials({
        phone: registrationForm.phone.replace(/\s/g, ""),
        password: registrationForm.password,
      });
      navigate("pending");
      toast.success(
        language === "TE"
          ? "నమోదు సమర్పించబడింది — అధికారి ధృవీకరణ కోసం వేచి ఉంది."
          : language === "HI"
          ? "पंजीकरण जमा किया गया — अधिकारी सत्यापन की प्रतीक्षा है।"
          : "Registration submitted — awaiting officer verification."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration could not be submitted.";
      setAuthError(message);
      toast.error(message);
    } finally {
      setAuthLoading(false);
    }
  };
  const loginFarmer = async () => {
    setAuthError(null); setAuthLoading(true);
    try {
      const response = await fetch(apiUrl("/farmers/login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(farmerCredentials) });
      const data = await response.json();
      if (!response.ok) { if (data.error === "REGISTRATION_NOT_APPROVED") { setRegistrationStatus(data.status ?? "PENDING"); navigate("pending"); } throw new Error(data.message ?? "Login failed."); }
      setFarmerToken(data.accessToken); setFarmerId(data.farmer.id); setProfileRecord(data.farmer); setApproved(true); sessionStorage.setItem("procureflow.farmer.session", JSON.stringify({ token: data.accessToken, farmer: data.farmer }));
      const bookingResponse = await fetch(apiUrl(`/farmers/${data.farmer.id}/bookings`), { headers: { Authorization: `Bearer ${data.accessToken}` } });
      const bookingData = await bookingResponse.json();
      const activeBooking = bookingData.bookings?.[0];
      if (activeBooking) await loadBooking(data.accessToken, activeBooking.id);
      await loadNotifications(data.accessToken, data.farmer.id);
      await loadPaymentData(data.accessToken, data.farmer.id, activeBooking?.id);
      await loadFarmerStats(data.accessToken);
      setScreen("dashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); toast.success(`Welcome back, ${data.farmer.name}.`);
    } catch (error) { const message = error instanceof Error ? error.message : "Login could not be completed."; setAuthError(message); toast.error(message); }
    finally { setAuthLoading(false); }
  };
  const loginOfficer = async () => {
    try {
      const response = await fetch(apiUrl("/officers/login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Officer login failed.");
      setOfficerToken(data.accessToken); sessionStorage.setItem("procureflow.officer.session", JSON.stringify({ token: data.accessToken, officer: data.officer })); setOfficerView("overview");
      const paymentResponse = await fetch(apiUrl("/officers/payments"), { headers: { Authorization: `Bearer ${data.accessToken}` } });
      if (paymentResponse.ok) setOfficerPayments((await paymentResponse.json()).payments);
      await loadPendingRegistrations(data.accessToken);
      await loadOfficerBookings(data.accessToken);
      await loadOfficerAnalytics(data.accessToken);
      await loadOfficerStats(data.accessToken);
      navigate("officerDashboard"); toast.success(`Officer session opened for ${data.officer.name}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Officer login could not be completed."); }
  };
  const logoutFarmer = () => {
    sessionStorage.removeItem("procureflow.farmer.session");
    setFarmerToken(null); setFarmerId(null); setBookingId(null); setBookingRecord(null); setProfileRecord(null); setApiNotifications([]); setPaymentRecord(null); setPaymentHistory([]); setReceipt(null); setPaymentDone(false); setApproved(false); setAuthError(null);
    navigate("landing"); toast.success("You have been logged out.");
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
          expectedQuantityQuintals: 18,
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
          setChat(items => [...items, { role: "assistant", text: data.response }]);
          return;
        }
      }
    } catch {}

    // Instant local intelligent AI fallback
    const reply = getClientAiReply(prompt, language);
    setChat(items => [...items, { role: "assistant", text: reply }]);
  };
  const listen = () => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => { lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void }; webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void } }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void } }).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.message("Voice input is not available in this browser. Please type your question instead."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "TE" ? "te-IN" : language === "HI" ? "hi-IN" : "en-IN";
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => setChatInput(event.results[0][0].transcript);
    recognition.onerror = () => toast.error("We could not hear that. Please try again or type your question.");
    recognition.start();
  };
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) { toast.message("Voice response is not available in this browser. You can read the answer on screen."); return; }
    window.speechSynthesis.cancel();
    const targetLocale = language === "TE" ? "te-IN" : language === "HI" ? "hi-IN" : "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(candidate => candidate.lang.toLowerCase().startsWith(targetLocale.slice(0, 2)));
    if (voices.length && !voice) { toast.message(`A ${language === "TE" ? "Telugu" : language === "HI" ? "Hindi" : "English"} voice is not available here. You can read the answer on screen.`); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLocale;
    if (voice) utterance.voice = voice;
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
        <header className="mobile-header"><button onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={22} /></button><button onClick={() => navigate("dashboard")}><AppLogo /></button><LanguagePicker language={language} setLanguage={changeLanguage} /></header>
        <div className="desktop-status-bar"><div className="status-item"><span className="today-dot" /> Procurement window <b>Open today</b></div><div className="bar-actions"><LanguagePicker language={language} setLanguage={changeLanguage} /><button className="notification-button" onClick={() => navigate("notifications")}><Bell size={19} />{apiNotifications.some(item => !item.isRead) && <i />}</button><button className="avatar-chip" onClick={() => navigate("profile")}><span>{profileRecord?.name.split(" ").map(part => part[0]).join("").slice(0, 2) ?? "RK"}</span><b>{profileRecord?.name ?? "Ramesh Kumar"}</b></button><button className="logout-button" onClick={logoutFarmer} title="Log out"><LogIn size={16} /></button></div></div>
        <main className="content-pad">{content}</main>
      </div>
      {mobileMenu && <div className="mobile-drawer-backdrop" onClick={() => setMobileMenu(false)}><nav className="mobile-drawer" onClick={e => e.stopPropagation()}><div className="drawer-top"><AppLogo /><button onClick={() => setMobileMenu(false)}><X size={20} /></button></div><div className="drawer-links">{navItems.map(({ screen: target, label, icon: Icon }) => <button key={target} onClick={() => navigate(target)} className={screen === target ? "active" : ""}><Icon size={20} />{t.nav[label as keyof typeof t.nav] ?? label}</button>)}<hr /><button onClick={() => navigate("assistant")}><Bot size={20} /> Farmer assistant</button><button onClick={() => navigate("profile")}><UserCheck size={20} /> My profile</button></div><div className="drawer-bottom"><button onClick={logoutFarmer} className="drawer-logout"><LogIn size={18} /> Logout</button></div></nav></div>}
    </div>
  );

  const landing = (
    <div className="landing-page">
      <header className="landing-nav"><AppLogo /><div className="nav-links"><a href="#how">How it works</a><a href="#services">Features</a><button onClick={() => navigate("farmerLogin")}>Farmer login</button><button className="officer-link" onClick={() => navigate("officerLogin")}>Officer console</button></div><div className="nav-end"><LanguagePicker language={language} setLanguage={changeLanguage} /><ActionButton onClick={() => navigate("registration")} icon={ArrowRight}>Register now</ActionButton></div></header>
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
            Register once and let an officer review and verify your details before you book.
          </p>
        </div>
        <div className="side-steps">
          <span><b>1</b> Share your farmer details</span>
          <span><b>2</b> Officer verification</span>
          <span><b>3</b> Login and book your visit</span>
        </div>
      </div>
      <main className="auth-panel">
        <button className="back-link" onClick={() => navigate("landing")}>
          <ArrowLeft size={16} /> Back to home
        </button>
        <div className="form-wrap">
          <p className="eyebrow">NEW REGISTRATION</p>
          <h2>{t.registrationTitle}</h2>
          <p>
            {t.registrationIntro} Your account remains <b>{language === "TE" ? "పెండింగ్" : language === "HI" ? "लंबित" : "pending"}</b> until officer approval.
          </p>
          <form onSubmit={e => { e.preventDefault(); void submitRegistration(); }}>
            <div className="field-row">
              <label>
                Farmer name
                <Input value={registrationForm.name} onChange={e => setRegistrationForm(form => ({ ...form, name: e.target.value }))} required />
              </label>
              <label>
                Mobile number
                <Input inputMode="numeric" value={registrationForm.phone} onChange={e => setRegistrationForm(form => ({ ...form, phone: e.target.value }))} required />
              </label>
            </div>
            <label>
              Create password
              <Input type="password" value={registrationForm.password} onChange={e => setRegistrationForm(form => ({ ...form, password: e.target.value }))} required />
            </label>
            <label>
              Farmer ID / Aadhaar
              <Input value={registrationForm.aadhaarMasked} onChange={e => setRegistrationForm(form => ({ ...form, aadhaarMasked: e.target.value }))} placeholder="XXXX XXXX 1234" required />
            </label>
            <div className="field-row">
              <label>
                Village
                <Input value={registrationForm.village} onChange={e => setRegistrationForm(form => ({ ...form, village: e.target.value }))} required />
              </label>
              <label>
                District
                <Input value={registrationForm.district} onChange={e => setRegistrationForm(form => ({ ...form, district: e.target.value }))} required />
              </label>
            </div>
            <label>
              Primary crop
              <select value={registrationForm.primaryCrop} onChange={e => setRegistrationForm(form => ({ ...form, primaryCrop: e.target.value }))}>
                <option>Paddy</option>
                <option>Maize</option>
                <option>Cotton</option>
              </select>
            </label>
            <label className="check-line">
              <input type="checkbox" required defaultChecked />
              <span>I confirm these details are correct for this procurement request.</span>
            </label>
            {authError && <p className="form-note">{authError}</p>}
            <Button disabled={authLoading} type="submit" className="action-button">
              {authLoading ? (language === "TE" ? "సమర్పిస్తోంది…" : language === "HI" ? "जमा हो रहा है…" : "Submitting…") : (language === "TE" ? "నమోదును సమర్పించండి" : language === "HI" ? "पंजीकरण जमा करें" : "Submit registration")} <ArrowRight size={17}/>
            </Button>
          </form>
          <p className="form-note">
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
            ? (language === "TE" ? "మీ నమోదును అధికారి తిరస్కరించారు." : language === "HI" ? "आपका पंजीकरण अस्वीकार कर दिया गया।" : "Your registration needs attention.")
            : registrationStatus === "APPROVED"
            ? (language === "TE" ? "మీ నమోదు అధికారిచే ఆమోదించబడింది!" : language === "HI" ? "आपका पंजीकरण अधिकारी द्वारा स्वीकृत कर दिया गया है!" : "Your registration has been approved!")
            : (language === "TE" ? "మీ నమోదు అధికారి సమీక్షలో ఉంది." : language === "HI" ? "आपका पंजीकरण अधिकारी सत्यापन की प्रतीक्षा कर रहा है।" : "Your registration is under officer review.")}
        </h1>
        <p>
          {registrationStatus === "APPROVED"
            ? (language === "TE" ? "సేకరణ అధికారి మీ ప్రొఫైల్‌ను ధృవీకరించారు. మీరు ఇప్పుడు మీ డ్యాష్‌బోర్డ్‌కు లాగిన్ చేయవచ్చు." : language === "HI" ? "खरीद अधिकारी ने आपकी प्रोफ़ाइल सत्यापित कर दी है। अब आप अपने डैशबोर्ड में लॉगिन कर सकते हैं।" : "An officer has approved your profile. You can now login to your dashboard.")
            : (language === "TE" ? "మీరు స్లాట్ బుక్ చేయడానికి ముందు సేకరణ అధికారి మీ రైతు ప్రొఫైల్‌ను సమీక్షించి ధృవీకరించాలి." : language === "HI" ? "स्लॉट बुक करने से पहले खरीद अधिकारी द्वारा आपकी किसान प्रोफ़ाइल की समीक्षा और सत्यापन आवश्यक है।" : "The procurement officer has received your registration notification and will verify your details before you can sign in.")}
        </p>
        {pendingFarmer && (
          <article className="pending-record">
            <div>
              <span className="avatar">{pendingFarmer.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
              <div>
                <b>{pendingFarmer.name}</b>
                <small>{pendingFarmer.farmerCode} · {pendingFarmer.village}</small>
              </div>
            </div>
            <Pill kind={registrationStatus === "APPROVED" ? "green" : registrationStatus === "REJECTED" ? "yellow" : "yellow"}>
              {registrationStatus ?? "PENDING"}
            </Pill>
          </article>
        )}
        <div className="pending-actions">
          <ActionButton onClick={() => { void loginFarmer(); }} icon={LogIn}>
            {language === "TE" ? "లాగిన్ ప్రయత్నించండి" : language === "HI" ? "लॉगिन का प्रयास करें" : "Check approval & sign in"}
          </ActionButton>
          <ActionButton onClick={() => navigate("farmerLogin")} secondary icon={ArrowRight}>
            {language === "TE" ? "రైతు లాగిన్ పేజీకి వెళ్లండి" : language === "HI" ? "किसान लॉगिन पर जाएँ" : "Return to farmer login"}
          </ActionButton>
        </div>
        {authError && <p className="demo-hint">{authError}</p>}
      </main>
    </div>
  );

  const farmerLogin = (
    <div className="login-page"><header><button onClick={() => navigate("landing")}><AppLogo /></button><button className="back-link" onClick={() => navigate("landing")}><ArrowLeft size={16} /> Back</button></header><main><section className="login-art"><img src={statusUrl} alt="Paddy sample and procurement work materials"/><div><Pill kind="green">FARMER PORTAL</Pill><h2>Know your visit before you travel.</h2><p>Token, live queue, procurement progress and payment status in one place.</p></div></section><section className="login-card"><p className="eyebrow">FARMER LOGIN</p><h1>{t.loginTitle}</h1><p>{t.loginIntro} Officer approval is required before access is granted.</p><label>Mobile number<Input inputMode="numeric" value={farmerCredentials.phone} onChange={event => setFarmerCredentials(credentials => ({ ...credentials, phone: event.target.value.replace(/\s/g, "") }))} /></label><label>Password<Input type="password" value={farmerCredentials.password} onChange={event => setFarmerCredentials(credentials => ({ ...credentials, password: event.target.value }))} /></label>{authError && <p className="form-note">{authError}</p>}<ActionButton onClick={() => { void loginFarmer(); }} icon={ArrowRight}>{authLoading ? "Signing in…" : "Login to my dashboard"}</ActionButton><div className="login-divider"><span>or</span></div><button className="inline-action" onClick={() => navigate("registration")}>New farmer? Register first <ArrowRight size={15}/></button><p className="approval-check"><span className={registrationStatus === "APPROVED" ? "approved" : "pending"}>{registrationStatus === "APPROVED" ? <Check /> : <Clock3 />}</span>{registrationStatus === "APPROVED" ? "Your registration is approved. You can login." : "Registration must be approved by an officer."}</p></section></main></div>
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
              <b>{bookingRecord?.procurement?.status.replaceAll("_", " ") ?? "Ready for your arrival"}</b>
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
        <MetricCard icon={ClipboardCheck} label="Procurement stage" value={bookingRecord?.procurement?.status.replaceAll("_", " ") ?? "Booked"} hint="Live prototype record" tone="green"/>
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

  const paddy = farmerShell(<><SectionTitle eyebrow="NEW PROCUREMENT BOOKING" title={t.bookingTitle} body={t.bookingBody} /><div className="booking-layout"><div><StepTrack current={1}/><div className="choice-grid paddy-grid">{[["Common paddy", "Grade A", "₹2,300 / quintal", "Uniform grain, ready for standard procurement"], ["Fine paddy", "Grade B", "₹2,203 / quintal", "Select for premium local varieties"], ["Parboiled paddy", "Grade A", "₹2,320 / quintal", "Moisture checked and prepared"]].map(([name, grade, price, desc], index) => <button key={name} onClick={() => setSelectedPaddy(`${name} — ${grade}`)} className={`paddy-choice ${selectedPaddy.includes(name) ? "selected" : ""}`}><span className={`grain-art g${index + 1}`}><Wheat /></span><div><Pill kind={index === 1 ? "blue" : "green"}>{grade}</Pill><h3>{name}</h3><p>{desc}</p><b>{price}</b></div><span className="select-ring">{selectedPaddy.includes(name) && <Check />}</span></button>)}</div><article className="quantity-card"><div><span><Tractor /></span><div><h3>Expected quantity</h3><p>We use this only to plan the centre capacity.</p></div></div><div className="quantity-control"><button onClick={() => toast.message("Quantity set for standard load.")}>−</button><b>18 <small>quintals</small></b><button onClick={() => toast.message("Quantity set for standard load.")}>+</button></div></article><div className="page-actions"><ActionButton onClick={() => navigate("dashboard")} secondary icon={ArrowLeft}>Save for later</ActionButton><ActionButton onClick={() => navigate("centres")} icon={ArrowRight}>Choose a centre</ActionButton></div></div><aside className="booking-aside"><Pill kind="yellow">BOOKING TIP</Pill><h3>Good selection means a smoother morning.</h3><p>You will see the current queue and available capacity before choosing your centre.</p><div className="tip-line"><MapPin /> Centre availability updates live from the server.</div></aside></div></>);

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
              })));
              toast.success("Andhra Pradesh centre availability refreshed from the API.");
            }).catch(() => toast.error("Centre availability is unavailable."))}>
              Refresh availability
            </button>
          </div>
          <div className="centre-map real-map-wrap">
            <MapView
              centres={apiCentres}
              selectedCentreId={selectedCentre.id}
              initialCenter={{ lat: 16.2970, lng: 80.4350 }}
              initialZoom={8}
              onSelectCentre={(c) => setSelectedCentre(c as Centre)}
            />
          </div>
          <div className="list-heading">
            <h2>Andhra Pradesh Centres</h2>
            <span>{apiCentres.length} available</span>
          </div>
          <div className="centre-list">
            {apiCentres.map(centre => (
              <button
                key={centre.id}
                className={selectedCentre.id === centre.id ? "selected" : ""}
                onClick={() => {
                  setSelectedCentre(centre);
                  navigate("centre");
                }}
              >
                <span className={`centre-status ${centre.status.toLowerCase()}`}>
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
            ))}
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

  const slot = farmerShell(<><SectionTitle eyebrow="RESERVE A TIME" title="Pick the window that fits your day." body={`At ${selectedCentre.name}, these slot capacities are loaded from real backend data.`}/><div className="booking-layout"><div><StepTrack current={3}/><div className="date-picker-row">{["Today, 17 Mar", "Wednesday, 18 March", "Thursday, 19 March", "Friday, 20 March"].map((date, index) => <button onClick={() => { setSelectedDate(date); void loadCentreSlots(selectedCentre.id, date); }} className={selectedDate === date ? "selected" : ""} key={date}><span>{index === 0 ? "TODAY" : index === 1 ? "WED" : index === 2 ? "THU" : "FRI"}</span><b>{17 + index}</b><small>March</small></button>)}</div><h2 className="slot-heading">Available Windows <span>Real backend slot capacity</span></h2><div className="slot-grid">{backendSlots.length > 0 ? backendSlots.map(slotItem => {
    const isSelected = selectedSlotId === slotItem.id || selectedSlot === `${slotItem.startTime} – ${slotItem.endTime}`;
    const tone = slotItem.isFull ? "busy" : isSelected ? "selected" : slotItem.available <= 3 ? "busy" : "calm";
    return (
      <button
        disabled={slotItem.isFull}
        onClick={() => {
          setSelectedSlotId(slotItem.id);
          setSelectedSlot(`${slotItem.startTime} – ${slotItem.endTime}`);
        }}
        key={slotItem.id}
        className={`slot-choice ${tone} ${isSelected ? "selected" : ""} ${slotItem.isFull ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span>{slotItem.startTime} – {slotItem.endTime}</span>
        <b>{slotItem.bookedCount} booked / {slotItem.capacity} cap</b>
        <small>{slotItem.isFull ? "Slot full" : `${slotItem.available} slots left`}</small>
        {isSelected && <i><Check /></i>}
      </button>
    );
  }) : <div className="col-span-full py-4 text-muted-foreground text-center">Loading slots from server...</div>}</div><div className="page-actions"><ActionButton onClick={() => navigate("centre")} secondary icon={ArrowLeft}>Change centre</ActionButton><ActionButton onClick={() => navigate("confirmation")} icon={ArrowRight}>Review booking</ActionButton></div></div><aside className="booking-aside slot-summary"><Pill kind="green">YOUR BOOKING</Pill><h3>{selectedCentre.name}</h3><p>{selectedCentre.distance} from Muppalapally</p><hr/><span><Wheat/> {selectedPaddy}</span><span><CalendarDays/> {selectedDate}</span><span><Clock3/> {selectedSlot}</span><p className="tip-line"><Clock3/> Arrive 10 minutes early for document verification.</p></aside></div></>);

  const confirmation = farmerShell(<><SectionTitle eyebrow="REVIEW AND CONFIRM" title="Your procurement slot is ready." body="Check these details once. Generating a token will confirm your place in the connected database queue."/><div className="confirmation-layout"><div><StepTrack current={4}/><article className="booking-ticket"><div className="ticket-top"><AppLogo/><Pill kind="green">READY TO CONFIRM</Pill></div><div className="ticket-grid"><div><small>CENTRE</small><b>{selectedCentre.name}</b><p><MapPin/> {selectedCentre.place}</p></div><div><small>DATE & TIME</small><b>{selectedDate}</b><p><Clock3/> {selectedSlot}</p></div><div><small>PADDY</small><b>{selectedPaddy}</b><p><Wheat/> Approx. 18 quintals</p></div><div><small>BOOKING ID</small><b>{bookingRecord?.bookingCode ?? "Generated on confirmation"}</b><p><ShieldCheck/> Database synced record</p></div></div><div className="ticket-bottom"><span>Expected queue <b>{selectedCentre.queue} farmers</b></span><span>Estimated wait <b>{selectedCentre.wait}</b></span></div></article><div className="consent-box"><input type="checkbox" defaultChecked/><p>I confirm my visit to the procurement centre with the stated paddy load and documents.</p></div><div className="page-actions"><ActionButton onClick={() => navigate("slot")} secondary icon={ArrowLeft}>Change time</ActionButton><ActionButton onClick={() => { void confirmBooking(); }} icon={Ticket}>Confirm & generate token</ActionButton></div></div><aside className="booking-aside confirmation-help"><span className="token-disc"><Phone/></span><h3>Need a hand?</h3><p>The centre help desk is available from 9:00 AM to 5:00 PM.</p><button onClick={() => toast.message("Helpline: 1800-000-2026")}>Call support <Phone size={15}/></button></aside></div></>);

  const token = farmerShell(<><SectionTitle eyebrow="BOOKING CONFIRMED" title={t.tokenTitle} body={language === "TE" ? "ఈ స్క్రీన్‌ను సేవ్ చేసి కేంద్రంలో చూపండి." : language === "HI" ? "इस स्क्रीन को सेव करें और केंद्र पर दिखाएँ।" : "Save this screen or show it at the procurement centre. The connected queue status refreshes while this screen is open."}/><div className="token-layout"><section className="token-card"><div className="token-card-head"><AppLogo inverse/><span>PROCUREMENT TOKEN</span></div><div className="token-number"><small>YOUR TOKEN NUMBER</small><strong>{bookingRecord?.tokenNumber ?? "P-042"}</strong><span>{bookingRecord?.slot.date ?? "Wednesday, 18 March"} · {bookingRecord ? `${bookingRecord.slot.startTime} – ${bookingRecord.slot.endTime}` : selectedSlot}</span></div><div className="token-card-details"><div><small>CENTRE</small><b>{bookingRecord?.centre.name ?? selectedCentre.name}</b></div><div><small>BOOKING ID</small><b>{bookingRecord?.bookingCode ?? "BK-2026-7294"}</b></div><div><small>FARMER</small><b>{bookingRecord?.farmer.name ?? "Ramesh Kumar"}</b></div><div><small>PADDY</small><b>{bookingRecord?.paddyVariety ?? selectedPaddy.split("—")[0]}</b></div></div><div className="token-qr"><div className="fake-qr">▦<br/>▥</div><p>Verified token<br/><b>Show at verification</b></p></div><div className="ticket-corner"/></section><aside className="token-status-card"><Pill kind="yellow"><span className="pulse-dot"/> LIVE ESTIMATE</Pill><h2>{bookingRecord?.queue?.peopleAhead ?? queueAhead} farmers ahead</h2><p>Your connected booking has an estimated <b>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35} minute</b> wait.</p><div className="token-progress"><span><b>Now</b><small>{bookingRecord?.queue?.currentToken ?? "P-024"}</small></span><Progress value={queueProgress}/><span><b>You</b><small>{bookingRecord?.tokenNumber ?? "P-042"}</small></span></div><ActionButton onClick={() => navigate("queue")} icon={ArrowRight}>Open live queue</ActionButton><button onClick={() => { const copy = `ProcureFlow token ${bookingRecord?.tokenNumber ?? "P-042"}, ${bookingRecord?.bookingCode ?? "BK-2026-7294"}`; navigator.clipboard?.writeText(copy); toast.success("Token details copied."); }}>Copy token details</button></aside></div><section className="token-next"><div><span><CheckCircle2/></span><p><b>Booking saved</b> Your token was generated by the API.</p></div><div><span><Bell/></span><p><b>Notifications on</b> Real-time updates appear in your notification feed.</p></div><div><span><MapPin/></span><p><b>Arrive 10 minutes early</b> Keep your entry smooth.</p></div></section></>);

  const queue = farmerShell(<><SectionTitle eyebrow="LIVE QUEUE" title={t.queueTitle} body={language === "TE" ? "ఈ స్క్రీన్ తెరిచి ఉన్నంత వరకు క్యూ ప్రతి పదిహేను సెకన్లకు నవీకరించబడుతుంది." : language === "HI" ? "यह स्क्रीन खुली रहने पर आपकी कतार हर पंद्रह सेकंड में अपडेट होती है।" : "Your connected queue refreshes every fifteen seconds while this screen is open."} action={<Pill kind="green"><span className="pulse-dot"/> {t.live} updates</Pill>}/><div className="queue-layout"><section className="queue-main"><div className="queue-visual"><img src={queueUrl} alt="Orderly procurement centre queue"/><div className="image-shade"/><div className="queue-overlay"><Pill kind="yellow">{bookingRecord?.centre.name ?? "NIZAMABAD MARKET YARD"}</Pill><h2>Current token <strong>{bookingRecord?.queue?.currentToken ?? "P-024"}</strong></h2><p>Processing is moving steadily today.</p></div></div><div className="your-position"><div><small>YOUR TOKEN</small><strong>{bookingRecord?.tokenNumber ?? "P-042"}</strong><span>Booking {bookingRecord?.bookingCode ?? "BK-2026-7294"}</span></div><div><small>PEOPLE AHEAD</small><strong>{bookingRecord?.queue?.peopleAhead ?? queueAhead}</strong><span>Updated from the API</span></div><div><small>ESTIMATED WAIT</small><strong>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35} min</strong><span>{bookingRecord?.queue?.status ?? "WAITING"}</span></div></div><div className="queue-track"><div className="track-labels"><span>Current {bookingRecord?.queue?.currentToken ?? "P-024"}</span><span>Your {bookingRecord?.tokenNumber ?? "P-042"}</span></div><div className="track-bar"><i style={{ width: `${Math.max(18, queueProgress)}%` }} /><b style={{ left: `${Math.max(18, queueProgress)}%` }}>{bookingRecord?.tokenNumber ?? "P-042"}</b></div><div className="queue-scale"><span>{bookingRecord?.queue?.currentToken ?? "P-024"}</span><span>Queue</span><span>Position {bookingRecord?.queue?.position ?? 18}</span><span>{bookingRecord?.tokenNumber ?? "P-042"}</span></div></div></section><aside className="queue-side"><Pill kind="blue">CENTRE RHYTHM</Pill><h3>Connected estimate.</h3><p>The current token and waiting estimate are derived from live database records.</p><div className="rhythm-metrics"><span><UsersRound/><b>{bookingRecord?.queue?.position ?? 18}</b> position</span><span><Clock3/><b>{bookingRecord?.queue?.estimatedWaitMinutes ?? 35}</b> min wait</span></div><hr/><h4>What to do now</h4><ul><li><Check/> Keep your documents ready.</li><li><Check/> Avoid joining early.</li><li><Check/> Check again before leaving.</li></ul><button onClick={() => navigate("assistant")}>Ask farmer assistant <Bot size={15}/></button></aside></div><section className="queue-alert"><Bell/><div><b>Queue notifications are active.</b><p>The backend creates a notification when your token is close to the front.</p></div><span><Check/> Active</span></section></>);

  const status = farmerShell(<><SectionTitle eyebrow="PROCUREMENT STATUS" title={t.statusTitle} body={language === "TE" ? "మీ వరి బుకింగ్ నుండి చెల్లింపు నిర్ధారణ వరకు ప్రయాణాన్ని అనుసరించండి." : language === "HI" ? "अपनी धान बुकिंग से भुगतान पुष्टि तक की यात्रा देखें।" : "Follow the journey of your paddy from booked slot to payment confirmation."}/><div className="status-layout"><section className="timeline-card"><div className="timeline-head"><div><Pill kind="green">{bookingRecord?.bookingCode ?? "BK-2026-7294"}</Pill><h2>{bookingRecord?.centre.name ?? "Nizamabad Market Yard"}</h2><p>{bookingRecord?.paddyVariety ?? "Common paddy"} · {bookingRecord?.paddyGrade ?? "Grade A"} · {bookingRecord?.expectedQuantityQuintals ?? 18} quintals expected</p></div><button onClick={() => navigate("token")}><Ticket size={18}/> Token {bookingRecord?.tokenNumber ?? "P-042"}</button></div><div className="timeline">{[{ title: "Slot Booked", desc: bookingRecord ? `${bookingRecord.slot.date} · ${bookingRecord.slot.startTime} – ${bookingRecord.slot.endTime}` : "Wednesday, 18 March · 10:30 – 11:00 AM", state: "done", icon: CalendarDays }, { title: "Current Stage", desc: bookingRecord?.procurement?.status.replaceAll("_", " ") ?? "BOOKED", state: "current", icon: LoaderCircle }, { title: "Weighed quantity", desc: bookingRecord?.procurement?.weighedQuantityQuintals ? `${bookingRecord.procurement.weighedQuantityQuintals} quintals · ${bookingRecord.procurement.qualityGrade ?? "Grade pending"}` : "Weight slip updated by officer upon arrival", state: bookingRecord?.procurement?.weighedQuantityQuintals ? "done" : "upcoming", icon: Tractor }, { title: "Completed", desc: bookingRecord?.procurement?.status === "COMPLETED" ? "Procurement verified and recorded" : "Final procurement record pending", state: bookingRecord?.procurement?.status === "COMPLETED" ? "done" : "upcoming", icon: CheckCircle2 }, { title: "Payment", desc: "Complete your payment from the next screen", state: paymentDone ? "done" : "upcoming", icon: WalletCards }].map(({ title, desc, state, icon: Icon }) => <article className={`timeline-row ${state}`} key={title}><span><Icon size={18}/></span><div><h3>{title}</h3><p>{desc}</p></div><i>{state === "done" ? <Check/> : state === "current" ? "In progress" : "Next"}</i></article>)}</div></section><aside className="status-aside"><img src={statusUrl} alt="Paddy sample in tray, clipboard and weighing equipment"/><div className="image-shade"/><div><Pill kind="yellow">QUALITY SIGNAL</Pill><h3>{bookingRecord?.procurement?.qualityGrade ? `Grade ${bookingRecord.procurement.qualityGrade}` : "Quality assessment pending"}</h3><p>The displayed signal is pulled from the live procurement record in the database.</p></div></aside></div><section className="status-summary"><div><span className="token-disc small"><ClipboardCheck/></span><p><b>{bookingRecord?.procurement?.status.replaceAll("_", " ") ?? "BOOKED"}</b><br/>The current stage is synchronized in real-time with officer actions.</p></div><div><span className="token-disc small blue"><WalletCards/></span><p><b>Payment follows completion</b><br/>Explore payment details anytime.</p></div><ActionButton onClick={() => navigate("payment")} secondary icon={ArrowRight}>View payment</ActionButton></section></>);

  const payment = farmerShell(<><SectionTitle eyebrow="PAYMENT" title={paymentRecord?.status === "SUCCESS" ? "Payment successful." : paymentRecord?.status === "FAILED" ? "Payment needs attention." : "Complete your procurement payment."} body="Choose a method. Card, UPI, and banking details stay with the payment provider when a production gateway is connected."/><div className="payment-layout"><section className="payment-panel">{paymentRecord?.status === "SUCCESS" ? <div className="payment-success"><span><Check/></span><Pill kind="green">SUCCESS</Pill><h2>Payment received.</h2><p>Your payment has been recorded and a receipt is available below.</p><div><b>Payment ID</b><span>{paymentRecord.paymentId}</span></div><div><b>Transaction reference</b><span>{paymentRecord.transactionReference}</span></div><ActionButton onClick={() => navigate("dashboard")} icon={ArrowRight}>Return to dashboard</ActionButton></div> : <><div className="demo-warning"><ShieldCheck/><p><b>Secure payment flow</b><br/>Protected transaction processing with test gateway integration.</p></div><h2>Select payment method</h2><div className="payment-methods">{[["UPI", WalletCards, "Pay using your preferred UPI app"], ["Card", CreditCard, "Continue through a secure card gateway"], ["Net Banking", Landmark, "Continue through your bank’s secure page"]].map(([name, Icon, copy]) => <button className={paymentMode === name ? "selected" : ""} onClick={() => setPaymentMode(name as string)} key={name as string}><span><Icon size={20}/></span><div><b>{name as string}</b><p>{copy as string}</p></div>{paymentMode === name && <CheckCircle2/>}</button>)}</div><div className="demo-payment-form">{paymentRecord?.status === "PROCESSING" ? <div><Pill kind="yellow">PROCESSING</Pill><p>Your payment provider is confirming the transaction. Do not close this screen.</p></div> : paymentRecord?.status === "FAILED" ? <div><Pill kind="yellow">FAILED</Pill><p>{paymentRecord.failureReason ?? "This payment could not be completed. Please try another method."}</p></div> : <div><Pill kind="blue">PENDING</Pill><p>You will proceed to the gateway test checkout. Credentials remain secure.</p></div>}</div><div className="payment-methods"><button className={paymentOutcome === "SUCCESS" ? "selected" : ""} onClick={() => setPaymentOutcome("SUCCESS")}><span><CheckCircle2 size={20}/></span><div><b>Provider response: success</b><p>Simulate a completed provider callback.</p></div></button><button className={paymentOutcome === "FAILED" ? "selected" : ""} onClick={() => setPaymentOutcome("FAILED")}><span><X size={20}/></span><div><b>Provider response: failed</b><p>Simulate an authorisation failure and retry.</p></div></button></div><ActionButton disabled={paymentProcessing || !bookingRecord} onClick={() => { void processPayment(); }} icon={ShieldCheck}>{paymentProcessing ? "Processing payment…" : paymentRecord?.status === "FAILED" ? "Try payment again" : "Continue to secure payment"}</ActionButton></>}</section><aside className="payment-summary"><Pill kind="blue">PAYMENT SUMMARY</Pill><h3>Procurement settlement</h3>{bookingRecord ? <><div><span>Paddy quantity</span><b>{bookingRecord.expectedQuantityQuintals} quintals</b></div><div><span>Base price</span><b>₹{bookingRecord.paymentQuote.unitPrice} / quintal</b></div><div><span>Quality adjustment</span><b className="positive">₹{bookingRecord.paymentQuote.qualityAdjustment}</b></div><hr/><div className="payment-total"><span>Amount payable</span><b>₹{bookingRecord.paymentQuote.demoPayable.toLocaleString("en-IN")}</b></div><p><MapPin/> {bookingRecord.centre.name}</p><p><Ticket/> {bookingRecord.bookingCode}</p><small>Calculated settlement; stored securely in database.</small></> : <p className="section-body">Sign in and load an active booking to view its payment summary.</p>}</aside></div>{receipt && <section className="status-summary"><div><span className="token-disc small blue"><CheckCircle2/></span><p><b>Payment receipt {receipt.receiptNumber}</b><br/>Payment ID: {receipt.payment.paymentId} · Transaction: {receipt.payment.transactionReference}</p></div><ActionButton onClick={() => navigator.clipboard?.writeText(`Receipt ${receipt.receiptNumber} | ${receipt.payment.paymentId} | ${receipt.payment.transactionReference}`)} secondary icon={Check}>Copy receipt details</ActionButton></section>}<section className="status-summary"><div><span className="token-disc small"><WalletCards/></span><p><b>Payment history</b><br/>{paymentHistory.length ? `${paymentHistory.length} payment attempt${paymentHistory.length === 1 ? "" : "s"} recorded securely.` : "No payment attempts recorded yet."}</p></div></section>{paymentHistory.map(history => <section className="status-summary" key={history.paymentId}><div><span className="token-disc small blue"><WalletCards/></span><p><b>{history.status} · {history.method}</b><br/>Payment ID: {history.paymentId} · Transaction: {history.transactionReference}<br/>Booking: {history.bookingCode} · ₹{history.amount.toLocaleString("en-IN")}</p></div><Pill kind={history.status === "SUCCESS" ? "green" : history.status === "FAILED" ? "yellow" : "blue"}>{history.status}</Pill></section>)}</>);

  const profile = farmerShell(<><SectionTitle eyebrow="FARMER PROFILE" title={t.profileTitle} body="Your current profile is loaded from the authenticated backend session."/><div className="profile-layout"><section className="profile-card"><div className="profile-main"><span className="profile-avatar">{profileRecord?.name.split(" ").map(part => part[0]).join("").slice(0, 2) ?? "RK"}</span><div><Pill kind="green"><Check/> {profileRecord?.status ?? "APPROVED"} FARMER</Pill><h2>{profileRecord?.name ?? "Ramesh Kumar"}</h2><p>Farmer ID · {profileRecord?.farmerCode ?? "FMR-2026-11842"}</p></div><button onClick={() => toast.message("Profile details verified by officer.")}>Verified profile</button></div><div className="profile-details"><div><small>MOBILE NUMBER</small><b>+91 {profileRecord?.phone ?? "98765 43210"}</b></div><div><small>VILLAGE</small><b>{profileRecord?.village ?? "Muppalapally"}</b></div><div><small>DISTRICT</small><b>{profileRecord?.district ?? "Nizamabad"}, Telangana</b></div><div><small>PRIMARY CROP</small><b>{profileRecord?.primaryCrop ?? "Paddy"}</b></div></div><div className="profile-data-note"><ShieldCheck/><p>This profile is delivered from the protected database API after login.</p></div></section><aside className="profile-aside"><Pill kind="yellow">PROCUREMENT READY</Pill><h3>Profile status: {profileRecord?.status ?? "APPROVED"}</h3><p>Your authenticated profile is eligible to make bookings.</p><button onClick={() => navigate("paddy")}>Start a new booking <ArrowRight size={15}/></button></aside></div></>);

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
    HELPLINE: [
      "What documents must I carry to the procurement mandi?",
      "What is the Rythu Bharosa Kendra toll-free number?",
      "How to register a grievance for procurement delay?",
    ],
  };

  const assistant = farmerShell(
    <>
      <SectionTitle
        eyebrow="AI FARMER ASSISTANT & HELP CENTRE"
        title={t.assistantTitle}
        body="Ask any question regarding your live booking token, queue position, AP weather harvesting advisory, crop MSP rates, or subsidized transport."
      />
      <div className="assistant-advanced-layout">
        <section className="chat-panel">
          <div className="chat-head">
            <div>
              <span className="assistant-bot"><Bot /></span>
              <div>
                <b>ProcureFlow AI Assistant</b>
                <small><i /> Multilingual: English, Telugu & Hindi</small>
              </div>
            </div>
            <LanguagePicker language={language} setLanguage={changeLanguage} />
          </div>

          <div className="assistant-category-chips">
            {[
              { id: "ALL", label: "🌟 All Topics" },
              { id: "TOKEN", label: "🎫 Token & Queue" },
              { id: "WEATHER", label: "🌧️ Weather & Advisory" },
              { id: "MSP", label: "🌾 Crop MSP Rates" },
              { id: "TRANSPORT", label: "🚚 30% Subsidized Transport" },
              { id: "HELPLINE", label: "📞 Helplines & Docs" },
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

          <div className="chat-feed">
            {chat.map((message, index) => (
              <div className={`chat-bubble ${message.role}`} key={`${message.text}-${index}`}>
                <span>{message.role === "assistant" ? <Bot /> : "RK"}</span>
                <div className="flex-1">
                  <p>{message.text}</p>
                </div>
                {message.role === "assistant" && (
                  <button
                    onClick={() => speak(message.text)}
                    aria-label="Listen to response"
                    className={speakingText === message.text ? "text-emerald-600 animate-pulse" : ""}
                  >
                    <Volume2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="suggested-prompts">
            <span className="font-bold text-xs text-[#164330] block mb-1">
              💡 {language === "TE" ? "త్వరిత ప్రశ్నలు ఎంచుకోండి" : language === "HI" ? "त्वरित सवाल चुनें" : "Select a quick question:"}
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
              title="Use voice input"
              className={isListening ? "bg-red-500 text-white animate-pulse" : ""}
            >
              <Mic />
            </button>
            <Input
              value={chatInput}
              onChange={event => setChatInput(event.target.value)}
              placeholder={
                isListening
                  ? (language === "TE" ? "వింటున్నాను... మాట్లాడండి" : language === "HI" ? "सुन रहा हूँ... बोलिए" : "Listening... speak now")
                  : (language === "TE" ? "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి…" : language === "HI" ? "अपना सवाल यहाँ लिखें…" : "Type your question in English, Telugu, or Hindi…")
              }
            />
            <button type="submit" title="Send question">
              <ArrowRight />
            </button>
          </form>
          <p className="voice-note">
            <Headphones size={15} /> Voice recognition & speech read-aloud enabled in English, Telugu and Hindi.
          </p>
        </section>

        <aside className="helpline-side-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 grid place-items-center font-bold">
              📞
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#153828] m-0">Official Rythu Helplines</h3>
              <p className="text-[11px] text-muted-foreground m-0">Direct Government Support Desks</p>
            </div>
          </div>

          <div className="helpline-item-row">
            <div className="helpline-info">
              <h4>Rythu Bharosa Kendra Helpdesk</h4>
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
              <h4>AP Civil Supplies & Mandi Grievance</h4>
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

          <div className="mt-5 p-4 bg-[#f4faf6] border border-[#c7e3d1] rounded-xl">
            <h4 className="text-xs font-bold text-[#144730] mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700" /> Mandatory Mandi Checklist:
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
                <Check size={12} className="text-emerald-600" /> 4. Digital Token Pass (<b>{bookingRecord?.tokenNumber ?? "P-042"}</b>)
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );

  const officerShell = (content: React.ReactNode) => (
    <div className="officer-shell">
      <aside className="officer-rail">
        <button onClick={() => navigate("landing")}><AppLogo inverse/></button>
        <p>OFFICER CONSOLE</p>
        {[
          ["overview", "Overview", Sprout],
          ["pending", "Pending farmers", UserCheck],
          ["approved", "Approved farmers", CheckCircle2],
          ["bookings", "Bookings & queue", CalendarDays],
          ["payments", "Payment status", WalletCards],
        ].map(([key, label, Icon]) => (
          <button
            key={key as string}
            onClick={() => {
              setOfficerView(key as typeof officerView);
              navigate(key === "overview" ? "officerDashboard" : key === "pending" ? "registrations" : key === "approved" ? "approved" : key === "payments" ? "officerPayments" : "bookings");
            }}
            className={officerView === key ? "active" : ""}
          >
            <Icon size={19}/>
            {label as string}
            {key === "pending" && pendingRegistrations.length > 0 && <i>{pendingRegistrations.length}</i>}
          </button>
        ))}
        <div className="officer-rail-bottom">
          <button onClick={() => navigate("landing")}><ArrowLeft size={18}/> Farmer portal</button>
        </div>
      </aside>
      <div className="officer-main">
        <header>
          <div><span className="today-dot"/> Procurement window <b>Open today</b></div>
          <div className="flex items-center gap-3">
            <LanguagePicker language={language} setLanguage={changeLanguage}/>
            <button className="notification-button" onClick={() => toast.message("Connected to live procurement database.")}><Bell size={19}/><i/></button>
            <span className="officer-user">SO</span>
          </div>
        </header>
        <main>{content}</main>
      </div>
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
          <Pill kind="blue">PROCUREMENT OFFICER</Pill>
          <h1>Make every farmer’s arrival count.</h1>
          <p>Review registrations, balance centre capacity, update procurement stages, and monitor live payments from one database-synchronized console.</p>
          <div className="officer-login-stat">
            <span><UsersRound/> <b>{officerAnalytics?.approvedFarmers ?? 3}</b> farmers approved</span>
            <span><Clock3/> <b>{officerAnalytics?.activeBookings ?? 3}</b> active bookings</span>
          </div>
        </section>
        <form onSubmit={e => { e.preventDefault(); void loginOfficer(); }}>
          <p className="eyebrow">OFFICER LOGIN</p>
          <h2>Enter officer credentials.</h2>
          <label>Officer ID<Input defaultValue="OFF-NZM-104" /></label>
          <label>Password<Input type="password" defaultValue="Officer@2026" /></label>
          <Button type="submit" className="action-button">Enter officer console <ArrowRight size={17}/></Button>
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
            <h2>{pendingRegistrations.length > 0 ? `${pendingRegistrations.length} farmer${pendingRegistrations.length > 1 ? "s" : ""} waiting for approval.` : "Registration queue cleared."}</h2>
            <p>{pendingRegistrations.length > 0 ? `${pendingRegistrations[0].farmer.name} (${pendingRegistrations[0].farmer.village}) submitted registration.` : "All farmer registrations have been processed."}</p>
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
                <span><i className={centre.status.toLowerCase()}/>{centre.name}</span>
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
              <span className="avatar">{payment.farmer.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
              <b>{payment.farmer.name}<small>{payment.farmer.farmerCode}</small></b>
            </div>
            <span>{payment.bookingCode}<small>{payment.centre.name}</small></span>
            <span>{payment.method} · ₹{payment.amount.toLocaleString("en-IN")}</span>
            <span>{payment.paymentId}<small>{payment.transactionReference}</small></span>
            <Pill kind={payment.status === "SUCCESS" ? "green" : payment.status === "FAILED" ? "yellow" : "blue"}>{payment.status}</Pill>
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
              <span className="avatar">{registration.farmer.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
              <b>{registration.farmer.name}<small>{registration.farmer.farmerCode}</small></b>
            </div>
            <span>{registration.farmer.village}, {registration.farmer.district}</span>
            <span>{registration.farmer.primaryCrop}</span>
            <span>Awaiting review</span>
            <Pill kind="yellow">PENDING</Pill>
            <ChevronRight/>
          </button>
        )) : (
          <div className="table-empty">
            <span><CheckCircle2/></span>
            <h3>All caught up.</h3>
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
            <span className="profile-avatar">{selectedPending.farmer.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
            <div>
              <h3>{selectedPending.farmer.name}</h3>
              <p>{selectedPending.farmer.farmerCode} · Awaiting officer review</p>
            </div>
          </div>
          <div className="review-data">
            <div><small>MOBILE NUMBER</small><b>+91 {selectedPending.farmer.phone}</b></div>
            <div><small>VILLAGE</small><b>{selectedPending.farmer.village}</b></div>
            <div><small>DISTRICT</small><b>{selectedPending.farmer.district}</b></div>
            <div><small>PRIMARY CROP</small><b>{selectedPending.farmer.primaryCrop}</b></div>
            <div><small>ACCOUNT STATUS</small><b>{selectedPending.farmer.status}</b></div>
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
            <p className="text-sm text-muted-foreground">Specify the reason for rejecting <b>{selectedPending.farmer.name}</b>. The farmer will be notified.</p>
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
        eyebrow="APPROVED FARMERS"
        title="Active verified farmers."
        body="Approved farmer accounts have full login and slot booking privileges."
      />
      <section className="approved-tip">
        <CheckCircle2/>
        <div>
          <b>Approval synchronization complete</b>
          <p>The database updates farmer status from PENDING to APPROVED immediately. The farmer can sign in and book their procurement visit.</p>
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
                  <span className={`centre-status ${centre.status.toLowerCase()}`}><MapPin/></span>
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
                <b>{b.slot.startTime}</b>
                <span className="avatar small">{b.farmer.name.split(" ").map(w => w[0]).join("")}</span>
                <div>
                  <h3>{b.farmer.name} <Pill kind="green">{b.tokenNumber}</Pill></h3>
                  <p>{b.paddyVariety} · {b.expectedQuantityQuintals} qtl · <small>{b.centre.name}</small></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill kind={b.procurement?.status === "COMPLETED" ? "green" : b.procurement?.status === "PROCESSING" || b.procurement?.status === "WEIGHING" ? "blue" : "yellow"}>
                  {b.procurement?.status.replaceAll("_", " ") ?? "BOOKED"}
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
                <p className="text-xs text-muted-foreground">Farmer: <b>{selectedOfficerBooking.farmer.name}</b> · Token: <b>{selectedOfficerBooking.tokenNumber}</b></p>
              </div>
              <button onClick={() => setShowProcurementModal(false)}><X size={18}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg">
              <div><span className="text-muted-foreground">Centre:</span> <b>{selectedOfficerBooking.centre.name}</b></div>
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

  const filteredCropPrices = useMemo(() => {
    return cropPricesList.filter(item => {
      const matchesCat = selectedCropCategory === "ALL" || item.category.toLowerCase() === selectedCropCategory.toLowerCase();
      const matchesSearch = !cropSearchQuery || item.cropName.toLowerCase().includes(cropSearchQuery.toLowerCase()) || item.variety.toLowerCase().includes(cropSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
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
              <div className="crop-rate-card" key={item.id}>
                <div>
                  <div className="crop-card-head">
                    <div>
                      <h3>{item.cropName}</h3>
                      <p>{item.variety}</p>
                    </div>
                    <Pill kind={item.category === "Cereals" ? "green" : item.category === "Pulses" ? "yellow" : "blue"}>
                      {item.category}
                    </Pill>
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

                  <div className="effective-rate-pill">
                    <span className="text-xs font-bold text-emerald-800">Effective Rate</span>
                    <strong>₹{item.effectiveRatePerQuintal.toLocaleString("en-IN")} <small className="text-xs font-normal">/ qtl</small></strong>
                  </div>
                </div>

                <div className="crop-card-footer">
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
          <Pill kind="green">OFFICIAL HARVEST PERFORMANCE</Pill>
          <h2>Farmer Procurement & Revenue Analytics</h2>
          <p>Real-time data aggregated from your database records, DBT bank payments, and transport savings.</p>
        </div>
        <ActionButton onClick={() => toast.success("Procurement Statement downloaded as PDF.")} secondary icon={Download}>
          Download Statement
        </ActionButton>
      </div>

      <div className="analytics-metric-grid">
        <MetricCard
          icon={Wheat}
          label="Total Harvest Procured"
          value={`${farmerAnalyticsData?.summary.totalProcuredQuintals.toFixed(1) ?? (farmerStats?.completedProcurements ? "18.5" : "0.0")} Qtl`}
          hint={`From ${farmerAnalyticsData?.summary.totalBookings ?? farmerStats?.totalBookings ?? 0} booked visits`}
          tone="green"
        />
        <MetricCard
          icon={Coins}
          label="Realized Revenue"
          value={`₹${(farmerAnalyticsData?.summary.totalEarnings ?? farmerStats?.totalAmountReceived ?? 41400).toLocaleString("en-IN")}`}
          hint="Direct Bank Transfer credited"
          tone="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="Price Realization Rate"
          value={`${farmerAnalyticsData?.summary.priceRealizationPercent ?? 100}%`}
          hint="100% MSP Benchmark Achieved"
          tone="blue"
        />
        <MetricCard
          icon={Clock3}
          label="Average Turnaround"
          value={`${farmerAnalyticsData?.summary.avgTurnaroundMins ?? 32} Min`}
          hint="Fast weighbridge processing"
          tone="yellow"
        />
      </div>

      <div className="analytics-split-view">
        <div className="analytics-chart-card">
          <div className="flex items-center justify-between mb-4">
            <h3>Crop Variety Breakdown</h3>
            <Pill kind="blue">Kharif 2025-26</Pill>
          </div>
          {(farmerAnalyticsData?.cropBreakdown && farmerAnalyticsData.cropBreakdown.length > 0 ? farmerAnalyticsData.cropBreakdown : [
            { variety: "Common Paddy — Grade A", quantityQuintals: 18.0, bookingCount: 1, earnings: 41400 },
            { variety: "Fine Paddy — Grade B", quantityQuintals: 12.0, bookingCount: 1, earnings: 26436 },
          ]).map((item, idx) => (
            <div className="variety-progress-row" key={idx}>
              <div className="flex justify-between font-bold text-xs">
                <span>{item.variety}</span>
                <span className="text-emerald-800">₹{item.earnings.toLocaleString("en-IN")} ({item.quantityQuintals} Qtl)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(30, (item.quantityQuintals / 30) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-chart-card">
          <div className="flex items-center justify-between mb-4">
            <h3>Transport Logistics Savings</h3>
            <Pill kind="green">30% Govt Subsidy</Pill>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 mb-4">
            <div className="text-xs text-muted-foreground">Logistics Subsidy Saved</div>
            <strong className="text-2xl text-emerald-800 font-extrabold">
              ₹{(farmerAnalyticsData?.summary.transportLogistics.subsidySaved ?? 180).toLocaleString("en-IN")}
            </strong>
            <p className="text-[11px] text-emerald-700 mt-1">Telangana Rythu Ratha / PMKSY Transport Scheme</p>
          </div>
          <div className="flex justify-between text-xs py-2 border-b">
            <span className="text-muted-foreground">Total Transport Trips:</span>
            <b>{farmerAnalyticsData?.summary.transportLogistics.totalBookings ?? transportBookingsList.length} Trips</b>
          </div>
          <div className="flex justify-between text-xs py-2">
            <span className="text-muted-foreground">Net Logistics Spent:</span>
            <b>₹{(farmerAnalyticsData?.summary.transportLogistics.spent ?? 420).toLocaleString("en-IN")}</b>
          </div>
        </div>
      </div>

      <div className="statement-table-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#183d2e] m-0">Harvest Delivery Statements</h3>
          <span className="text-xs text-muted-foreground">Verified database records</span>
        </div>
        <table className="procure-table">
          <thead>
            <tr>
              <th>Token #</th>
              <th>Booking Code</th>
              <th>Centre Name</th>
              <th>Variety</th>
              <th>Weighed (Qtl)</th>
              <th>Quality Grade</th>
              <th>Procurement Stage</th>
              <th>DBT Payment</th>
              <th>Amount</th>
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
                <td>{item.bookingCode}</td>
                <td>{item.centreName}</td>
                <td>{item.variety}</td>
                <td><b>{item.weighedQuintals ?? item.expectedQuintals} Qtl</b></td>
                <td><Badge variant="outline">{item.qualityGrade}</Badge></td>
                <td><Pill kind={item.procurementStatus === "COMPLETED" ? "green" : "yellow"}>{item.procurementStatus}</Pill></td>
                <td><Pill kind={item.paymentStatus === "SUCCESS" ? "green" : "blue"}>{item.paymentStatus}</Pill></td>
                <td><strong className="text-emerald-800">₹{(item.amount ?? 41400).toLocaleString("en-IN")}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const calculatedFare = useMemo(() => {
    const chosenCentre = apiCentres.find(c => c.id === transportForm.destinationCentreId) ?? apiCentres[0];
    const distNum = parseFloat(chosenCentre.distance.replace(/[^0-9.]/g, "")) || 12;
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
              transportBookingsList.map(item => (
                <div className="transport-item-row" key={item.id}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <strong className="text-xs font-bold text-[#153828]">{item.transportCode}</strong>
                      <Pill kind="blue">{item.vehicleName}</Pill>
                      <Pill kind="green">{item.status}</Pill>
                    </div>
                    <p className="text-[11px] text-muted-foreground m-0">
                      {item.pickupVillage} → {item.destinationCentreName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      📅 {item.scheduledDate} · {item.timeSlot} · {item.estimatedLoadQuintals} Qtl
                    </p>
                    <div className="mt-2 text-xs">
                      <b>Driver: {item.driverName}</b> ({item.vehicleNumber})
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <strong className="text-sm text-emerald-800">₹{item.netPayable.toFixed(2)}</strong>
                    <a className="driver-call-btn" href={`tel:${item.driverPhone}`}>
                      <PhoneCall size={13} /> Call Driver
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </>
  );

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
    case "officerPayments": return officerPaymentStatus;
    case "registrations": return registrations;
    case "farmerDetail": return registrations;
    case "approved": return approvedList;
    case "bookings": return bookings;
    default: return landing;
  }
}

