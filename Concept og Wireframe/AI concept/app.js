(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const offers = window.CONCEPT_DATA?.offers || [];
  const categories = window.CONCEPT_DATA?.categories || [];
  const storageKey = 'hvad-a-ad-gera-concept-v1';
  const money = value => value === 0 ? 'Ókeypis' : `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).toLocaleLowerCase('is').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dateParts = new Intl.DateTimeFormat('en-CA', {timeZone:'Atlantic/Reykjavik', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
  const datePart = name => dateParts.find(x => x.type === name).value;
  const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
  const dateAt = (offset = 0) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const weekendOffset = () => (6 - new Date(`${today}T12:00:00Z`).getUTCDay() + 7) % 7;
  const offerDate = offer => dateAt(offer.schedule === 'weekend' ? weekendOffset() : (offer.dayOffset || 0));
  const slotIsFuture = (date, time) => new Date(`${date}T${time}:00Z`).getTime() > Date.now();
  const displayDate = (date, options = {}) => {
    const value = new Date(`${date}T12:00:00Z`);
    const months = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];
    const shortMonths = ['jan.','feb.','mar.','apr.','maí','jún.','júl.','ágú.','sep.','okt.','nóv.','des.'];
    const weekdays = ['sunnudagur','mánudagur','þriðjudagur','miðvikudagur','fimmtudagur','föstudagur','laugardagur'];
    const shortWeekdays = ['sun.','mán.','þri.','mið.','fim.','fös.','lau.'];
    const weekday = options.weekday ? `${(options.weekday === 'short' ? shortWeekdays : weekdays)[value.getUTCDay()]}, ` : '';
    const month = (options.month === 'short' ? shortMonths : months)[value.getUTCMonth()];
    return `${weekday}${value.getUTCDate()}. ${month}${options.year ? ` ${value.getUTCFullYear()}` : ''}`;
  };
  const offerById = id => offers.find(offer => offer.id === id);
  let storageAvailable = true;
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
  } catch {
    storageAvailable = false;
  }
  const state = {
    route:'discover', category:'all', query:'', favoritesOnly:false, eventFilter:'all',
    favorites:new Set(Array.isArray(stored.favorites) ? stored.favorites.filter(offerById) : []),
    plans:Array.isArray(stored.plans) ? stored.plans.filter(x => x && offerById(x.id) && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && /^\d{2}:\d{2}$/.test(x.time)) : [],
    mapId:offers[0]?.id, detailId:null, spinning:false, wheelRotation:0
  };
  const icons = {
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    remove:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    all:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    matur:'<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18m12 0V3c-4 3-5 8 0 9"/>',
    tonlist:'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
    afthreying:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 11h18M7 3l3 3m4-3 3 3M10 14l5 2-5 2Z"/>',
    utivera:'<path d="m2 20 7-12 5 8 3-5 5 9H2Z"/><circle cx="17" cy="5" r="2"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5"/>'
  };
  function icon(name, extra = '') {
    return `<svg class="ui-icon ${extra}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.all}</svg>`;
  }
  let toastTimer;
  function toast(message) {
    const element = $('#toast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4200);
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({favorites:[...state.favorites], plans:state.plans}));
      storageAvailable = true;
      return true;
    } catch {
      storageAvailable = false;
      toast('Vafrinn leyfir ekki vistun. Planið helst í minni meðan síðan er opin.');
      return false;
    }
  }
  function updateCounts() {
    if ($('#plan-count')) $('#plan-count').textContent = state.plans.length;
    if ($('#favorite-count')) {
      $('#favorite-count').textContent = state.favorites.size;
      $('#favorite-count').hidden = state.favorites.size === 0;
    }
    $$('[data-action="favorites"]').forEach(button => {
      button.classList.toggle('is-active', state.favoritesOnly);
      button.setAttribute('aria-pressed', String(state.favoritesOnly));
      button.setAttribute('aria-label', state.favoritesOnly ? 'Sýna allar hugmyndir' : `Sýna vistaðar hugmyndir, ${state.favorites.size} vistaðar`);
    });
    $$('[data-save]').forEach(button => {
      const offer = offerById(button.dataset.save);
      if (!offer) return;
      const saved = state.favorites.has(offer.id);
      button.classList.toggle('is-saved', saved);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'Fjarlægja úr' : 'Vista í'} uppáhaldi: ${offer.title}`);
    });
  }
  function offerCard(offer, {event = false} = {}) {
    const saved = state.favorites.has(offer.id);
    const date = offerDate(offer);
    return `<article class="offer-card feed-post">
      <header class="post-header">
        <button class="post-avatar" type="button" data-open="${offer.id}" aria-label="Skoða ${escape(offer.place)}"><img src="${escape(offer.image)}" alt="" loading="lazy" width="44" height="44"></button>
        <div class="post-account"><strong><button type="button" data-open="${offer.id}">${escape(offer.place)}</button></strong><span>${escape(offer.address)} · ${escape(offer.categoryLabel)}</span></div>
        <button class="post-more" type="button" data-open="${offer.id}" aria-label="Nánari upplýsingar um ${escape(offer.title)}"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button>
      </header>
      <div class="post-media">
        <button class="image-open" type="button" data-open="${offer.id}" aria-label="Skoða ${escape(offer.title)}">
          <img src="${escape(offer.image)}" alt="${escape(offer.imageAlt)}" loading="lazy" width="640" height="800">
          <span class="post-gradient" aria-hidden="true"></span>
          <span class="post-overlay">
            <span class="post-kicker">${escape(offer.categoryLabel)}${event ? ` <span class="event-date">· ${escape(displayDate(date, {weekday:'short',month:'short'}))}</span>` : ''}</span>
            <span class="post-title" role="heading" aria-level="3">${escape(offer.title)}</span>
            <span class="post-subtitle">${escape(offer.subtitle)}</span>
            <span class="post-overlay-meta"><span class="post-duration">${icon('clock')}${escape(offer.duration)}</span><span class="post-price"><strong>${escape(money(offer.price))}</strong>${offer.originalPrice ? `<del>${escape(money(offer.originalPrice))}</del>` : ''}<small>${offer.price ? (offer.id === 'pizza' ? 'fyrir tvo' : 'fyrir upplifunina') : 'frítt að njóta'}</small></span></span>
          </span>
        </button>
        ${offer.discount ? `<span class="card-tag discount-tag">−${offer.discount}%</span>` : `<span class="card-tag">${escape(offer.tag)}</span>`}
      </div>
      <div class="post-actions">
        <button class="post-save ${saved ? 'is-saved' : ''}" type="button" data-save="${offer.id}" aria-pressed="${saved}" aria-label="${saved ? 'Fjarlægja úr' : 'Vista í'} uppáhaldi: ${escape(offer.title)}">${icon('heart')}<span>${saved ? 'Vistað' : 'Vista'}</span></button>
        <button class="post-details" type="button" data-open="${offer.id}"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></svg><span>Nánar</span></button>
        <button class="post-plan button" type="button" data-open="${offer.id}">${icon('calendar')}Setja á planið</button>
      </div>
    </article>`;
  }
  function renderCategories() {
    const storyImages = {matur:'assets/burger.jpg',tonlist:'assets/concert.jpg',afthreying:'assets/cinema.jpg',utivera:'assets/walk.svg'};
    if ($('#category-filters')) $('#category-filters').innerHTML = categories.map(category => `<button class="category-pill ${state.category === category.id ? 'is-active' : ''}" data-category="${category.id}" aria-pressed="${state.category === category.id}"><span class="story-thumbnail">${storyImages[category.id] ? `<img src="${storyImages[category.id]}" alt="" width="66" height="66">` : icon('all')}</span><span class="story-label">${escape(category.label)}</span></button>`).join('');
  }
  function renderOffers() {
    const filtered = offers.filter(offer => (state.category === 'all' || offer.category === state.category) && (!state.favoritesOnly || state.favorites.has(offer.id)) && normalize(`${offer.title} ${offer.subtitle} ${offer.place} ${offer.categoryLabel}`).includes(normalize(state.query)));
    if ($('#offer-grid')) $('#offer-grid').innerHTML = filtered.map(offer => offerCard(offer)).join('');
    if ($('#offer-count')) $('#offer-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'hugmynd' : 'hugmyndir'}`;
    if ($('#empty-offers')) $('#empty-offers').hidden = filtered.length > 0;
    if ($('#reset-filters')) $('#reset-filters').hidden = !(state.query || state.category !== 'all' || state.favoritesOnly);
    if ($('#active-filters')) {
      $('#active-filters').textContent = state.favoritesOnly ? 'Uppáhaldið þitt' : '';
      $('#active-filters').hidden = !state.favoritesOnly;
    }
    renderCategories();
    updateCounts();
  }
  function isWeekend(date) {
    const startOffset = weekendOffset();
    const start = dateAt(startOffset);
    const end = dateAt(startOffset + 1);
    return date >= start && date <= end;
  }
  function renderEvents() {
    const filters = [{id:'all',label:'Allt fram undan'},{id:'today',label:'Í dag'},{id:'tomorrow',label:'Á morgun'},{id:'weekend',label:'Um helgina'}];
    if ($('#event-filters')) $('#event-filters').innerHTML = filters.map(filter => `<button class="category-pill ${state.eventFilter === filter.id ? 'is-active' : ''}" data-event-filter="${filter.id}" aria-pressed="${state.eventFilter === filter.id}">${escape(filter.label)}</button>`).join('');
    const events = offers.filter(offer => offer.fixedDate).filter(offer => state.eventFilter === 'all' || (state.eventFilter === 'today' && offerDate(offer) === today) || (state.eventFilter === 'tomorrow' && offerDate(offer) === dateAt(1)) || (state.eventFilter === 'weekend' && isWeekend(offerDate(offer)))).sort((a,b) => offerDate(a).localeCompare(offerDate(b)));
    if ($('#event-list')) $('#event-list').innerHTML = events.length ? events.map(offer => offerCard(offer, {event:true})).join('') : '<div class="empty-state event-empty"><h3>Rólegt á dagskránni.</h3><p>Engir sýniviðburðir passa við þessa daga. Skoðaðu allt sem er fram undan.</p><button class="button button-primary" data-event-filter="all">Sjá alla viðburði</button></div>';
    if ($('#event-count')) $('#event-count').textContent = `${events.length} ${events.length === 1 ? 'viðburður' : 'viðburðir'}`;
  }
  function renderMap() {
    const selected = offerById(state.mapId) || offers[0];
    if (!selected) return;
    if ($('#map-pins')) $('#map-pins').innerHTML = offers.map((offer, index) => `<button class="map-pin ${offer.id === selected.id ? 'is-selected' : ''}" style="left:${offer.x}%;top:${offer.y}%" data-map="${offer.id}" aria-label="${escape(offer.title)} á ${escape(offer.place)}" aria-pressed="${offer.id === selected.id}">${icon(offer.category)}<span>${index + 1}</span></button>`).join('');
    if ($('#map-list')) $('#map-list').innerHTML = offers.map(offer => `<button class="map-list-item ${offer.id === selected.id ? 'is-selected' : ''}" data-map="${offer.id}" aria-pressed="${offer.id === selected.id}"><img src="${escape(offer.image)}" alt="" width="64" height="64"><span class="map-item-copy"><strong>${escape(offer.title)}</strong><small>${escape(offer.place)}</small></span><span class="map-item-price">${escape(money(offer.price))}</span></button>`).join('');
    if ($('#map-detail')) $('#map-detail').innerHTML = `<div class="map-selected-card"><img src="${escape(selected.image)}" alt="${escape(selected.imageAlt)}" width="160" height="110"><div><span class="card-category">${escape(selected.categoryLabel)}</span><h3>${escape(selected.title)}</h3><p>${escape(selected.address)}</p><strong>${escape(money(selected.price))}</strong></div><button class="button button-primary" data-open="${selected.id}">Skoða ${icon('arrow')}</button></div>`;
  }
  function renderPlan() {
    const plans = [...state.plans].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    if ($('#plan-list')) $('#plan-list').innerHTML = plans.map(plan => {
      const offer = offerById(plan.id);
      return `<article class="plan-card"><img src="${escape(offer.image)}" alt="${escape(offer.imageAlt)}" width="160" height="140"><div class="plan-card-copy"><span class="plan-date-tag">${icon('calendar')}${escape(displayDate(plan.date, {weekday:'short'}))} · ${escape(plan.time)}</span><h3>${escape(offer.title)}</h3><p>${escape(offer.place)} · ${escape(offer.duration)}</p><strong>${escape(money(offer.price))}</strong></div><div class="plan-card-actions"><button class="button button-secondary" data-open="${offer.id}">Breyta</button><button class="remove-plan" data-remove-plan="${offer.id}" aria-label="Fjarlægja ${escape(offer.title)} úr plani">${icon('remove')}</button></div></article>`;
    }).join('');
    if ($('#empty-plan')) $('#empty-plan').hidden = plans.length > 0;
    const total = plans.reduce((sum, plan) => sum + offerById(plan.id).price, 0);
    if ($('#plan-summary')) $('#plan-summary').innerHTML = `<h2>Yfirlit</h2><div class="summary-row"><span>Hugmyndir á planinu</span><strong>${plans.length}</strong></div><div class="summary-row"><span>Áætlaður kostnaður</span><strong>${plans.length ? escape(money(total)) : '0 kr.'}</strong></div><p>Áætlun samkvæmt sýnigögnum. Endanlegt verð og framboð væri staðfest hjá hverjum stað.</p>`;
    if ($('#export-plan')) $('#export-plan').disabled = !plans.length;
    updateCounts();
  }
  function setRoute(route, {focus = false, updateHash = true} = {}) {
    if (!['discover','events','map','plan'].includes(route)) route = 'discover';
    state.route = route;
    $$('[id^="view-"]').forEach(view => { view.hidden = view.id !== `view-${route}`; });
    $$('[data-nav]').forEach(button => {
      const active = button.dataset.nav === route;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.body.dataset.view = route;
    const titles = {discover:'Fyrir þig',events:'Viðburðir',map:'Kortið',plan:'Planið mitt'};
    document.title = `${titles[route]} · Hvað á að gera?`;
    if (route === 'map') renderMap();
    if (route === 'plan') renderPlan();
    if (updateHash && location.hash !== `#${route}`) {
      try { history.pushState(null, '', `#${route}`); }
      catch { location.hash = route; }
    }
    if (focus) {
      const heading = $(`#view-${route} h1`);
      if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
      window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
  }
  function showDialog(dialog) {
    if (!dialog || dialog.open) return;
    if ($('#random-dialog')?.open && dialog !== $('#random-dialog')) $('#random-dialog').close();
    dialog.showModal();
  }
  function showDetails(id) {
    const offer = offerById(id);
    const dialog = $('#detail-dialog');
    if (!offer || !dialog || !$('#detail-content')) return;
    state.detailId = id;
    const planned = state.plans.find(plan => plan.id === id);
    const saved = state.favorites.has(id);
    const eventDate = offerDate(offer);
    const times = [...new Set(offer.times || ['18:00'])].sort();
    let selectedDate = offer.fixedDate ? eventDate : (planned?.date >= today ? planned.date : eventDate);
    if (!offer.fixedDate && selectedDate < today) selectedDate = today;
    if (!offer.fixedDate && selectedDate === today && !times.some(time => slotIsFuture(today, time))) selectedDate = dateAt(1);
    $('#detail-content').innerHTML = `<div class="detail-layout"><div class="detail-visual"><img src="${escape(offer.image)}" alt="${escape(offer.imageAlt)}" width="800" height="900">${offer.discount ? `<span class="card-tag discount-tag">−${offer.discount}%</span>` : ''}<button class="save-button detail-save ${saved ? 'is-saved' : ''}" data-save="${offer.id}" aria-pressed="${saved}" aria-label="${saved ? 'Fjarlægja úr' : 'Vista í'} uppáhaldi">${icon('heart')}</button></div><div class="detail-main"><button class="dialog-close detail-close" data-close aria-label="Loka upplýsingum">${icon('close')}</button><span class="detail-category">${escape(offer.categoryLabel)} · ${escape(offer.tag)}</span><h2 id="detail-title">${escape(offer.title)}</h2><p class="detail-subtitle">${escape(offer.subtitle)}</p><p class="detail-description">${escape(offer.description)}</p><div class="detail-facts"><div>${icon('pin')}<span><strong>${escape(offer.place)}</strong><small>${escape(offer.address)}</small></span></div><div>${icon('clock')}<span><strong>${escape(offer.duration)}</strong><small>Tími fyrir góða stund</small></span></div>${offer.fixedDate ? `<div>${icon('calendar')}<span><strong>${escape(displayDate(eventDate, {weekday:'long'}))}</strong><small>Dagsetning sýniviðburðar</small></span></div>` : ''}</div><div class="detail-price">${offer.originalPrice ? `<del>${escape(money(offer.originalPrice))}</del>` : ''}<strong>${escape(money(offer.price))}</strong><span>${offer.price ? (offer.id === 'pizza' ? 'fyrir tvo' : 'fyrir upplifunina') : 'enginn aðgangseyrir'}</span></div><form id="plan-form"><div class="plan-fields"><label>${offer.fixedDate ? 'Dagsetning viðburðar' : 'Dagsetning'}<input id="plan-date" type="date" min="${offer.fixedDate ? eventDate : today}" ${offer.fixedDate ? `max="${eventDate}" readonly aria-readonly="true"` : ''} value="${escape(selectedDate)}" required></label><label>Tími<select id="plan-time" required aria-describedby="plan-slot-note">${times.map(time => `<option value="${escape(time)}" ${time === (planned?.time || times[0]) ? 'selected' : ''}>${escape(time)}</option>`).join('')}</select></label></div><p class="detail-note" id="plan-slot-note" role="status"></p><div class="detail-actions"><button class="button button-primary" id="add-plan" type="submit">${icon(planned ? 'check' : 'calendar')}${planned ? 'Uppfæra planið' : 'Bæta við planið'}</button><button class="button button-secondary" type="button" data-show-map="${offer.id}">${icon('pin')}Sjá á korti</button></div></form><p class="detail-note">Sýnigögn. Að bæta við plan vistar hugmyndina hjá þér; það bókar ekki hjá staðnum.</p></div></div>`;
    const updateSlots = () => {
      const dateInput = $('#plan-date');
      const timeInput = $('#plan-time');
      const previousTime = timeInput.value;
      let date = dateInput.value;
      let advanced = false;
      if (!offer.fixedDate && date === today && !times.some(time => slotIsFuture(date, time))) {
        date = dateAt(1);
        dateInput.value = date;
        advanced = true;
      }
      const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && (!offer.fixedDate || date === eventDate);
      const slots = dateValid ? times.filter(time => slotIsFuture(date, time)) : [];
      timeInput.innerHTML = slots.length ? slots.map(time => `<option value="${escape(time)}">${escape(time)}</option>`).join('') : '<option value="">Engir tímar eftir</option>';
      timeInput.value = slots.includes(previousTime) ? previousTime : (slots[0] || '');
      timeInput.disabled = slots.length === 0;
      $('#add-plan').disabled = slots.length === 0;
      $('#plan-slot-note').textContent = !dateValid ? 'Veldu gilda dagsetningu í dag eða síðar.' : !slots.length ? 'Allir tímar þessa sýniviðburðar eru liðnir. Skoðaðu aðra hugmynd fyrir næsta plan.' : advanced ? `Tímar dagsins eru liðnir. Næsti dagur er ${displayDate(date)}.` : offer.fixedDate ? 'Viðburðurinn fer fram á þessari dagsetningu. Veldu einn af tímunum sem eru eftir.' : '';
    };
    $('#plan-date').addEventListener('change', updateSlots);
    updateSlots();
    $('#plan-form').addEventListener('submit', event => {
      event.preventDefault();
      const date = $('#plan-date').value;
      const time = $('#plan-time').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || (offer.fixedDate && date !== eventDate) || !times.includes(time) || !slotIsFuture(date, time)) {
        updateSlots();
        toast('Þessi tími er ekki í boði. Veldu gilda dagsetningu og tíma fram undan.');
        return;
      }
      state.plans = state.plans.filter(plan => plan.id !== offer.id);
      state.plans.push({id:offer.id,date,time});
      const savedLocally = persist();
      renderPlan();
      dialog.close();
      setRoute('plan', {focus:true});
      if (savedLocally) toast(`${offer.title} er komið á planið þitt.`);
    });
    dialog.setAttribute('aria-labelledby', 'detail-title');
    showDialog(dialog);
  }
  function toggleFavorite(id) {
    if (!offerById(id)) return;
    const wasSaved = state.favorites.has(id);
    if (wasSaved) state.favorites.delete(id);
    else state.favorites.add(id);
    const active = document.activeElement;
    const detailFocused = Boolean(active?.closest('#detail-dialog'));
    const savedLocally = persist();
    renderOffers();
    renderEvents();
    $$(`[data-save="${id}"]`).forEach(button => {
      button.classList.toggle('is-saved', !wasSaved);
      button.setAttribute('aria-pressed', String(!wasSaved));
      button.setAttribute('aria-label', `${wasSaved ? 'Vista í' : 'Fjarlægja úr'} uppáhaldi: ${offerById(id).title}`);
    });
    if (detailFocused) $(`#detail-dialog [data-save="${id}"]`)?.focus({preventScroll:true});
    else $(`#view-${state.route} [data-save="${id}"]`)?.focus({preventScroll:true});
    if (savedLocally) toast(wasSaved ? 'Hugmynd fjarlægð úr uppáhaldi.' : 'Hugmynd vistuð í uppáhaldi.');
  }
  function openRandom() {
    if ($('#random-category')) {
      const value = $('#random-category').value;
      $('#random-category').innerHTML = categories.map(category => `<option value="${category.id}">${escape(category.id === 'all' ? 'Allt kemur til greina' : category.label)}</option>`).join('');
      if (categories.some(category => category.id === value)) $('#random-category').value = value;
    }
    showDialog($('#random-dialog'));
  }
  function spin() {
    if (state.spinning) return;
    const category = $('#random-category')?.value || 'all';
    const budget = $('#random-budget')?.value || 'all';
    const candidates = offers.filter(offer => (category === 'all' || offer.category === category) && (budget === 'all' || offer.price <= Number(budget)) && (!offer.fixedDate || offer.times.some(time => slotIsFuture(offerDate(offer), time))));
    const result = $('#random-result');
    if (!candidates.length) {
      if (result) result.innerHTML = '<div class="random-result-empty"><strong>Ekkert passar alveg núna.</strong><p>Prófaðu annan flokk eða hærra verðbil.</p></div>';
      return;
    }
    state.spinning = true;
    const button = $('#spin-button');
    if (button) { button.disabled = true; button.textContent = 'Veljum gott plan…'; }
    if (result) result.innerHTML = '<p class="random-spinning" role="status">Smá tilviljun. Mikið til að hlakka til.</p>';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    const categoryIndex = ['matur','tonlist','afthreying','utivera'].indexOf(winner.category);
    const targetRotation = ((315 - 90 * categoryIndex) % 360 + 360) % 360;
    state.wheelRotation += 1080 + ((targetRotation - state.wheelRotation % 360 + 360) % 360);
    if ($('#random-wheel')) {
      $('#random-wheel').style.transition = reduced ? 'none' : 'transform 1.3s cubic-bezier(.15,.72,.18,1)';
      $('#random-wheel').style.transform = `rotate(${state.wheelRotation}deg)`;
    }
    setTimeout(() => {
      state.spinning = false;
      if (button) { button.disabled = false; button.innerHTML = `${icon('all')} Velja aftur`; }
      if (result) result.innerHTML = `<div class="random-result-card"><img src="${escape(winner.image)}" alt="${escape(winner.imageAlt)}" width="88" height="88"><div><span class="card-category">Þetta varð fyrir valinu</span><h3>${escape(winner.title)}</h3><p>${escape(winner.place)} · ${escape(money(winner.price))}</p></div><button class="button button-primary" data-open="${winner.id}">Skoða ${icon('arrow')}</button></div>`;
    }, reduced ? 30 : 1350);
  }
  function exportPlan() {
    if (!state.plans.length) return;
    const icsEscape = text => String(text).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const stamp = date => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Hvad a ad gera//AI concept//IS','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Planið mitt'];
    state.plans.forEach(plan => {
      const offer = offerById(plan.id);
      const start = new Date(`${plan.date}T${plan.time}:00Z`);
      const numericDuration = Number.parseFloat(offer.duration.replace(',', '.')) || 90;
      const duration = /klst/i.test(offer.duration) ? numericDuration * 60 : numericDuration;
      const end = new Date(start.getTime() + duration * 60000);
      lines.push('BEGIN:VEVENT',`UID:${plan.id}-${plan.date}-${plan.time.replace(':','')}@hvadadgera-concept.local`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${icsEscape(offer.title)}`,`LOCATION:${icsEscape(`${offer.place}, ${offer.address}`)}`,`DESCRIPTION:${icsEscape(`${offer.description}\nSýnigögn úr AI concept. Þetta er vistað plan, ekki staðfest bókun.`)}`,'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    // RFC 5545 limits physical content lines to 75 UTF-8 octets.
    // Iterate code points so a multibyte Icelandic character is never split.
    const encoder = new TextEncoder();
    const foldLine = line => {
      const folded = [];
      let part = '', octets = 0;
      for (const character of line) {
        const width = encoder.encode(character).length;
        if (octets + width > 75) {
          folded.push(part);
          part = ' ';
          octets = 1;
        }
        part += character;
        octets += width;
      }
      folded.push(part);
      return folded.join('\r\n');
    };
    const blob = new Blob([lines.map(foldLine).join('\r\n') + '\r\n'], {type:'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'planid-mitt.ics';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Dagatalskráin er tilbúin til að opna í dagatalinu þínu.');
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button, a[data-nav]');
    if (!button) return;
    if (button.dataset.nav) setRoute(button.dataset.nav, {focus:true});
    else if (button.dataset.open) showDetails(button.dataset.open);
    else if (button.dataset.save) toggleFavorite(button.dataset.save);
    else if (button.dataset.category) { state.category = button.dataset.category; renderOffers(); $(`[data-category="${state.category}"]`)?.focus({preventScroll:true}); }
    else if (button.dataset.eventFilter) { state.eventFilter = button.dataset.eventFilter; renderEvents(); $(`[data-event-filter="${state.eventFilter}"]`)?.focus({preventScroll:true}); }
    else if (button.dataset.map) {
      state.mapId = button.dataset.map;
      const onPin = button.classList.contains('map-pin');
      renderMap();
      $(`${onPin ? '#map-pins' : '#map-list'} [data-map="${state.mapId}"]`)?.focus({preventScroll:true});
    }
    else if (button.dataset.showMap) { state.mapId = button.dataset.showMap; $('#detail-dialog')?.close(); setRoute('map', {focus:true}); }
    else if (button.dataset.removePlan) {
      const id = button.dataset.removePlan;
      state.plans = state.plans.filter(plan => plan.id !== id);
      const savedLocally = persist();
      renderPlan();
      if (savedLocally) toast('Hugmynd fjarlægð úr planinu.');
    }
    else if (button.hasAttribute('data-close')) button.closest('dialog')?.close();
    else if (button.dataset.action === 'random') openRandom();
    else if (button.dataset.action === 'favorites') { state.favoritesOnly = !state.favoritesOnly; state.category = 'all'; state.query = ''; if ($('#search-input')) $('#search-input').value = ''; renderOffers(); setRoute('discover', {focus:true}); }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || state.route !== 'discover') return;
    if (event.target.closest?.('input, select, textarea, [contenteditable]') || $('dialog[open]')) return;
    const search = $('#search-input');
    if (search) { event.preventDefault(); search.focus(); }
  });
  $('#search-input')?.addEventListener('input', event => { state.query = event.target.value; renderOffers(); });
  $('#reset-filters')?.addEventListener('click', () => { state.category = 'all'; state.query = ''; state.favoritesOnly = false; if ($('#search-input')) $('#search-input').value = ''; renderOffers(); $('#search-input')?.focus(); });
  $('#spin-button')?.addEventListener('click', spin);
  $('#export-plan')?.addEventListener('click', exportPlan);
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  const restoreRoute = () => {
    const route = location.hash.slice(1);
    if (['discover','events','map','plan'].includes(route)) setRoute(route, {updateHash:false});
    else if (!route) setRoute('discover', {updateHash:false});
  };
  window.addEventListener('hashchange', restoreRoute);
  window.addEventListener('popstate', restoreRoute);
  renderOffers();
  renderEvents();
  renderMap();
  renderPlan();
  setRoute(location.hash.slice(1) || 'discover', {updateHash:false});
  if (!storageAvailable) setTimeout(() => toast('Vistun í vafra er óvirk. Þú getur samt prófað allt meðan síðan er opin.'), 1000);
})();
