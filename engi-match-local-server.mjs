import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlFile = path.join(root, 'engi-match-learning-planner.html');
const dataFile = path.join(root, 'engi-match-learning-data.json');
const port = Number(process.env.PORT || 4173);
const courses = [
  { id:'hs-physics-1', courseId:'hs-physics', courseName:'ฟิสิกส์ ม.ปลาย', institutionName:'คลังตัวอย่าง ม.ปลาย', title:'พื้นฐานวงจรไฟฟ้าและกฎของโอห์ม', duration:'12 นาที', level:'high-school', videoUrl:'' },
  { id:'hs-math-1', courseId:'hs-math', courseName:'คณิตศาสตร์ ม.ปลาย', institutionName:'คลังตัวอย่าง ม.ปลาย', title:'เวกเตอร์สำหรับงานวิศวกรรม', duration:'15 นาที', level:'high-school', videoUrl:'' },
  { id:'uni-cs-1', courseId:'uni-cs', courseName:'วิศวกรรมคอมพิวเตอร์', institutionName:'คลังบทเรียนตัวอย่าง', title:'เริ่มต้นโครงสร้างข้อมูลและอัลกอริทึม', duration:'20 นาที', level:'university', videoUrl:'' },
  { id:'uni-ee-1', courseId:'uni-ee', courseName:'วิศวกรรมไฟฟ้า', institutionName:'คลังบทเรียนตัวอย่าง', title:'ทบทวนการวิเคราะห์วงจรไฟฟ้า', duration:'18 นาที', level:'university', videoUrl:'' },
  { id:'uni-me-1', courseId:'uni-me', courseName:'วิศวกรรมเครื่องกล', institutionName:'คลังบทเรียนตัวอย่าง', title:'พื้นฐานกลศาสตร์และแรง', duration:'16 นาที', level:'university', videoUrl:'' }
];
let store = { accounts: {} };
try { store = JSON.parse(await fs.readFile(dataFile, 'utf8')); } catch {}
const persist = async () => { const temp = dataFile + '.tmp'; await fs.writeFile(temp, JSON.stringify(store, null, 2), 'utf8'); await fs.rename(temp, dataFile); };
const accountKey = req => {
  const email = String(req.headers['x-engi-account'] || 'local-demo').trim().toLowerCase();
  return email.slice(0, 180) || 'local-demo';
};
const account = req => store.accounts[accountKey(req)] ||= { events: [] };
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };
async function body(req) {
  let raw=''; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error('Request too large'); }
  return raw ? JSON.parse(raw) : {};
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (url.pathname === '/api/health') return json(res, 200, { ok:true, service:'learning-library', storage:'local-json' });
    if (url.pathname === '/api/graduate/voice/speech' && req.method === 'POST') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      const voiceId = process.env.ELEVENLABS_VOICE_ID;
      if (!apiKey || !voiceId) return json(res, 503, { message:'ตั้งค่า ELEVENLABS_API_KEY และ ELEVENLABS_VOICE_ID ในเซิร์ฟเวอร์ก่อนสร้างเสียง' });
      const data = await body(req), text = String(data.text || '').trim();
      if (!text || text.length > 4000) return json(res, 400, { message:'ข้อความต้องมีความยาว 1–4,000 ตัวอักษร' });
      const result = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
        method:'POST', headers:{ 'xi-api-key':apiKey, 'Content-Type':'application/json', 'Accept':'audio/mpeg' },
        body:JSON.stringify({ text, model_id:'eleven_multilingual_v2' })
      });
      if (!result.ok) {
        const detail = await result.text();
        console.error('ElevenLabs TTS request failed:', result.status, detail.slice(0,500));
        return json(res, result.status === 401 || result.status === 403 ? 502 : result.status, { message:result.status === 401 || result.status === 403 ? 'ElevenLabs ปฏิเสธคีย์หรือสิทธิ์ใช้งาน กรุณาตรวจการตั้งค่าในเซิร์ฟเวอร์' : 'ElevenLabs สร้างเสียงไม่สำเร็จ กรุณาตรวจ voice ID และโควตา' });
      }
      const audio = Buffer.from(await result.arrayBuffer());
      if (!audio.length || audio.length > 12 * 1024 * 1024) return json(res, 502, { message:'ไฟล์เสียงจาก ElevenLabs มีขนาดไม่ถูกต้อง' });
      res.writeHead(200, { 'Content-Type':'audio/mpeg', 'Content-Length':audio.length, 'Cache-Control':'no-store' });
      return res.end(audio);
    }
    if (url.pathname.startsWith('/api/learning/')) {
      const db = account(req), route = url.pathname.slice('/api/learning/'.length);
      if (route === 'videos' && req.method === 'GET') {
        const level = url.searchParams.get('level');
        const institutionId = url.searchParams.get('institutionId') || '';
        const levelCourses = courses.filter(c => !level || c.level === level);
        const filtered = institutionId === 'high-school' ? levelCourses.filter(c => c.level === 'high-school') : levelCourses.filter(c => c.level !== 'high-school');
        const result = filtered.map(c => ({ ...c, institutionId, videos:[{ id:c.id, title:c.title, duration:c.duration, videoUrl:c.videoUrl }] }));
        return json(res, 200, { courses:result });
      }
      if (route === 'calendar' && req.method === 'GET') {
        const from = url.searchParams.get('from') || '0000-01-01', to = url.searchParams.get('to') || '9999-12-31';
        return json(res, 200, { events:db.events.filter(e => e.date >= from && e.date <= to) });
      }
      if (route === 'calendar' && req.method === 'POST') {
        const data = await body(req), date = String(data.date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(res, 400, { message:'กรุณาเลือกวันที่ให้ถูกต้อง' });
        const title = String(data.title || data.videoTitle || courses.find(c => c.id === data.videoId)?.title || '').trim().slice(0, 240);
        if (!title) return json(res, 400, { message:'กรุณาระบุหัวข้อหรือเลือกคลิป' });
        const video = courses.find(c => c.id === data.videoId);
        const event = { id:crypto.randomUUID(), date, title, topic:title, videoTitle:video?.title || '', courseName:video?.courseName || '', institutionName:video?.institutionName || '', videoUrl:video?.videoUrl || '', level:String(data.level || video?.level || '').slice(0,30), createdAt:new Date().toISOString() };
        db.events.push(event); await persist(); return json(res, 201, { event });
      }
      if (route === 'calendar/generate' && req.method === 'POST') {
        const data = await body(req), topics = Array.isArray(data.topics) ? data.topics : [];
        const start = new Date(); start.setHours(12,0,0,0);
        const goal = String(data.goal || '').slice(0,120);
        const defaultTopics = goal ? [`ทบทวนพื้นฐาน: ${goal}`, `ฝึกโจทย์และทักษะ: ${goal}`, `ทำแบบฝึกหัดสรุป: ${goal}`] : ['ทบทวนพื้นฐานวิศวกรรม','ฝึกทักษะตามสาขาที่สนใจ','ทำแบบฝึกหัดสรุป'];
        const planTopics = topics.length ? topics.slice(0,30).map(x=>String(x).slice(0,180)) : defaultTopics;
        const created=[];
        planTopics.forEach((title,i) => { const d=new Date(start); d.setDate(d.getDate()+i*2); const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); const event={id:crypto.randomUUID(),date,title,topic:title,courseName:'แผนฝึกส่วนตัว',institutionName:'',level:String(data.role||'').slice(0,30),createdAt:new Date().toISOString()}; db.events.push(event); created.push(event); });
        await persist(); return json(res, 201, { events:created });
      }
      return json(res, 404, { message:'ไม่พบ Learning API endpoint' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { message:'Method not allowed' });
    const requested = decodeURIComponent(url.pathname === '/' ? '/engi-match-learning-planner.html' : url.pathname);
    const resolved = path.resolve(root, '.' + requested);
    if (resolved !== htmlFile) return json(res, 404, { message:'Not found' });
    const content = await fs.readFile(htmlFile);
    res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache', 'Content-Length':content.length });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) { json(res, error instanceof SyntaxError ? 400 : 500, { message:error instanceof SyntaxError ? 'รูปแบบข้อมูลไม่ถูกต้อง' : 'เกิดข้อผิดพลาดในบริการคลังการเรียน' }); }
});
server.listen(port, '127.0.0.1', () => console.log(`Learning planner: http://127.0.0.1:${port}`));
