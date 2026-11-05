const $ = (id) => document.getElementById(id);
const chat = $("chat");
const input = $("message");
const send = $("send");
const mic = $("mic");
const notice = $("notice");
const history = [];
let busy = false;

function addBubble(text, who) {
  const el = document.createElement("div");
  el.className = `bubble ${who}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}
function speak(text) {
  if (!$("voiceReply").checked || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ur-PK";
  u.rate = 0.92;
  const voices = speechSynthesis.getVoices();
  const urduVoice = voices.find(v => v.lang.toLowerCase().startsWith("ur"));
  if (urduVoice) u.voice = urduVoice;
  speechSynthesis.speak(u);
}
async function ask(text) {
  if (busy || !text.trim()) return;
  busy = true; send.disabled = true; mic.disabled = true;
  $("status").textContent = "سوچ رہا ہوں...";
  $("hint").textContent = "آپ کے سوال کا جواب تیار ہو رہا ہے";
  addBubble(text, "user");
  input.value = "";
  const thinking = document.createElement("div");
  thinking.className = "bubble assistant";
  thinking.textContent = "جاروس جواب تیار کر رہا ہے…";
  chat.appendChild(thinking);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({message:text, history})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "سرور سے رابطہ نہیں ہو سکا۔");
    thinking.textContent = data.reply;
    history.push({role:"user",content:text},{role:"assistant",content:data.reply});
    if (history.length > 12) history.splice(0, history.length - 12);
    speak(data.reply);
  } catch (err) {
    thinking.textContent = err.message || "معذرت، کچھ مسئلہ پیش آیا۔";
  } finally {
    busy = false; send.disabled = false; mic.disabled = false;
    $("status").textContent = "میں حاضر ہوں";
    $("hint").textContent = "مزید کوئی سوال پوچھ سکتے ہیں";
    input.focus();
  }
}
send.addEventListener("click", () => ask(input.value));
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 110) + "px";
});

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  const recognition = new Recognition();
  recognition.lang = "ur-PK";
  recognition.continuous = false;
  recognition.interimResults = false;
  mic.addEventListener("click", () => {
    try { recognition.start(); } catch {}
  });
  recognition.onstart = () => {
    document.body.classList.add("listening");
    $("status").textContent = "سن رہا ہوں...";
    notice.textContent = "اب بولیے، میں سن رہا ہوں۔";
  };
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    input.value = transcript;
    ask(transcript);
  };
  recognition.onerror = () => {
    notice.textContent = "آواز شناخت نہیں ہو سکی؛ دوبارہ کوشش کریں یا لکھ کر بھیجیں۔";
  };
  recognition.onend = () => {
    document.body.classList.remove("listening");
    if (!busy) $("status").textContent = "میں حاضر ہوں";
  };
} else {
  mic.disabled = true;
  notice.textContent = "اس براؤزر میں وائس شناخت دستیاب نہیں؛ پیغام لکھ کر بھیجیں۔";
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));
}
