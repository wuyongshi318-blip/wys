/* Import only validated text; never interpret learning-pack content as HTML/code. */
(function(root) {
  'use strict';
  const modes=['论文介绍','会议问答','术语精读'];
  function object(x){return x!==null && typeof x==='object' && !Array.isArray(x);}
  function text(x,max=4000,empty=false){if(typeof x!=='string'||x.length>max||(!empty&&!x.trim()))throw Error('学习包文字缺失或超过长度限制');return x;}
  function rows(x,keys,max=20){if(!Array.isArray(x)||x.length>max)throw Error('学习包列表格式不正确');return x.map(r=>{if(!object(r))throw Error('学习包条目格式不正确');return Object.fromEntries(keys.map(k=>[k,text(r[k])]));});}
  function material(m,topics){
    if(!object(m))throw Error('素材格式不正确');
    const result=Object.fromEntries(['id','title','author','source','location','topic','license','excerpt'].map(k=>[k,text(m[k],k==='excerpt'?3000:800,k==='excerpt'||k==='source')]));
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(m.id)||!topics.includes(m.topic)||!Array.isArray(m.modes)||!m.modes.length||m.modes.some(v=>!modes.includes(v))||new Set(m.modes).size!==m.modes.length)throw Error('素材标识、话题或练习种类不正确');
    result.modes=[...m.modes];
    if(m.study!==undefined){
      const s=m.study;if(!object(s)||!object(s.exercises))throw Error('导读格式不正确');
      const exercises={};
      for(const mode of result.modes){exercises[mode]=rows(s.exercises[mode],['en','zh','hint','model_en','model_zh','location'],5);if(!exercises[mode].length)throw Error('缺少练习内容');}
      result.study={summary:text(s.summary),sections:rows(s.sections,['heading','text','location'],12),translations:rows(s.translations,['en','zh','location'],12),terms:rows(s.terms,['en','zh','note'],30),exercises};
    }
    return result;
  }
  function parse(pack,topics){
    if(!object(pack)||pack.format!=='yuna-learning-pack'||pack.version!==1||!Array.isArray(pack.materials)||!pack.materials.length||pack.materials.length>50)throw Error('不是支持的 Yuna 学习包（版本 1）');
    const title=text(pack.title,200), materials=pack.materials.map(m=>material(m,topics));
    if(new Set(materials.map(m=>m.id)).size!==materials.length)throw Error('包内有重复素材');
    return {title,materials};
  }
  const api={parse,material};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.YunaLearningPack=api;
})(typeof globalThis!=='undefined'?globalThis:this);
