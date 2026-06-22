// Authentication — login flow

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
