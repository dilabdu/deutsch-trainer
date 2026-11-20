const KEY="deutsch-trainer-v1";
let words=JSON.parse(localStorage.getItem(KEY)||"[]"), current=null, recognition=null, heard="";
const $=id=>document.getElementById(id);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(words));render()};
const norm=s=>(s||"").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim();
function dueWords(){return words.filter(w=>!w.nextReview||w.nextReview<=Date.now())}
function render(){
 $("total").textContent=words.length;$("due").textContent=dueWords().length;
 $("wordlist").innerHTML=words.length?words.map((w,i)=>`<div class="word"><div class="row"><strong>${esc(w.de)}</strong><button class="smallbtn" data-del="${i}">O‘chirish</button></div><div>${esc(w.uz)}</div><div class="muted">Sinonimlar: ${esc((w.syn||[]).join(", ")||"—")}</div></div>`).join(""):'<p class="muted">Hozircha lug‘at bo‘sh. “So‘z qo‘shish” bo‘limidan boshlang.</p>';
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{words.splice(+b.dataset.del,1);save();if(current&&!words.includes(current))pick()});
 if(!current||!words.includes(current))pick(false);
}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function pick(advance=true){
 const pool=dueWords();current=pool.length?pool[Math.floor(Math.random()*pool.length)]:words[Math.floor(Math.random()*words.length)]||null;
 $("prompt").textContent=current?current.uz:"Boshlash uchun lug‘at qo‘shing";
 $("hint").textContent=current?"Tarjimani va imkon qadar 1–2 sinonimni ayting.":"";
 $("result").classList.add("hidden");$("micstatus").textContent=current?"Mikrofon tugmasini bosing":"";
 $("progress").textContent=words.length?`${words.length-dueWords().length} takrorlash muddati kelgan / ${words.length} jami`:"0 / 0";
 $("reveal").disabled=!current;$("next").disabled=!current;
}
function answerText(){if(!current)return;const synonyms=current.syn||[];$("result").textContent=`Asosiy javob: ${current.de}\nSinonimlar: ${synonyms.join(", ")||"—"}\n${current.family?"So‘z oilasi: "+current.family:""}\n${current.example?"Misol: "+current.example:""}`;$("result").classList.remove("hidden")}
$("reveal").onclick=answerText;
$("next").onclick=()=>pick();
$("save").onclick=()=>{
 const de=$("de").value.trim(),uz=$("uz").value.trim();if(!de||!uz){alert("Nemischa so‘z va tarjimani kiriting.");return}
 words.push({de,uz,syn:$("syn").value.split(",").map(x=>x.trim()).filter(Boolean),family:$("family").value.trim(),example:$("example").value.trim(),interval:0,nextReview:0});
 ["de","uz","syn","family","example"].forEach(id=>$(id).value="");save();pick();document.querySelector('[data-tab="study"]').click();
};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x===b));["study","words","add"].forEach(t=>$(t).classList.toggle("hidden",t!==b.dataset.tab));});
function compare(spoken){
 const expected=[current.de,...(current.syn||[])].map(norm);
 const got=norm(spoken);
 const matched=expected.filter(x=>got.includes(x)||x.includes(got)&&got.length>3);
 const ok=matched.length>0;
 $("result").textContent=`Siz aytdingiz: ${spoken}\n${ok?"Dastlabki tekshiruv: mos javob topildi ✓":"Dastur javobni lug‘atdagi shakllarga mos topmadi."}\nKutilgan javob: ${current.de}\nSinonimlar: ${(current.syn||[]).join(", ")||"—"}\n\nEslatma: bu avtomatik matn taqqoslash; talaffuz va grammatikani to‘liq baholamaydi.`;
 $("result").classList.remove("hidden");
 current.interval=ok?Math.min((current.interval||0)+1,4):0;
 const days=ok?[1,3,7,14,30][current.interval-1]:0;
 current.nextReview=Date.now()+days*86400000;save();
}
function startRecognition(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){$("micstatus").textContent="Bu brauzer nutqni tanishni qo‘llamaydi. Android Chrome orqali sinab ko‘ring.";return}
 if(!current)return;
 recognition=new SR();recognition.lang="de-DE";recognition.continuous=false;recognition.interimResults=false;
 recognition.onstart=()=>{$("mic").classList.add("listening");$("micstatus").textContent="Tinglayapman… Nemischa javob bering."};
 recognition.onerror=e=>{$("micstatus").textContent="Mikrofon xatosi: "+e.error+". Ruxsat va internetni tekshiring."; $("mic").classList.remove("listening")};
 recognition.onend=()=>$("mic").classList.remove("listening");
 recognition.onresult=e=>{heard=e.results[0][0].transcript;$("micstatus").textContent="Eshitildi: "+heard;compare(heard)};
 recognition.start();
}
$("mic").onclick=startRecognition;
$("importfile").onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{const data=JSON.parse(await f.text());if(!Array.isArray(data))throw Error("JSON massiv bo‘lishi kerak");
 let added=0;for(const x of data){if(x.de&&x.uz){words.push({de:x.de,uz:x.uz,syn:Array.isArray(x.syn)?x.syn:(x.synonyms||[]),family:x.family||"",example:x.example||"",interval:0,nextReview:0});added++}}
 save();alert(`${added} ta so‘z import qilindi.`);e.target.value="";
 }catch(err){alert("Import amalga oshmadi: "+err.message)}
};
$("export").onclick=()=>{const blob=new Blob([JSON.stringify(words,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mening-nemis-lugatim.json";a.click();URL.revokeObjectURL(a.href)};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();