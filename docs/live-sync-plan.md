# Smart OS: Account + Live Sync (plan, decision needed)

Abhi bana hua (v1, bina server): "Account & Sync" app, password se encrypt karke code/file export-import.

## Live sync (apne aap) ke liye server chahiye. Options
1. **Apna server** (Termalin wala): chhota API (login + encrypted blob store). Pura control, data tumhare paas. Kaam: ~1-2 din, server par HTTPS chahiye.
2. **Free backend (Firebase/Supabase)**: jaldi (kuch ghante), par third-party me data rahega, free limits.
3. **GitHub private repo**: bina server, par har user ko GitHub account/token chahiye, aam users ke liye mushkil.

## Design (jo bhi option)
- Data client par encrypt hota hai (AES-GCM, key = password se PBKDF2). Server ko sirf encrypted blob dikhta hai, password kabhi nahi bhejta.
- Login = email/username + password (server par sirf slow hash).
- Device link: naya device login kare -> blob download -> decrypt -> import (wahi v1 ka code).
- Conflict: last-write-wins per key + timestamp.
- Privacy: users ke data ki zimmedari; privacy policy zaroori.
