// Vercel serverless function: POST /api/inquiry
// 1) Supabase `poc_inquiries` 테이블에 저장  2) Resend로 알림 메일
// 필요한 환경변수: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, INQUIRY_TO (SUPABASE_URL은 선택 — 기본값 있음)
const FIELDS = ['team', 'size', 'stage', 'name', 'email', 'tools', 'pain'];

module.exports = async (req, res) => {
  try { return await handle(req, res); }
  catch (e) { console.error('inquiry crashed', e); return res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
};

async function handle(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const row = {};
  for (const k of FIELDS) row[k] = String(body[k] || '').trim().slice(0, 2000);
  if (!row.team || !row.name || !row.email || !row.pain || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) {
    return res.status(400).json({ ok: false, error: '필수 항목이 비어 있거나 이메일 형식이 잘못됐습니다.' });
  }
  if (body.website) return res.status(200).json({ ok: true }); // honeypot: 봇은 조용히 무시

  // URL은 공개값이라 기본값으로 둠
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdkfheozxoolmbcbadrk.supabase.co';
  const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, INQUIRY_TO } = process.env;
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ ok: false, error: 'env missing: SUPABASE_SERVICE_ROLE_KEY' });

  // 1) DB 저장 — 실패하면 에러로 응답 (프론트가 mailto로 폴백)
  const db = await fetch(`${SUPABASE_URL}/rest/v1/poc_inquiries`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...row, user_agent: req.headers['user-agent'] || null }),
  });
  if (!db.ok) {
    const detail = await db.text();
    console.error('supabase insert failed', db.status, detail);
    return res.status(500).json({ ok: false, error: '저장에 실패했습니다.', detail: detail.slice(0, 300) });
  }

  // 2) 메일 알림 — 실패해도 접수는 된 것이므로 200 (로그만 남김)
  let mailed = false, mailError = null;
  if (RESEND_API_KEY && INQUIRY_TO) {
    const lines = [
      ['팀 이름', row.team], ['팀 인원', row.size], ['팀 단계', row.stage || '-'],
      ['담당자', row.name], ['회신 이메일', row.email], ['현재 업무 관리 방식', row.tools || '-'],
    ];
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = `<h2 style="font-family:sans-serif">[Bingle PoC 문의] ${esc(row.team)}</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${lines.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6e6f66">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table>
<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap"><b>가장 큰 고민</b>\n${esc(row.pain)}</p>`;
    const mail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.INQUIRY_FROM || 'Bingle <onboarding@resend.dev>',
        to: [INQUIRY_TO],
        reply_to: row.email,
        subject: `[Bingle PoC 문의] ${row.team} (${row.size || '인원 미입력'})`,
        html,
      }),
    });
    if (mail.ok) mailed = true;
    else { mailError = (await mail.text()).slice(0, 300); console.error('resend failed', mail.status, mailError); }
  }

  return res.status(200).json({ ok: true, mailed, mailError });
}
