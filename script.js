const CONFERENTES = [
  {name:"Sthefany", quality:"bom"},
  {name:"Jose", quality:"bom"},
  {name:"Gabriel Proença", quality:"bom"},
  {name:"Higor", quality:"bom"},
  {name:"Marilene", quality:"ruim"},
  {name:"Fabio", quality:"bom"},
  {name:"Gabriel Morais", quality:"bom"},
];

const CARREGADORES = [
  {name:"Jose", quality:"bom"},
  {name:"Gabriel Proença", quality:"bom"},
  {name:"Higor", quality:"bom"},
  {name:"Fabio", quality:"bom"},
  {name:"Gabriel Morais", quality:"bom"},
  {name:"Bruna", quality:"bom"},
  {name:"Rafael", quality:"bom"},
  {name:"Keny", quality:"bom"},
  {name:"Douglas", quality:"ruim"},
  {name:"Dheymes", quality:"ruim"},
  {name:"Ana", quality:"ruim"},
  {name:"Roberto", quality:"ruim"},
  {name:"Evelyn", quality:"ruim"},
  {name:"Ketelyn", quality:"ruim"},
  {name:"Marilene", quality:"ruim"},
];

// Docas atendidas, em ordem de prioridade (volume mais alto primeiro).
// "loaders" = quantos carregadores a doca precisa. "minBons" = mínimo de carregadores bons obrigatório.
const DOCKS = [
  { code:"SSP15", volume:"Alto",        loaders:3, minBons:2 },
  { code:"SSP46", volume:"Alto",        loaders:3 },
  { code:"SSP20", volume:"Alto",        loaders:3 },
  { code:"SSP38", volume:"Médio",       loaders:2 },
  { code:"SSP17", volume:"Razoável",    loaders:2 },
  { code:"SSP48", volume:"Baixo",       loaders:1 },
  { code:"SSP51", volume:"Muito baixo", loaders:1 },
];

// Pares que precisam cair na mesma equipe pelo menos 1x por semana
const FORCED_PAIRS = ["Sthefany", "Evelyn", "Roberto", "Marilene"]; // sempre pareados com "Ana"
const SAVE_PASSWORD = "leoleo";

// Referência informativa: o ideal é cada conferente ficar com pelo menos 2 docas.
// Isso NÃO limita mais quantos conferentes a pessoa pode escolher — é só usado para
// gerar um aviso quando a escolha feita deixar alguém com menos docas que o ideal.
const MIN_DOCAS_POR_CONFERENTE = 2;

function slug(prefix, name){
  return prefix + '-' + name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
}

function renderRoster(listEl, people, prefix){
  listEl.innerHTML = '';
  [...people].sort((a,b)=>a.name.localeCompare(b.name)).forEach(p=>{
    const id = slug(prefix, p.name);
    const li = document.createElement('li');
    li.className = 'roster-item';
    li.innerHTML = `
      <input type="checkbox" id="${id}" checked data-name="${p.name}" data-quality="${p.quality}">
      <label for="${id}">${p.name}</label>
    `;
    listEl.appendChild(li);
  });
}

const confListEl = document.getElementById('conf-list');
const cargListEl = document.getElementById('carg-list');
renderRoster(confListEl, CONFERENTES, 'conf');
renderRoster(cargListEl, CARREGADORES, 'carg');

document.getElementById('marcar-todos').addEventListener('click', ()=>{
  document.querySelectorAll('#conf-list input[type=checkbox]').forEach(cb=>{ cb.checked = true; cb.dispatchEvent(new Event('change', {bubbles:true})); });
  document.querySelectorAll('#carg-list input[type=checkbox]').forEach(cb=>{
    if(!cb.disabled){ cb.checked = true; cb.dispatchEvent(new Event('change', {bubbles:true})); }
  });
});
document.getElementById('desmarcar-todos').addEventListener('click', ()=>{
  document.querySelectorAll('.roster-list input[type=checkbox]').forEach(cb=>{ cb.checked = false; cb.dispatchEvent(new Event('change', {bubbles:true})); });
});

// Impede marcar a mesma pessoa como conferente e carregadora ao mesmo tempo
function setupExclusivity(){
  const byName = {};
  document.querySelectorAll('#conf-list input[type=checkbox]').forEach(cb=>{ byName[cb.dataset.name] = byName[cb.dataset.name] || {}; byName[cb.dataset.name].conf = cb; });
  document.querySelectorAll('#carg-list input[type=checkbox]').forEach(cb=>{ byName[cb.dataset.name] = byName[cb.dataset.name] || {}; byName[cb.dataset.name].carg = cb; });

  Object.values(byName).forEach(pair=>{
    if(!pair.conf || !pair.carg) return;
    const li_conf = pair.conf.closest('.roster-item');
    const li_carg = pair.carg.closest('.roster-item');

    pair.conf.addEventListener('change', ()=>{
      if(pair.conf.checked){ pair.carg.checked = false; pair.carg.disabled = true; li_carg.style.opacity = '.4'; }
      else { pair.carg.disabled = false; li_carg.style.opacity = '1'; }
    });
    pair.carg.addEventListener('change', ()=>{
      if(pair.carg.checked){ pair.conf.checked = false; pair.conf.disabled = true; li_conf.style.opacity = '.4'; }
      else { pair.conf.disabled = false; li_conf.style.opacity = '1'; }
    });

    if(pair.conf.checked){ pair.carg.checked = false; pair.carg.disabled = true; li_carg.style.opacity = '.4'; }
  });
}
setupExclusivity();

const qtdConferentesInput = document.getElementById('qtd-conferentes-input');
let qtdConferentesTocadoPeloUsuario = false;

// O limite agora é só o total de conferentes marcados no checklist — a pessoa escolhe
// livremente quantos deles vão atuar hoje (1, 4, 5, todos... o que ela quiser).
function syncQtdConferentes(){
  const checkedCount = getChecked(confListEl).length || 1;
  qtdConferentesInput.max = checkedCount;
  if(!qtdConferentesTocadoPeloUsuario){
    // ainda não foi editado à mão: acompanha o total de conferentes marcados
    qtdConferentesInput.value = checkedCount;
  } else if(Number(qtdConferentesInput.value) > checkedCount){
    // foi editado, mas ficou maior que o total marcado agora: reduz só pra caber no checklist
    qtdConferentesInput.value = checkedCount;
  }
}
confListEl.addEventListener('change', syncQtdConferentes);
qtdConferentesInput.addEventListener('input', ()=>{ qtdConferentesTocadoPeloUsuario = true; });
qtdConferentesInput.addEventListener('change', ()=>{
  qtdConferentesTocadoPeloUsuario = true;
  let v = parseInt(qtdConferentesInput.value, 10);
  const max = Number(qtdConferentesInput.max) || 1;
  if(!Number.isFinite(v) || v < 1) v = 1;
  if(v > max) v = max;
  qtdConferentesInput.value = v;
});
syncQtdConferentes();

function getChecked(listEl){
  return [...listEl.querySelectorAll('input[type=checkbox]:checked')].map(cb=>({ name: cb.dataset.name, quality: cb.dataset.quality }));
}

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}

function dateStr(d){ return d.toISOString().slice(0,10); }
function pairKey(a,b){ return [a,b].sort().join('__'); }

function isoWeekKey(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-dayNum+3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(),0,4));
  const week = 1 + Math.round(((d - firstThursday)/86400000 - 3 + ((firstThursday.getUTCDay()+6)%7))/7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

function daysBetween(d1,d2){ return Math.round((d2-d1)/86400000); }

function formatDateShort(iso){ const [y,m,d]=iso.split('-'); return `${d}/${m}`; }
function formatDatePt(iso){
  const dt = new Date(iso+'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' });
}

async function getPairHistory(){
  try{
    const res = await window.storage.get('pair-history', true);
    return res ? JSON.parse(res.value) : {};
  }catch(e){ return {}; }
}
async function savePairHistory(hist){
  try{ await window.storage.set('pair-history', JSON.stringify(hist), true); }catch(e){ console.error(e); }
}

function decideForcedPair(history, key, today){
  const entry = history[key] || {};
  const weekKey = isoWeekKey(today);
  const metThisWeek = !!(entry.weeksMet && entry.weeksMet[weekKey]);
  if(metThisWeek) return { force:false, urgency:-1 };
  const last = entry.lastDate ? new Date(entry.lastDate+'T00:00:00') : null;
  const daysSince = last ? daysBetween(last, today) : 999;
  const dow = today.getDay();
  const mondayIndex = (dow+6)%7; // segunda=0 ... domingo=6
  const isLastChance = mondayIndex === 6; // domingo, último dia da semana
  const randomTrigger = Math.random() < 0.35;
  const force = isLastChance || daysSince >= 5 || randomTrigger;
  const urgency = (isLastChance ? 1000 : 0) + daysSince;
  return { force, urgency };
}

function findTeamIndexOf(teams, name){
  for(let i=0;i<teams.length;i++){
    const t = teams[i];
    if(t.conferente && t.conferente.name===name) return i;
    if(t.carregadores.some(c=>c.name===name)) return i;
  }
  return -1;
}

function forcePairing(teams, partnerName, movName){
  const idxPartner = findTeamIndexOf(teams, partnerName);
  const idxMov = findTeamIndexOf(teams, movName);
  if(idxPartner===-1 || idxMov===-1 || idxPartner===idxMov) return;
  const teamMov = teams[idxMov];
  const teamPartner = teams[idxPartner];
  const pos = teamMov.carregadores.findIndex(c=>c.name===movName);
  if(pos===-1) return;
  const [moved] = teamMov.carregadores.splice(pos,1);
  teamPartner.carregadores.push(moved);
}

async function gerarEscala(){
  const msg = document.getElementById('msg');
  msg.textContent = '';
  document.getElementById('save-msg').textContent = '';

  const confPresentes = shuffle(getChecked(confListEl));
  const cargPresentes = getChecked(cargListEl);

  if(confPresentes.length === 0){ msg.style.color='var(--red)'; msg.textContent = 'Selecione ao menos um conferente presente.'; return; }
  if(cargPresentes.length === 0){ msg.style.color='var(--red)'; msg.textContent = 'Selecione ao menos um carregador presente.'; return; }

  const bons = shuffle(cargPresentes.filter(p=>p.quality==='bom'));
  const ruins = shuffle(cargPresentes.filter(p=>p.quality==='ruim'));

  // A quantidade de conferentes que vai atuar hoje é escolha da pessoa (campo "Conferentes
  // hoje"). O único limite é o total de conferentes marcados como presentes no checklist —
  // esse checklist já é a validação da quantidade disponível. Não existe mais corte automático
  // baseado em "2 docas por conferente".
  let qtdConferentes = parseInt(qtdConferentesInput.value, 10);
  if(!Number.isFinite(qtdConferentes) || qtdConferentes < 1) qtdConferentes = confPresentes.length;
  qtdConferentes = Math.min(qtdConferentes, confPresentes.length);
  const confAtivos = confPresentes.slice(0, qtdConferentes);

  // Distribui as docas em rodízio (round-robin) entre os conferentes ativos, seguindo a ordem
  // de prioridade (volume mais alto primeiro). Isso intercala doca de volume alto com volume
  // baixo entre as pessoas. Se a pessoa escolher mais conferentes do que docas existem, os
  // conferentes excedentes entram na equipe sem doca própria (ficam de reforço/folga) — é uma
  // escolha da pessoa e a tabela reflete isso normalmente, sem travar a geração.
  const teams = confAtivos.map(conferente => ({ docas:[], volumes:[], loaders:0, minBons:0, conferente, carregadores:[] }));
  DOCKS.forEach((d, i)=>{
    const team = teams[i % teams.length];
    team.docas.push(d.code);
    team.volumes.push(d.volume);
    team.loaders = Math.max(team.loaders, d.loaders);
    team.minBons = Math.max(team.minBons, d.minBons||0);
  });

  let bi=0, ri=0;
  teams.forEach(team=>{
    // garante primeiro o mínimo de carregadores bons exigido pelo grupo (ex: quem cobre a SSP15)
    let bonsGiven = 0;
    while(bonsGiven < team.minBons && bi < bons.length && team.carregadores.length < team.loaders){
      team.carregadores.push(bons[bi++]); bonsGiven++;
    }
    // completa o restante das vagas, alternando bom/ruim
    while(team.carregadores.length < team.loaders){
      const preferBom = team.carregadores.length % 2 === 0;
      let pick = null;
      if(preferBom){ if(bi<bons.length) pick = bons[bi++]; else if(ri<ruins.length) pick = ruins[ri++]; }
      else { if(ri<ruins.length) pick = ruins[ri++]; else if(bi<bons.length) pick = bons[bi++]; }
      if(!pick) break;
      team.carregadores.push(pick);
    }
  });

  // sobras vão para as equipes ativas que têm doca, por ordem de prioridade
  const teamsComDoca = teams.filter(t=>t.docas.length > 0);
  let ti = 0, guard = 0;
  while((bi<bons.length || ri<ruins.length) && guard < 2000 && teamsComDoca.length){
    const team = teamsComDoca[ti % teamsComDoca.length];
    if(bi<bons.length) team.carregadores.push(bons[bi++]);
    else if(ri<ruins.length) team.carregadores.push(ruins[ri++]);
    ti++; guard++;
  }

  // Pares obrigatórios (envolvendo Ana)
  const today = new Date();
  const dateKey = dateStr(today);
  const weekKey = isoWeekKey(today);
  const anaPresent = cargPresentes.some(p=>p.name==='Ana');

  if(anaPresent){
    const presentNames = new Set([...confPresentes.map(p=>p.name), ...cargPresentes.map(p=>p.name)]);
    const history = await getPairHistory();
    const candidates = [];
    FORCED_PAIRS.forEach(partner=>{
      if(!presentNames.has(partner)) return;
      const { force, urgency } = decideForcedPair(history, pairKey(partner,'Ana'), today);
      if(force) candidates.push({ partner, urgency });
    });
    if(candidates.length){
      candidates.sort((a,b)=>b.urgency-a.urgency);
      forcePairing(teams, candidates[0].partner, 'Ana');
    }
  }

  // avisos (informativos — nunca bloqueiam a geração da escala)
  const warnings = [];

  const semDoca = teams.filter(t=>t.docas.length === 0);
  if(semDoca.length){
    warnings.push(`${semDoca.length} conferente(s) ficaram sem doca própria hoje (mais conferentes do que docas): ${semDoca.map(t=>t.conferente.name).join(', ')}.`);
  }

  const abaixoDoIdeal = teams.filter(t=>t.docas.length > 0 && t.docas.length < MIN_DOCAS_POR_CONFERENTE);
  if(abaixoDoIdeal.length){
    warnings.push(`Ideal é ${MIN_DOCAS_POR_CONFERENTE}+ docas por conferente — ficaram abaixo disso: ${abaixoDoIdeal.map(t=>t.conferente.name).join(', ')}.`);
  }

  const semCarregadores = teams.filter(t=>t.carregadores.length < t.loaders);
  if(semCarregadores.length){ warnings.push(`Carregadores insuficientes em: ${semCarregadores.map(t=>t.docas.join('/')||t.conferente.name).join(', ')}.`); }

  const ssp15 = teams.find(t=>t.docas.includes('SSP15'));
  if(ssp15){
    const bonsCount = ssp15.carregadores.filter(c=>c.quality==='bom').length;
    if(bonsCount < ssp15.minBons){ warnings.push(`SSP15 ficou com apenas ${bonsCount} carregador(es) reforçado(s) — precisa de pelo menos ${ssp15.minBons}.`); }
  }

  msg.style.color = 'var(--red)';
  msg.textContent = warnings.join(' ');

  window.__draft = { teams, dateKey, weekKey };
  renderTable(teams, { saved:false, date: dateKey });
}

function renderTable(teams, meta){
  const wrap = document.getElementById('teams-table-wrap');
  const rows = teams.map(t=>{
    const conf = t.conferente ? t.conferente.name : '—';
    const docaCell = t.docas.length ? t.docas.join('/') : '—';
    const volumeCell = t.volumes.length ? [...new Set(t.volumes)].join(' / ') : '—';
    const carg = t.carregadores.length ? t.carregadores.map(c=>c.name).join(', ') : '—';
    return `<tr><td class="col-doca">${docaCell}</td><td>${volumeCell}</td><td class="col-conf">${conf}</td><td class="col-carg">${carg}</td></tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="teams-table">
      <thead>
        <tr><th colspan="4">PLANEJAMENTO DT. ${formatDateShort(meta.date)}</th></tr>
        <tr><th colspan="4">EQUIPE POR DOCA</th></tr>
        <tr><th>DOCA</th><th>VOLUME</th><th>CONFERENTE</th><th>CARREGADORES</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="4">STAGE ZONE = Maria Lucia - Yanetxhi - Gracy</td></tr>
      </tfoot>
    </table>
  `;

  const tag = document.getElementById('status-tag');
  if(meta.saved){ tag.className = 'status-tag saved'; tag.textContent = `Escala oficial · salva em ${formatDatePt(meta.date)}`; }
  else { tag.className = 'status-tag draft'; tag.textContent = `Rascunho · ${formatDatePt(meta.date)} · ainda não salva`; }

  document.getElementById('output-section').style.display = 'block';
  document.getElementById('print-btn').style.display = 'inline-block';
  document.getElementById('output-section').scrollIntoView({behavior:'smooth', block:'start'});
}

document.getElementById('gerar-btn').addEventListener('click', gerarEscala);
document.getElementById('print-btn').addEventListener('click', ()=>window.print());

document.getElementById('save-btn').addEventListener('click', ()=>{
  document.getElementById('pass-panel').style.display = 'flex';
  document.getElementById('pass-input').focus();
});
document.getElementById('pass-cancel').addEventListener('click', ()=>{
  document.getElementById('pass-panel').style.display = 'none';
  document.getElementById('pass-input').value = '';
});
document.getElementById('pass-input').addEventListener('keydown', e=>{ if(e.key==='Enter') confirmSave(); });
document.getElementById('pass-confirm').addEventListener('click', confirmSave);

async function confirmSave(){
  const val = document.getElementById('pass-input').value;
  const saveMsg = document.getElementById('save-msg');
  if(val !== SAVE_PASSWORD){ saveMsg.style.color = 'var(--red)'; saveMsg.textContent = 'Senha incorreta.'; return; }
  if(!window.__draft){ saveMsg.style.color = 'var(--red)'; saveMsg.textContent = 'Gere uma escala antes de salvar.'; return; }

  saveMsg.style.color = 'var(--muted)';
  saveMsg.textContent = 'Salvando...';

  try{
    const { teams, dateKey, weekKey } = window.__draft;
    const payload = {
      date: dateKey,
      savedAt: new Date().toISOString(),
      teams: teams.map(t=>({
        docas: t.docas,
        volumes: t.volumes,
        conferente: t.conferente ? t.conferente.name : null,
        carregadores: t.carregadores.map(c=>c.name)
      }))
    };
    await window.storage.set('escala:'+dateKey, JSON.stringify(payload), true);

    const hist = await getPairHistory();
    FORCED_PAIRS.forEach(partner=>{
      const key = pairKey(partner, 'Ana');
      const together = teams.some(t=>{
        const names = [t.conferente ? t.conferente.name : null, ...t.carregadores.map(c=>c.name)];
        return names.includes(partner) && names.includes('Ana');
      });
      if(together){
        hist[key] = hist[key] || {};
        hist[key].lastDate = dateKey;
        hist[key].weeksMet = hist[key].weeksMet || {};
        hist[key].weeksMet[weekKey] = true;
      }
    });
    await savePairHistory(hist);

    saveMsg.style.color = 'var(--green)';
    saveMsg.textContent = 'Escala salva! Todos já podem visualizar.';
    document.getElementById('pass-panel').style.display = 'none';
    document.getElementById('pass-input').value = '';
    renderTable(teams, { saved:true, date:dateKey });
    refreshSavedList();
  }catch(e){
    saveMsg.style.color = 'var(--red)';
    saveMsg.textContent = 'Erro ao salvar. Tente novamente.';
  }
}

function payloadToTeams(data){
  return data.teams.map(t=>({
    docas: t.docas || (t.doca ? [t.doca] : []),
    volumes: t.volumes || (t.volume ? [t.volume] : []),
    conferente: t.conferente ? { name:t.conferente } : null,
    carregadores: (t.carregadores || []).map(n=>({ name:n }))
  }));
}

async function refreshSavedList(){
  const sel = document.getElementById('saved-select');
  sel.innerHTML = '<option value="">Selecione uma data</option>';
  try{
    const res = await window.storage.list('escala:', true);
    const keys = (res && res.keys) ? res.keys : [];
    keys.sort().reverse().forEach(k=>{
      const d = k.replace('escala:','');
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = formatDatePt(d);
      sel.appendChild(opt);
    });
  }catch(e){ /* sem escalas salvas ainda */ }
}

document.getElementById('ver-salva-btn').addEventListener('click', async ()=>{
  const key = document.getElementById('saved-select').value;
  if(!key) return;
  try{
    const res = await window.storage.get(key, true);
    if(!res) return;
    const data = JSON.parse(res.value);
    renderTable(payloadToTeams(data), { saved:true, date:data.date });
  }catch(e){ /* ignora */ }
});

(async function init(){
  const todayKey = 'escala:' + dateStr(new Date());
  try{
    const res = await window.storage.get(todayKey, true);
    if(res){
      const data = JSON.parse(res.value);
      renderTable(payloadToTeams(data), { saved:true, date:data.date });
    }
  }catch(e){ /* nenhuma escala salva hoje ainda */ }
  refreshSavedList();
})();
