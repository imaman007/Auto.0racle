// ════════════════════════════════════════════
//  CARVALUE — Pure JS Price Predictor
//  All data derived from car_details.csv
//  (8,128 Indian used car transactions)
// ════════════════════════════════════════════

// ── Brand baseline prices (INR) ─────────────
const BRAND_BASE = {
  "Maruti":        403075,
  "Hyundai":       458554,
  "Toyota":        959946,
  "Honda":         596178,
  "Mahindra":      623224,
  "Tata":          357433,
  "Ford":          516682,
  "Renault":       462618,
  "Volkswagen":    498817,
  "Skoda":         607723,
  "Chevrolet":     273867,
  "Nissan":        465407,
  "Datsun":        314599,
  "Fiat":          296063,
  "Jeep":         2149612,
  "BMW":          4109916,
  "Audi":         2612199,
  "Mercedes-Benz":2470444,
  "Jaguar":       2915464,
  "Volvo":        3272014,
  "Lexus":        5150000,
  "Mitsubishi":    817500,
  "Isuzu":        1942000,
  "Land":         3608333,
  "Force":         887500,
};
const BRAND_DEFAULT = 500000;

// ── Age depreciation multipliers ────────────
// Index = age in years (0=new, derived from dataset)
const AGE_DECAY = {
   0: 1.00,  1: 0.90,  2: 0.79,  3: 0.74,
   4: 0.66,  5: 0.68,  6: 0.72,  7: 0.66,
   8: 0.52,  9: 0.45, 10: 0.39, 11: 0.35,
  12: 0.27, 13: 0.25, 14: 0.21, 15: 0.17,
  16: 0.16, 17: 0.14, 18: 0.13, 19: 0.11,
  20: 0.09,
};

// ── Km driven penalty (multiplier) ──────────
function kmMultiplier(km) {
  // Derived from dataset km buckets
  if (km <=  10000) return 0.90;
  if (km <=  20000) return 0.88;
  if (km <=  30000) return 0.85;
  if (km <=  40000) return 0.82;
  if (km <=  50000) return 0.78;
  if (km <=  60000) return 0.74;
  if (km <=  70000) return 0.70;
  if (km <=  80000) return 0.65;
  if (km <=  90000) return 0.61;
  if (km <= 100000) return 0.57;
  if (km <= 120000) return 0.52;
  if (km <= 150000) return 0.47;
  if (km <= 180000) return 0.42;
  return 0.37;
}

// ── Fuel type multiplier (vs Petrol baseline) ─
const FUEL_MULT = {
  "Petrol":   1.00,
  "Diesel":   1.12,   // diesel commands premium in India
  "CNG":      0.82,
  "LPG":      0.72,
  "Electric": 1.20,
};

// ── Transmission multiplier ──────────────────
const TRANS_MULT = {
  "Manual":    1.00,
  "Automatic": 1.22,  // automatic premium ~22%
};

// ── Ownership factor ─────────────────────────
const OWNER_MULT = {
  "First Owner":           1.00,
  "Second Owner":          0.80,
  "Third Owner":           0.65,
  "Fourth & Above Owner":  0.52,
  "Test Drive Car":        1.15,
};

// ── Seller type adjustment ───────────────────
const SELLER_ADJ = {
  "Individual":       -0.03,  // slight discount
  "Dealer":            0.05,  // dealer premium
  "Trustmark Dealer":  0.08,  // highest trust premium
};

// ── Engine CC adjustment ─────────────────────
function engineAdj(cc) {
  if (!cc || isNaN(cc)) return 0;
  if (cc < 800)  return -0.08;
  if (cc < 1000) return -0.04;
  if (cc < 1200) return  0.00;
  if (cc < 1500) return  0.04;
  if (cc < 2000) return  0.10;
  if (cc < 2500) return  0.18;
  if (cc < 3000) return  0.26;
  return 0.35;
}

// ════════════════════════════════════════════
//  MAIN PREDICTION ENGINE
// ════════════════════════════════════════════
function calcPrice(inputs) {
  const { brand, year, km, fuel, trans, owner, seller, engine } = inputs;

  // 1. Brand baseline
  const brandKey = Object.keys(BRAND_BASE).find(
    b => brand.trim().toLowerCase().startsWith(b.toLowerCase())
  );
  const base = brandKey ? BRAND_BASE[brandKey] : BRAND_DEFAULT;
  const brandFound = !!brandKey;

  // 2. Age factor
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, Math.min(currentYear - year, 20));
  const ageMult = AGE_DECAY[age] ?? 0.08;

  // 3. KM factor
  const kmMult = kmMultiplier(km);

  // 4. Fuel
  const fuelMult = FUEL_MULT[fuel] ?? 1.00;

  // 5. Transmission
  const transMult = TRANS_MULT[trans] ?? 1.00;

  // 6. Owner
  const ownerMult = OWNER_MULT[owner] ?? 1.00;

  // 7. Seller
  const sellerAdj = SELLER_ADJ[seller] ?? 0;

  // 8. Engine
  const engAdj = engineAdj(engine);

  // Compose price
  const price = base
    * ageMult
    * kmMult
    * fuelMult
    * transMult
    * ownerMult
    * (1 + sellerAdj)
    * (1 + engAdj);

  const low  = Math.round(price * 0.82);
  const high = Math.round(price * 1.22);
  const mid  = Math.round(price);

  // Build factor breakdown
  const factors = [];

  factors.push({
    name: "Brand",
    val: brandFound ? `₹${fmt(base)} avg` : "Generic estimate",
    tag: brandFound ? "neu" : "down",
    label: brandFound ? "KNOWN" : "UNKNOWN"
  });

  const ageImpact = ageMult >= 0.75 ? "up" : ageMult >= 0.45 ? "neu" : "down";
  factors.push({
    name: `Age (${age} yr${age !== 1 ? 's' : ''})`,
    val: `${Math.round(ageMult * 100)}% of base`,
    tag: ageImpact,
    label: ageMult >= 0.75 ? "RECENT" : ageMult >= 0.45 ? "MODERATE" : "OLD"
  });

  const kmImpact = km <= 40000 ? "up" : km <= 100000 ? "neu" : "down";
  factors.push({
    name: `Km (${km.toLocaleString('en-IN')})`,
    val: `${Math.round(kmMult * 100)}% of base`,
    tag: kmImpact,
    label: km <= 40000 ? "LOW" : km <= 100000 ? "AVERAGE" : "HIGH"
  });

  if (fuel) {
    factors.push({
      name: `Fuel: ${fuel}`,
      val: fuelMult > 1 ? `+${Math.round((fuelMult-1)*100)}%` : fuelMult < 1 ? `-${Math.round((1-fuelMult)*100)}%` : "Baseline",
      tag: fuelMult >= 1.1 ? "up" : fuelMult < 0.9 ? "down" : "neu",
      label: fuelMult >= 1.1 ? "PREMIUM" : fuelMult < 0.9 ? "DISCOUNT" : "NEUTRAL"
    });
  }

  if (trans) {
    factors.push({
      name: `Transmission: ${trans}`,
      val: transMult > 1 ? `+${Math.round((transMult-1)*100)}%` : "Baseline",
      tag: transMult > 1 ? "up" : "neu",
      label: transMult > 1 ? "PREMIUM" : "STANDARD"
    });
  }

  if (owner) {
    factors.push({
      name: `Owner: ${owner}`,
      val: ownerMult < 1 ? `-${Math.round((1-ownerMult)*100)}%` : ownerMult > 1 ? `+${Math.round((ownerMult-1)*100)}%` : "Baseline",
      tag: ownerMult >= 0.9 ? "up" : ownerMult >= 0.7 ? "neu" : "down",
      label: ownerMult >= 0.9 ? "FIRST" : ownerMult >= 0.7 ? "2ND" : "3RD+"
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
  const brand = getVal('brand');
  const yearStr = getVal('year');
  const kmStr   = getVal('km');
  const fuel    = getVal('fuel');
  const trans   = getVal('trans');
  const owner   = getVal('owner');
  const seller  = getVal('seller');
  const engStr  = getVal('engine');

  // Validate required fields
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
    document.getElementById('err-msg').textContent = 'Please enter a valid year between 1990 and ' + new Date().getFullYear();
    showState('error');
    return;
  }

  const result = calcPrice({ brand, year, km, fuel, trans, owner, seller, engine });

  // ── Render ────────────────────────────────
  document.getElementById('out-price').textContent = fmtFull(result.mid);
  document.getElementById('out-range').textContent =
    `Range: ${fmtFull(result.low)} – ${fmtFull(result.high)}`;

  // Bars (as % of high)
  const bh = result.high;
  document.getElementById('bar-low').style.width  = Math.round((result.low  / bh) * 100) + '%';
  document.getElementById('bar-mid').style.width  = Math.round((result.mid  / bh) * 100) + '%';
  document.getElementById('bar-high').style.width = '100%';
  document.getElementById('val-low').textContent  = fmtFull(result.low);
  document.getElementById('val-mid').textContent  = fmtFull(result.mid);
  document.getElementById('val-high').textContent = fmtFull(result.high);

  // Factors
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

  // Brand avg
  if (result.base) {
    document.getElementById('out-brand-avg').textContent =
      `${result.brandKey} market avg: ${fmtFull(result.base)}`;
  } else {
    document.getElementById('out-brand-avg').textContent = '';
  }

  showState('result');
}

// ── Allow Enter key in inputs ───────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') predict();
});
