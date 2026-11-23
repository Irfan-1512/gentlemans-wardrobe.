/* app.js - Gentleman's Wardrobe */
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function gd(k,d){try{var s=localStorage.getItem(k);return s?JSON.parse(s):d;}catch(e){return d;}}
function sd(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
var TAGLINES=[
  "Dress like you already won.",
  "Confidence is silent. Your outfit speaks first.",
  "Don't just show up. Arrive.",
  "First impressions don't get second chances.",
  "The suit makes the man. Make it count.",
  "Anyone can buy clothes. Few can wear them.",
  "Dress for the life you want, not the life you have.",
  "Every great man started with a great outfit.",
  "Style is not a luxury. It's a statement.",
  "Look the part. Own the room.",
  "Dress sharp. Win every room.",
  "Your style. Your power.",
  "Dress like you mean it.",
  "Don't dress to impress. Dress to express.",
  "A gentleman never underdresses."
];

var OUTFITS=[],filters={occasion:'all',color:'all'},selectedStars=0,lastFocus=null;
var reviews=gd('gw_reviews',[]);
var OCCASIONS=['all','interview','office','wedding','date','party'];
var COLORS=['all','black','charcoal','gray','navy','blue','olive','green','burgundy','brown','cream','tan'];
function cap(s){return s==='all'?'All':s==='date'?'Date night':s.charAt(0).toUpperCase()+s.slice(1);}
function tagline(){return '"'+TAGLINES[Math.floor(Math.random()*TAGLINES.length)]+'"';}
$('hero-tagline').textContent=tagline();
$('footer-tagline').textContent=tagline();

/* NAV */
function showPage(name){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-link[data-page]').forEach(function(l){l.classList.toggle('active',l.dataset.page===name);});
  $('page-'+name).classList.add('active');
  closeMenu();window.scrollTo(0,0);
  if(name==='reviews')renderReviews();
}
function toggleMenu(){var o=$('mobile-menu').classList.toggle('open');document.querySelector('.hamburger').setAttribute('aria-expanded',o);}
function closeMenu(){$('mobile-menu').classList.remove('open');document.querySelector('.hamburger').setAttribute('aria-expanded','false');}
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target.getAttribute&&e.target.getAttribute('role')==='link')e.target.click();
});

/* SUITS */
function chipRow(id,list,key){
  $(id).innerHTML=list.map(function(v){
    return '<button type="button" class="chip" data-key="'+key+'" data-val="'+v+'" aria-pressed="'+(filters[key]===v)+'">'+(key==='color'&&v!=='all'?cap(v):cap(v))+'</button>';
  }).join('');
}
function renderChips(){chipRow('chips-occasion',OCCASIONS,'occasion');chipRow('chips-color',COLORS,'color');}
function renderSuits(){
  var list=OUTFITS.filter(function(o){
    return (filters.occasion==='all'||o.occasions.indexOf(filters.occasion)>-1)&&(filters.color==='all'||o.colors.indexOf(filters.color)>-1);
  });
  $('suits-msg').textContent=list.length?'':'No suits match those filters. Try another colour or occasion.';
  $('suits-grid').innerHTML=list.map(function(o){
    return '<button type="button" class="outfit reveal" data-id="'+esc(o.id)+'"><span class="badge">'+esc(o.badge)+'</span><img src="'+esc(o.image)+'" alt="'+esc(o.alt)+'" width="900" height="900" loading="lazy"><div><h3>'+esc(o.name)+'</h3><small>'+esc(o.desc)+'</small></div></button>';
  }).join('');
}
document.addEventListener('click',function(e){
  var chip=e.target.closest&&e.target.closest('.chip');
  if(chip){filters[chip.dataset.key]=chip.dataset.val;renderChips();renderSuits();return;}
  var card=e.target.closest&&e.target.closest('.outfit');
  if(card)openSuit(card.dataset.id);
});
function findOutfit(id){return OUTFITS.filter(function(o){return o.id===id;})[0];}
function openSuit(id){
  var o=findOutfit(id);if(!o)return;
  lastFocus=document.activeElement;
  $('m-img').src=o.image;$('m-img').alt=o.alt;
  $('m-name').textContent=o.name;$('m-desc').textContent=o.desc;$('m-quote').textContent='"'+o.quote+'"';
  $('m-details').innerHTML=o.details.map(function(d){
    return '<div class="detail"><span>'+esc(d.type)+'</span><span>'+esc(d.val)+'. '+esc(d.tip)+'</span></div>';
  }).join('');
  $('suit-modal').classList.add('open');document.body.style.overflow='hidden';$('m-close').focus();
}
function closeSuit(){
  $('suit-modal').classList.remove('open');document.body.style.overflow='';
  if(lastFocus&&lastFocus.focus)lastFocus.focus();
}
$('m-close').addEventListener('click',closeSuit);
$('suit-modal').addEventListener('click',function(e){if(e.target===this)closeSuit();});
document.addEventListener('keydown',function(e){
  var m=$('suit-modal');if(!m.classList.contains('open'))return;
  if(e.key==='Escape')closeSuit();
  if(e.key==='Tab'){
    var f=m.querySelectorAll('button,a[href]');var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
fetch('data/outfits.json').then(function(r){if(!r.ok)throw new Error('load');return r.json();})
  .then(function(d){OUTFITS=d;renderChips();renderSuits();})
  .catch(function(){$('suits-msg').textContent='Could not load the suits. Refresh the page to try again.';});

/* AI STYLIST */
var out=$('stylist-out');
function showResult(j){
  var o=findOutfit(j.outfitId);if(!o)throw new Error('unknown outfit');
  out.innerHTML='<div class="result reveal"><img src="'+esc(o.image)+'" alt="'+esc(o.alt)+'" width="900" height="900"><div class="modal-body"><p class="tag">Stylist pick</p><h3>'+esc(o.name)+'</h3><p>'+esc(j.reason||'')+'</p>'
   +(j.fallback?'<p class="msg">The AI was not sure, so this is the closest match from our guides.</p>':'')
   +'<p class="quote">"'+esc(o.quote)+'"</p><div class="actions" style="margin-top:1rem"><button type="button" class="btn" data-open="'+esc(o.id)+'">View full look</button><button type="button" class="btn btn-ghost" id="again">Try again</button></div></div></div>';
}
out.addEventListener('click',function(e){
  var op=e.target.closest('[data-open]');if(op)openSuit(op.dataset.open);
  if(e.target.id==='again'){out.innerHTML='';$('f-occasion').focus();}
});
$('stylist-form').addEventListener('submit',function(e){
  e.preventDefault();
  var occ=$('f-occasion').value,bud=$('f-budget').value,col=$('f-color').value,btn=$('f-submit');
  if(!occ||!bud){out.innerHTML='<p class="msg">Choose an occasion and a budget first.</p>';return;}
  btn.disabled=true;btn.textContent='Styling...';out.innerHTML='<p class="msg">The stylist is thinking...</p>';
  var ctl=new AbortController();var timer=setTimeout(function(){ctl.abort();},15000);
  fetch('/.netlify/functions/stylist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({occasion:occ,budget:Number(bud),colorPref:col}),signal:ctl.signal})
    .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'bad response');return j;});})
    .then(showResult)
    .catch(function(){out.innerHTML='<p class="msg">The stylist is unavailable right now. Try again in a moment, or browse the suits.</p><button type="button" class="btn btn-ghost" onclick="showPage(\'suits\')">Browse suits</button>';})
    .finally(function(){clearTimeout(timer);btn.disabled=false;btn.textContent='Get my look';});
});

/* REVIEWS (kept from the original site) */
function calcAvg(){
  if(!reviews.length)return 0;
  return reviews.reduce(function(a,r){return a+r.stars;},0)/reviews.length;
}
function setStar(n){
  selectedStars=n;
  document.querySelectorAll('#star-row button').forEach(function(s,i){s.classList.toggle('lit',i<n);});
}
function submitReview(){
  if(!selectedStars){showToast('Please select a star rating!');return;}
  var text=document.getElementById('rev-text').value.trim();
  if(!text){showToast('Please write a short review!');return;}
  var name=document.getElementById('rev-name').value.trim()||'Anonymous Gentleman';
  reviews.unshift({name:name,stars:selectedStars,text:text,date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})});
  sd('gw_reviews',reviews);
  document.getElementById('rev-text').value='';
  document.getElementById('rev-name').value='';
  setStar(0);
  renderReviews();
  showToast('Thank you for your review!');
}
function renderReviews(){
  var avg=calcAvg();var total=reviews.length;
  document.getElementById('avg-num').textContent=avg?avg.toFixed(1):'—';
  document.getElementById('avg-stars').style.color=avg?'var(--gold)':'var(--border)';
  document.getElementById('rev-count').textContent=total?(total+' REVIEW'+(total>1?'S':'')):'NO REVIEWS YET';
  var counts=[0,0,0,0,0];
  reviews.forEach(function(r){counts[r.stars-1]++;});
  for(var i=1;i<=5;i++){
    var pct=total?Math.round(counts[i-1]/total*100):0;
    document.getElementById('b'+i).style.width=pct+'%';
    document.getElementById('c'+i).textContent=counts[i-1];
  }
  var list=document.getElementById('reviews-list');
  if(!reviews.length){
    list.innerHTML='<div class="empty-box"><div class="empty-icon">🎩</div><div class="empty-title">No Reviews Yet</div><div class="empty-sub">Be the first gentleman to share your experience.</div></div>';
    return;
  }
  list.innerHTML=reviews.map(function(r){
    return '<div class="review-card"><div class="review-head"><div class="review-avatar">👨</div><div><div class="review-user">'+esc(r.name)+'</div><div class="review-date">'+r.date+'</div></div></div><div class="review-stars">'+'★'.repeat(r.stars)+'☆'.repeat(5-r.stars)+'</div><div class="review-text">"'+esc(r.text)+'"</div></div>';
  }).join('');
}
function showToast(msg){
  var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2800);
}
renderReviews();
