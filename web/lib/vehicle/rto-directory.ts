export interface StateInfo {
  code: string;
  name: string;
  type: "state" | "union_territory";
  capital: string;
  portalUrl: string;
}

export interface RtoOfficeInfo {
  code: string; // e.g. "DL01", "MH12", "KA05"
  stateCode: string;
  district: string;
  officeName: string;
  stateName: string;
  zone?: string;
  pincode?: string;
}

export const INDIAN_STATES_AND_UTS: Record<string, StateInfo> = {
  AN: { code: "AN", name: "Andaman and Nicobar Islands", type: "union_territory", capital: "Port Blair", portalUrl: "https://transport.andaman.gov.in" },
  AP: { code: "AP", name: "Andhra Pradesh", type: "state", capital: "Amaravati", portalUrl: "https://aprtacitizen.epragathi.org" },
  AR: { code: "AR", name: "Arunachal Pradesh", type: "state", capital: "Itanagar", portalUrl: "https://arunpol.nic.in" },
  AS: { code: "AS", name: "Assam", type: "state", capital: "Dispur", portalUrl: "https://transport.assam.gov.in" },
  BR: { code: "BR", name: "Bihar", type: "state", capital: "Patna", portalUrl: "https://transport.bihar.gov.in" },
  CG: { code: "CG", name: "Chhattisgarh", type: "state", capital: "Raipur", portalUrl: "https://cgtransport.gov.in" },
  CH: { code: "CH", name: "Chandigarh", type: "union_territory", capital: "Chandigarh", portalUrl: "https://chdtransport.gov.in" },
  DD: { code: "DD", name: "Daman and Diu", type: "union_territory", capital: "Daman", portalUrl: "https://daman.nic.in/rtodaman" },
  DL: { code: "DL", name: "Delhi", type: "union_territory", capital: "New Delhi", portalUrl: "https://transport.delhi.gov.in" },
  DN: { code: "DN", name: "Dadra and Nagar Haveli", type: "union_territory", capital: "Silvassa", portalUrl: "https://dnh.gov.in" },
  GA: { code: "GA", name: "Goa", type: "state", capital: "Panaji", portalUrl: "https://goatransport.gov.in" },
  GJ: { code: "GJ", name: "Gujarat", type: "state", capital: "Gandhinagar", portalUrl: "https://cot.gujarat.gov.in" },
  HP: { code: "HP", name: "Himachal Pradesh", type: "state", capital: "Shimla", portalUrl: "https://himachal.nic.in/transport" },
  HR: { code: "HR", name: "Haryana", type: "state", capital: "Chandigarh", portalUrl: "https://haryanatransport.gov.in" },
  JH: { code: "JH", name: "Jharkhand", type: "state", capital: "Ranchi", portalUrl: "https://transport.jharkhand.gov.in" },
  JK: { code: "JK", name: "Jammu and Kashmir", type: "union_territory", capital: "Srinagar / Jammu", portalUrl: "https://jaktrans.nic.in" },
  KA: { code: "KA", name: "Karnataka", type: "state", capital: "Bengaluru", portalUrl: "https://transport.karnataka.gov.in" },
  KL: { code: "KL", name: "Kerala", type: "state", capital: "Thiruvananthapuram", portalUrl: "https://mvd.kerala.gov.in" },
  LA: { code: "LA", name: "Ladakh", type: "union_territory", capital: "Leh", portalUrl: "https://ladakh.nic.in" },
  LD: { code: "LD", name: "Lakshadweep", type: "union_territory", capital: "Kavaratti", portalUrl: "https://lakshadweep.gov.in" },
  MH: { code: "MH", name: "Maharashtra", type: "state", capital: "Mumbai", portalUrl: "https://transport.maharashtra.gov.in" },
  ML: { code: "ML", name: "Meghalaya", type: "state", capital: "Shillong", portalUrl: "https://megtransport.gov.in" },
  MN: { code: "MN", name: "Manipur", type: "state", capital: "Imphal", portalUrl: "https://manipur.gov.in" },
  MP: { code: "MP", name: "Madhya Pradesh", type: "state", capital: "Bhopal", portalUrl: "https://mptransport.org" },
  MZ: { code: "MZ", name: "Mizoram", type: "state", capital: "Aizawl", portalUrl: "https://transport.mizoram.gov.in" },
  NL: { code: "NL", name: "Nagaland", type: "state", capital: "Kohima", portalUrl: "https://transport.nagaland.gov.in" },
  OD: { code: "OD", name: "Odisha", type: "state", capital: "Bhubaneswar", portalUrl: "https://odishatransport.gov.in" },
  PB: { code: "PB", name: "Punjab", type: "state", capital: "Chandigarh", portalUrl: "https://olps.punjabtransport.org" },
  PY: { code: "PY", name: "Puducherry", type: "union_territory", capital: "Puducherry", portalUrl: "https://transport.py.gov.in" },
  RJ: { code: "RJ", name: "Rajasthan", type: "state", capital: "Jaipur", portalUrl: "https://transport.rajasthan.gov.in" },
  SK: { code: "SK", name: "Sikkim", type: "state", capital: "Gangtok", portalUrl: "https://sikkim.gov.in" },
  TN: { code: "TN", name: "Tamil Nadu", type: "state", capital: "Chennai", portalUrl: "https://tnsta.gov.in" },
  TR: { code: "TR", name: "Tripura", type: "state", capital: "Agartala", portalUrl: "https://transport.tripura.gov.in" },
  TS: { code: "TS", name: "Telangana", type: "state", capital: "Hyderabad", portalUrl: "https://transport.telangana.gov.in" },
  UK: { code: "UK", name: "Uttarakhand", type: "state", capital: "Dehradun", portalUrl: "https://transport.uk.gov.in" },
  UP: { code: "UP", name: "Uttar Pradesh", type: "state", capital: "Lucknow", portalUrl: "https://uptransport.upsdc.gov.in" },
  WB: { code: "WB", name: "West Bengal", type: "state", capital: "Kolkata", portalUrl: "https://transport.wb.gov.in" },
};

// Comprehensive Mapping of RTO Codes Across Indian States & Union Territories
export const RTO_DIRECTORY: Record<string, RtoOfficeInfo> = {
  // Delhi (DL)
  DL01: { code: "DL01", stateCode: "DL", stateName: "Delhi", district: "North Delhi", officeName: "Mall Road RTO (Civil Lines)" },
  DL02: { code: "DL02", stateCode: "DL", stateName: "Delhi", district: "New Delhi", officeName: "Tilak Marg RTO (IP Estate)" },
  DL03: { code: "DL03", stateCode: "DL", stateName: "Delhi", district: "South Delhi", officeName: "Sheikh Sarai RTO" },
  DL04: { code: "DL04", stateCode: "DL", stateName: "Delhi", district: "West Delhi", officeName: "Janakpuri RTO" },
  DL05: { code: "DL05", stateCode: "DL", stateName: "Delhi", district: "North East Delhi", officeName: "Loni Road RTO" },
  DL06: { code: "DL06", stateCode: "DL", stateName: "Delhi", district: "Central Delhi", officeName: "Sarai Kale Khan RTO" },
  DL07: { code: "DL07", stateCode: "DL", stateName: "Delhi", district: "East Delhi", officeName: "Mayur Vihar RTO" },
  DL08: { code: "DL08", stateCode: "DL", stateName: "Delhi", district: "North West Delhi", officeName: "Wazirpur RTO" },
  DL09: { code: "DL09", stateCode: "DL", stateName: "Delhi", district: "South West Delhi", officeName: "Palam RTO (Dwarka)" },
  DL10: { code: "DL10", stateCode: "DL", stateName: "Delhi", district: "West Delhi", officeName: "Raja Garden RTO" },
  DL11: { code: "DL11", stateCode: "DL", stateName: "Delhi", district: "North West Delhi", officeName: "Rohini RTO" },
  DL12: { code: "DL12", stateCode: "DL", stateName: "Delhi", district: "South West Delhi", officeName: "Vasant Vihar RTO" },
  DL13: { code: "DL13", stateCode: "DL", stateName: "Delhi", district: "East Delhi", officeName: "Surajmal Vihar RTO" },
  DL14: { code: "DL14", stateCode: "DL", stateName: "Delhi", district: "Shahdara", officeName: "Shahdara Regional Office" },

  // Maharashtra (MH)
  MH01: { code: "MH01", stateCode: "MH", stateName: "Maharashtra", district: "Mumbai City", officeName: "Mumbai Central (Tardeo) RTO" },
  MH02: { code: "MH02", stateCode: "MH", stateName: "Maharashtra", district: "Mumbai Suburban", officeName: "Mumbai West (Andheri) RTO" },
  MH03: { code: "MH03", stateCode: "MH", stateName: "Maharashtra", district: "Mumbai Suburban", officeName: "Mumbai East (Wadala) RTO" },
  MH04: { code: "MH04", stateCode: "MH", stateName: "Maharashtra", district: "Thane", officeName: "Thane RTO" },
  MH05: { code: "MH05", stateCode: "MH", stateName: "Maharashtra", district: "Thane", officeName: "Kalyan RTO" },
  MH06: { code: "MH06", stateCode: "MH", stateName: "Maharashtra", district: "Raigad", officeName: "Pen / Raigad RTO" },
  MH07: { code: "MH07", stateCode: "MH", stateName: "Maharashtra", district: "Sindhudurg", officeName: "Sindhudurg RTO" },
  MH08: { code: "MH08", stateCode: "MH", stateName: "Maharashtra", district: "Ratnagiri", officeName: "Ratnagiri RTO" },
  MH09: { code: "MH09", stateCode: "MH", stateName: "Maharashtra", district: "Kolhapur", officeName: "Kolhapur RTO" },
  MH10: { code: "MH10", stateCode: "MH", stateName: "Maharashtra", district: "Sangli", officeName: "Sangli RTO" },
  MH11: { code: "MH11", stateCode: "MH", stateName: "Maharashtra", district: "Satara", officeName: "Satara RTO" },
  MH12: { code: "MH12", stateCode: "MH", stateName: "Maharashtra", district: "Pune", officeName: "Pune RTO" },
  MH13: { code: "MH13", stateCode: "MH", stateName: "Maharashtra", district: "Solapur", officeName: "Solapur RTO" },
  MH14: { code: "MH14", stateCode: "MH", stateName: "Maharashtra", district: "Pune", officeName: "Pimpri-Chinchwad (PCMC) RTO" },
  MH15: { code: "MH15", stateCode: "MH", stateName: "Maharashtra", district: "Nashik", officeName: "Nashik RTO" },
  MH16: { code: "MH16", stateCode: "MH", stateName: "Maharashtra", district: "Ahmednagar", officeName: "Ahmednagar RTO" },
  MH17: { code: "MH17", stateCode: "MH", stateName: "Maharashtra", district: "Ahmednagar", officeName: "Shrirampur RTO" },
  MH18: { code: "MH18", stateCode: "MH", stateName: "Maharashtra", district: "Dhule", officeName: "Dhule RTO" },
  MH19: { code: "MH19", stateCode: "MH", stateName: "Maharashtra", district: "Jalgaon", officeName: "Jalgaon RTO" },
  MH20: { code: "MH20", stateCode: "MH", stateName: "Maharashtra", district: "Chhatrapati Sambhajinagar", officeName: "Aurangabad / Sambhajinagar RTO" },
  MH31: { code: "MH31", stateCode: "MH", stateName: "Maharashtra", district: "Nagpur", officeName: "Nagpur Urban RTO" },
  MH43: { code: "MH43", stateCode: "MH", stateName: "Maharashtra", district: "Thane", officeName: "Navi Mumbai (Vashi) RTO" },
  MH46: { code: "MH46", stateCode: "MH", stateName: "Maharashtra", district: "Raigad", officeName: "Navi Mumbai (Panvel) RTO" },
  MH47: { code: "MH47", stateCode: "MH", stateName: "Maharashtra", district: "Mumbai Suburban", officeName: "Mumbai North (Borivali) RTO" },
  MH48: { code: "MH48", stateCode: "MH", stateName: "Maharashtra", district: "Palghar", officeName: "Vasai-Virar RTO" },

  // Karnataka (KA)
  KA01: { code: "KA01", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Bengaluru Central (Koramangala) RTO" },
  KA02: { code: "KA02", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Bengaluru West (Rajajinagar) RTO" },
  KA03: { code: "KA03", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Bengaluru East (Indiranagar / Kasturinagar) RTO" },
  KA04: { code: "KA04", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Bengaluru North (Yeshwanthpur) RTO" },
  KA05: { code: "KA05", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Bengaluru South (Jayanagar) RTO" },
  KA09: { code: "KA09", stateCode: "KA", stateName: "Karnataka", district: "Mysuru", officeName: "Mysuru West RTO" },
  KA14: { code: "KA14", stateCode: "KA", stateName: "Karnataka", district: "Shivamogga", officeName: "Shivamogga RTO" },
  KA19: { code: "KA19", stateCode: "KA", stateName: "Karnataka", district: "Dakshina Kannada", officeName: "Mangaluru RTO" },
  KA20: { code: "KA20", stateCode: "KA", stateName: "Karnataka", district: "Udupi", officeName: "Udupi RTO" },
  KA22: { code: "KA22", stateCode: "KA", stateName: "Karnataka", district: "Belagavi", officeName: "Belagavi RTO" },
  KA25: { code: "KA25", stateCode: "KA", stateName: "Karnataka", district: "Dharwad", officeName: "Hubballi-Dharwad RTO" },
  KA41: { code: "KA41", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Jnana Bharathi (Kengeri) RTO" },
  KA50: { code: "KA50", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Yelahanka RTO" },
  KA51: { code: "KA51", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "Electronic City RTO" },
  KA53: { code: "KA53", stateCode: "KA", stateName: "Karnataka", district: "Bengaluru Urban", officeName: "K.R. Puram RTO" },

  // Tamil Nadu (TN)
  TN01: { code: "TN01", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai Central (Ayanavaram) RTO" },
  TN02: { code: "TN02", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai North (Anna Nagar) RTO" },
  TN03: { code: "TN03", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai North East (Tondiarpet) RTO" },
  TN04: { code: "TN04", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai East (Pulianthope) RTO" },
  TN05: { code: "TN05", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai North (Kolathur) RTO" },
  TN06: { code: "TN06", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai South East (Mandavelli) RTO" },
  TN07: { code: "TN07", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai South (Thiruvanmiyur) RTO" },
  TN09: { code: "TN09", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai West (K.K. Nagar) RTO" },
  TN10: { code: "TN10", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai", officeName: "Chennai South West (Virugambakkam) RTO" },
  TN22: { code: "TN22", stateCode: "TN", stateName: "Tamil Nadu", district: "Chennai / Chengalpattu", officeName: "Meenambakkam RTO" },
  TN37: { code: "TN37", stateCode: "TN", stateName: "Tamil Nadu", district: "Coimbatore", officeName: "Coimbatore South RTO" },
  TN38: { code: "TN38", stateCode: "TN", stateName: "Tamil Nadu", district: "Coimbatore", officeName: "Coimbatore North RTO" },
  TN59: { code: "TN59", stateCode: "TN", stateName: "Tamil Nadu", district: "Madurai", officeName: "Madurai North RTO" },

  // Uttar Pradesh (UP)
  UP14: { code: "UP14", stateCode: "UP", stateName: "Uttar Pradesh", district: "Ghaziabad", officeName: "Ghaziabad RTO" },
  UP15: { code: "UP15", stateCode: "UP", stateName: "Uttar Pradesh", district: "Meerut", officeName: "Meerut RTO" },
  UP16: { code: "UP16", stateCode: "UP", stateName: "Uttar Pradesh", district: "Gautam Buddha Nagar", officeName: "Noida / Greater Noida RTO" },
  UP32: { code: "UP32", stateCode: "UP", stateName: "Uttar Pradesh", district: "Lucknow", officeName: "Lucknow Transport Nagar RTO" },
  UP70: { code: "UP70", stateCode: "UP", stateName: "Uttar Pradesh", district: "Prayagraj", officeName: "Prayagraj (Allahabad) RTO" },
  UP78: { code: "UP78", stateCode: "UP", stateName: "Uttar Pradesh", district: "Kanpur Nagar", officeName: "Kanpur RTO" },
  UP80: { code: "UP80", stateCode: "UP", stateName: "Uttar Pradesh", district: "Agra", officeName: "Agra RTO" },
  UP85: { code: "UP85", stateCode: "UP", stateName: "Uttar Pradesh", district: "Mathura", officeName: "Mathura RTO" },

  // Haryana (HR)
  HR01: { code: "HR01", stateCode: "HR", stateName: "Haryana", district: "Ambala", officeName: "Ambala RTO" },
  HR26: { code: "HR26", stateCode: "HR", stateName: "Haryana", district: "Gurugram", officeName: "Gurugram North RTO" },
  HR29: { code: "HR29", stateCode: "HR", stateName: "Haryana", district: "Faridabad", officeName: "Ballabgarh RTO" },
  HR51: { code: "HR51", stateCode: "HR", stateName: "Haryana", district: "Faridabad", officeName: "Faridabad RTO" },
  HR72: { code: "HR72", stateCode: "HR", stateName: "Haryana", district: "Gurugram", officeName: "Gurugram South RTO" },

  // Gujarat (GJ)
  GJ01: { code: "GJ01", stateCode: "GJ", stateName: "Gujarat", district: "Ahmedabad", officeName: "Ahmedabad West (Subhash Bridge) RTO" },
  GJ02: { code: "GJ02", stateCode: "GJ", stateName: "Gujarat", district: "Mehsana", officeName: "Mehsana RTO" },
  GJ03: { code: "GJ03", stateCode: "GJ", stateName: "Gujarat", district: "Rajkot", officeName: "Rajkot RTO" },
  GJ05: { code: "GJ05", stateCode: "GJ", stateName: "Gujarat", district: "Surat", officeName: "Surat RTO" },
  GJ06: { code: "GJ06", stateCode: "GJ", stateName: "Gujarat", district: "Vadodara", officeName: "Vadodara RTO" },
  GJ27: { code: "GJ27", stateCode: "GJ", stateName: "Gujarat", district: "Ahmedabad", officeName: "Ahmedabad East (Vastral) RTO" },

  // Himachal Pradesh (HP)
  HP01: { code: "HP01", stateCode: "HP", stateName: "Himachal Pradesh", district: "Shimla", officeName: "Shimla Tourist RTO" },
  HP03: { code: "HP03", stateCode: "HP", stateName: "Himachal Pradesh", district: "Shimla", officeName: "Shimla Urban RTO" },
  HP04: { code: "HP04", stateCode: "HP", stateName: "Himachal Pradesh", district: "Kangra", officeName: "Dharamshala RTO" },
  HP05: { code: "HP05", stateCode: "HP", stateName: "Himachal Pradesh", district: "Mandi", officeName: "Mandi RTO" },
  HP10: { code: "HP10", stateCode: "HP", stateName: "Himachal Pradesh", district: "Shimla", officeName: "Rohru RTO" },
  HP12: { code: "HP12", stateCode: "HP", stateName: "Himachal Pradesh", district: "Solan", officeName: "Nalagarh RTO" },
  HP14: { code: "HP14", stateCode: "HP", stateName: "Himachal Pradesh", district: "Solan", officeName: "Solan RTO" },
  HP20: { code: "HP20", stateCode: "HP", stateName: "Himachal Pradesh", district: "Una", officeName: "Una RTO" },
  HP22: { code: "HP22", stateCode: "HP", stateName: "Himachal Pradesh", district: "Hamirpur", officeName: "Hamirpur RTO" },
  HP34: { code: "HP34", stateCode: "HP", stateName: "Himachal Pradesh", district: "Kullu", officeName: "Kullu RTO" },
  HP74: { code: "HP74", stateCode: "HP", stateName: "Himachal Pradesh", district: "Hamirpur", officeName: "Bhoranj Sub-Divisional RTO (Hamirpur)" },

  // West Bengal (WB)
  WB01: { code: "WB01", stateCode: "WB", stateName: "West Bengal", district: "Kolkata", officeName: "Kolkata (Beltala) RTO" },
  WB02: { code: "WB02", stateCode: "WB", stateName: "West Bengal", district: "Kolkata", officeName: "Kolkata (Kasba) RTO" },
  WB03: { code: "WB03", stateCode: "WB", stateName: "West Bengal", district: "Kolkata", officeName: "Kolkata (Salt Lake) RTO" },
  WB19: { code: "WB19", stateCode: "WB", stateName: "West Bengal", district: "South 24 Parganas", officeName: "Alipore RTO" },

  // Telangana (TS) & Andhra Pradesh (AP)
  TS07: { code: "TS07", stateCode: "TS", stateName: "Telangana", district: "Rangareddy", officeName: "Attapur RTO" },
  TS08: { code: "TS08", stateCode: "TS", stateName: "Telangana", district: "Medchal-Malkajgiri", officeName: "Uppal RTO" },
  TS09: { code: "TS09", stateCode: "TS", stateName: "Telangana", district: "Hyderabad", officeName: "Hyderabad Central (Khairatabad) RTO" },
  TS10: { code: "TS10", stateCode: "TS", stateName: "Telangana", district: "Hyderabad", officeName: "Secunderabad RTO" },
  AP39: { code: "AP39", stateCode: "AP", stateName: "Andhra Pradesh", district: "Visakhapatnam", officeName: "Visakhapatnam Urban RTO" },

  // Kerala (KL)
  KL01: { code: "KL01", stateCode: "KL", stateName: "Kerala", district: "Thiruvananthapuram", officeName: "Thiruvananthapuram RTO" },
  KL07: { code: "KL07", stateCode: "KL", stateName: "Kerala", district: "Ernakulam", officeName: "Ernakulam (Kochi) RTO" },
  KL11: { code: "KL11", stateCode: "KL", stateName: "Kerala", district: "Kozhikode", officeName: "Kozhikode RTO" },

  // Rajasthan (RJ)
  RJ14: { code: "RJ14", stateCode: "RJ", stateName: "Rajasthan", district: "Jaipur", officeName: "Jaipur South RTO" },
  RJ45: { code: "RJ45", stateCode: "RJ", stateName: "Rajasthan", district: "Jaipur", officeName: "Jaipur North RTO" },

  // Bihar (BR)
  BR01: { code: "BR01", stateCode: "BR", stateName: "Bihar", district: "Patna", officeName: "Patna RTO" },
  BR02: { code: "BR02", stateCode: "BR", stateName: "Bihar", district: "Gaya", officeName: "Gaya DTO" },

  // Punjab (PB)
  PB02: { code: "PB02", stateCode: "PB", stateName: "Punjab", district: "Amritsar", officeName: "Amritsar RTO" },
  PB10: { code: "PB10", stateCode: "PB", stateName: "Punjab", district: "Ludhiana", officeName: "Ludhiana RTO" },
};

/**
 * Resolves state and RTO office details from a 2-letter state code and numeric RTO code.
 */
export function resolveRto(stateCode: string, rtoNum?: string | number): {
  state: StateInfo | null;
  rto: RtoOfficeInfo | null;
  rtoCode: string;
} {
  const normState = stateCode.toUpperCase().trim();
  const state = INDIAN_STATES_AND_UTS[normState] ?? null;

  if (rtoNum === undefined || rtoNum === null || rtoNum === "") {
    return { state, rto: null, rtoCode: normState };
  }

  const paddedNum = String(rtoNum).padStart(2, "0");
  const fullRtoCode = `${normState}${paddedNum}`;
  const rto = RTO_DIRECTORY[fullRtoCode] ?? {
    code: fullRtoCode,
    stateCode: normState,
    stateName: state?.name ?? normState,
    district: `${state?.name ?? normState} District RTO ${paddedNum}`,
    officeName: `${state?.name ?? normState} Transport Office ${fullRtoCode}`,
  };

  return { state, rto, rtoCode: fullRtoCode };
}

/**
 * Resolves Bharat Series metadata from registration year.
 */
export function resolveBharatSeries(yearPrefix: number): {
  series: "BH";
  nationalScope: true;
  registrationYear: number;
  description: string;
} {
  const fullYear = yearPrefix < 100 ? 2000 + yearPrefix : yearPrefix;
  return {
    series: "BH",
    nationalScope: true,
    registrationYear: fullYear,
    description: `Bharat Series (BH) National Registration initialized under MoRTH Notification G.S.R. 594(E) (${fullYear}). Inter-state transfer without re-registration.`,
  };
}
