// ══════════════════════════════════════
// CONFIG — change PINs here
// ══════════════════════════════════════
var USERS = {
  latisha: { name:'Latisha', role:'Owner', pin:'0162', pages:['dashboard','clients','vouchers','tours','social','adcreative','tasks','staff','finances','vietnam','goals','sops','huestripe','marketing','online','comms'] },
  salma:   { name:'Salma',   role:'Admin Support', pin:'2222', pages:['myhub','tasks','clients','vouchers','tours','social','adcreative','vietnam','goals','sops','huestripe','marketing','online','comms'] },
  lemari:  { name:'Lemari',  role:'Content · Video', pin:'3333', pages:['myhub','tasks','clients','vouchers','tours','social','adcreative','vietnam','goals','sops','huestripe','marketing','online','comms'] }
};
var NAV = [
  { id:'comms',     lbl:'Comms',        sec:'Team',        icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { id:'myhub',     lbl:'My Hub',       sec:'Overview',    icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
  { id:'dashboard', lbl:'Dashboard',    sec:null,          icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
  { id:'clients',   lbl:'Clients',      sec:'Operations',  icon:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { id:'vouchers',  lbl:'Gift Vouchers', sec:'Operations', icon:'<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>' },
  { id:'tasks',     lbl:'Tasks',        sec:null,          icon:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
  { id:'staff',     lbl:'Staff',        sec:null,          icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
  { id:'tours',     lbl:'Tours',        sec:null,          icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { id:'social',    lbl:'Social Media', sec:null,          icon:'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>' },
  { id:'adcreative',lbl:'Ad Creative',  sec:null,          icon:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>' },
  { id:'finances',  lbl:'Finances',     sec:null,          icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { id:'vietnam',   lbl:'Vietnam Tour', sec:'Projects',    icon:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
  { id:'goals',     lbl:'Goals',        sec:null,          icon:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { id:'sops',      lbl:'SOPs',         sec:'Resources',   icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
  { id:'marketing', lbl:'Marketing',    sec:'Operations',  icon:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' },
    { id:'online',    lbl:'Online Analysis', sec:null, icon:'<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M15 6l4-3M9 6L5 3"/>' },
    { id:'huestripe', lbl:'Hue & Stripe', sec:null,          icon:'<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/>' }
];

// ── Login state ──
var curUser = null, selUid = null, pin = '';

function selUser(id) {
  selUid = id;
  document.getElementById('step-user').style.display = 'none';
  document.getElementById('step-pin').style.display = 'block';
  document.getElementById('pin-prompt').textContent = 'Enter your PIN, ' + USERS[id].name;
  pin = ''; updDots(); document.getElementById('perr').textContent = '';
}
function pk(d) {
  if (pin.length >= 4) return;
  pin += d; updDots();
  if (pin.length === 4) setTimeout(chkPin, 200);
}
function pdel() { pin = pin.slice(0,-1); updDots(); }
function updDots() {
  for (var i=0;i<4;i++) {
    var el = document.getElementById('d'+i);
    if (el) el.className = 'pdot' + (i < pin.length ? ' on' : '');
  }
}
function chkPin() {
  if (pin === USERS[selUid].pin) { curUser = selUid; launchApp(); }
  else {
    document.getElementById('perr').textContent = 'Incorrect PIN. Try again.';
    pin = ''; updDots();
    var dots = document.querySelector('.pdots');
    dots.style.animation = 'none';
    dots.offsetHeight;
    dots.style.animation = 'shake .4s ease';
  }
}
function goBack() {
  document.getElementById('step-pin').style.display = 'none';
  document.getElementById('step-user').style.display = 'block';
  pin = ''; updDots(); selUid = null;
  document.getElementById('perr').textContent = '';
}
