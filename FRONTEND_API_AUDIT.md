# Frontend → Backend Contract Audit — PenWorld Academy

Base URL (hardcoded everywhere): `https://penworld-gloryseed-demo-school-back.vercel.app`
Generated: 2026-10-08 — full static trace of `src/**/*` (fetch + axios).

> Each row below is EXACTLY what the deployed frontend sends. If backend expects
> anything different (different path, method, field name, term format), that request
> 404/400/403s and the UI shows "Failed to...".

## 0. Global conventions (apply to EVERYTHING)

- Auth header: `Authorization: Bearer <localStorage.token>` on every authed call.
  `src/api.js` axios interceptor adds it automatically; all raw `fetch` calls add it manually.
- `Bearer null` bug: if token is null, fetch still sends `Bearer null`. Treat as 401, not 500.
- Success envelope: frontend reads `result.data`, `res.data.data || res.data`,
  `data.data?.newPassword`, `json.data || null`. Tolerates `{success,data}`, `{data}`,
  raw array. Backend should ALWAYS return `{ success:true, data:<...> }` and include
  `message` on errors (UI does `data.message || "Failed..."`).
- IDs: reads `t._id || t.id`, `s._id || s.id`. Return BOTH `_id` and `id`.
  Route params accept either Mongo `_id` or registration `studentId`/`staffId`
  (frontend `encodeURIComponent`s them).
- Content-Type: JSON calls send `Content-Type: application/json`. FormData calls send
  NO Content-Type (browser sets multipart boundary). Do not require JSON CT on multipart routes.
- CORS: allow frontend origin, `Authorization, Content-Type`, GET/POST/PUT/DELETE/OPTIONS.
- Never sends trailing slash. Do not 301 on trailing-slash mismatch.

## 1. Auth (all three logins hit the SAME endpoint)

- Admin login `Admin/1Login.jsx:25`: `POST /api/auth/login` JSON `{staffId, password}`, no auth header.
- Staff login `Staff/1Login.jsx:25`: `POST /api/auth/login` JSON `{staffId, password}`.
- Student login `Student/1Login.jsx:26`: `POST /api/auth/login` JSON `{studentId, password}`.
- Change password (all 3 profiles): `PUT /api/auth/change-password` Bearer+JSON `{currentPassword, newPassword}` — key is `currentPassword`, NOT `oldPassword`.
- Logout (all layouts via api.js): `POST /api/auth/logout` Bearer, empty body.

Expects login response `{token, user}` saved to localStorage. `user` must have name/role (staff) or name/class (student) or topbar is blank.
BACKEND FIX: single /api/auth/login must branch on staffId vs studentId. Change-password is PUT, not POST.

## 2. Meta / bootstrapping

- Admin `useMeta.js:25`: `GET /api/admin/meta` Bearer.
- Staff `useStaffMeta.js:24`: `GET /api/staff/meta` Bearer.
- Student `useStudentMeta.js:23`: `GET /api/student/meta` Bearer.
- Layouts `useClasses.jsx:106,139` PORTAL_PATH {admin:admin, staff:staff, teacher:staff, student:student}: `GET /api/<admin|staff|student>/meta`.

Normalizer accepts raw array, {data:[...]}, {data:{...}}, {classOptions,classes,classNames,subjects,subjectsByClass,subjectsByLevel,sessions,terms,roles,divisions}. Items {value,name,label,id,\_id,code,level,grade,division,classTeacher,teacherId,studentCount}. Sessions [{name,startYear,endYear,isCurrent}].
BACKEND FIX: return classOptions/classes, subjectsByClass/Level, sessions with isCurrent, terms. If /api/staff/meta or /api/student/meta 404s, every dropdown in that portal is empty.

## 3. Dashboards + me

- Admin dash `Admin/2Dashboard.jsx:24`: `GET /api/admin/me` + `GET /api/admin/dashboard` parallel via axios. me:{name|fullName}; dashboard:{success,data:{stats:{activeStudents,onlineClasses,upcomingCbt,activeStaff,classesAvailable,activeAssignments}, recentAssignment, recentCbt}}. Reads d.stats.\* directly — crashes if data not wrapped.
- Staff dash `Staff/2Dashboard.jsx:14`: `GET /api/staff/dashboard` Bearer. Expects {success,data:{staff:{firstName}, stats:{activeStudents,onlineClasses,upcomingCbt}, recentAssignments:[{subject,classLabel,due|dueDate,status}], cbtTests:[{_id|id,subject,type|description,status}]}}.
- Student dash `Student/2Dashboard.jsx:59`: `GET /api/student/dashboard` Bearer. Expects {success,data:{stats:{activeAssignments,onlineClasses,upcomingCbt}, recentAssignment:{subject,dueDate|due,status}, recentCbt:{subject,description|type|detail,status}}}. Name comes from cached /api/student/me.
- Admin profile `Admin/11Profile.jsx:26`: `GET /api/admin/me` Bearer, caches whole object.
- Staff profile `Staff/10Profile.jsx:26` + StaffLayout: `GET /api/staff/me` Bearer. Expects {success,data:{name,initials,role,staffId,email,phone,sex,profileImage,department,assignedClass}}.
- Student profile `Student/7Profile.jsx:26`: `GET /api/student/me` Bearer. Reads data.data||data.

## 4. Students and Staff CRUD

Admin students (Admin/3Student.jsx):

- GET /api/admin/students?class=<full name e.g. Primary 1 Gaa-Akanbi> Bearer -> {success,data:[]}.
- POST /api/admin/students Bearer+JSON {surname, otherNames, sex:M|F, studentClass:full live class}.
- PUT /api/admin/students/:id same body. DELETE /:id Bearer only.
- POST /api/admin/students/:id/reset-password Bearer+JSON {} or {newPassword} -> {success,data:{newPassword}}.

Admin staff (Admin/5Staff.jsx): same under /api/admin/staff, body {surname,otherNames,sex:M|F,role:one of meta.roles e.g. Teacher or Class Teacher JSS 1 Gaa-Akanbi}; reset-password same.

Staff students (Staff/3Student.jsx):

- GET /api/staff/students -> {success,data:[{id,name,studentId,sex,class}], assignedClass:TOP-LEVEL}.
- GET /api/staff/students/:id (used by 8Result2.jsx:162) -> {success,data:{...}}.
- POST /api/staff/students Bearer+JSON {surname,otherNames,sex} NO class (backend assigns).
- PUT/DELETE /api/staff/students/:\_id|:id.

FIX: ?class= needs full sectioned name; sex single letter; reset body may be {}; staff list needs top-level assignedClass.

## 5. Classes / Sessions / Promote (admin)

- GET /api/admin/classes Bearer -> any meta-like shape.
- GET /api/admin/staff Bearer (join teacher names).
- POST /api/admin/classes Bearer+JSON {name, code, level, grade:Number, academicSession:2026/2027}.
- GET /api/admin/sessions Bearer -> {success,data:[]}.
- POST /api/admin/sessions Bearer+JSON {name, startYear:Number, endYear:Number}.
- POST /api/admin/promote Bearer, NO body -> {success,data:{...}}.

## 6. Assignments (multipart!)

Admin: GET /api/admin/assignments; POST Bearer+FormData {subject,classLabel,instructions,dueDate:free-text,attachment?:single File key=attachment}; DELETE /:id.

## 8. Results — HIGHEST RISK (term/session format split)

Admin list (Admin/9Result.jsx):

- GET /api/admin/results?session=2026/2027&term=Third Term&classLabel=JSS 1 Gaa-Akanbi Bearer. NOTE term=LABEL (First Term) via TERM_LABELS. Expects {success,data:[{studentId,name,registrationId,sex,class,totalScore,subjectCount,isSubmitted,isFinal}]}.
- POST /api/admin/results/publish Bearer+JSON {session, term:LABEL, classLabel}.
- POST /api/admin/results/:studentId/publish {session, term:LABEL}.
- DELETE /api/admin/results/:studentId?session=&term=LABEL.
- View (9Result2.jsx:64,84): GET /api/admin/results/:studentId?session=&term=<label> -> {success,data:{subjects:[{name|subject,ca1,ca2,exam,total|percent|thirdTotal,grade,remark}],totalScore,percentage,comment}} + fallback GET .../:studentId/comments?session=&term= (+unfiltered).

Staff (submit=lowercase, publish/comments=LABEL — accept BOTH):

- GET /api/staff/results/students Bearer -> {success,data:[{id,name,studentId,sex}]} (id=Mongo, used for routing).
- POST /api/staff/results Bearer+JSON (8Result2.jsx:561): {studentId:<route _id preferred>, session:2026/2027 (OMITTED if empty/24-hex — default to current), term:first|second|third lowercase, subjects:[{subject:canonical, ca1:0-20, ca2:0-20, exam:0-60}], class?:if known}. No grade/total sent — backend computes (A1>=75..F9<40). Must return savedFor:{session,term} or save looks missing.
- POST /api/staff/results/:id/publish Bearer+JSON {session, term:LABEL} (7Result.jsx:83).
- POST /api/staff/results/:studentId/comments {text, session, term:LABEL} -> may return attachedTo:{session,term,fallback} which frontend follows.
- GET tries 5 URLs in order (8Result2.jsx:234): /api/staff/results/:id?session&term=<label>, ...term=<lowercase>, /:id bare, /api/staff/results?studentId&session&term=<label>, ...lowercase. Accepts {data|result} with subjects|scores|items, session.name|session|academicSession, term|termLabel, comment.
- GET /api/staff/results/:id/comments?session&term=<label> + unfiltered -> {data|comments:[{text,author,createdAt}]}.

Student (Student/5Result.jsx): GET /api/student/results?session&term= (x3 for third: selected+first+second) -> {success,data:{studentInfo,subjects,totalScore,percentage,comment}}. GET /api/student/results/comments?session&term= + unfiltered.

FIX: normalize term with includes(first|second|third) case-insensitive EVERYWHERE. Session=2026/2027 name, never ObjectId. Return savedFor/attachedTo. Publish single must not require classLabel. Comments thread must work unfiltered.

## 9. CBT — PATH SPLIT (staff = /api/teacher/cbt !)

Admin (Admin/10CBT.jsx, modal role=admin):

- GET /api/admin/cbt Bearer -> {data|tests:[]}.
- POST /api/admin/cbt Bearer+FormData {subject, classLevel, description, duration, date, excelFile:File} — file key excelFile singular.
- DELETE /api/admin/cbt/:id. POST /api/admin/cbt/:id/reactivate (no body) sets isActive=true expiresAt=now+24h; frontend reads data.data|data.test else +24h local.
- GET /api/admin/cbt/:testId/results -> {data:[{studentId,name,attemptId,score,totalQuestions,percentage,passed,timeTakenSeconds,submittedAt}]}.

Staff (Staff/9CBT.jsx, modal role=teacher): GET|POST|DELETE /api/teacher/cbt... NOT /api/staff/cbt (roleCheck teacher,admin per code comment). Same FormData keys. GET /api/teacher/cbt/:id/results.

Student: GET /api/cbt Bearer (no /student prefix) -> {data:[{subject,description,duration,questions,date,expiresAt,isActive,status}]}. GET /api/cbt/:testId/questions -> {data:{duration,questions:[{id,text,options}]}}; 403=day-window closed, 409/already-submitted=locked. POST /api/cbt/:testId/submit Bearer+JSON {answers:[{questionId,selected:A}], timeTakenSeconds:Number} -> {data:{score,totalQuestions,percentage,passed}}; 400=time-expired (consumed), 403=window.

## 10. Top backend fixes (priority)

1. Term dual-accept (label+lowercase, case-insensitive contains) on ALL results endpoints.
2. Mount staff CBT at /api/teacher/cbt with roleCheck(teacher,admin) or alias /api/staff/cbt. Check JWT role string.
3. Single login branching staffId|studentId; change-password PUT {currentPassword,newPassword}.
4. Session fallback: omit->current + return savedFor. Never 400 missing session.
5. Envelopes: always {success,data}+message; reset->{data:{newPassword}}; staff students top-level assignedClass; CBT results attempt fields.
6. Multipart keys: excelFile (CBT), attachment (assignment create), files[] (student submit).
7. Class keys differ: studentClass (student create), classLabel (assignments/online), classLevel (CBT), class (result submit), ?class= (filter). Alias, don't unify blindly.
8. Stub-or-implement or screens die: /api/staff/meta, /api/student/meta, /api/staff/results/students, /api/staff/students/:id, /api/student/results/comments, /api/admin/cbt/:id/reactivate, /api/admin/promote, /api/admin/sessions.
9. Auth/CORS: Bearer everywhere, 401 not 500, allow frontend origin+preflight.

Staff: same under /api/staff/assignments.
Student (axios): GET /api/student/assignments (reads res.data?.data||res.data); POST /api/student/assignments/:id/submit Bearer+FormData multipart/form-data MULTIPLE files key=files. Card key is assignment.id — return id+\_id. Teacher file read from many keys (tolerant).
FIX: multer attachment(single) on create vs files(array) on submit. dueDate free text. No JSON on these POSTs.

## 7. Online classes (JSON)

- Admin: GET /api/admin/online-classes; POST {date,time,classLabel,subject,meetingLink}; DELETE /:id.
- Staff: same under /api/staff/online-classes.
- Student: GET /api/student/online-classes -> [{subject,classLabel|class,date,time,meetingLink|link}].
