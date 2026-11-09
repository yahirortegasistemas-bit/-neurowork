function lum(c){const x=c.slice(1).match(/.{2}/g).map(h=>{const v=parseInt(h,16)/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*x[0]+0.7152*x[1]+0.0722*x[2];}
function cr(f,b){const L1=Math.max(lum(f),lum(b)), L2=Math.min(lum(f),lum(b)); return (L1+0.05)/(L2+0.05);}
function fmt(v){return v.toFixed(2)+':1';}
const L={
  bg:'#F1F4EF',bgElev:'#FFFFFF',ink:'#1E2420',inkSoft:'#4C574E',inkFaint:'#7C877E',
  primary:'#2F6259',accent:'#C0863C',danger:'#B15A45',white:'#FFFFFF'
};
console.log('LIGHT THEME');
console.log('ink/bg:', fmt(cr(L.ink,L.bg)), '(>=4.5 AA normal)');
console.log('inkSoft/bg:', fmt(cr(L.inkSoft,L.bg)), '(>=4.5)');
console.log('inkFaint/bg:', fmt(cr(L.inkFaint,L.bg)), '(>=4.5; small text needs >=3.0)');
console.log('ink/bgElev:', fmt(cr(L.ink,L.bgElev)));
console.log('inkFaint/bgElev:', fmt(cr(L.inkFaint,L.bgElev)));
console.log('accent/bg:', fmt(cr(L.accent,L.bg)), '(>=3.0 for UI/large)');
console.log('danger/bg:', fmt(cr(L.danger,L.bg)));
console.log('white/primary:', fmt(cr(L.white,L.primary)));
const D={
  bg:'#171B18',bgElev:'#20261F',ink:'#EDF1EA',inkSoft:'#B7C2B4',inkFaint:'#7E8A7B',
  primary:'#6FB39F',accent:'#E0AD6B',danger:'#E19685',primaryInk:'#0E1512'
};
console.log('\nDARK THEME');
console.log('ink/bg:', fmt(cr(D.ink,D.bg)));
console.log('inkFaint/bgElev:', fmt(cr(D.inkFaint,D.bgElev)));
console.log('white/primaryInk? prim/primInk:', fmt(cr(D.primaryInk,D.primary)));
