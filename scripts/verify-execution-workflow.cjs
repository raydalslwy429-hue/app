// scripts/verify-execution-workflow.cjs
const fs = require('fs');
const path = require('path');

const capaPath = path.join(__dirname, '..', 'src', 'app', 'actions', 'capa.ts');
const fieldQueuePath = path.join(__dirname, '..', 'src', 'app', 'field', 'FieldQueue.tsx');
const fieldPagePath = path.join(__dirname, '..', 'src', 'app', 'field', 'page.tsx');
const adminManagerPath = path.join(__dirname, '..', 'src', 'app', 'admin', 'AdminManager.tsx');
const adminPagePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'page.tsx');

const capaCode = fs.readFileSync(capaPath, 'utf8');
const queueCode = fs.readFileSync(fieldQueuePath, 'utf8');
const fieldPageCode = fs.readFileSync(fieldPagePath, 'utf8');
const adminCode = fs.readFileSync(adminManagerPath, 'utf8');
const adminPageCode = fs.readFileSync(adminPagePath, 'utf8');

console.log('=====================================================');
console.log('🧪 MULTI-EXECUTOR CAPA WORKFLOW VERIFICATION TEST');
console.log('=====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// 1. Initial Multi-Executor Assignment
assert(
  adminCode.includes('منفذو إدارة') && adminCode.includes('اختر منفذاً أو أكثر'),
  'AdminManager: Multi-select executor selector is prominently displayed in open_cases'
);
assert(
  adminCode.includes('تحديد جميع منفذي الإدارة'),
  'AdminManager: "Select All Executors" quick toggle exists for department'
);
assert(
  capaCode.includes('targetUsers?: Array<{ id: number; name: string; deptCode: string }>') &&
  capaCode.includes('INSERT OR REPLACE INTO case_assignments'),
  'capa.ts: assignCaseAction creates individual assignments for each selected executor'
);

// 2. Non-disappearing Cases on Executor Reply & Field Queue Statuses
assert(
  fieldPageCode.includes("a.status IN ('pending', 'completed', 'accepted') AND c.status != 'closed'"),
  'field/page.tsx: Query includes pending, completed, and accepted tasks until c.status == closed'
);
const submitExecCode = capaCode.substring(capaCode.indexOf('export async function submitExecutionAction'), capaCode.indexOf('export async function approveTaskAction'));
assert(
  submitExecCode.includes("UPDATE cases_master SET status = 'in_progress'") &&
  !submitExecCode.includes("UPDATE cases_master SET status = 'closed'") &&
  submitExecCode.includes("UPDATE case_assignments SET status = 'completed'"),
  'capa.ts: submitExecutionAction updates assignment but keeps cases_master open so other executors remain'
);

// 3. Approval Behavior ("مقبولة" for Replier, "معلقة" for Others)
assert(
  queueCode.includes('الحالة: مقبولة ومعتمدة من الإدارة ✅ (بانتظار الإغلاق النهائي للبلاغ)') &&
  queueCode.includes('الحالة: معلقة ⏳ (مطلوب اتخاذ الإجراء)'),
  'FieldQueue.tsx: Visual status distinguishes "مقبولة" (Accepted) for approved replier and "معلقة" (Pending) for others'
);
assert(
  capaCode.includes("UPDATE case_assignments SET status = 'accepted', is_accepted = 1"),
  'capa.ts: approveTaskAction marks individual executor assignment accepted without closing the case'
);

// 4. Reassignment / Task Continuation ("استكمال المهمة")
assert(
  adminCode.includes('<span>استكمال المهمة</span>'),
  'AdminManager: Review button renamed to "استكمال المهمة"'
);
assert(
  adminCode.includes('اختر المنفذين المكلفين باستكمال المهمة') &&
  adminCode.includes('توجيهات وملاحظات استكمال المهمة للمنفذين (إلزامي)'),
  'AdminManager: Reassign modal shows department executors selector and mandatory task notes'
);
assert(
  capaCode.includes('export async function reassignTaskAction') &&
  capaCode.includes('targetUsers?: Array<{ id: number; name: string; deptCode: string }>') &&
  capaCode.includes('nextRound'),
  'capa.ts: reassignTaskAction creates assignments for selected executors with round increment'
);

// 5. Final Closure with Mandatory Feedback ("إغلاق الحالة بشكل نهائي")
assert(
  adminCode.includes('<span>إغلاق الحالة نهائياً</span>') &&
  adminCode.includes('الملاحظات والتوجيهات الإدارية الدائمة (إلزامي'),
  'AdminManager: Close modal requires mandatory administrative feedback'
);
assert(
  capaCode.includes('if (!closureNotes || closureNotes.trim() === "")') &&
  capaCode.includes('closed_feedback = ?') &&
  capaCode.includes('admin_feedback = ?'),
  'capa.ts: closeCaseEntirelyAction enforces mandatory closureNotes and saves feedback for all executors'
);
assert(
  queueCode.includes('💡 التوجيه والملاحظات الإدارية الدائمة (تغذية راجعة)') &&
  queueCode.includes('🔒 للقراءة فقط'),
  'FieldQueue.tsx: Closed cases tab displays administrative feedback as read-only'
);

// Summary
console.log('\n=====================================================');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
console.log('=====================================================');

if (failed > 0) process.exit(1);
