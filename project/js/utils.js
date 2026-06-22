// Utility helpers — no side effects, used everywhere

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
function fmtDate(d){return d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});}
function statusLabel(s){return {n:'Not Started','not-started':'Not Started','in-progress':'In Progress','blocked':'Blocked','done':'Done'}[s]||'Not Started';}
function atypeColor(v) {
  if (!v||v==='—') return '';
  if (v.indexOf('Premium')>-1) return 'color:#7C3AED;font-weight:500';
  if (v.indexOf('Call')>-1) return 'color:#059669;font-weight:500';
  return 'color:#C4956A;font-weight:500';
}
function isLightColour(hex) {
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*0.299+g*0.587+b*0.114) > 160;
}
function isLight(hex) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 > 140;
}
function periodLabel() { return finPeriod==='weekly'?'/ wk':finPeriod==='monthly'?'/ mo':'/ yr'; }
function fmtAmt(n) { return '$' + n.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtAmtRound(n) { return '$' + Math.round(n).toLocaleString('en-AU'); }
function getWeekStart(off) {
  var d = new Date(); var day = d.getDay(); var diff = (day===0)?-6:1-day;
  d.setDate(d.getDate()+diff+(off*7)); d.setHours(0,0,0,0); return d;
}
function weekLabel(off) {
  var s=getWeekStart(off); var e=new Date(s); e.setDate(s.getDate()+6);
  if(off===0) return 'This Week — '+fmtDate(s)+' to '+fmtDate(e);
  if(off===-1) return 'Last Week — '+fmtDate(s)+' to '+fmtDate(e);
  if(off===1) return 'Next Week — '+fmtDate(s)+' to '+fmtDate(e);
  return fmtDate(s)+' to '+fmtDate(e);
}
function fmtTourDate(d) {
  if (!d) return '\u2014';
  var p = d.split('-'); if (p.length < 3) return d;
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(p[2]) + ' ' + mo[parseInt(p[1])-1];
}
function wrapText(ctx, text, font, maxW) {
  ctx.font = font;
  var words = text.split(' ');
  var lines = [], cur = '';
  words.forEach(function(w) {
    var test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else { cur = test; }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}
