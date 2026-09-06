# Bingle 랜딩페이지

정적 HTML + Vercel 서버리스 함수 1개 (`api/inquiry.js`).

## 배포
Vercel 프로젝트가 이 레포에 연결돼 있어 `main`에 push하면 자동 배포됩니다.

## 문의 폼이 동작하려면 (Vercel → Settings → Environment Variables)
| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `RESEND_API_KEY` | resend.com 가입 후 API Keys에서 발급 |
| `INQUIRY_TO` | 알림 받을 메일 (Resend 무료·도메인 미인증 상태에선 Resend 가입 메일만 가능) |
| `INQUIRY_FROM` | (선택) 도메인 인증 후 `Bingle <hello@도메인>` |

테이블은 `supabase/poc_inquiries.sql`을 Supabase SQL Editor에서 한 번 실행.
환경변수가 없거나 서버 저장이 실패하면 폼은 자동으로 mailto 초안으로 폴백합니다.
