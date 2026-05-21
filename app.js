// ════════════════════════════════════════════
//  CARVALUE — Pure JS Price Predictor
//  Adjusted for 2026 Indian Market Norms
// ════════════════════════════════════════════

// ── Brand baseline prices (INR) ─────────────
// Updated for post-2024 general inflation baselines
const BRAND_BASE = {
  "Maruti":        425000,
  "Hyundai":       480000,
  "Toyota":        1050000, // Very strong resale
  "Honda":         610000,
  "Mahindra":      680000,  // SUV demand surge
  "Tata":          420000,  // Improved brand perception
  "Ford":          450000,  // Depreciated slightly due to exit, but enthusiasts hold up price
  "Renault":       450000,
  "Volkswagen":    520000,
  "Skoda":         610000,
  "Chevrolet":     220000,  // Heavy penalty for exit
  "Nissan":        465000,
  "Datsun":        280000,
  "Fiat":          250000,
  "Jeep":         2050000,
  "BMW":          4100000,
  "Audi":         2600000,
  "Mercedes-Benz":2600000,
  "Jaguar":       2900000,
  "Volvo":        3200000,
  "Lexus":        5200000,
  "Mitsubishi":    750000,
  "Isuzu":        1900000,
  "Land":         3800000,
  "Force":         880000,
};
const BRAND_DEFAULT = 500000;

// ── Age depreciation multipliers ────────────
// Smoothed curve for Indian market. Steeper drop for 10-15 years.
const AGE_DECAY = {
   0: 1.00,  1: 0.88,  2: 0.79,  3: 0.72,
   4: 0.65,  5: 0.59,  6: 0.54,  7: 0.49,
   8: 0.44,  9: 0.39, 10: 0.34, 11: 0.28,
  12: 0.23, 13: 0.18, 14: 0.14, 15: 0.10,
  16: 0.08, 17: 0.06, 18: 0.05, 19: 0.04,
  20: 0.03,
};

// ── Km driven penalty (multiplier) ──────────
function kmMultiplier(km) {
  if (km <=  10000) return 0.96;
  if (km <=  20000) return 0.91;
  if (km <=  30000) return 0.87;
  if (km <=  40000) return 0.83;
  if (km <=  50000) return 0.79;
  if (km <=  60000) return 0.75;
  if (km <=  70000) return 0.71;
  if (km <=  80000) return 0.66;
  if (km <=  90000) return 0.62;
  if (km <= 100000) return 0.57;
  if (km <= 120000) return 0.50;
  if (km <= 150000) return 0.44;
  if (km <= 180000) return 0.37;
  return 0.30;
}

// ── Fuel type multiplier (vs Petrol baseline) ─
const FUEL_MULT = {
  "Petrol":   1.00,
  "Diesel":   1.06,   // Reduced diesel premium due to strict 10-year regulations
  "CNG":      1.04,   // Consistent high demand for running costs
  "LPG":      0.70,   // Almost entirely obsolete
  "Electric": 0.82,   // Slower secondary market, battery health concerns
};

// ── Transmission multiplier ──────────────────
const TRANS_MULT = {
  "Manual":    1.00,
  "Automatic": 1.14,  // 14% premium, growing preference for automatics in cities
};

// ── Ownership factor ─────────────────────────
const OWNER_MULT = {
  "First Owner":           1.00,
  "Second Owner":          0.83,
  "Third Owner":           0.68,
  "Fourth & Above Owner":  0.50,
  "Test Drive Car":        1.05, // Slight premium over standard used, usually lower KMs
};

// ── Seller type adjustment ───────────────────
const SELLER_ADJ = {
  "Individual":        0.00,  // Baseline
  "Dealer":            0.08,  // standard dealer markup
  "Trustmark Dealer":  0.15,  // organized retail premium (warranties/certifications)
};

// ── Engine CC adjustment ─────────────────────
function engineAdj(cc) {
  if (!cc || isNaN(cc)) return 0;
  if (cc < 800)  return -0.10;
  if (cc <= 1000) return -0.05;
  if (cc <= 1200) return  0.00;
  if (cc <= 1500) return  0.05;
  if (cc <= 2000) return  0.10;
  if (cc <= 2500) return  0.18;
  if (cc <= 3000) return  0.25;
  return 0.32;
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
  const currentYear = new Date().getFullYear(); // Evaluates to 2026 based on context
  const age = Math.max(0, Math.min(currentYear - year, 20));
  const ageMult = AGE_DECAY[age] ?? 0.03;

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

  // Create range
  const low  = Math.round(price * 0.86);
  const high = Math.round(price * 1.16);
  const mid  = Math.round(price);

  // Build factor breakdown
  const factors = [];

  factors.push({
    name: "Brand",
    val: brandFound ? `₹${fmt(base)} base` : "Generic est.",
    tag: brandFound ? "neu" : "down",
    label: brandFound ? "KNOWN" : "UNKNOWN"
  });

  const ageImpact = ageMult >= 0.70 ? "up" : ageMult >= 0.34 ? "neu" : "down";
  factors.push({
    name: `Age (${age} yr${age !== 1 ? 's' : ''})`,
    val: `${Math.round(ageMult * 100)}% of base`,
    tag: ageImpact,
    label: ageMult >= 0.70 ? "RECENT" : ageMult >= 0.34 ? "MODERATE" : "OLD"
  });

  const kmImpact = km <= 40000 ? "up" : km <= 80000 ? "neu" : "down";
  factors.push({
    name: `Km (${km.toLocaleString('en-IN')})`,
    val: `${Math.round(kmMult * 100)}% of base`,
    tag: kmImpact,
    label: km <= 40000 ? "LOW" : km <= 80000 ? "AVERAGE" : "HIGH"
  });

  if (fuel) {
    factors.push({
      name: `Fuel: ${fuel}`,
      val: fuelMult > 1 ? `+${Math.round((fuelMult-1)*100)}%` : fuelMult < 1 ? `-${Math.round((1-fuelMult)*100)}%` : "Baseline",
      tag: fuelMult >= 1.04 ? "up" : fuelMult < 0.96 ? "down" : "neu",
      label: fuelMult >= 1.04 ? "PREMIUM" : fuelMult < 0.96 ? "DISCOUNT" : "NEUTRAL"
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
      tag: ownerMult >= 1.0 ? "up" : ownerMult >= 0.8 ? "neu" : "down",
      label: ownerMult >= 1.0 ? "FIRST" : ownerMult >= 0.8 ? "2ND" : "3RD+"
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
    if (el) el.style.display = (s === name) ? 'block' : 'none';
  });
}

function getVal(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function reset() {
  // Clear inputs and return to form
  document.getElementById('brand').value = '';
  document.getElementById('year').value = '';
  document.getElementById('km').value = '';
  document.getElementById('fuel').value = '';
  document.getElementById('trans').value = '';
  document.getElementById('owner').value = '';
  document.getElementById('seller').value = '';
  document.getElementById('engine').value = '';
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
  const currentYear = new Date().getFullYear();

  if (year < 1990 || year > currentYear) {
    document.getElementById('err-msg').textContent = 'Please enter a valid year between 1990 and ' + currentYear;
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
      `*Baseline calculation anchored to standard ${result.brandKey} models.`;
  } else {
    document.getElementById('out-brand-avg').textContent = '';
  }

  showState('result');
}

// ── Allow Enter key in inputs ───────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    // Only predict if we are on the idle screen
    if (document.getElementById('state-idle').style.display !== 'none') {
      predict();
    }
  }
});
