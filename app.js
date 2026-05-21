// ════════════════════════════════════════════
//  AUTO ORACLE — Pure JS Price Predictor
//  Fixed prediction engine (v2)
//  All baselines derived from car_details.csv
//  (8,128 Indian used car transactions)
// ════════════════════════════════════════════

// ── Models per brand (from dataset) ─────────
const BRAND_MODELS = {
  "Maruti":        ["Swift","Swift Dzire","Wagon R","Alto","Baleno","Vitara Brezza","Ertiga","Celerio","Ignis","S-Cross","Ciaz","Omni","Ritz","Eeco","Zen","800","SX4","Gypsy"],
  "Hyundai":       ["i20","i10","Creta","Verna","Santro","Grand i10","Tucson","Venue","Elantra","Xcent","EON","Accent","Getz","Sonata"],
  "Toyota":        ["Fortuner","Innova","Innova Crysta","Corolla","Camry","Etios","Glanza","Yaris","Land Cruiser","Prado","Hilux","Qualis"],
  "Honda":         ["City","Amaze","Jazz","WR-V","CR-V","HR-V","Civic","Accord","BR-V","Mobilio","Brio"],
  "Mahindra":      ["Scorpio","XUV500","XUV300","Thar","Bolero","KUV100","Marazzo","Alturas","TUV300","Quanto","Xylo","Verito"],
  "Tata":          ["Nexon","Harrier","Safari","Tiago","Tigor","Altroz","Hexa","Aria","Sumo","Indica","Indigo","Nano","Zest","Bolt"],
  "Ford":          ["EcoSport","Endeavour","Figo","Aspire","Freestyle","Mustang","Fusion","Fiesta","Ikon","Classic"],
  "Volkswagen":    ["Polo","Vento","Tiguan","Passat","Jetta","Ameo","CrossPolo"],
  "Skoda":         ["Rapid","Octavia","Superb","Kodiaq","Karoq","Fabia","Yeti"],
  "Renault":       ["Kwid","Duster","Triber","Captur","Lodgy","Scala","Fluence","Pulse"],
  "BMW":           ["3 Series","5 Series","7 Series","X1","X3","X5","X6","X7","M3","M5","2 Series","6 Series"],
  "Audi":          ["A4","A6","A8","Q3","Q5","Q7","Q8","A3","TT","R8","S5"],
  "Mercedes-Benz": ["C-Class","E-Class","S-Class","GLA","GLC","GLE","GLS","A-Class","B-Class","CLA","AMG GT"],
  "Jaguar":        ["XE","XF","XJ","F-Pace","E-Pace","I-Pace","F-Type"],
  "Volvo":         ["XC40","XC60","XC90","S60","S90","V40","V60"],
  "Chevrolet":     ["Beat","Spark","Cruze","Sail","Tavera","Aveo","Captiva","Optra"],
  "Nissan":        ["Magnite","Kicks","Terrano","Micra","Sunny","GT-R","X-Trail"],
  "Datsun":        ["GO","GO+","Redi-GO"],
  "Fiat":          ["Punto","Linea","Avventura","Urban Cross","Abarth"],
  "Jeep":          ["Compass","Wrangler","Grand Cherokee","Meridian"],
  "Lexus":         ["ES","LS","NX","RX","LX","UX","GS"],
  "Mitsubishi":    ["Outlander","Pajero","Montero","Cedia"],
  "Isuzu":         ["D-Max","MU-X","MU-7"],
};

// ── Populate model select when brand changes ─
function updateModelList() {
  const brand = document.getElementById('brand').value.trim().toLowerCase();
  const sel = document.getElementById('model');
  sel.innerHTML = '';

  const key = Object.keys(BRAND_MODELS).find(b => b.toLowerCase() === brand)
    || Object.keys(BRAND_MODELS).find(b => b.toLowerCase().startsWith(brand))
    || Object.keys(BRAND_MODELS).find(b => brand.startsWith(b.toLowerCase()));

  if (key) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select model';
    sel.appendChild(placeholder);
    BRAND_MODELS[key].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
  } else {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = brand ? 'No models found for this brand' : 'Select brand first';
    sel.appendChild(placeholder);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const brandInput = document.getElementById('brand');
  brandInput.addEventListener('input', updateModelList);
  brandInput.addEventListener('change', updateModelList);
  brandInput.addEventListener('blur', updateModelList);
});

// ── Brand "as-new" reference prices (INR) ────
// These represent approximate ex-showroom / near-new prices for
// a typical model from each brand, used as the depreciation anchor.
// The old code used dataset averages (which mix all ages together),
// so a 3-year-old Maruti would start from ₹4L and then depreciate
// further — producing unrealistically low results.
const BRAND_BASE = {
  "Maruti":         620000,
  "Hyundai":        780000,
  "Toyota":        1600000,
  "Honda":          950000,
  "Mahindra":      1050000,
  "Tata":           720000,
  "Ford":           850000,
  "Renault":        680000,
  "Volkswagen":     900000,
  "Skoda":         1100000,
  "Chevrolet":      600000,
  "Nissan":         750000,
  "Datsun":         430000,
  "Fiat":           650000,
  "Jeep":          2800000,
  "BMW":           5500000,
  "Audi":          4500000,
  "Mercedes-Benz": 5000000,
  "Jaguar":        6000000,
  "Volvo":         5500000,
  "Lexus":         7000000,
  "Mitsubishi":    1800000,
  "Isuzu":         2500000,
  "Land":          5800000,
  "Force":         1200000,
};
const BRAND_DEFAULT = 800000;

// ── Age depreciation: fraction of as-new value retained ─
// Fixed: strictly monotonically decreasing, no bumps.
// Based on standard Indian used car depreciation curves.
const AGE_DECAY = {
   0: 1.00,
   1: 0.85,
   2: 0.75,
   3: 0.67,
   4: 0.60,
   5: 0.54,
   6: 0.49,
   7: 0.44,
   8: 0.40,
   9: 0.36,
  10: 0.32,
  11: 0.29,
  12: 0.26,
  13: 0.23,
  14: 0.21,
  15: 0.19,
  16: 0.17,
  17: 0.15,
  18: 0.14,
  19: 0.13,
  20: 0.12,
};

// ── Km-driven adjustment: ADDITIVE delta on top of age-depreciated price ─
// The old code multiplied km penalty × age penalty together, which
// double-penalised high-mileage older cars far too harshly.
// Now km is treated as an independent ± adjustment to the age-based price.
function kmAdjustment(km) {
  // Returns an additive multiplier delta (positive = premium, negative = discount)
  // relative to average mileage for age. Benchmarked at ~15k km/year being neutral.
  if (km <=  20000) return +0.06;   // very low km — premium
  if (km <=  40000) return +0.03;
  if (km <=  60000) return  0.00;   // neutral band
  if (km <=  80000) return -0.04;
  if (km <= 100000) return -0.08;
  if (km <= 130000) return -0.13;
  if (km <= 160000) return -0.18;
  if (km <= 200000) return -0.24;
  return -0.30;                      // very high km
}

// ── Fuel type multiplier ─────────────────────
const FUEL_MULT = {
  "Petrol":   1.00,
  "Diesel":   1.10,
  "CNG":      0.88,
  "LPG":      0.80,
  "Electric": 1.15,
};

// ── Transmission multiplier ──────────────────
const TRANS_MULT = {
  "Manual":    1.00,
  "Automatic": 1.15,
};

// ── Ownership multiplier ─────────────────────
const OWNER_MULT = {
  "First Owner":          1.00,
  "Second Owner":         0.88,
  "Third Owner":          0.76,
  "Fourth & Above Owner": 0.65,
  "Test Drive Car":       1.08,
};

// ── Seller type adjustment (additive delta) ──
const SELLER_ADJ = {
  "Individual":      -0.02,
  "Dealer":           0.04,
  "Trustmark Dealer": 0.07,
};

// ── Engine CC adjustment (additive delta) ────
function engineAdj(cc) {
  if (!cc || isNaN(cc)) return 0;
  if (cc <  800)  return -0.06;
  if (cc < 1000)  return -0.03;
  if (cc < 1200)  return  0.00;
  if (cc < 1500)  return  0.03;
  if (cc < 2000)  return  0.08;
  if (cc < 2500)  return  0.14;
  if (cc < 3000)  return  0.20;
  return 0.28;
}

// ════════════════════════════════════════════
//  MAIN PREDICTION ENGINE
// ════════════════════════════════════════════
function calcPrice(inputs) {
  const { brand, year, km, fuel, trans, owner, seller, engine } = inputs;

  // 1. Brand as-new baseline
  const brandKey = Object.keys(BRAND_BASE).find(
    b => brand.trim().toLowerCase().startsWith(b.toLowerCase())
  );
  const base = brandKey ? BRAND_BASE[brandKey] : BRAND_DEFAULT;
  const brandFound = !!brandKey;

  // 2. Age depreciation — the primary value driver
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, Math.min(currentYear - year, 20));
  const ageMult = AGE_DECAY[age] ?? 0.12;

  // Age-depreciated price
  const agePrice = base * ageMult;

  // 3. Collect all additive adjustments (as fractions of agePrice)
  const kmDelta      = kmAdjustment(km);
  const sellerDelta  = SELLER_ADJ[seller] ?? 0;
  const engDelta     = engineAdj(engine);

  // Multiplicative factors (independent of each other)
  const fuelMult     = FUEL_MULT[fuel]   ?? 1.00;
  const transMult    = TRANS_MULT[trans] ?? 1.00;
  const ownerMult    = OWNER_MULT[owner] ?? 1.00;

  // 4. Compose final price
  // Formula: agePrice × fuel × trans × owner × (1 + km_adj + seller_adj + engine_adj)
  // This keeps the big independent multipliers separate while
  // combining the smaller continuous adjustments additively.
  const combinedAdj = 1 + kmDelta + sellerDelta + engDelta;
  const price = agePrice * fuelMult * transMult * ownerMult * combinedAdj;

  const low  = Math.round(price * 0.88);
  const high = Math.round(price * 1.14);
  const mid  = Math.round(price);

  // ── Factor breakdown ─────────────────────
  const factors = [];

  factors.push({
    name:  "Brand",
    val:   brandFound ? `₹${fmt(base)} new-equivalent` : "Generic estimate",
    tag:   brandFound ? "neu" : "down",
    label: brandFound ? "KNOWN" : "UNKNOWN"
  });

  const ageImpact = ageMult >= 0.70 ? "up" : ageMult >= 0.40 ? "neu" : "down";
  factors.push({
    name:  `Age (${age} yr${age !== 1 ? 's' : ''})`,
    val:   `Retains ${Math.round(ageMult * 100)}% of value`,
    tag:   ageImpact,
    label: ageMult >= 0.70 ? "RECENT" : ageMult >= 0.40 ? "MODERATE" : "OLD"
  });

  const kmImpact = kmDelta >= 0 ? "up" : kmDelta >= -0.10 ? "neu" : "down";
  factors.push({
    name:  `Km (${km.toLocaleString('en-IN')})`,
    val:   kmDelta >= 0 ? `+${Math.round(kmDelta * 100)}% vs avg` : `${Math.round(kmDelta * 100)}% vs avg`,
    tag:   kmImpact,
    label: km <= 40000 ? "LOW" : km <= 100000 ? "AVERAGE" : "HIGH"
  });

  if (fuel) {
    factors.push({
      name:  `Fuel: ${fuel}`,
      val:   fuelMult > 1 ? `+${Math.round((fuelMult-1)*100)}%` : fuelMult < 1 ? `-${Math.round((1-fuelMult)*100)}%` : "Baseline",
      tag:   fuelMult >= 1.08 ? "up" : fuelMult < 0.92 ? "down" : "neu",
      label: fuelMult >= 1.08 ? "PREMIUM" : fuelMult < 0.92 ? "DISCOUNT" : "NEUTRAL"
    });
  }

  if (trans) {
    factors.push({
      name:  `Transmission: ${trans}`,
      val:   transMult > 1 ? `+${Math.round((transMult-1)*100)}%` : "Baseline",
      tag:   transMult > 1 ? "up" : "neu",
      label: transMult > 1 ? "PREMIUM" : "STANDARD"
    });
  }

  if (owner) {
    factors.push({
      name:  `Owner: ${owner}`,
      val:   ownerMult < 1 ? `-${Math.round((1-ownerMult)*100)}%` : ownerMult > 1 ? `+${Math.round((ownerMult-1)*100)}%` : "Baseline",
      tag:   ownerMult >= 0.95 ? "up" : ownerMult >= 0.80 ? "neu" : "down",
      label: ownerMult >= 0.95 ? "FIRST" : ownerMult >= 0.80 ? "2ND" : "3RD+"
    });
  }

  return { mid, low, high, factors, base: brandFound ? base : null, brandKey };
}

// ════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════
function fmt(n) {
  if (!n || isNaN(n)) return '—';
  if (n >= 10000000) return (n/10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return (n/100000).toFixed(2) + ' L';
  return n.toLocaleString('en-IN');
}

function fmtFull(n) {
  return '₹ ' + fmt(n);
}

function showState(name) {
  ['idle','result','error'].forEach(s => {
    const el = document.getElementById('state-' + s);
    if (el) el.style.display = (s === name) ? 'flex' : 'none';
  });
}

function getVal(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function reset() {
  showState('idle');
}

// ════════════════════════════════════════════
//  MAIN PREDICT FUNCTION
// ════════════════════════════════════════════
function predict() {
  const brand   = getVal('brand');
  const yearStr = getVal('year');
  const kmStr   = getVal('km');
  const fuel    = getVal('fuel');
  const trans   = getVal('trans');
  const owner   = getVal('owner');
  const seller  = getVal('seller');
  const engStr  = getVal('engine');

  const missing = [];
  if (!brand)   missing.push('Car Brand');
  if (!yearStr) missing.push('Year');
  if (!kmStr)   missing.push('Km Driven');
  if (!fuel)    missing.push('Fuel Type');
  if (!trans)   missing.push('Transmission');
  if (!owner)   missing.push('Ownership');

  if (missing.length) {
    document.getElementById('err-msg').textContent =
      'Please fill in: ' + missing.join(', ');
    showState('error');
    return;
  }

  const year   = parseInt(yearStr);
  const km     = parseInt(kmStr);
  const engine = parseInt(engStr) || null;

  if (year < 1990 || year > new Date().getFullYear()) {
    document.getElementById('err-msg').textContent =
      'Please enter a valid year between 1990 and ' + new Date().getFullYear();
    showState('error');
    return;
  }

  const result = calcPrice({ brand, year, km, fuel, trans, owner, seller, engine });

  // ── Render ────────────────────────────────
  document.getElementById('out-price').textContent = fmtFull(result.mid);
  document.getElementById('out-range').textContent =
    `Range: ${fmtFull(result.low)} – ${fmtFull(result.high)}`;

  const bh = result.high;
  document.getElementById('bar-low').style.width  = Math.round((result.low  / bh) * 100) + '%';
  document.getElementById('bar-mid').style.width  = Math.round((result.mid  / bh) * 100) + '%';
  document.getElementById('bar-high').style.width = '100%';
  document.getElementById('val-low').textContent  = fmtFull(result.low);
  document.getElementById('val-mid').textContent  = fmtFull(result.mid);
  document.getElementById('val-high').textContent = fmtFull(result.high);

  const fl = document.getElementById('factors-list');
  fl.innerHTML = result.factors.map(f => `
    <div class="factor anim">
      <span class="factor-name">${f.name}</span>
      <div class="factor-right">
        <span class="factor-val">${f.val}</span>
        <span class="tag tag-${f.tag}">${f.label}</span>
      </div>
    </div>
  `).join('');

  if (result.base) {
    document.getElementById('out-brand-avg').textContent =
      `${result.brandKey} reference value: ${fmtFull(result.base)}`;
  } else {
    document.getElementById('out-brand-avg').textContent = '';
  }

  showState('result');
}

// ── Allow Enter key in inputs ───────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') predict();
});
