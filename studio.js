/* Private study workspace. Paper bytes and excerpts never leave this browser. */
(() => {
  const key = 'yuna-studio-v1', E = escapeHtml;
  const topics = [...new Set(lessons.map(l => l.theme))];
  let state;
  try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch { state = {}; }
  state.prefs ||= Object.fromEntries(topics.map(t => [t, {on: t === '科研交流' || t === '日常安排', count: 1}]));
  state.materials ||= []; state.done ||= {}; state.answers ||= {};
  let draft = null, busy = false, selectedMaterial = null, pendingPack = null;
  const baseRender = render, baseMark = mark, baseProgress = updateProgress;
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); return true; }
    catch { toast('保存失败：浏览器空间不足或禁止存储，请先导出备份。'); return false; }
  }
  function today() { return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai'}).format(new Date()); }
  function plan() {
    const d = today(), seed = Number(d.replaceAll('-', ''));
    return topics.filter(t => state.prefs[t]?.on).map(t => {
      const pool = lessons.map((l,i) => ({id:'lesson-'+i, title:l.zh, theme:t, index:i, kind:'builtin'})).filter(x => lessons[x.index].theme === t);
      for (const m of state.materials.filter(m => m.topic === t)) {
        m.modes.forEach(mode => pool.push({id:m.id+'-'+mode, title:m.title+' · '+mode, theme:t, material:m.id, mode, kind:'paper'}));
      }
      const rotated = pool.map((_, i) => pool[(i+seed)%pool.length]);
      return {topic:t, target:state.prefs[t].count, items:rotated.slice(0,state.prefs[t].count)};
    });
  }
  function countDone() { const ids = new Set(state.done[today()] || []); return plan().flatMap(p=>p.items).filter(i=>ids.has(i.id)).length; }
  updateProgress = function() {
    baseProgress(); const items = plan().flatMap(p=>p.items), done=countDone();
    $('#done').textContent=done; $('#done').nextElementSibling.textContent=`/ ${items.length} 条完成`;
    $('#progress').style.width=items.length ? done/items.length*100+'%' : '0%';
    $('#streak').textContent='本机学习空间 · 同一条练习每天只计一次';
  };
  mark = function(type) {
    baseMark(type);
    if (type==='listen' || type==='speak') complete('lesson-'+idx);
  };
  function complete(id) {
    const d=today(); state.done[d] ||= [];
    if(!state.done[d].includes(id)) {
      state.done[d].push(id);
      if(!save()) { state.done[d].pop(); return; }
    }
    updateProgress(); toast('今天的练习已记录');
  }
  const nav=$('.tabs');
  nav.insertAdjacentHTML('afterbegin','<button class="tab" data-tab="plan">今日计划</button>');
  nav.insertAdjacentHTML('beforeend','<button class="tab" data-tab="library">私人素材</button><button class="tab" data-tab="settings">个性化设置</button>');
  document.querySelector('header').insertAdjacentHTML('beforeend','<button class="mini" id="local-space">本机学习空间</button>');
  $('#local-space').onclick=()=>go('settings');
  function go(next) {
    if(recording){toast('请先停止录音。');return;}
    if(tab==='speak' && $('#answer')){saved.notes[idx]=$('#answer').value;persist();}
    if(tab==='paper' && !storeAnswer())return;
    if(busy){toast('素材正在解析，请稍候再切换页面。');return;}
    stopAudio(); tab=next; render();
  }
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
  function heading(pill,title,text) {return `<section class="card studio-intro"><span class="pill">${pill}</span><h2>${title}</h2><p class="subtitle">${text}</p></section>`;}
  function planView() {
    const groups=plan(), done=state.done[today()]||[];
    return heading('为你安排','今天，按自己的节奏。','每条内置课程完成听力或口语任一项即计数；文献练习需写下回答并标记完成。重复完成不重复计数。')+
      (groups.length ? groups.map(g=>`<section class="card studio-section"><div class="studio-between"><h2>${E(g.topic)}</h2><span class="pill">每日目标 ${g.target} 条</span></div>${g.items.map(i=>`<button class="studio-task" data-task="${E(i.id)}"><span><strong>${E(i.title)}</strong><small>${i.kind==='paper'?'私人文献 · 自主表达':'原创双语课程 · 5–10 分钟'}</small></span><span>${done.includes(i.id)?'已完成 ✓':'开始 →'}</span></button>`).join('')}${g.items.length<g.target?`<p class="studio-notice">当前有 ${g.items.length} 条，距离目标还缺 ${g.target-g.items.length} 条。可在私人素材里添加练习；不会用重复内容凑数。</p>`:''}</section>`).join(''):'<div class="card empty">还没有选择话题。<p><button class="primary" id="choose-topics">选择我的话题</button></p></div>');
  }
  function settingsView() {
    return heading('本机保存版','把练习，调成你喜欢的样子。','设置、片段和回答仅保存在此浏览器。当前没有账号登录或云端同步；已分析的学习包可在私人素材中导入。共用设备上的其他使用者可能读到这些资料。')+`<form id="prefs-form" class="card studio-section"><h2>话题与每日数量</h2><p class="subtitle">关闭的话题不进入今日计划；每类可设 1–10 条。修改后立即重新安排今天的计划，已完成记录仍保留。</p>${topics.map((t,i)=>`<div class="studio-setting"><label><input type="checkbox" name="topic-${i}" ${state.prefs[t]?.on?'checked':''}> ${E(t)}</label><label class="small">每天 <input class="studio-number" type="number" name="count-${i}" min="1" max="10" required value="${state.prefs[t]?.count||1}"> 条</label></div>`).join('')}<p><button class="primary" type="submit">保存我的计划</button></p></form><section class="card studio-section"><h2>资料与备份</h2><p class="subtitle">浏览器清理数据会移除本机资料。备份包含你的私人片段和回答，请自行保管。</p><div class="studio-actions"><button class="mini" id="backup">导出学习备份</button><label class="mini studio-file-label">恢复备份<input id="restore" type="file" accept="application/json,.json" hidden></label></div><p class="small">账号登录将在配置认证服务后接入。</p></section>`;
  }
  function libraryView() {
    return heading('只在此浏览器','让读过的论文，变成说得出的英语。','PDF / TXT 在本机解析，原文件不保存、不上传。只保存你确认的片段、出处和练习回答。暂不支持扫描版识别和自动翻译。')+`<section class="card studio-section"><h2>导入已整理的学习包</h2><p class="subtitle">把文献交给聊天助手分析后，在这里导入生成的 JSON 学习包。标题、出处、中文导读、重点翻译和练习一次带入，不用复制原文。文件只在此浏览器读取；导入会追加素材，保留现有笔记和设置。</p><label class="primary studio-file-label">导入学习包<input id="pack-file" type="file" accept=".json,application/json" hidden></label><div id="pack-preview" role="status"></div></section><section class="card studio-section"><h2>自行导入原文（可选）</h2><p class="subtitle">仅导入你有权用于此次学习的内容。合法下载不等于拥有再传播或第三方处理授权；私人保存也不能代替对许可条款的检查。</p><label class="studio-check"><input id="rights" type="checkbox"> 我已检查材料的使用权限，并仅用于本人学习。</label><div class="studio-actions"><label class="primary studio-file-label">选择 PDF / TXT<input id="paper-file" type="file" accept=".pdf,.txt,application/pdf,text/plain" hidden ${busy?'disabled':''}></label><button class="mini" id="paste-material" ${busy?'disabled':''}>粘贴文字或自写笔记</button></div><p class="small" id="import-status" role="status">单文件上限 20 MB，PDF 最多解析前 30 页。可多次导入不同片段。</p><div id="draft-form"></div></section><section class="card studio-section"><h2>我的私人素材 <span class="pill">${state.materials.length} 篇</span></h2>${state.materials.length?state.materials.map(m=>`<div class="studio-material"><div><strong>${E(m.title)}</strong><p class="small">${E(m.author)} · ${E(m.topic)} · ${E(m.location)}<br>${E(m.modes.join(' / '))}</p></div><div class="studio-actions"><button class="mini" data-open-paper="${E(m.id)}">练习</button><button class="mini" data-delete-paper="${E(m.id)}">删除</button></div></div>`).join(''):'<p class="empty">你的素材只属于你。先导入一篇，选取一段，再开始练习。</p>'}</section>`;
  }
  const modes=['论文介绍','会议问答','术语精读'];
  const prompts={
    '论文介绍':[['What question does this study investigate?','这项研究要回答什么问题？'],['How was the study carried out?','使用了什么方法？'],['What can you conclude from this excerpt, and what remains uncertain?','从片段可得出什么结论？哪些还不确定？']],
    '会议问答':[['Why was this approach chosen?','为什么选择这种方法？'],['What evidence supports the claim?','哪些证据支持这个观点？'],['What are the limitations and possible next steps?','有哪些局限和下一步工作？']],
    '术语精读':[['Choose three technical terms and explain each in your own words.','选出三个术语，用自己的话解释。'],['Paraphrase the key point without changing its meaning.','不改变意思，换一种表达概括要点。'],['Which detail is missing from the excerpt?','哪些信息在片段中没有给出？']]
  };
  function exerciseView() {
    const m=state.materials.find(x=>x.id===selectedMaterial?.id);
    if(!m)return heading('私人素材','素材不存在','可能已被删除，请回素材库重新选择。');
    const mode=selectedMaterial.mode, id=m.id+'-'+mode;
    const exercises=m.study?.exercises?.[mode];
    const studyContent=m.study?studyView(m,mode):'';
    return heading('私人素材 · '+E(mode),E(m.title),m.study?'先看中文导读，再练英文表达。参考回答为学习用改写；请结合标注页码核对原论文，区分观察、模型解释与研究启发。':'以下是通用练习问题，不是 AI 对论文的分析。仅依据片段回答，缺失的信息请注明“片段未提供”。')+`<section class="card studio-section"><label>练习方式 <select id="paper-mode">${m.modes.map(x=>`<option ${x===mode?'selected':''}>${x}</option>`).join('')}</select></label><p class="small">${E(m.author)} · ${E(m.location)} · ${E(m.source||'未填写 DOI / 来源')} · ${E(m.license)}</p>${studyContent}${m.excerpt?`<details open><summary>查看你选取的原文片段</summary><p class="studio-excerpt">${E(m.excerpt)}</p></details><button class="mini" id="read-excerpt">朗读片段</button><p class="small">设备合成语音；复杂公式和专业术语的读音可能不准确。</p>`:''}${exercises?'':prompts[mode].map(([en,zh])=>`<div class="line"><strong>${en}</strong><p class="zh">${zh}</p></div>`).join('')}<label for="paper-answer"><h2>我的表达与术语笔记</h2></label><textarea id="paper-answer" maxlength="12000" placeholder="用英文概括，或先写关键词；把你的理解与作者原文区分开。">${E(state.answers[id]||'')}</textarea><div class="studio-actions"><button class="mini" id="save-paper-answer">保存回答</button><button class="primary" id="finish-paper">完成这条练习 ✓</button><button class="mini" id="back-library">返回素材库</button></div></section>`;
  }
  function studyView(m,mode) {
    const s=m.study;
    return `<section class="studio-section"><span class="pill">中文先读</span><h2>一分钟导读</h2><p class="studio-reading">${E(s.summary)}</p><details><summary>看懂方法、数据与边界</summary>${s.sections.map(x=>`<h3>${E(x.heading)}</h3><p class="studio-reading">${E(x.text)}</p><p class="small">${E(x.location)}</p>`).join('')}</details></section><details class="studio-section"><summary>重点句翻译（含原文位置）</summary>${s.translations.map(x=>`<div class="line"><p class="en">${E(x.en)}</p><p class="zh">${E(x.zh)}</p><p class="small">${E(x.location)}</p></div>`).join('')}</details><details class="studio-section"><summary>核心术语</summary>${s.terms.map(x=>`<div class="line"><strong>${E(x.en)} · ${E(x.zh)}</strong><p class="zh">${E(x.note)}</p></div>`).join('')}</details><h2>今天只练这一条</h2>${s.exercises[mode].map((x,i)=>`<div class="line"><p class="en"><strong>${E(x.en)}</strong></p><p class="zh">${E(x.zh)}</p><p class="tip">${E(x.hint)}</p><details><summary>需要帮助时看参考表达</summary><p class="en">${E(x.model_en)}</p><p class="zh">${E(x.model_zh)}</p><button class="mini" data-read-model="${i}">听参考表达</button></details><p class="small">${E(x.location)}</p></div>`).join('')}`;
  }
  render=function() {
    if(!['plan','settings','library','paper'].includes(tab)){baseRender();updateProgress();return;}
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab || (tab==='paper'&&b.dataset.tab==='library')));
    $('#content').innerHTML=tab==='plan'?planView():tab==='settings'?settingsView():tab==='library'?libraryView():exerciseView();
    bindStudio(); updateProgress();
  };
  function showDraft() {
    const box=$('#draft-form'); if(!box || !draft)return;
    box.innerHTML=`<form id="material-form" class="studio-draft"><h2>确认片段与出处</h2><label>论文标题 / 素材名<input name="title" required maxlength="200" value="${E(draft.title)}"></label><label>作者 / 机构<input name="author" required maxlength="200" placeholder="请保留作者署名"></label><label>DOI 或来源说明<input name="source" maxlength="500" placeholder="例如 10.xxxx/xxxx 或自写笔记"></label><div class="grid"><label>话题<select name="topic">${topics.map(t=>`<option ${t==='科研交流'?'selected':''}>${t}</option>`).join('')}</select></label><label>权限依据<select name="license" required><option value="">请选择</option><option>本人原创 / 拥有相应权利</option><option>已获得适用授权</option><option>开放许可允许此次使用（已检查条款）</option><option>已核实适用的个人学习使用依据</option></select></label></div><label>来源位置 / 页码<input name="location" required maxlength="100" value="${E(draft.location)}"></label>${draft.pages?.length?`<label>查看解析页<select id="page-select">${draft.pages.map(p=>`<option value="${p.page}">第 ${p.page} 页</option>`).join('')}</select></label><div class="studio-source-preview" id="page-preview">${E(draft.pages[0].text)}</div><p class="small">从上面的页面选取所需文字，复制到下方。当前不会保存整篇论文。</p>`:''}<label>要练习的片段（最多 3000 字符）<textarea name="excerpt" required maxlength="3000" placeholder="选取一个有上下文的短片段，或粘贴自己写的概括。">${E(draft.text||'')}</textarea></label><fieldset><legend>练习种类</legend>${modes.map(x=>`<label class="studio-check"><input type="checkbox" name="mode" value="${x}" checked> ${x}</label>`).join('')}</fieldset><p class="small">保留署名和许可条件；没有通用的“少于多少字就不侵权”标准。不保存原文件，不提供公开分享。</p><div class="studio-actions"><button class="primary" type="submit">保存为私人练习</button><button class="mini" type="button" id="cancel-import">取消</button></div></form>`;
    $('#cancel-import').onclick=()=>{draft=null;box.innerHTML='';};
    if($('#page-select'))$('#page-select').onchange=e=>{const p=draft.pages.find(p=>p.page===Number(e.target.value));$('#page-preview').textContent=p.text;$('#material-form').elements.location.value='第 '+p.page+' 页';};
    $('#material-form').onsubmit=e=>{
      e.preventDefault(); const f=new FormData(e.target), chosen=f.getAll('mode');
      if(!chosen.length){toast('请至少选择一种练习。');return;}
      if(!$('#rights').checked){toast('请先确认使用权限。');return;}
      if(state.materials.length>=100){toast('最多保存 100 篇片段，请先备份并清理。');return;}
      const m={id:crypto.randomUUID(),title:f.get('title').trim(),author:f.get('author').trim(),source:f.get('source').trim(),location:f.get('location').trim(),topic:f.get('topic'),license:f.get('license'),excerpt:f.get('excerpt').trim(),modes:chosen};
      if(!m.title||!m.author||!m.excerpt||!m.location){toast('请填写标题、作者、位置和片段。');return;}
      state.materials.push(m); if(!save()){state.materials.pop();return;}
      draft=null; render();toast('已保存到本机；可在个性化设置中开启该话题。');
    };
  }
  async function importFile(file) {
    if(!$('#rights').checked){toast('请先确认素材使用权限。');$('#paper-file').value='';return;}
    if(!file)return;
    if(file.size>20*1024*1024){toast('文件超过 20 MB，请选取更小的文件。');return;}
    busy=true;$('#paper-file').disabled=true;$('#paste-material').disabled=true;
    const status=$('#import-status'); status.textContent='正在本机解析…';
    let doc;
    try {
      if(/\.pdf$/i.test(file.name)) {
        const pdf=await import('./pdf.mjs'); pdf.GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.mjs',document.baseURI).href;
        doc=await pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,stopAtErrors:true}).promise;
        const pages=[];
        for(let p=1;p<=Math.min(doc.numPages,30);p++) {
          const page=await doc.getPage(p), content=await page.getTextContent();
          const text=content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('').slice(0,50000);
          if(text.trim())pages.push({page:p,text}); page.cleanup();
          status.textContent=`正在本机解析第 ${p} / ${Math.min(doc.numPages,30)} 页…`;
        }
        if(!pages.length)throw new Error('未找到可提取文字。这可能是扫描版，请先识别文字后粘贴。');
        draft={title:file.name.replace(/\.pdf$/i,''),location:'第 '+pages[0].page+' 页',pages,text:''};
        status.textContent=`已解析 ${pages.length} 页文字${doc.numPages>30?'（仅处理前 30 页）':''}。请检查断行、公式和阅读顺序，再选取片段。`;
      } else if(/\.txt$/i.test(file.name)) {
        const text=await file.text();if(!text.trim())throw new Error('文件没有文字。');
        draft={title:file.name.replace(/\.txt$/i,''),location:'TXT 选取片段',text:text.slice(0,3000)};
        status.textContent=text.length>3000?'已读取前 3000 字符，请自行调整片段。':'文字已读取，请确认片段。';
      } else throw new Error('仅支持 PDF 和 UTF-8 TXT。');
      showDraft();
    } catch(e){status.textContent='导入未完成：'+(e.message||'无法解析此文件。');}
    finally {busy=false;doc?.destroy().catch(()=>{});if($('#paper-file')){$('#paper-file').disabled=false;$('#paste-material').disabled=false;$('#paper-file').value='';}}
  }
  function bindStudio() {
    $('#choose-topics')?.addEventListener('click',()=>go('settings'));
    document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{
      const item=plan().flatMap(p=>p.items).find(i=>i.id===b.dataset.task);
      if(item.kind==='builtin'){idx=item.index;stage=0;choice=null;go('listen');}
      else{selectedMaterial={id:item.material,mode:item.mode};go('paper');}
    });
    $('#prefs-form')?.addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.target), prior=state.prefs;
      state.prefs=Object.fromEntries(topics.map((t,i)=>[t,{on:f.has('topic-'+i),count:Math.min(10,Math.max(1,Number(f.get('count-'+i))||1))}]));
      if(!save()){state.prefs=prior;return;}go('plan');toast('今日计划已更新');
    });
    $('#pack-file')?.addEventListener('change',async e=>{
      const box=$('#pack-preview');
      try {
        pendingPack=null;const file=e.target.files[0];if(!file)return;
        if(file.size>1024*1024)throw Error('学习包不能超过 1 MB');
        pendingPack=YunaLearningPack.parse(JSON.parse(await file.text()),topics);
        const added=pendingPack.materials.filter(m=>!state.materials.some(x=>x.id===m.id));
        if(state.materials.length+added.length>100)throw Error('导入后超过 100 篇素材上限');
        box.innerHTML=`<div class="tip"><strong>${E(pendingPack.title)}</strong><p>新增 ${added.length} 篇素材 / ${added.reduce((n,m)=>n+m.modes.length,0)} 条练习；已存在 ${pendingPack.materials.length-added.length} 篇，自动跳过。仅本机保存，不代表获得原作再传播许可。</p>${added.length?'<button class="primary" id="confirm-pack">确认导入</button>':'无需重复导入。'}</div>`;
        $('#confirm-pack')?.addEventListener('click',()=>{
          const prior=state.materials;
          state.materials=[...state.materials,...added];
          if(!save()){state.materials=prior;return;}
          pendingPack=null;render();toast('学习包已导入，点击素材的“练习”即可开始。');
        });
      }catch(err){pendingPack=null;box.textContent='导入失败：'+err.message;}
      finally{e.target.value='';}
    });
    document.querySelectorAll('[data-read-model]').forEach(b=>b.onclick=()=>{
      const m=state.materials.find(x=>x.id===selectedMaterial.id);
      say(m.study.exercises[selectedMaterial.mode][Number(b.dataset.readModel)].model_en);
    });
    $('#paper-file')?.addEventListener('change',e=>importFile(e.target.files[0]));
    $('#paste-material')?.addEventListener('click',()=>{if(!$('#rights').checked){toast('请先确认素材使用权限。');return;}draft={title:'',location:'粘贴片段 / 自写笔记',text:''};showDraft();});
    document.querySelectorAll('[data-open-paper]').forEach(b=>b.onclick=()=>{const m=state.materials.find(x=>x.id===b.dataset.openPaper);selectedMaterial={id:m.id,mode:m.modes[0]};go('paper');});
    document.querySelectorAll('[data-delete-paper]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.deletePaper;
      if(!confirm('删除这份本机素材及其练习回答？如需保留，请先导出备份。'))return;
      const previous=JSON.parse(JSON.stringify(state));
      state.materials=state.materials.filter(x=>x.id!==id);
      for(const k of Object.keys(state.answers))if(k.startsWith(id+'-'))delete state.answers[k];
      for(const d of Object.keys(state.done))state.done[d]=state.done[d].filter(k=>!k.startsWith(id+'-'));
      if(!save()){state=previous;return;}render();
    });
    $('#paper-mode')?.addEventListener('change',e=>{storeAnswer();selectedMaterial.mode=e.target.value;render();});
    $('#read-excerpt')?.addEventListener('click',()=>say(state.materials.find(x=>x.id===selectedMaterial.id).excerpt));
    $('#save-paper-answer')?.addEventListener('click',()=>{if(storeAnswer())toast('回答已保存到本机');});
    $('#finish-paper')?.addEventListener('click',()=>{if(!$('#paper-answer').value.trim()){toast('先写下回答或练习笔记，再完成练习。');return;}if(storeAnswer())complete(selectedMaterial.id+'-'+selectedMaterial.mode);});
    $('#back-library')?.addEventListener('click',()=>{storeAnswer();go('library');});
    $('#backup')?.addEventListener('click',()=>download(new Blob([JSON.stringify({version:1,studio:state,learning:saved},null,2)],{type:'application/json'}),'yuna-private-backup.json'));
    $('#restore')?.addEventListener('change',async e=>{
      try {
        const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)throw new Error('备份不能超过 3 MB');
        const b=JSON.parse(await file.text()), s=b.studio;
        if(b.version!==1||!s||!Array.isArray(s.materials)||s.materials.length>100||!s.prefs||!s.done||!s.answers)throw new Error('不是有效的学习备份');
        for(const m of s.materials)if(!['id','title','author','source','location','topic','license','excerpt'].every(k=>typeof m[k]==='string')||m.excerpt.length>3000||!topics.includes(m.topic)||!Array.isArray(m.modes)||!m.modes.length||m.modes.some(x=>!modes.includes(x)))throw new Error('素材内容格式不正确');
        s.materials=s.materials.map(m=>YunaLearningPack.material(m,topics));
        if(new Set(s.materials.map(m=>m.id)).size!==s.materials.length||s.materials.some(m=>new Set(m.modes).size!==m.modes.length))throw new Error('备份中有重复素材或练习');
        for(const t of topics)if(typeof s.prefs[t]?.on!=='boolean'||!Number.isInteger(s.prefs[t]?.count)||s.prefs[t].count<1||s.prefs[t].count>10)throw new Error('话题设置格式不正确');
        if(Object.values(s.done).some(x=>!Array.isArray(x)||x.some(y=>typeof y!=='string'))||Object.values(s.answers).some(x=>typeof x!=='string'||x.length>12000))throw new Error('练习数据格式不正确');
        if(!confirm('恢复会替换本机的话题设置、素材和文献回答，继续？'))return;
        const prior=state;state=s;if(!save()){state=prior;return;}render();toast('已恢复设置、素材和文献回答。旧版课程笔记保留不变。');
      }catch(err){toast('恢复失败：'+err.message);}
    });
  }
  function storeAnswer(){if(!selectedMaterial||!$('#paper-answer'))return true;const id=selectedMaterial.id+'-'+selectedMaterial.mode;state.answers[id]=$('#paper-answer').value;return save();}
  window.addEventListener('pagehide',()=>{storeAnswer();draft=null;});
  tab='plan';render();
})();
