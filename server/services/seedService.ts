import { and, eq } from "drizzle-orm";
import {
  bookings,
  cropPrices,
  farmers,
  officers,
  procurementCentres,
  procurements,
  queueEntries,
  registrations,
  slots,
  transportBookings,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { hashPassword } from "./passwordService";

let seedPromise: Promise<void> | null = null;

const prototypeCentres = [
  // Andhra Pradesh
  { name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", district: "Guntur", state: "Andhra Pradesh", latitude: "16.2970000", longitude: "80.4350000", distanceKm: "2.40", status: "OPEN" as const, queueCapacity: 60, currentToken: "AP-GNT-024", cropCategories: "Cereals, Pulses, Commercial" },
  { name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", district: "NTR District", state: "Andhra Pradesh", latitude: "16.5417000", longitude: "80.5847000", distanceKm: "4.80", status: "OPEN" as const, queueCapacity: 55, currentToken: "AP-VJA-009", cropCategories: "Cereals, Pulses" },
  { name: "Kurnool Rythu Bharosa Kendra", place: "C-Camp Agri Centre", district: "Kurnool", state: "Andhra Pradesh", latitude: "15.8281000", longitude: "78.0373000", distanceKm: "6.50", status: "BUSY" as const, queueCapacity: 45, currentToken: "AP-KNL-038", cropCategories: "Cereals, Coarse Cereals, Pulses" },
  { name: "Rajahmundry Godavari Collection Point", place: "Katheru Road", district: "East Godavari", state: "Andhra Pradesh", latitude: "17.0005000", longitude: "81.8040000", distanceKm: "8.20", status: "LIMITED" as const, queueCapacity: 35, currentToken: "AP-RJY-016", cropCategories: "Cereals, Oilseeds" },
  { name: "Eluru District Procurement Yard", place: "Sanivarapupeta", district: "Eluru", state: "Andhra Pradesh", latitude: "16.7107000", longitude: "81.0952000", distanceKm: "10.50", status: "OPEN" as const, queueCapacity: 40, currentToken: "AP-ELR-012", cropCategories: "Cereals, Commercial" },
  { name: "Nellore Coastal Paddy Mandi", place: "Podalakur Road", district: "Nellore", state: "Andhra Pradesh", latitude: "14.4426000", longitude: "79.9865000", distanceKm: "13.80", status: "OPEN" as const, queueCapacity: 50, currentToken: "AP-NLR-007", cropCategories: "Cereals, Pulses" },
  { name: "Tirupati Rayalaseema Grain Yard", place: "Renigunta Road", district: "Tirupati", state: "Andhra Pradesh", latitude: "13.6288000", longitude: "79.4192000", distanceKm: "15.20", status: "BUSY" as const, queueCapacity: 40, currentToken: "AP-TPT-019", cropCategories: "Cereals, Oilseeds" },
  { name: "Visakhapatnam Anandapuram Yard", place: "Anandapuram Junction", district: "Visakhapatnam", state: "Andhra Pradesh", latitude: "17.8864000", longitude: "83.3980000", distanceKm: "18.50", status: "OPEN" as const, queueCapacity: 45, currentToken: "AP-VSP-005", cropCategories: "Cereals, Pulses" },

  // Telangana
  { name: "Nizamabad Integrated Grain Yard", place: "Dubba Road Market Yard", district: "Nizamabad", state: "Telangana", latitude: "18.6725000", longitude: "78.0941000", distanceKm: "22.40", status: "OPEN" as const, queueCapacity: 65, currentToken: "TS-NZB-018", cropCategories: "Cereals, Pulses, Oilseeds" },
  { name: "Warangal Enumamula Agricultural Market", place: "Enumamula Grain Terminal", district: "Warangal", state: "Telangana", latitude: "17.9689000", longitude: "79.5941000", distanceKm: "26.80", status: "OPEN" as const, queueCapacity: 80, currentToken: "TS-WGL-042", cropCategories: "Cereals, Pulses, Commercial" },
  { name: "Karimnagar Rythu Vedika Hub", place: "Manakondur Road", district: "Karimnagar", state: "Telangana", latitude: "18.4386000", longitude: "79.1288000", distanceKm: "28.50", status: "LIMITED" as const, queueCapacity: 45, currentToken: "TS-KNR-011", cropCategories: "Cereals, Oilseeds" },
  { name: "Nalgonda Miryalaguda Paddy Depot", place: "Sagar Road, Miryalaguda", district: "Nalgonda", state: "Telangana", latitude: "16.8711000", longitude: "79.5638000", distanceKm: "19.00", status: "OPEN" as const, queueCapacity: 70, currentToken: "TS-MLG-031", cropCategories: "Cereals, Pulses" },
  { name: "Khammam Cotton & Chilli Market Yard", place: "Wyra Road, Khammam", district: "Khammam", state: "Telangana", latitude: "17.2473000", longitude: "80.1514000", distanceKm: "24.50", status: "BUSY" as const, queueCapacity: 50, currentToken: "TS-KHM-025", cropCategories: "Commercial, Pulses, Cereals" },

  // Punjab
  { name: "Ludhiana Gill Road Grain Mandi", place: "Gill Road Grain Market", district: "Ludhiana", state: "Punjab", latitude: "30.9010000", longitude: "75.8573000", distanceKm: "18.00", status: "OPEN" as const, queueCapacity: 90, currentToken: "PB-LDH-054", cropCategories: "Cereals, Oilseeds" },
  { name: "Sangrur Central Wheat & Paddy Yard", place: "Dhuri Road Mandi", district: "Sangrur", state: "Punjab", latitude: "30.2447000", longitude: "75.8451000", distanceKm: "21.50", status: "OPEN" as const, queueCapacity: 75, currentToken: "PB-SGR-033", cropCategories: "Cereals" },
  { name: "Patiala Nabha Gate Procurement Center", place: "Nabha Gate Mandi", district: "Patiala", state: "Punjab", latitude: "30.3398000", longitude: "76.3869000", distanceKm: "24.00", status: "BUSY" as const, queueCapacity: 60, currentToken: "PB-PTL-019", cropCategories: "Cereals, Pulses" },
  { name: "Bathinda Multania Road Mandi", place: "Multania Road Yard", district: "Bathinda", state: "Punjab", latitude: "30.2110000", longitude: "74.9455000", distanceKm: "28.00", status: "LIMITED" as const, queueCapacity: 55, currentToken: "PB-BTI-028", cropCategories: "Cereals, Commercial" },
  { name: "Amritsar Bhagtanwala Grain Terminal", place: "Bhagtanwala Dana Mandi", district: "Amritsar", state: "Punjab", latitude: "31.6340000", longitude: "74.8723000", distanceKm: "32.00", status: "OPEN" as const, queueCapacity: 70, currentToken: "PB-ASR-041", cropCategories: "Cereals" },

  // Haryana
  { name: "Karnal GT Road New Grain Market", place: "GT Road Dana Mandi", district: "Karnal", state: "Haryana", latitude: "29.6857000", longitude: "76.9905000", distanceKm: "15.00", status: "OPEN" as const, queueCapacity: 85, currentToken: "HR-KAR-012", cropCategories: "Cereals, Oilseeds" },
  { name: "Kurukshetra Pipli Procurement Hub", place: "Pipli Grain Market", district: "Kurukshetra", state: "Haryana", latitude: "29.9695000", longitude: "76.8783000", distanceKm: "20.50", status: "OPEN" as const, queueCapacity: 65, currentToken: "HR-KKR-027", cropCategories: "Cereals, Pulses" },
  { name: "Sirsa Cotton & Wheat Mandi", place: "Bhavani Road APMC", district: "Sirsa", state: "Haryana", latitude: "29.5349000", longitude: "75.0298000", distanceKm: "30.00", status: "BUSY" as const, queueCapacity: 70, currentToken: "HR-SRS-045", cropCategories: "Cereals, Commercial, Oilseeds" },
  { name: "Kaithal Agricultural Produce Yard", place: "Jind Road Mandi", district: "Kaithal", state: "Haryana", latitude: "29.8015000", longitude: "76.3996000", distanceKm: "22.00", status: "LIMITED" as const, queueCapacity: 50, currentToken: "HR-KTL-015", cropCategories: "Cereals" },

  // Madhya Pradesh
  { name: "Indore Laxmibai Nagar Krishi Upaj Mandi", place: "Laxmibai Nagar", district: "Indore", state: "Madhya Pradesh", latitude: "22.7533000", longitude: "75.8617000", distanceKm: "16.00", status: "OPEN" as const, queueCapacity: 80, currentToken: "MP-IND-062", cropCategories: "Cereals, Pulses, Oilseeds" },
  { name: "Ujjain Chimanganj Grain Yard", place: "Chimanganj Mandi", district: "Ujjain", state: "Madhya Pradesh", latitude: "23.1765000", longitude: "75.7885000", distanceKm: "25.00", status: "OPEN" as const, queueCapacity: 65, currentToken: "MP-UJN-034", cropCategories: "Cereals, Pulses, Oilseeds" },
  { name: "Bhopal Karond Mandi Complex", place: "Karond Bypass", district: "Bhopal", state: "Madhya Pradesh", latitude: "23.2989000", longitude: "77.4024000", distanceKm: "19.50", status: "LIMITED" as const, queueCapacity: 55, currentToken: "MP-BPL-021", cropCategories: "Cereals, Pulses" },
  { name: "Hoshangabad Narmadapuram Wheat Center", place: "Itarsi Road Mandi", district: "Narmadapuram", state: "Madhya Pradesh", latitude: "22.7519000", longitude: "77.7289000", distanceKm: "27.00", status: "OPEN" as const, queueCapacity: 75, currentToken: "MP-NDP-048", cropCategories: "Cereals, Pulses" },
  { name: "Jabalpur Krishi Mandi Yard", place: "Vijay Nagar Mandi", district: "Jabalpur", state: "Madhya Pradesh", latitude: "23.1815000", longitude: "79.9864000", distanceKm: "31.00", status: "BUSY" as const, queueCapacity: 60, currentToken: "MP-JBP-039", cropCategories: "Cereals, Pulses" },

  // Uttar Pradesh
  { name: "Varanasi Shivpur Grain Mandi", place: "Shivpur Mandi Samiti", district: "Varanasi", state: "Uttar Pradesh", latitude: "25.3524000", longitude: "82.9621000", distanceKm: "14.50", status: "OPEN" as const, queueCapacity: 70, currentToken: "UP-VNS-022", cropCategories: "Cereals, Pulses" },
  { name: "Lucknow Dubagga Krishi Upaj Mandi", place: "Dubagga Mandi Yard", district: "Lucknow", state: "Uttar Pradesh", latitude: "26.8622000", longitude: "80.8653000", distanceKm: "17.00", status: "OPEN" as const, queueCapacity: 75, currentToken: "UP-LKO-037", cropCategories: "Cereals, Pulses, Commercial" },
  { name: "Bareilly Delapeer Mandi Samiti", place: "Delapeer Crossing", district: "Bareilly", state: "Uttar Pradesh", latitude: "28.3752000", longitude: "79.4312000", distanceKm: "23.00", status: "LIMITED" as const, queueCapacity: 50, currentToken: "UP-BLY-016", cropCategories: "Cereals, Commercial" },
  { name: "Aligarh G.T. Road Grain Depot", place: "Dhanipur Mandi", district: "Aligarh", state: "Uttar Pradesh", latitude: "27.8974000", longitude: "78.0880000", distanceKm: "26.00", status: "OPEN" as const, queueCapacity: 60, currentToken: "UP-ALG-029", cropCategories: "Cereals, Oilseeds" },
  { name: "Gorakhpur Sahjanwa Procurement Point", place: "Sahjanwa Industrial Area", district: "Gorakhpur", state: "Uttar Pradesh", latitude: "26.7606000", longitude: "83.3732000", distanceKm: "29.00", status: "BUSY" as const, queueCapacity: 55, currentToken: "UP-GKP-043", cropCategories: "Cereals, Pulses" },

  // Maharashtra
  { name: "Nagpur Kalamna Grain & Pulse Market", place: "Kalamna Market Yard", district: "Nagpur", state: "Maharashtra", latitude: "21.1719000", longitude: "79.1364000", distanceKm: "18.50", status: "OPEN" as const, queueCapacity: 85, currentToken: "MH-NGP-051", cropCategories: "Cereals, Pulses, Oilseeds, Commercial" },
  { name: "Akola Cotton & Soybean APMC", place: "Shivaji Nagar APMC", district: "Akola", state: "Maharashtra", latitude: "20.7002000", longitude: "77.0082000", distanceKm: "24.00", status: "OPEN" as const, queueCapacity: 70, currentToken: "MH-AKL-032", cropCategories: "Oilseeds, Commercial, Pulses" },
  { name: "Nashik Dindori Road Agri Hub", place: "Dindori Naka APMC", district: "Nashik", state: "Maharashtra", latitude: "20.0110000", longitude: "73.7903000", distanceKm: "21.00", status: "BUSY" as const, queueCapacity: 65, currentToken: "MH-NSK-024", cropCategories: "Cereals, Coarse Cereals, Pulses" },
  { name: "Latur Pulses & Oilseeds Mandi", place: "Market Yard, Latur", district: "Latur", state: "Maharashtra", latitude: "18.4088000", longitude: "76.5604000", distanceKm: "26.50", status: "OPEN" as const, queueCapacity: 75, currentToken: "MH-LTR-047", cropCategories: "Pulses, Oilseeds" },
  { name: "Solapur Siddheshwar Krishi Kendra", place: "Old Pune Naka", district: "Solapur", state: "Maharashtra", latitude: "17.6599000", longitude: "75.9064000", distanceKm: "29.00", status: "LIMITED" as const, queueCapacity: 50, currentToken: "MH-SLP-018", cropCategories: "Coarse Cereals, Pulses" },

  // Karnataka
  { name: "Dharwad APMC Amargol Market Yard", place: "Amargol APMC Complex", district: "Dharwad", state: "Karnataka", latitude: "15.3949000", longitude: "75.0935000", distanceKm: "17.50", status: "OPEN" as const, queueCapacity: 70, currentToken: "KA-DHW-035", cropCategories: "Cereals, Pulses, Oilseeds" },
  { name: "Belagavi Central Agricultural Center", place: "Khanapur Road APMC", district: "Belagavi", state: "Karnataka", latitude: "15.8497000", longitude: "74.4977000", distanceKm: "23.00", status: "OPEN" as const, queueCapacity: 60, currentToken: "KA-BGM-022", cropCategories: "Cereals, Commercial" },
  { name: "Raichur Cotton & Paddy Complex", place: "Lingasugur Road APMC", district: "Raichur", state: "Karnataka", latitude: "16.2120000", longitude: "77.3439000", distanceKm: "20.00", status: "BUSY" as const, queueCapacity: 65, currentToken: "KA-RCR-041", cropCategories: "Cereals, Pulses, Commercial" },
  { name: "Davanagere Bathi Maize & Grain Mandi", place: "Bathi APMC Yard", district: "Davanagere", state: "Karnataka", latitude: "14.4644000", longitude: "75.9218000", distanceKm: "25.00", status: "LIMITED" as const, queueCapacity: 50, currentToken: "KA-DVG-014", cropCategories: "Coarse Cereals, Cereals" },

  // Tamil Nadu
  { name: "Thanjavur Cauvery Delta Paddy Yard", place: "Pillayarpatti DPC", district: "Thanjavur", state: "Tamil Nadu", latitude: "10.7870000", longitude: "79.1378000", distanceKm: "16.00", status: "OPEN" as const, queueCapacity: 75, currentToken: "TN-TNJ-028", cropCategories: "Cereals, Pulses" },
  { name: "Tiruvarur Direct Purchase Center", place: "Mannargudi Road DPC", district: "Tiruvarur", state: "Tamil Nadu", latitude: "10.7725000", longitude: "79.6365000", distanceKm: "19.50", status: "OPEN" as const, queueCapacity: 60, currentToken: "TN-TVR-033", cropCategories: "Cereals" },
  { name: "Madurai Mattuthavani Agri Market", place: "Mattuthavani Yard", district: "Madurai", state: "Tamil Nadu", latitude: "9.9391000", longitude: "78.1561000", distanceKm: "22.00", status: "BUSY" as const, queueCapacity: 55, currentToken: "TN-MDU-019", cropCategories: "Cereals, Pulses, Commercial" },
  { name: "Tiruchirappalli Gandhi Market Depot", place: "Palakarai Complex", district: "Tiruchirappalli", state: "Tamil Nadu", latitude: "10.7905000", longitude: "78.7047000", distanceKm: "24.50", status: "LIMITED" as const, queueCapacity: 45, currentToken: "TN-TRY-012", cropCategories: "Cereals, Coarse Cereals" },

  // Rajasthan
  { name: "Kota Bhamashah Krishi Upaj Mandi", place: "Anantpura Bhamashah Mandi", district: "Kota", state: "Rajasthan", latitude: "25.1825000", longitude: "75.8340000", distanceKm: "18.00", status: "OPEN" as const, queueCapacity: 85, currentToken: "RJ-KTA-066", cropCategories: "Cereals, Pulses, Oilseeds" },
  { name: "Sri Ganganagar Grain & Mustard Yard", place: "Suratgarh Road Mandi", district: "Sri Ganganagar", state: "Rajasthan", latitude: "29.9038000", longitude: "73.8772000", distanceKm: "27.00", status: "OPEN" as const, queueCapacity: 70, currentToken: "RJ-SGN-038", cropCategories: "Cereals, Oilseeds, Commercial" },
  { name: "Hanumangarh Junction Cotton Depot", place: "Junction Dana Mandi", district: "Hanumangarh", state: "Rajasthan", latitude: "29.5819000", longitude: "74.3294000", distanceKm: "29.50", status: "BUSY" as const, queueCapacity: 60, currentToken: "RJ-HNM-029", cropCategories: "Cereals, Commercial" },
  { name: "Baran Soybean & Pulses Mandi", place: "APMC Yard Baran", district: "Baran", state: "Rajasthan", latitude: "25.1011000", longitude: "76.5132000", distanceKm: "24.00", status: "LIMITED" as const, queueCapacity: 45, currentToken: "RJ-BRN-017", cropCategories: "Oilseeds, Pulses" },

  // Gujarat
  { name: "Rajkot Bedi Marketing Yard", place: "Bedi Bypass APMC", district: "Rajkot", state: "Gujarat", latitude: "22.3039000", longitude: "70.8022000", distanceKm: "20.00", status: "OPEN" as const, queueCapacity: 80, currentToken: "GJ-RJK-049", cropCategories: "Oilseeds, Commercial, Pulses" },
  { name: "Junagadh Groundnut & Sesame APMC", place: "Bilkha Road Yard", district: "Junagadh", state: "Gujarat", latitude: "21.5222000", longitude: "70.4579000", distanceKm: "25.50", status: "BUSY" as const, queueCapacity: 60, currentToken: "GJ-JND-032", cropCategories: "Oilseeds, Pulses" },
  { name: "Gondal Bhuvaneshwari Agri Hub", place: "Gondal Marketing Yard", district: "Rajkot", state: "Gujarat", latitude: "21.9619000", longitude: "70.7985000", distanceKm: "22.50", status: "OPEN" as const, queueCapacity: 75, currentToken: "GJ-GDL-055", cropCategories: "Oilseeds, Commercial" },

  // Bihar
  { name: "Purnia Gulabbagh Maize & Paddy Mandi", place: "Gulabbagh Mandi", district: "Purnia", state: "Bihar", latitude: "25.7771000", longitude: "87.4753000", distanceKm: "19.00", status: "OPEN" as const, queueCapacity: 75, currentToken: "BR-PUR-034", cropCategories: "Coarse Cereals, Cereals" },
  { name: "Rohtas Sasaram Grain Collection Depot", place: "Old GT Road, Sasaram", district: "Rohtas", state: "Bihar", latitude: "24.9522000", longitude: "84.0315000", distanceKm: "26.00", status: "LIMITED" as const, queueCapacity: 50, currentToken: "BR-RHT-018", cropCategories: "Cereals, Pulses" },
  { name: "Begusarai Agricultural Procurement Yard", place: "Harhar Mahadev Chowk", district: "Begusarai", state: "Bihar", latitude: "25.4182000", longitude: "86.1272000", distanceKm: "23.50", status: "OPEN" as const, queueCapacity: 55, currentToken: "BR-BGS-027", cropCategories: "Cereals, Coarse Cereals" },

  // Odisha
  { name: "Bargarh Paddy Procurement Terminal", place: "Bargarh RMC Mandi", district: "Bargarh", state: "Odisha", latitude: "21.3340000", longitude: "83.6212000", distanceKm: "17.00", status: "OPEN" as const, queueCapacity: 80, currentToken: "OD-BGR-044", cropCategories: "Cereals, Pulses" },
  { name: "Sambalpur Hirakud Basin Grain Hub", place: "Khetrajpur Market Yard", district: "Sambalpur", state: "Odisha", latitude: "21.4669000", longitude: "83.9812000", distanceKm: "22.00", status: "BUSY" as const, queueCapacity: 60, currentToken: "OD-SBP-029", cropCategories: "Cereals" },
  { name: "Cuttack Malgodown Agri Mandi", place: "Malgodown Terminal", district: "Cuttack", state: "Odisha", latitude: "20.4625000", longitude: "85.8828000", distanceKm: "25.50", status: "LIMITED" as const, queueCapacity: 50, currentToken: "OD-CTC-015", cropCategories: "Cereals, Pulses" },

  // West Bengal
  { name: "Bardhaman Memari Paddy Hub", place: "Memari CPC Mandi", district: "Purba Bardhaman", state: "West Bengal", latitude: "23.2324000", longitude: "87.8615000", distanceKm: "18.00", status: "OPEN" as const, queueCapacity: 75, currentToken: "WB-BDN-038", cropCategories: "Cereals, Pulses" },
  { name: "Murshidabad Berhampore Grain Mandi", place: "Cossimbazar Road", district: "Murshidabad", state: "West Bengal", latitude: "24.0988000", longitude: "88.2679000", distanceKm: "24.00", status: "BUSY" as const, queueCapacity: 55, currentToken: "WB-MSD-021", cropCategories: "Cereals, Oilseeds" },
  { name: "Hooghly Arambagh Agricultural Centre", place: "Arambagh Link Road", district: "Hooghly", state: "West Bengal", latitude: "22.8804000", longitude: "87.7816000", distanceKm: "21.50", status: "OPEN" as const, queueCapacity: 60, currentToken: "WB-HGL-026", cropCategories: "Cereals, Commercial" },
];

export const prototypeSlots = [
  ["07:00 AM", "08:00 AM", 25, 7],
  ["08:00 AM", "09:00 AM", 25, 12],
  ["09:00 AM", "10:00 AM", 25, 18],
  ["10:00 AM", "11:00 AM", 25, 22],
  ["11:00 AM", "12:00 PM", 25, 15],
  ["02:00 PM", "03:00 PM", 25, 9],
  ["03:00 PM", "04:00 PM", 25, 14],
  ["04:00 PM", "05:00 PM", 25, 20],
] as const;

export const prototypeCropPrices = [
  { cropName: "Paddy (Common)", variety: "Standard / MTU 1010", category: "Cereals", mspPerQuintal: "2300.00", marketRatePerQuintal: "2280.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "17.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-01" },
  { cropName: "Paddy (Grade A)", variety: "Grade A / BPT 5204", category: "Cereals", mspPerQuintal: "2320.00", marketRatePerQuintal: "2310.00", govtBonusPerQuintal: "50.00", maxMoisturePercent: "17.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-02" },
  { cropName: "Paddy (Parboiled)", variety: "Boiled Grade A", category: "Cereals", mspPerQuintal: "2320.00", marketRatePerQuintal: "2340.00", govtBonusPerQuintal: "30.00", maxMoisturePercent: "15.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-03" },
  { cropName: "Wheat (Gehun)", variety: "Kalyan Sona / Sharbati", category: "Cereals", mspPerQuintal: "2275.00", marketRatePerQuintal: "2250.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Rabi 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-04" },
  { cropName: "Maize (Makka)", variety: "Hybrid Yellow", category: "Coarse Cereals", mspPerQuintal: "2225.00", marketRatePerQuintal: "2180.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "14.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-05" },
  { cropName: "Jowar (Sorghum)", variety: "Maldandi / Hybrid", category: "Coarse Cereals", mspPerQuintal: "3371.00", marketRatePerQuintal: "3300.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-06" },
  { cropName: "Bajra (Pearl Millet)", variety: "Hybrid Pearl", category: "Coarse Cereals", mspPerQuintal: "2625.00", marketRatePerQuintal: "2580.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-07" },
  { cropName: "Ragi (Finger Millet)", variety: "GPU-28 / Indaf", category: "Coarse Cereals", mspPerQuintal: "4290.00", marketRatePerQuintal: "4210.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-08" },
  { cropName: "Bengal Gram (Chickpea / Chana)", variety: "Desi / Kabuli", category: "Pulses", mspPerQuintal: "5440.00", marketRatePerQuintal: "5380.00", govtBonusPerQuintal: "100.00", maxMoisturePercent: "12.0", effectiveSeason: "Rabi 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-09" },
  { cropName: "Red Gram (Tur / Arhar)", variety: "Maruti / Asha", category: "Pulses", mspPerQuintal: "7550.00", marketRatePerQuintal: "7480.00", govtBonusPerQuintal: "200.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-10" },
  { cropName: "Green Gram (Moong)", variety: "Shin Moong", category: "Pulses", mspPerQuintal: "8558.00", marketRatePerQuintal: "8400.00", govtBonusPerQuintal: "200.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-11" },
  { cropName: "Black Gram (Urad)", variety: "PU-19 / VBN", category: "Pulses", mspPerQuintal: "7400.00", marketRatePerQuintal: "7320.00", govtBonusPerQuintal: "150.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-12" },
  { cropName: "Groundnut (In Shell)", variety: "TMV-2 / Kadiri-6", category: "Oilseeds", mspPerQuintal: "6783.00", marketRatePerQuintal: "6600.00", govtBonusPerQuintal: "150.00", maxMoisturePercent: "8.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-13" },
  { cropName: "Sunflower", variety: "KBSH-44", category: "Oilseeds", mspPerQuintal: "7280.00", marketRatePerQuintal: "7190.00", govtBonusPerQuintal: "100.00", maxMoisturePercent: "9.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-14" },
  { cropName: "Soybean (Yellow)", variety: "JS 335", category: "Oilseeds", mspPerQuintal: "4892.00", marketRatePerQuintal: "4650.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-15" },
  { cropName: "Cotton (Medium Staple)", variety: "Surabhi", category: "Commercial", mspPerQuintal: "7121.00", marketRatePerQuintal: "6950.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "8.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-16" },
  { cropName: "Cotton (Long Staple)", variety: "BT Cotton / DCH-32", category: "Commercial", mspPerQuintal: "7521.00", marketRatePerQuintal: "7480.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "8.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-17" },
  { cropName: "Sugarcane", variety: "Co 86032 / Mandya", category: "Commercial", mspPerQuintal: "340.00", marketRatePerQuintal: "335.00", govtBonusPerQuintal: "15.00", maxMoisturePercent: "10.0", effectiveSeason: "Annual 2025-26", notificationRef: "MoA&FW/CACP-2025/FRP-18" },
];

export async function ensurePrototypeSeed(): Promise<void> {
  if (!seedPromise) seedPromise = seedDatabase();
  return seedPromise;
}

async function seedDatabase(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable.");

  // Seed Crop MSP Prices
  const existingCropPrices = await db.select().from(cropPrices);
  if (existingCropPrices.length === 0) {
    await db.insert(cropPrices).values(prototypeCropPrices);
  } else {
    for (const p of prototypeCropPrices) {
      const found = existingCropPrices.find(e => e.cropName === p.cropName && e.variety === p.variety);
      if (!found) {
        await db.insert(cropPrices).values(p);
      }
    }
  }

  const seededOfficers = [
    {
      officerCode: "OFF-NZM-104",
      employeeId: "EMP-HO-104",
      name: "K. Venkata Rao (Head Officer)",
      email: "head.officer@smartprocure.gov.in",
      phone: "9848012345",
      passwordHash: hashPassword("Officer@2026"),
      role: "HEAD_OFFICER" as const,
      department: "Administration",
      designation: "Chief District Procurement Officer",
      branch: "Guntur",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "QC-2026-4892",
      employeeId: "EMP-QC-4892",
      name: "Dr. S. Madhavan",
      email: "qc.madhavan@smartprocure.gov.in",
      phone: "9848012346",
      passwordHash: hashPassword("Officer@2026"),
      role: "QUALITY_CONTROL_INSPECTOR" as const,
      department: "Quality Assurance & Lab",
      designation: "Chief Quality Inspector",
      branch: "Guntur Agricultural Market Yard",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "LOG-2026-1042",
      employeeId: "EMP-LOG-1042",
      name: "B. Prabhakar Reddy",
      email: "logistics.prabhakar@smartprocure.gov.in",
      phone: "9848012347",
      passwordHash: hashPassword("Officer@2026"),
      role: "LOGISTICS_OFFICER" as const,
      department: "Logistics & Transportation",
      designation: "District Fleet Coordinator",
      branch: "Guntur Transport Hub",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "PAY-2026-9041",
      employeeId: "EMP-PAY-9041",
      name: "N. Anjaneyulu",
      email: "finance.anjaneyulu@smartprocure.gov.in",
      phone: "9848012348",
      passwordHash: hashPassword("Officer@2026"),
      role: "PAYMENT_OFFICER" as const,
      department: "Finance & Accounts (DBT)",
      designation: "Senior Treasury Officer",
      branch: "Guntur",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "PO-2026-3391",
      employeeId: "EMP-PO-3391",
      name: "T. Rajasekhar",
      email: "mandi.rajasekhar@smartprocure.gov.in",
      phone: "9848012349",
      passwordHash: hashPassword("Officer@2026"),
      role: "PROCUREMENT_OFFICER" as const,
      department: "Mandi Operations",
      designation: "Procurement Yard Officer",
      branch: "Guntur Agricultural Market Yard",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
  ];

  for (const off of seededOfficers) {
    const existingOfficer = await db.select({ id: officers.id }).from(officers).where(eq(officers.officerCode, off.officerCode)).limit(1);
    if (!existingOfficer[0]) {
      await db.insert(officers).values(off);
    }
  }

  for (const centre of prototypeCentres) {
    const existing = await db.select({ id: procurementCentres.id }).from(procurementCentres).where(eq(procurementCentres.name, centre.name)).limit(1);
    if (!existing[0]) {
      await db.insert(procurementCentres).values(centre);
    }
  }
  const currentCentres = await db.select({ id: procurementCentres.id }).from(procurementCentres);
  const datesToSeed = ["2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20"];
  for (const centre of currentCentres) {
    const existingCentreSlots = await db.select({ id: slots.id }).from(slots).where(eq(slots.centreId, centre.id)).limit(1);
    if (!existingCentreSlots[0]) {
      for (const d of datesToSeed) {
        await db.insert(slots).values(
          prototypeSlots.map(([startTime, endTime, capacity, bookedCount]) => ({
            centreId: centre.id,
            slotDate: d,
            startTime,
            endTime,
            capacity,
            bookedCount,
            isActive: 1,
          }))
        );
      }
    }
  }

  const existingFarmer = await db.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1);
  if (!existingFarmer[0]) {
    await db.insert(farmers).values({ farmerCode: "FMR-2026-11842", name: "Ramesh Kumar", phone: "9876543210", passwordHash: hashPassword("Farmer@2026"), village: "Mangalagiri", district: "Guntur", primaryCrop: "Paddy", status: "APPROVED" });
  }
  const farmer = (await db.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1))[0];
  if (!farmer) return;

  const additionalPrototypeFarmers = [
    { farmerCode: "FMR-2026-11843", name: "Lakshmi Devi", phone: "9876543211", passwordHash: hashPassword("Farmer@2026"), village: "Tenali", district: "Guntur", primaryCrop: "Paddy", status: "APPROVED" as const },
    { farmerCode: "FMR-2026-11844", name: "Srinivas Rao", phone: "9876543212", passwordHash: hashPassword("Farmer@2026"), village: "Tadepalle", district: "Guntur", primaryCrop: "Paddy", status: "APPROVED" as const },
  ];
  for (const prototypeFarmer of additionalPrototypeFarmers) {
    const exists = await db.select({ id: farmers.id }).from(farmers).where(eq(farmers.phone, prototypeFarmer.phone)).limit(1);
    if (!exists[0]) {
      await db.insert(farmers).values(prototypeFarmer);
      const created = (await db.select({ id: farmers.id }).from(farmers).where(eq(farmers.phone, prototypeFarmer.phone)).limit(1))[0];
      if (created) await db.insert(registrations).values({ farmerId: created.id, aadhaarMasked: "XXXX XXXX 2194", declarationAccepted: 1, status: "APPROVED" });
    }
  }

  const existingRegistration = await db.select().from(registrations).where(eq(registrations.farmerId, farmer.id)).limit(1);
  if (!existingRegistration[0]) {
    const officer = (await db.select().from(officers).where(eq(officers.officerCode, "OFF-NZM-104")).limit(1))[0];
    await db.insert(registrations).values({ farmerId: farmer.id, aadhaarMasked: "XXXX XXXX 4512", declarationAccepted: 1, status: "APPROVED", reviewedByOfficerId: officer?.id, reviewedAt: new Date() });
  }

  const existingTransport = await db.select({ id: transportBookings.id }).from(transportBookings).limit(1);
  if (!existingTransport[0]) {
    await db.insert(transportBookings).values([
      {
        transportCode: "TR-2026-7160",
        farmerId: farmer.id,
        bookingId: null,
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Mangalagiri",
        destinationCentreId: 1,
        scheduledDate: "2026-09-04",
        timeSlot: "Morning (07:00 - 11:00 AM)",
        estimatedLoadQuintals: "24.00",
        driverName: "B. Venkatesham",
        driverPhone: "9440192831",
        vehicleNumber: "TS-16-TR-4921",
        distanceKm: "14.00",
        baseFare: "502.00",
        subsidyAmount: "150.60",
        netPayable: "351.40",
        status: "ASSIGNED",
      },
      {
        transportCode: "TR-2026-4891",
        farmerId: farmer.id,
        bookingId: null,
        vehicleType: "MINI_TRUCK",
        pickupVillage: "Tenali",
        destinationCentreId: 1,
        scheduledDate: "2026-09-04",
        timeSlot: "Afternoon (12:00 - 04:00 PM)",
        estimatedLoadQuintals: "35.00",
        driverName: "K. Mohan Reddy",
        driverPhone: "9848039218",
        vehicleNumber: "AP-16-PK-8812",
        distanceKm: "18.00",
        baseFare: "746.00",
        subsidyAmount: "223.80",
        netPayable: "522.20",
        status: "REQUESTED",
      },
    ]);
  }

}

