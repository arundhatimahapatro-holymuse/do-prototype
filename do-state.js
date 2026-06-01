/* ════════════════════════════════════════════════════════════
   DO-STATE — shared engine for the Deemed Ownership prototype
   • localStorage flow state (happy / pending + per-check status)
   • reusable collapsible checklist card
   • animated "why DO transfer" explainer modal
   • palette: primary #4736FE · comp #63FFB1 · black #0A0A0A · white #FFF
════════════════════════════════════════════════════════════ */

const DOState = (() => {
  const K = { flow: 'do_flow', echallan: 'do_echallan', insurance: 'do_insurance' };

  // Seven deemed-ownership checks. echallan + insurance are dynamic.
  const CHECKS = [
    { key: 'echallan', name: 'E-Challans Cleared',
      subPending: '₹1,000 pending · Parivahan', subDone: 'All challans cleared · Parivahan',
      action: { label: 'Pay Now', page: 'challan-flow.html' } },
    { key: 'hypo', name: 'No Hypothecation',
      subDone: 'No active loan on vehicle · Vahan', always: true },
    { key: 'insurance', name: 'Insurance Valid',
      subPending: 'Expired on 12 Mar 2025', subDone: 'Comprehensive · valid till May 2026',
      action: { label: 'Renew', page: 'insurance-renewal.html' } },
    { key: 'pucc', name: 'PUCC Valid',
      subDone: 'Pollution cert valid till Sep 2026', always: true },
    { key: 'mobile', name: 'Mobile Linked to Vahan',
      subDone: '+91 XXXXXX4521 verified', always: true },
    { key: 'fitness', name: 'Fitness Certificate',
      subDone: 'Valid till May 2038', always: true },
    { key: 'hsrp', name: 'HSRP Fitted',
      subDone: 'High Security Number Plate installed', always: true },
  ];

  function init() { if (!localStorage.getItem(K.flow)) reset(); }
  function reset() {
    localStorage.setItem(K.flow, 'pending');
    localStorage.setItem(K.echallan, 'pending');
    localStorage.setItem(K.insurance, 'pending');
  }
  function setHappy() {
    localStorage.setItem(K.flow, 'happy');
    localStorage.setItem(K.echallan, 'done');
    localStorage.setItem(K.insurance, 'done');
    sessionStorage.removeItem('happyPopupDismissed');
  }
  function setPending() { reset(); }

  const get = k => localStorage.getItem(K[k]);
  const setEchallanDone  = () => localStorage.setItem(K.echallan, 'done');
  const setInsuranceDone = () => localStorage.setItem(K.insurance, 'done');
  const isDone = key => key === 'echallan' ? get('echallan') === 'done'
                      : key === 'insurance' ? get('insurance') === 'done'
                      : true;
  function doneCount() { let c = 5; if (isDone('echallan')) c++; if (isDone('insurance')) c++; return c; }
  const allDone = () => doneCount() === 7;
  const pendingCount = () => 7 - doneCount();

  // read ?return= param (the page that launched a sub-flow)
  function returnPage(fallback) {
    const p = new URLSearchParams(location.search).get('return');
    return p || fallback || 'price-discovery.html';
  }

  /* ── inject shared styles once ── */
  function injectStyles() {
    if (document.getElementById('do-shared-styles')) return;
    const css = `
    :root{
      --do-primary:#4736FE; --do-comp:#63FFB1; --do-comp-ink:#04553A;
      --do-black:#0A0A0A; --do-white:#FFFFFF;
    }
    /* ── CHECKLIST CARD ── */
    .do-card{background:var(--do-white);margin:10px 12px 0;border-radius:18px;
      border:1px solid #ECECF1;overflow:hidden;box-shadow:0 1px 2px rgba(10,10,10,.04);}
    .do-card-head{padding:14px 16px 10px;display:flex;align-items:flex-start;
      justify-content:space-between;gap:8px;}
    .do-title-row{display:flex;align-items:center;gap:7px;}
    .do-title{font-size:14px;font-weight:700;color:var(--do-black);}
    .do-info-btn{width:18px;height:18px;border-radius:50%;border:1.5px solid #C7C5D6;
      background:transparent;color:#6B6980;font-size:11px;font-weight:700;cursor:pointer;
      display:flex;align-items:center;justify-content:center;font-style:italic;line-height:1;
      flex-shrink:0;padding:0;font-family:Georgia,serif;}
    .do-info-btn:hover{border-color:var(--do-primary);color:var(--do-primary);}
    .do-subline{font-size:11px;color:#6B6980;margin-top:3px;line-height:1.35;}
    .do-subline.good{color:var(--do-comp-ink);font-weight:600;}
    .do-viewall{font-size:11px;font-weight:600;color:var(--do-primary);
      background:none;border:none;cursor:pointer;white-space:nowrap;padding:2px 0;flex-shrink:0;}
    .do-body{padding:4px 16px 14px;}
    .do-progress{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
    .do-track{flex:1;height:6px;background:#EDEDF2;border-radius:100px;overflow:hidden;}
    .do-fill{height:100%;background:linear-gradient(90deg,var(--do-primary),var(--do-comp));
      border-radius:100px;transition:width .5s ease;}
    .do-plabel{font-size:12px;font-weight:700;color:var(--do-comp-ink);white-space:nowrap;}
    .do-items{position:relative;transition:max-height .35s ease;overflow:hidden;}
    .do-items.collapsed{max-height:186px;}
    .do-item{display:flex;align-items:center;gap:10px;padding:10px 0;
      border-bottom:1px solid #F3F3F7;}
    .do-item:last-child{border-bottom:none;}
    .do-ic{width:28px;height:28px;border-radius:50%;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;}
    .do-ic.pass{background:var(--do-comp);}
    .do-ic.pend{background:#FFF;border:1.5px dashed #C7C5D6;}
    .do-itxt{flex:1;min-width:0;}
    .do-iname{font-size:13px;font-weight:600;color:var(--do-black);}
    .do-isub{font-size:11px;color:#6B6980;margin-top:1px;}
    .do-cta{font-size:11px;font-weight:700;padding:6px 13px;border-radius:100px;
      border:none;cursor:pointer;background:var(--do-primary);color:#fff;
      text-decoration:none;white-space:nowrap;flex-shrink:0;}
    .do-fademask{position:absolute;left:0;right:0;bottom:0;height:64px;
      background:linear-gradient(to bottom,rgba(255,255,255,0),#fff 78%);
      pointer-events:none;}
    .do-morewrap{display:flex;justify-content:center;margin-top:8px;}
    .do-morebtn{font-size:12px;font-weight:700;color:var(--do-primary);
      background:#F4F3FF;border:1px solid #E3E1FF;border-radius:100px;
      padding:7px 16px;cursor:pointer;}

    /* ── EXPLAINER MODAL ── */
    .do-modal{position:fixed;inset:0;background:rgba(10,10,10,.55);z-index:3000;
      display:none;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}
    .do-modal.show{display:flex;}
    .do-video{width:340px;max-width:100%;background:var(--do-black);border-radius:22px;
      overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.5);position:relative;}
    .do-video-stage{height:340px;position:relative;background:
      radial-gradient(120% 90% at 50% 0%,#221C6B 0%,#0A0A0A 70%);overflow:hidden;}
    .do-scene{position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:28px 26px;text-align:center;
      opacity:0;transform:translateY(8px) scale(.98);
      transition:opacity .5s ease,transform .5s ease;pointer-events:none;}
    .do-scene.active{opacity:1;transform:none;}
    .do-scene-emoji{font-size:54px;margin-bottom:14px;animation:doPop .6s ease;}
    @keyframes doPop{0%{transform:scale(.3);opacity:0;}60%{transform:scale(1.15);}100%{transform:scale(1);opacity:1;}}
    .do-scene-title{font-size:18px;font-weight:800;color:#fff;margin-bottom:8px;line-height:1.25;}
    .do-scene-text{font-size:13px;color:rgba(255,255,255,.78);line-height:1.5;}
    .do-flowline{display:flex;align-items:center;gap:8px;margin-top:6px;}
    .do-node{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);
      color:#fff;font-size:11px;font-weight:700;padding:7px 11px;border-radius:10px;}
    .do-node.mid{background:var(--do-primary);border-color:var(--do-primary);}
    .do-arrow{color:var(--do-comp);font-size:16px;animation:doSlide 1s infinite;}
    @keyframes doSlide{0%,100%{transform:translateX(0);}50%{transform:translateX(3px);}}
    .do-doclist{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-top:14px;width:100%;}
    .do-doc{display:flex;align-items:center;gap:6px;font-size:11px;color:#fff;
      background:rgba(99,255,177,.12);border:1px solid rgba(99,255,177,.3);
      border-radius:8px;padding:6px 8px;text-align:left;opacity:0;animation:doDocIn .4s ease forwards;}
    @keyframes doDocIn{to{opacity:1;}}
    .do-doc b{color:var(--do-comp);}
    .do-prog{display:flex;gap:5px;padding:12px 16px;background:#0A0A0A;}
    .do-prog-seg{flex:1;height:3px;border-radius:100px;background:rgba(255,255,255,.18);overflow:hidden;}
    .do-prog-seg i{display:block;height:100%;width:0;background:var(--do-comp);}
    .do-prog-seg.done i{width:100%;}
    .do-prog-seg.active i{animation:doSeg 2.6s linear forwards;}
    @keyframes doSeg{from{width:0;}to{width:100%;}}
    .do-video-foot{display:flex;align-items:center;justify-content:space-between;
      padding:0 16px 16px;background:#0A0A0A;}
    .do-skip{background:none;border:none;color:rgba(255,255,255,.6);font-size:13px;
      font-weight:600;cursor:pointer;}
    .do-gotit{background:var(--do-comp);color:var(--do-black);border:none;
      font-size:14px;font-weight:800;padding:10px 22px;border-radius:100px;cursor:pointer;}

    /* ── HAPPY POPUP ── */
    .do-pop{position:absolute;inset:0;background:rgba(10,10,10,.5);z-index:2500;
      display:none;align-items:center;justify-content:center;padding:24px;
      backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);}
    .do-pop.show{display:flex;}
    .do-pop-card{background:#fff;border-radius:22px;padding:24px 22px 20px;text-align:center;
      position:relative;width:100%;animation:doPopIn .4s cubic-bezier(.2,.8,.3,1.2);}
    @keyframes doPopIn{from{transform:scale(.85);opacity:0;}to{transform:scale(1);opacity:1;}}
    .do-pop-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;
      background:#F3F3F7;border:none;cursor:pointer;font-size:15px;color:#6B6980;line-height:1;}
    .do-pop-emoji{font-size:48px;margin-bottom:8px;}
    .do-pop-title{font-size:19px;font-weight:800;color:var(--do-black);margin-bottom:8px;line-height:1.25;}
    .do-pop-text{font-size:13px;color:#6B6980;line-height:1.5;margin-bottom:18px;}
    .do-pop-btn{background:var(--do-primary);color:#fff;border:none;font-size:15px;
      font-weight:700;padding:13px 0;border-radius:14px;cursor:pointer;width:100%;}
    `;
    const s = document.createElement('style');
    s.id = 'do-shared-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ── render a checklist card into a container ── */
  function renderChecklistCard(containerId, ownerPage, collapsed = true) {
    injectStyles();
    const el = document.getElementById(containerId);
    if (!el) return;
    const done = doneCount();
    const pct = Math.round(done / 7 * 100);
    const good = allDone();
    const subline = good
      ? '✅ Great news — we’ve received all your documents!'
      : 'Complete all checks for smooth RC transfer';

    const itemsHtml = CHECKS.map(c => {
      const passed = c.always || isDone(c.key);
      const sub = passed ? c.subDone : c.subPending;
      const right = passed
        ? `<div class="do-ic pass"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#04553A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
        : `<a class="do-cta" href="${c.action.page}?return=${encodeURIComponent(ownerPage)}">${c.action.label}</a>`;
      const leftIc = passed
        ? `<div class="do-ic pass"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#04553A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
        : `<div class="do-ic pend"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1V6" stroke="#6B6980" stroke-width="1.6" stroke-linecap="round"/><circle cx="5.5" cy="9" r="1" fill="#6B6980"/></svg></div>`;
      return `<div class="do-item">
        ${leftIc}
        <div class="do-itxt"><div class="do-iname">${c.name}</div><div class="do-isub">${sub}</div></div>
        ${passed ? '' : right}
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="do-card">
        <div class="do-card-head">
          <div>
            <div class="do-title-row">
              <span class="do-title">Deemed Ownership Checklist</span>
              <button class="do-info-btn" onclick="DOState.showExplainer()" title="Why is this needed?">i</button>
            </div>
            <div class="do-subline ${good ? 'good' : ''}">${subline}</div>
          </div>
        </div>
        <div class="do-body">
          <div class="do-progress">
            <div class="do-track"><div class="do-fill" style="width:${pct}%"></div></div>
            <span class="do-plabel">${done}/7 done</span>
          </div>
          <div class="do-items ${collapsed ? 'collapsed' : ''}" id="${containerId}-items">
            ${itemsHtml}
            <div class="do-fademask" id="${containerId}-fade" ${collapsed ? '' : 'style="display:none"'}></div>
          </div>
          <div class="do-morewrap">
            <button class="do-morebtn" id="${containerId}-more" onclick="DOState.toggleChecklist('${containerId}')">View all 7 checks →</button>
          </div>
        </div>
      </div>`;
  }

  function toggleChecklist(containerId) {
    const items = document.getElementById(containerId + '-items');
    const fade  = document.getElementById(containerId + '-fade');
    const btn   = document.getElementById(containerId + '-more');
    const collapsed = items.classList.toggle('collapsed');
    if (collapsed) {
      fade.style.display = '';
      btn.textContent = 'View all 7 checks →';
    } else {
      items.style.maxHeight = items.scrollHeight + 'px';
      fade.style.display = 'none';
      btn.textContent = 'Show less ↑';
    }
  }

  /* ── animated explainer modal ── */
  let explainerTimer = null;
  function showExplainer() {
    injectStyles();
    let m = document.getElementById('do-explainer');
    if (!m) {
      m = document.createElement('div');
      m.id = 'do-explainer';
      m.className = 'do-modal';
      m.innerHTML = `
        <div class="do-video">
          <div class="do-video-stage">
            <div class="do-scene" data-i="0">
              <div class="do-scene-emoji">🔄</div>
              <div class="do-scene-title">What is Deemed Ownership?</div>
              <div class="do-scene-text">While we find your buyer, the car’s RC moves from you to Cars24 in the interim.</div>
              <div class="do-flowline"><span class="do-node">You</span><span class="do-arrow">→</span><span class="do-node mid">Cars24</span><span class="do-arrow">→</span><span class="do-node">Buyer</span></div>
            </div>
            <div class="do-scene" data-i="1">
              <div class="do-scene-emoji">⚡</div>
              <div class="do-scene-title">Why it matters</div>
              <div class="do-scene-text">A clean, verified vehicle gets you a <b style="color:#63FFB1">better price</b> and a <b style="color:#63FFB1">faster transfer</b> — no surprises later.</div>
            </div>
            <div class="do-scene" data-i="2">
              <div class="do-scene-emoji">⚠️</div>
              <div class="do-scene-title">If you skip it…</div>
              <div class="do-scene-text">Pending dues or expired docs can <b style="color:#FF8A65">block the RC transfer</b>, delay your payment, and keep liabilities in your name.</div>
            </div>
            <div class="do-scene" data-i="3">
              <div class="do-scene-emoji">📋</div>
              <div class="do-scene-title">7 things we verify</div>
              <div class="do-doclist">
                <div class="do-doc" style="animation-delay:.05s"><b>1</b> E-Challans</div>
                <div class="do-doc" style="animation-delay:.15s"><b>2</b> Hypothecation</div>
                <div class="do-doc" style="animation-delay:.25s"><b>3</b> Insurance</div>
                <div class="do-doc" style="animation-delay:.35s"><b>4</b> PUCC</div>
                <div class="do-doc" style="animation-delay:.45s"><b>5</b> Mobile linked</div>
                <div class="do-doc" style="animation-delay:.55s"><b>6</b> Fitness cert</div>
                <div class="do-doc" style="animation-delay:.65s"><b>7</b> HSRP plate</div>
                <div class="do-doc" style="animation-delay:.75s;background:rgba(71,54,254,.2);border-color:rgba(71,54,254,.5)"><b style="color:#fff">✓</b> All set!</div>
              </div>
            </div>
          </div>
          <div class="do-prog" id="do-prog">
            <div class="do-prog-seg"><i></i></div><div class="do-prog-seg"><i></i></div>
            <div class="do-prog-seg"><i></i></div><div class="do-prog-seg"><i></i></div>
          </div>
          <div class="do-video-foot">
            <button class="do-skip" onclick="DOState.closeExplainer()">Skip</button>
            <button class="do-gotit" onclick="DOState.closeExplainer()">Got it 👍</button>
          </div>
        </div>`;
      document.body.appendChild(m);
    }
    m.classList.add('show');
    playExplainer();
  }

  function playExplainer() {
    const scenes = document.querySelectorAll('#do-explainer .do-scene');
    const segs = document.querySelectorAll('#do-explainer .do-prog-seg');
    let i = 0;
    const step = () => {
      scenes.forEach((s, n) => s.classList.toggle('active', n === i));
      segs.forEach((s, n) => {
        s.classList.toggle('done', n < i);
        s.classList.toggle('active', n === i);
      });
      i++;
      if (i <= scenes.length) explainerTimer = setTimeout(step, 2600);
    };
    clearTimeout(explainerTimer);
    step();
  }

  function closeExplainer() {
    clearTimeout(explainerTimer);
    const m = document.getElementById('do-explainer');
    if (m) m.classList.remove('show');
  }

  /* ── happy-flow congrats popup (price discovery) ── */
  function maybeShowHappyPopup() {
    if (get('flow') !== 'happy') return;
    if (sessionStorage.getItem('happyPopupDismissed')) return;
    showHappyPopup();
  }
  function showHappyPopup() {
    injectStyles();
    const phone = document.querySelector('.phone');
    if (!phone) return;
    let p = document.getElementById('do-happy-pop');
    if (!p) {
      p = document.createElement('div');
      p.id = 'do-happy-pop';
      p.className = 'do-pop';
      p.innerHTML = `
        <div class="do-pop-card">
          <button class="do-pop-close" onclick="DOState.dismissHappyPopup()">×</button>
          <div class="do-pop-emoji">🎉</div>
          <div class="do-pop-title">All your documents are in place!</div>
          <div class="do-pop-text">Every requirement for your deemed ownership transfer is verified. Let’s get you a great price!</div>
          <button class="do-pop-btn" onclick="DOState.dismissHappyPopup()">Awesome, let’s go</button>
        </div>`;
      phone.appendChild(p);
    }
    p.classList.add('show');
  }
  function dismissHappyPopup() {
    sessionStorage.setItem('happyPopupDismissed', '1');
    const p = document.getElementById('do-happy-pop');
    if (p) p.classList.remove('show');
  }

  init();
  return {
    CHECKS, reset, setHappy, setPending, get, returnPage,
    setEchallanDone, setInsuranceDone, isDone, doneCount, allDone, pendingCount,
    renderChecklistCard, toggleChecklist,
    showExplainer, closeExplainer,
    maybeShowHappyPopup, showHappyPopup, dismissHappyPopup,
  };
})();
