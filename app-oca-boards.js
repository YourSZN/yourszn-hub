// ══ SEASON BOARDS ══
// Visual stripe boards using exact colours sampled from official season board images

var OCA_SEASON_BOARDS = {
  'Soft Autumn':   ['#3D1335','#164C6E','#34897D','#3C3531','#E2D2A1','#4F4139','#B55332','#CB807F','#6D5E99','#35646D','#A29842','#455136','#889D66','#F5D67C','#6A5D51','#852A39','#2D3351','#6D5743','#F3BFB7'],
  'True Autumn':   ['#DB8646','#463720','#935322','#E8481E','#912B1C','#CA5318','#E08D6F','#9F2F22','#454887','#A29942','#465236','#889F45','#D29C4E','#675D51','#FE826C','#403854','#ED554D','#F8B53F'],
  'Dark Autumn':   ['#F9B856','#0F2B36','#2599B3','#2F261D','#5E1E01','#F7D9AB','#BA3C02','#E77E69','#780902','#79007F','#2D15A5','#6A700B','#1A2A0D','#494101','#F1C759','#59504D','#EB7084','#203454','#A22B3B','#331A0A'],
  'Light Summer':  ['#EA98DE','#C3ED83','#1FE6E5','#E9E880','#847CDF','#FC9893','#5C6ECF','#DB9BD2','#9073C4','#BDABA2','#6E8FD3','#7AB2CA','#92DFBB','#89CA74','#F9F97F','#BEBFBF','#E93850','#C56C89','#A99188','#7097E3'],
  'True Summer':   ['#50B470','#4BB8D6','#9D988E','#5D453C','#B92730','#AB1E4D','#DC9BD2','#81497C','#3F027B','#5548BA','#516FB2','#76B2FE','#4DA596','#83C773','#FAFA7E','#BEBEBF','#6188DE','#DA5183','#EA98DE','#7C7DE8'],
  'Soft Summer':   ['#CE899E','#E2586D','#8E746B','#5C3F34','#911C28','#8A2A67','#8B2F89','#552A7E','#1E1255','#3D3E87','#5167AD','#478BB0','#2F5C78','#4CA596','#117A6A','#F3E78A','#2C306F','#703642','#FAA0BC','#4F3244'],
  'Bright Winter': ['#9C02E0','#65FAFE','#4F10FE','#17005F','#E0001D','#90FD22','#757674','#01C040','#400194','#FC48B5','#08F6CE','#FE0404','#DCFD50','#FE0DD3','#012CEC','#01112C','#FD3A09','#FEFD56','#FE2277'],
  'True Winter':   ['#ACC8FE','#DB175F','#FDFB56','#75EFA2','#5D0730','#E40B9B','#9415CA','#FE8AED','#2646E6','#17D3D7','#01893C','#F9FA7F','#00107B','#E20B2F','#0193FE','#4D02D6','#C51EE6','#193AF3'],
  'Dark Winter':   ['#B00019','#2F261C','#8F4931','#403576','#FE47AF','#59299C','#9315CA','#4644B8','#201955','#159DFD','#00EFF4','#007035','#013317','#FBFC60','#CDD1D3','#1D6896','#E5362D','#363E2B','#214058','#FE3EFE'],
  'Light Spring':  ['#8FC7E5','#CF7E48','#F1778C','#D3B48D','#A77C53','#E7976D','#F2536F','#7D7EE7','#B073DB','#00EFF3','#00A67A','#76B2FD','#6BC04C','#E9E37A','#A0A09B','#FE826C','#ECDCC3','#4CBBD0','#FEF04B'],
  'True Spring':   ['#DB8646','#935321','#A77A51','#D16C1A','#E9481E','#912C1B','#F25270','#E37A90','#5446BA','#395874','#01EFF4','#AEC447','#487642','#A6C452','#F9B53F','#A0A09C','#FD826C','#783D14','#9B4ED3','#FEEC22'],
  'Bright Spring': ['#FE260A','#3C2E27','#621CCF','#FE6F0F','#BB723A','#CA5419','#DB8446','#FD1A42','#501EFD','#17416C','#79F2FD','#45B6E0','#DDFE1D','#00E502','#FEFE56','#A9A9AA','#FE816B','#AD4501','#A222FD','#FCE800'],
};

var ocaBoardsExpanded = null; // season name or null

function renderOcaBoards() {
  var families = [
    { name: 'Summer', colour: '#8BA8C4' },
    { name: 'Winter', colour: '#5C7A9E' },
    { name: 'Autumn', colour: '#B8784A' },
    { name: 'Spring', colour: '#C4A04A' },
  ];

  if (ocaBoardsExpanded) {
    return renderOcaBoardFull(ocaBoardsExpanded);
  }

  var html = '<div style="display:grid;gap:28px">';

  families.forEach(function(fam) {
    var seasons = OCA_GROUPS[fam.name] || [];
    html += '<div>'
      + '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;padding-left:2px">' + fam.name + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">'
      + seasons.map(function(seasonName) {
          var colours = OCA_SEASON_BOARDS[seasonName] || [];
          var season = OCA_SEASONS[seasonName];
          var stripes = colours.map(function(hex) {
            return '<div style="flex:1;background:' + hex + ';min-height:1px"></div>';
          }).join('');

          return '<div onclick="ocaBoardsExpanded=\'' + seasonName.replace(/'/g,"\\'") + '\';renderOca()" style="cursor:pointer;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.13)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 1px 4px rgba(0,0,0,.08)\'">'
            + '<div style="display:flex;height:110px">' + stripes + '</div>'
            + '<div style="padding:10px 14px;background:white;border-top:1px solid #F0EAE2;display:flex;align-items:center;justify-content:space-between">'
            + '<div>'
            + '<div style="font-size:12px;font-weight:700;color:var(--deep)">' + seasonName + '</div>'
            + '<div style="font-size:10px;color:var(--muted);margin-top:1px">' + (season ? season.desc : '') + '</div>'
            + '</div>'
            + '<div style="font-size:11px;color:var(--muted);flex-shrink:0;margin-left:8px">&#8599;</div>'
            + '</div></div>';
        }).join('')
      + '</div></div>';
  });

  html += '</div>';
  return html;
}

function renderOcaBoardFull(seasonName) {
  var colours = OCA_SEASON_BOARDS[seasonName] || [];
  var season = OCA_SEASONS[seasonName];

  var html = '<div style="margin-bottom:20px">'
    + '<button onclick="ocaBoardsExpanded=null;renderOca()" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--muted);padding:0;display:flex;align-items:center;gap:6px;font-family:inherit">&#8592; All Seasons</button>'
    + '</div>';

  html += '<div style="margin-bottom:28px">'
    + '<div style="font-size:24px;font-weight:700;color:var(--deep);margin-bottom:4px">' + seasonName + '</div>'
    + '<div style="font-size:13px;color:var(--muted)">' + (season ? season.desc : '') + '</div>'
    + '</div>';

  // Full-width stripe bar
  var fullStripes = colours.map(function(hex) {
    return '<div style="flex:1;background:' + hex + ';min-height:1px"></div>';
  }).join('');

  html += '<div style="display:flex;height:200px;border-radius:14px;overflow:hidden;margin-bottom:28px;box-shadow:0 2px 12px rgba(0,0,0,.1)">'
    + fullStripes + '</div>';

  // Swatch grid with hex codes
  html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">'
    + colours.map(function(hex) {
        return '<div style="border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">'
          + '<div style="background:' + hex + ';height:56px"></div>'
          + '<div style="padding:7px 10px;background:white;border-top:1px solid #F0EAE2">'
          + '<div style="font-size:10px;color:var(--deep);font-family:monospace">' + hex + '</div>'
          + '</div></div>';
      }).join('')
    + '</div>';

  return html;
}
