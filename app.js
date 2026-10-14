(() => {
'use strict';
const $ = id => document.getElementById(id);
const DURATION = 7 * 60 * 1000;
const stages = window.STAGES || [];
let selected = null, words = [], index = 0, responses = [], deadline = 0, timer = null;
let state = 'setup', hintUsed = false, revealed = false;
const norm = s => String(s).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const options = w => [w.en, ...(w.accept || [])].map(norm);
const shuffle = arr => [...arr].sort(() => Math.random() - .5);
const show = name => { ['setup','game','result'].forEach(id => $(id).classList.toggle('hidden',id !== name)); state = name; };
const stageRoot = $('stages');
stages.forEach(s => {
  const b = document.createElement('button'); b.className = 'stage';
  const head = document.createElement('strong'); head.textContent = s.title;
  const sub = document.createElement('small'); sub.textContent = s.description || '';
  b.append(head,sub);
  b.addEventListener('click', () => {selected=s;document.querySelectorAll('.stage').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('start').disabled=false;});
  stageRoot.append(b);
});
function validate(data){
 if(!Array.isArray(data)||!data.length) throw new Error('単語データが空です');
 for(const [i,w] of data.entries()){
   if(!w || typeof w.ja!=='string' || typeof w.en!=='string' || !w.ja.trim() || !w.en.trim() || typeof w.sentence!=='string' || typeof w.translation!=='string') throw new Error(`${i+1}番目の語句データに不足があります`);
   if(!w.sentence.includes('( )')) throw new Error(`${i+1}番目の例文には ( ) を入れてください`);
 }
 return data;
}
$('start').addEventListener('click',async()=>{
 if(!selected)return;
 $('start').disabled=true;
 try {const res=await fetch(selected.file,{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=validate(await res.json());words=shuffle(data);begin();}
 catch(e){alert(`Stageを読み込めませんでした。\n${e.message}\nGitHub Pages またはローカルサーバーから開いてください。`);}
 finally {$('start').disabled=false;}
});
function begin(){clearInterval(timer);index=0;responses=[];deadline=Date.now()+DURATION;show('game');$('time').textContent='07:00';$('timer-bar').style.width='100%';showWord();timer=setInterval(tick,150);tick();}
function tick(){if(state!=='game')return;const remaining=Math.max(0,deadline-Date.now());const seconds=Math.ceil(remaining/1000);$('time').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timer-bar').style.width=`${remaining/DURATION*100}%`;if(remaining<=0)finish();}
function showWord(){if(index>=words.length){finish();return;}hintUsed=false;revealed=false;const w=words[index];$('meaning').textContent=w.ja;$('sentence').textContent=w.sentence;$('translation').textContent=w.translation;$('progress').textContent=`${index+1} / ${words.length}`;$('answer').disabled=false;$('answer').value='';$('submit').textContent='ENTER ↵';$('hint').disabled=false;$('hint-text').textContent='';$('feedback').textContent='';$('feedback').className='feedback';$('live-score').textContent=String(Math.round(score()*100));$('answer').focus();}
// 正答: 1点、ヒント正答: 0.5点、誤答・未回答: 0点。満点はStage登録語数で割った100点。
function score(){return responses.reduce((sum,r)=>sum+(r.correct?(r.hint?0.5:1):0),0)/words.length;}
function onSubmit(){if(state!=='game')return;if(Date.now()>=deadline){finish();return;}if(revealed){index++;showWord();return;}const w=words[index];const user=$('answer').value;const correct=options(w).includes(norm(user));responses.push({ja:w.ja,en:w.en,user:user.trim(),correct,hint:hintUsed});revealed=true;$('answer').disabled=true;$('hint').disabled=true;$('submit').textContent='NEXT →';$('feedback').className='feedback '+(correct?'good':'bad');$('feedback').textContent=correct?`✓ 正解！${hintUsed?'（ヒント使用：0.5点）':'（1点）'}`:`✕ 不正解　正答：${w.en}`;$('live-score').textContent=String(Math.round(score()*100));$('submit').focus();}
$('submit').addEventListener('click',onSubmit);
$('answer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();onSubmit();}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&state==='game'&&revealed&&document.activeElement!==$('submit')){e.preventDefault();onSubmit();}});
$('hint').addEventListener('click',()=>{if(state!=='game'||revealed||Date.now()>=deadline)return;hintUsed=true;const w=words[index].en;const chars=Array.from(w);const letters=chars.filter(c=>/[a-z]/i.test(c));$('hint-text').textContent=`最初の文字：${letters[0]||chars[0]||'?'} ／ 文字数：${letters.length}`;$('hint').disabled=true;$('answer').focus();});
function finish(){if(state!=='game')return;clearInterval(timer);show('result');const total=words.length;const hits=responses.filter(r=>r.correct).length;const hints=responses.filter(r=>r.hint).length;const earned=responses.reduce((sum,r)=>sum+(r.correct?(r.hint?0.5:1):0),0);const points=Math.round(earned/total*100);$('final-score').textContent=String(points);$('result-summary').textContent=`${selected.title} · ${responses.length} / ${total} 問に挑戦`;$('result-detail').replaceChildren();for(const [num,label] of [[`${hits} / ${responses.length}`,'正答数 / 解答数'],[hints,'ヒント使用'],[`${total-responses.length}`,'未出題']]){const d=document.createElement('div');const strong=document.createElement('strong');strong.textContent=num;const small=document.createElement('small');small.textContent=label;d.append(strong,small);$('result-detail').append(d);}const review=$('review');review.replaceChildren();responses.forEach((r,i)=>{const item=document.createElement('div');item.className='review-item';const a=document.createElement('div');a.textContent=`${i+1}. ${r.ja} → ${r.en}`;const b=document.createElement('small');b.className=r.correct?'right':'wrong';b.textContent=`${r.correct?'✓':'✕'} 入力: ${r.user||'（空欄）'}${r.hint?' · ヒント使用':''}`;item.append(a,b);review.append(item);});}
$('retry').addEventListener('click',()=>{words=shuffle(words);begin();});$('back').addEventListener('click',()=>{clearInterval(timer);show('setup');});
})();
