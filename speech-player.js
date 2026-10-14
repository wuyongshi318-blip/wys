/* Two real device voices; keep a speaker's voice consistent across their turns. */
(function(root){
  function voiceKey(v){return v.voiceURI || v.name;}
  function englishVoices(synth){
    const unique=new Map();
    for(const v of synth?.getVoices()||[])if(/^en(?:[-_]|$)/i.test(v.lang))unique.set(voiceKey(v),v);
    return [...unique.values()].sort((a,b)=>(a.lang==='en-GB'?0:1)-(b.lang==='en-GB'?0:1)||a.name.localeCompare(b.name));
  }
  function resolve(voices,prefs={}){
    const a=voices.find(v=>voiceKey(v)===prefs.a)||voices[0]||null;
    const others=voices.filter(v=>voiceKey(v)!==voiceKey(a||{}));
    const b=voices.find(v=>voiceKey(v)===prefs.b)||others.find(v=>/Serena|Samantha|Flo|Karen|Google UK English Female|Microsoft.*(Sonia|Aria|Jenny)/i.test(v.name))||others[0]||a;
    return [a,b];
  }
  function create(synth,Utterance){
    let generation=0, active=null;
    function stop(){generation++;active=null;synth?.cancel();}
    function play(entries,prefs={},notify=()=>{}){
      stop(); const token=generation;
      if(!synth||!Utterance){notify('此浏览器不支持语音朗读。');return;}
      const voices=resolve(englishVoices(synth),prefs), rate=Number(prefs.rate)||.85;
      let index=0;
      function next(){
        if(token!==generation)return;
        if(index===entries.length){active=null;notify('朗读结束。可以重听或继续练习。');return;}
        const entry=entries[index++], speaker=entry.speaker===1?1:0;
        const u=new Utterance(entry.text);active=u;
        u.voice=voices[speaker];u.lang=u.voice?.lang||'en-GB';u.rate=rate;
        u.onstart=()=>{if(token===generation)notify(`正在朗读 · ${speaker?'B':'A'} · ${u.voice?.name||'设备默认声音'}`);};
        u.onend=next;
        u.onerror=()=>{if(token===generation){active=null;notify('朗读未完成，请重试或换一个声音。');}};
        synth.speak(u);
      }
      next();
    }
    return {play,stop};
  }
  const api={voiceKey,englishVoices,resolve,create};
  root.YunaSpeech=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
