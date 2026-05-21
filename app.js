// ════════════════════════════════════════════
//  AUTO ORACLE — Pure JS Price Predictor
//  Data derived from car_details.csv
//  (8,128 Indian used car transactions)
// ════════════════════════════════════════════

// ── Models per brand ────────────────────────
const BRAND_MODELS = {
  "Maruti":        ["Swift","Swift Dzire","Wagon R","Alto","Baleno","Vitara Brezza","Ertiga","Celerio","Ignis","S-Cross","Ciaz","Omni","Ritz","Eeco","Zen","800","SX4","Gypsy","Alto K10","Alto 800"],
  "Hyundai":       ["i20","i10","Creta","Verna","Santro","Grand i10","Tucson","Venue","Elantra","Xcent","EON","Accent","Getz","Sonata","Elite i20","Active i20"],
  "Toyota":        ["Fortuner","Innova","Innova Crysta","Corolla","Camry","Etios","Glanza","Yaris","Land Cruiser","Prado","Hilux","Qualis","Etios Cross","Etios Liva"],
  "Honda":         ["City","Amaze","Jazz","WR-V","CR-V","HR-V","Civic","Accord","BR-V","Mobilio","Brio"],
  "Mahindra":      ["Scorpio","XUV500","XUV300","Thar","Bolero","KUV100","Marazzo","Alturas G4","TUV300","Quanto","Xylo","Verito","Scorpio S","Bolero Power Plus"],
  "Tata":          ["Nexon","Harrier","Safari","Tiago","Tigor","Altroz","Hexa","Aria","Sumo","Indica","Indigo","Nano","Zest","Bolt","Manza"],
  "Ford":          ["EcoSport","Endeavour","Figo","Aspire","Freestyle","Mustang","Fusion","Fiesta","Ikon","Classic","Figo Aspire"],
  "Volkswagen":    ["Polo","Vento","Tiguan","Passat","Jetta","Ameo","CrossPolo","Polo GT"],
  "Skoda":         ["Rapid","Octavia","Superb","Kodiaq","Karoq","Fabia","Yeti","Rapid Monte Carlo"],
  "Renault":       ["Kwid","Duster","Triber","Captur","Lodgy","Scala","Fluence","Pulse","Kwid RXT"],
  "Chevrolet":     ["Beat","Spark","Cruze","Sail","Tavera","Aveo","Captiva","Optra","Sail Hatchback"],
  "Nissan":        ["Magnite","Kicks","Terrano","Micra","Sunny","GT-R","X-Trail","Micra Active"],
  "Datsun":        ["GO","GO+","Redi-GO","GO T","Redi-GO T"],
  "Fiat":          ["Punto","Linea","Avventura","Urban Cross","Abarth Punto","Grande Punto"],
  "Jeep":          ["Compass","Wrangler","Grand Cherokee","Meridian","Compass Trailhawk"],
  "BMW":           ["3 Series","5 Series","7 Series","X1","X3","X5","X6","X7","M3","M5","2 Series","6 Series","1 Series","4 Series"],
  "Audi":          ["A4","A6","A8","Q3","Q5","Q7","Q8","A3","TT","R8","S5","A4 Allroad"],
  "Mercedes-Benz": ["C-Class","E-Class","S-Class","GLA","GLC","GLE","GLS","A-Class","B-Class","CLA","AMG GT","ML-Class"],
  "Jaguar":        ["XE","XF","XJ","F-Pace","E-Pace","I-Pace","F-Type"],
  "Volvo":         ["XC40","XC60","XC90","S60","S90","V40","V60"],
  "Lexus":         ["ES","LS","NX","RX","LX","UX","GS"],
  "Mitsubishi":    ["Outlander","Pajero","Montero","Cedia","Pajero Sport"],
  "Isuzu":         ["D-Max","MU-X","MU-7","D-Max V-Cross"],
};

// ── Populate model dropdown when brand changes ──
function updateModelList() {
  const brand = document.getElementById('brand').value;
  const modelSel = document.getElementById('model');
  modelSel.innerHTML = '';

  if (!brand || !BRAND_MODELS[brand]) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Select brand first';
    modelSel.appendChild(opt);
    modelSel.disabled = true;
    return;
  }

  modelSel.disabled = false;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select model';
  modelSel.appendChild(placeholder);

  BRAND_MODELS[brand].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    modelSel.appendChild(opt);
  });
}

// Run on page load to set initial state
window.addEventListener('DOMContentLoaded', () => {
  updateModelList();
});

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
};
const BRAND_DEFAULT = 500000;

// ── Age depreciation ────────────────────────
const AGE_DECAY = {
   0:1.00, 1:0.90, 2:0.79, 3:0.74,
   4:0.66, 5:0.68, 6:0.72, 7:0.66,
   8:0.52, 9:0.45,10:0.39,11:0.35,
  12:0.27,13:0.25,14:0.21,15:0.17,
  16:0.16,17:0.14,18:0.13,19:0.11,
  20:0.09,
};

// ── Km penalty ──────────────────────────────
function kmMultiplier(km) {
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

// ── Fuel multiplier ─────────────────────────
const FUEL_MULT = {
  "Petrol":1.00,"Diesel":1.12,"CNG":0.82,"LPG":0.72,"Electric":1.20
};

// ── Transmission multiplier ─────────────────
const TRANS_MULT = {"Manual":1.00,"Automatic":1.22};

// ── Ownership factor ────────────────────────
const OWNER_MULT = {
  "First Owner":1.00,"Second Owner":0.80,"Third Owner":0.65,
  "Fourth & Above Owner":0.52,"Test Drive Car":1.15
};

// ── Seller adjustment ───────────────────────
const SELLER_ADJ = {
  "Individual":-0.03,"Dealer":0.05,"Trustmark Dealer":0.08
};

// ── Engine CC adjustment ────────────────────
function engineAdj(cc) {
  if (!cc||isNaN(cc)) return 0;
  if (cc<800)  return -0.08;
  if (cc<1000) return -0.04;
  if (cc<1200) return  0.00;
  if (cc<1500) return  0.04;
  if (cc<2000) return  0.10;
  if (cc<2500) return  0.18;
  if (cc<3000) return  0.26;
  return 0.35;
}

// ── Mileage adjustment ──────────────────────
function mileageAdj(kmpl) {
  if (!kmpl||isNaN(kmpl)) return 0;
  if (kmpl>=25) return  0.06;
  if (kmpl>=20) return  0.03;
  if (kmpl>=15) return  0.00;
  if (kmpl>=10) return -0.03;
  return -0.06;
}

// ── Max power adjustment ────────────────────
function powerAdj(bhp) {
  if (!bhp||isNaN(bhp)) return 0;
  if (bhp>=200) return  0.15;
  if (bhp>=150) return  0.10;
  if (bhp>=100) return  0.05;
  if (bhp>=70)  return  0.00;
  return -0.04;
}

// ════════════════════════════════════════════
//  PRICE CALCULATION ENGINE
// ════════════════════════════════════════════
function calcPrice(inputs) {
  const {brand,year,km,fuel,trans,owner,seller,engine,mileage,maxpower} = inputs;

  const base = BRAND_BASE[brand] || BRAND_DEFAULT;
  const brandFound = !!BRAND_BASE[brand];

  const currentYear = new Date().getFullYear();
  const age = Math.max(0, Math.min(currentYear - year, 20));
  const ageMult   = AGE_DECAY[age] ?? 0.08;
  const kmMult    = kmMultiplier(km);
  const fuelMult  = FUEL_MULT[fuel]  ?? 1.00;
  const transMult = TRANS_MULT[trans] ?? 1.00;
  const ownerMult = OWNER_MULT[owner] ?? 1.00;
  const selAdj    = SELLER_ADJ[seller] ?? 0;
  const engAdj    = engineAdj(engine);
  const milAdj    = mileageAdj(mileage);
  const powAdj    = powerAdj(maxpower);

  const price = base * ageMult * kmMult * fuelMult * transMult * ownerMult
                * (1 + selAdj) * (1 + engAdj) * (1 + milAdj) * (1 + powAdj);

  const mid  = Math.round(price);
  const low  = Math.round(price * 0.82);
  const high = Math.round(price * 1.22);

  const factors = [];

  factors.push({
    name:"Brand",
    val: brandFound ? `₹${fmt(base)} avg` : "Generic estimate",
    tag: brandFound ? "neu" : "down",
    label: brandFound ? "KNOWN" : "UNKNOWN"
  });

  factors.push({
    name:`Age (${age} yr${age!==1?'s':''})`,
    val:`${Math.round(ageMult*100)}% of base`,
    tag: ageMult>=0.75?"up":ageMult>=0.45?"neu":"down",
    label: ageMult>=0.75?"RECENT":ageMult>=0.45?"MODERATE":"OLD"
  });

  factors.push({
    name:`Km Driven (${km.toLocaleString('en-IN')})`,
    val:`${Math.round(kmMult*100)}% of base`,
    tag: km<=40000?"up":km<=100000?"neu":"down",
    label: km<=40000?"LOW":km<=100000?"AVERAGE":"HIGH"
  });

  if (fuel) factors.push({
    name:`Fuel: ${fuel}`,
    val: fuelMult>1?`+${Math.round((fuelMult-1)*100)}%`:fuelMult<1?`-${Math.round((1-fuelMult)*100)}%`:"Baseline",
    tag: fuelMult>=1.1?"up":fuelMult<0.9?"down":"neu",
    label: fuelMult>=1.1?"PREMIUM":fuelMult<0.9?"DISCOUNT":"NEUTRAL"
  });

  if (trans) factors.push({
    name:`Transmission: ${trans}`,
    val: transMult>1?`+${Math.round((transMult-1)*100)}%`:"Baseline",
    tag: transMult>1?"up":"neu",
    label: transMult>1?"PREMIUM":"STANDARD"
  });

  if (owner) factors.push({
    name:`Owner: ${owner}`,
    val: ownerMult<1?`-${Math.round((1-ownerMult)*100)}%`:ownerMult>1?`+${Math.round((ownerMult-1)*100)}%`:"Baseline",
    tag: ownerMult>=0.9?"up":ownerMult>=0.7?"neu":"down",
    label: ownerMult>=0.9?"1ST":ownerMult>=0.7?"2ND":"3RD+"
  });

  if (mileage) factors.push({
    name:`Mileage: ${mileage} kmpl`,
    val: milAdj>0?`+${Math.round(milAdj*100)}%`:milAdj<0?`${Math.round(milAdj*100)}%`:"Baseline",
    tag: milAdj>0?"up":milAdj<0?"down":"neu",
    label: mileage>=25?"EXCELLENT":mileage>=18?"GOOD":"AVERAGE"
  });

  return {mid,low,high,factors,base:brandFound?base:null,brandFound,brand};
}

// ════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════
function fmt(n) {
  if (!n||isNaN(n)) return '—';
  if (n>=10000000) return (n/10000000).toFixed(2)+' Cr';
  if (n>=100000)   return (n/100000).toFixed(2)+' L';
  return n.toLocaleString('en-IN');
}
function fmtFull(n) { return '₹ '+fmt(n); }

function showState(name) {
  ['idle','result','error'].forEach(s => {
    const el = document.getElementById('state-'+s);
    if (el) el.style.display = (s===name)?'flex':'none';
  });
}

function getVal(id) {
  return (document.getElementById(id)?.value||'').trim();
}

function resetForm() {
  showState('idle');
}

// ════════════════════════════════════════════
//  PREDICT
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
  const milStr  = getVal('mileage');
  const powStr  = getVal('maxpower');

  // Validate
  const missing = [];
  if (!brand)   missing.push('Car Brand');
  if (!yearStr) missing.push('Year');
  if (!kmStr)   missing.push('Km Driven');
  if (!fuel)    missing.push('Fuel Type');
  if (!trans)   missing.push('Transmission');
  if (!owner)   missing.push('Ownership');

  if (missing.length) {
    document.getElementById('err-msg').textContent = 'Please fill in: '+missing.join(', ');
    showState('error');
    return;
  }

  const year     = parseInt(yearStr);
  const km       = parseInt(kmStr);
  const engine   = parseInt(engStr)  || null;
  const mileage  = parseFloat(milStr)|| null;
  const maxpower = parseFloat(powStr)|| null;

  if (year<1990||year>new Date().getFullYear()) {
    document.getElementById('err-msg').textContent = 'Enter a valid year between 1990 and '+new Date().getFullYear();
    showState('error');
    return;
  }

  const result = calcPrice({brand,year,km,fuel,trans,owner,seller,engine,mileage,maxpower});

  // Render price
  document.getElementById('out-price').textContent = fmtFull(result.mid);
  document.getElementById('out-range').textContent = `Range: ${fmtFull(result.low)} – ${fmtFull(result.high)}`;

  // Bars
  const bh = result.high;
  document.getElementById('bar-low').style.width  = Math.round((result.low/bh)*100)+'%';
  document.getElementById('bar-mid').style.width  = Math.round((result.mid/bh)*100)+'%';
  document.getElementById('bar-high').style.width = '100%';
  document.getElementById('val-low').textContent  = fmtFull(result.low);
  document.getElementById('val-mid').textContent  = fmtFull(result.mid);
  document.getElementById('val-high').textContent = fmtFull(result.high);

  // Factors
  document.getElementById('factors-list').innerHTML = result.factors.map(f=>`
    <div class="factor anim">
      <span class="factor-name">${f.name}</span>
      <div class="factor-right">
        <span class="factor-val">${f.val}</span>
        <span class="tag tag-${f.tag}">${f.label}</span>
      </div>
    </div>
  `).join('');

  // Brand avg
  document.getElementById('out-brand-avg').textContent =
    result.base ? `${result.brand} market avg: ${fmtFull(result.base)}` : '';

  showState('result');
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key==='Enter') predict();
});
