import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ClipboardCheck, Download, FileText, Loader2, MessageCircle, RotateCcw, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { templatesApi, whatsappApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  MAX_FILES,
  analyzeScorecard,
  downloadReportPdf,
  downloadStudyPlanPdf,
  fileSlug,
  saveBlob,
  validateFiles,
} from '../../lib/scoreReportApi';

const SCORE_FIELDS = [
  { key: 'listening_score', label: 'Listening' },
  { key: 'reading_score', label: 'Reading' },
  { key: 'speaking_score', label: 'Speaking' },
  { key: 'writing_score', label: 'Writing' },
];

const OVERRIDE_FIELDS = [{ key: 'overall_score', label: 'Overall' }, ...SCORE_FIELDS];

const SKILLS_PROFILE = [
  { key: 'open_response_speaking_writing_score', label: 'Open Response Speaking and Writing' },
  { key: 'reproducing_spoken_written_score', label: 'Reproducing Spoken and Written Language' },
  { key: 'extended_writing_score', label: 'Extended Writing' },
  { key: 'short_writing_score', label: 'Short Writing' },
  { key: 'extended_speaking_score', label: 'Extended Speaking' },
  { key: 'short_speaking_score', label: 'Short Speaking' },
  { key: 'multiple_skills_comprehension_score', label: 'Multiple-skills Comprehension' },
  { key: 'single_skill_comprehension_score', label: 'Single-skill Comprehension' },
];

const EMPTY_OVERRIDES = { overall_score: '', listening_score: '', reading_score: '', speaking_score: '', writing_score: '' };

function errMessage(err) {
  return err?.message || 'Something went wrong. Please try again.';
}

// Digits only, with country code (e.g. 61412345678). Spaces, + and dashes are dropped.
function normalizePhone(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

// The backend's message when Meta won't deliver a file outside the 24-hour window.
function isWindowClosed(err) {
  return /24[- ]hour|window/i.test(err?.message ?? '');
}

// Body text of a template, and how many {{n}} parameters it takes.
function templateBody(template) {
  const body = (template?.components ?? []).find((c) => (c.type || '').toUpperCase() === 'BODY');
  return body?.text || '';
}

function templateParamCount(text) {
  const matches = String(text ?? '').match(/{{\s*\d+\s*}}/g);
  if (!matches) return 0;
  return Math.max(...matches.map((m) => parseInt(m.replace(/\D/g, ''), 10)), 0);
}

function inRange(value, min, max) {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= min && n <= max;
}

function ScoreTile({ label, value, large = false }) {
  return (
    <div className={cn('rounded-xl border border-gray-100 bg-gray-50 p-4 text-center', large && 'bg-emerald-50')}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={cn('mt-1 font-semibold text-gray-900', large ? 'text-3xl' : 'text-2xl')}>{value ?? '—'}</div>
    </div>
  );
}

export function FreeAssessmentPage() {
  useDocumentTitle('Free Assessment', "Upload a student's PTE score report to get a free assessment.");

  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const [overrides, setOverrides] = useState(EMPTY_OVERRIDES);
  const [showOverrides, setShowOverrides] = useState(false);
  const [target, setTarget] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState('60');
  const [studentPhone, setStudentPhone] = useState('');
  const [openerTemplate, setOpenerTemplate] = useState('');

  const analyze = useMutation({
    mutationFn: () => {
      const typed = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== ''));
      return analyzeScorecard(files, typed);
    },
    // The error is shown inline under the Analyze button (it can be long).
  });

  const reportPdf = useMutation({
    mutationFn: (payload) => downloadReportPdf(payload),
    onSuccess: (blob) => saveBlob(blob, `${fileSlug(name)}-assessment.pdf`),
    onError: (err) => toast.error(errMessage(err)),
  });

  const studyPlan = useMutation({
    mutationFn: (payload) => downloadStudyPlanPdf(payload),
    onSuccess: (blob) => saveBlob(blob, `${fileSlug(name)}-study-plan.pdf`),
    onError: (err) => toast.error(errMessage(err)),
  });

  // Lead magnet: build the assessment PDF and send it to the student on WhatsApp.
  const sendToStudent = useMutation({
    mutationFn: async ({ payload, to, caption }) => {
      const blob = await downloadReportPdf(payload);
      const file = new File([blob], `${fileSlug(payload.name)}-assessment.pdf`, { type: 'application/pdf' });
      return whatsappApi.sendMedia({ to, file, caption });
    },
    onSuccess: () => toast.success('Assessment sent on WhatsApp'),
    onError: (err) => toast.error(errMessage(err)),
  });

  const windowClosed = sendToStudent.isError && isWindowClosed(sendToStudent.error);

  // Approved templates the staff can use to open the chat. Only those without
  // {{n}} parameters, because this panel doesn't ask for values.
  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
    enabled: windowClosed,
    staleTime: 60_000,
  });
  const openerOptions = useMemo(
    () =>
      (Array.isArray(templatesQ.data) ? templatesQ.data : templatesQ.data?.templates ?? []).filter(
        (t) => t.status === 'APPROVED' && templateParamCount(templateBody(t)) === 0,
      ),
    [templatesQ.data],
  );

  // Sends an approved template to open the 24-hour window. The student's reply
  // opens it, then the PDF can be sent.
  const sendOpener = useMutation({
    mutationFn: () => {
      const t = openerOptions.find((o) => o.name === openerTemplate);
      if (!t) throw new Error('Choose a template first.');
      return templatesApi.sendTest({
        to: normalizePhone(studentPhone),
        template_name: t.name,
        language: t.language,
        components: [],
      });
    },
    onSuccess: () => {
      toast.success('Template sent. Send the PDF again once they reply.');
      sendToStudent.reset();
    },
    onError: (err) => toast.error(errMessage(err)),
  });

  const result = analyze.data;

  const tasks = useMemo(
    () => [...(result?.task_estimates ?? [])].sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0)),
    [result],
  );

  const addFiles = (incoming) => {
    const next = [...files, ...Array.from(incoming ?? [])];
    try {
      validateFiles(next);
    } catch (err) {
      toast.error(errMessage(err));
      return;
    }
    setFiles(next);
    analyze.reset();
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    analyze.reset();
  };

  const startOver = () => {
    setFiles([]);
    setName('');
    setOverrides(EMPTY_OVERRIDES);
    setShowOverrides(false);
    setTarget('');
    setExamDate('');
    setDailyMinutes('60');
    setStudentPhone('');
    setOpenerTemplate('');
    analyze.reset();
    reportPdf.reset();
    studyPlan.reset();
    sendToStudent.reset();
    sendOpener.reset();
    if (inputRef.current) inputRef.current.value = '';
  };

  const overridesValid = Object.values(overrides).every((v) => v === '' || inRange(v, 10, 90));
  const trimmedName = name.trim().slice(0, 60);
  const basePayload = result
    ? { scores: result.scores, skills_profile: result.skills_profile, ...(trimmedName ? { name: trimmedName } : {}) }
    : null;

  const targetValid = inRange(target, 10, 90);
  const minutesValid = inRange(dailyMinutes, 10, 600);

  const phoneDigits = normalizePhone(studentPhone);
  const phoneValid = /^\d{8,15}$/.test(phoneDigits);

  const onSendToStudent = (e) => {
    e.preventDefault();
    if (!basePayload || !phoneValid) return;
    sendToStudent.mutate({
      payload: basePayload,
      to: phoneDigits,
      caption: trimmedName ? `Your free PTE assessment, ${trimmedName}` : 'Your free PTE assessment',
    });
  };

  const onStudyPlan = (e) => {
    e.preventDefault();
    if (!basePayload || !targetValid || !minutesValid) return;
    studyPlan.mutate({
      ...basePayload,
      target_overall: Number(target),
      exam_date: examDate || null,
      daily_minutes: Number(dailyMinutes),
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Free Assessment</div>
          <div className="mt-1 text-sm text-gray-500">
            Upload a student&apos;s PTE score report to get a free assessment.
          </div>
        </div>
        {(files.length > 0 || result) && (
          <Button variant="outline" onClick={startOver}>
            <RotateCcw className="h-4 w-4" />
            Start over
          </Button>
        )}
      </div>

      <Card className="p-4 sm:p-6">
        <div className="grid gap-4">
          <div>
            <label htmlFor="fa-name" className="mb-1 block text-sm font-medium text-gray-700">
              Student name <span className="font-normal text-gray-400">(optional, shown on the PDFs)</span>
            </label>
            <Input
              id="fa-name"
              value={name}
              maxLength={60}
              placeholder="e.g. Priya Sharma"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload score report"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer?.files);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragging ? 'border-brand-accent bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
            )}
          >
            <Upload className="h-6 w-6 text-gray-400" />
            <div className="mt-2 text-sm font-medium text-gray-900">Drop the score report here, or click to choose</div>
            <div className="mt-1 text-xs text-gray-500">
              Screenshots, photos or PDF · up to {MAX_FILES} files · 4 MB each
            </div>
            <input
              ref={inputRef}
              data-testid="fa-file-input"
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="grid gap-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate text-gray-900">{f.name}</span>
                    <span className="shrink-0 text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => removeFile(i)}
                    disabled={analyze.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <button
              type="button"
              className="text-sm font-medium text-gray-600 underline-offset-2 hover:underline"
              onClick={() => setShowOverrides((v) => !v)}
            >
              {showOverrides ? 'Hide typed scores' : 'Type scores yourself (optional)'}
            </button>
            {showOverrides && (
              <div className="mt-3">
                <div className="mb-2 text-xs text-gray-500">
                  Typed scores (10–90) replace what is read from the report. Use this when a score is not visible.
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {OVERRIDE_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label htmlFor={`fa-ov-${f.key}`} className="mb-1 block text-xs font-medium text-gray-600">
                        {f.label}
                      </label>
                      <Input
                        id={`fa-ov-${f.key}`}
                        type="number"
                        inputMode="numeric"
                        min={10}
                        max={90}
                        value={overrides[f.key]}
                        onChange={(e) => setOverrides((o) => ({ ...o, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                {!overridesValid && <div className="mt-2 text-xs text-red-600">Scores must be whole numbers from 10 to 90.</div>}
              </div>
            )}
          </div>

          <div>
            <Button
              onClick={() => analyze.mutate()}
              disabled={files.length === 0 || analyze.isPending || !overridesValid}
              className="w-full sm:w-auto"
            >
              {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              {analyze.isPending ? 'Analyzing…' : 'Analyze'}
            </Button>
          </div>

          {analyze.isError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errMessage(analyze.error)}
            </div>
          )}
        </div>
      </Card>

      {analyze.isPending && (
        <div className="mt-6 grid gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-6">
          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-lg font-semibold text-gray-900">Scores</div>
              <Button
                variant="outline"
                onClick={() => reportPdf.mutate(basePayload)}
                disabled={reportPdf.isPending}
              >
                {reportPdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF report
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="col-span-2 sm:col-span-1">
                <ScoreTile label="Overall" value={result.scores?.overall_score} large />
              </div>
              {SCORE_FIELDS.map((f) => (
                <ScoreTile key={f.key} label={f.label} value={result.scores?.[f.key]} />
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="mb-1 text-lg font-semibold text-gray-900">Send to student</div>
            <div className="mb-4 text-sm text-gray-500">
              Sends the assessment PDF to the student on WhatsApp. WhatsApp only delivers free-form messages to numbers
              that have messaged us in the last 24 hours.
            </div>
            <form onSubmit={onSendToStudent} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label htmlFor="fa-phone" className="mb-1 block text-sm font-medium text-gray-700">
                  WhatsApp number (with country code)
                </label>
                <Input
                  id="fa-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 61 412 345 678"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                />
                {studentPhone && !phoneValid && (
                  <div className="mt-1 text-xs text-red-600">Enter 8–15 digits including the country code.</div>
                )}
              </div>
              <Button type="submit" disabled={!phoneValid || sendToStudent.isPending} className="w-full sm:w-auto">
                {sendToStudent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {sendToStudent.isPending ? 'Sending…' : 'Send assessment PDF'}
              </Button>
            </form>
            {sendToStudent.isError && (
              <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errMessage(sendToStudent.error)}
              </div>
            )}
            {windowClosed && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
                <div className="font-medium text-gray-900">Open the chat first</div>
                <div className="mb-3 mt-1 text-gray-600">
                  Send an approved template that asks the student to reply. Once they reply, click Send assessment PDF
                  again.
                </div>
                {templatesQ.isLoading && <div className="text-gray-500">Loading templates…</div>}
                {templatesQ.isError && <div className="text-red-600">Could not load templates.</div>}
                {templatesQ.isSuccess && openerOptions.length === 0 && (
                  <div className="text-gray-600">
                    No approved templates without variables. Create and approve one in Templates.
                  </div>
                )}
                {openerOptions.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <label htmlFor="fa-opener" className="mb-1 block text-xs font-medium text-gray-600">
                        Template
                      </label>
                      <select
                        id="fa-opener"
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        value={openerTemplate}
                        onChange={(e) => setOpenerTemplate(e.target.value)}
                      >
                        <option value="">Choose a template</option>
                        {openerOptions.map((t) => (
                          <option key={`${t.name}-${t.language}`} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!openerTemplate || sendOpener.isPending}
                      onClick={() => sendOpener.mutate()}
                      className="w-full sm:w-auto"
                    >
                      {sendOpener.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {sendOpener.isPending ? 'Sending…' : 'Send template'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {sendToStudent.isSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Sent to {phoneDigits}.
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-gray-900">Skills Profile</div>
              {result.profile_status === 'estimated' && <Badge variant="warning">Estimated</Badge>}
            </div>
            {(result.warnings ?? []).length > 0 && (
              <ul className="mb-4 grid gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <div className="grid gap-3">
              {SKILLS_PROFILE.map((row) => {
                const v = result.skills_profile?.[row.key];
                const pct = Math.max(0, Math.min(100, Number(v) || 0));
                return (
                  <div key={row.key} data-testid="fa-profile-row">
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-700">{row.label}</span>
                      <span className="font-semibold text-gray-900">{v ?? '—'}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-brand-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="mb-1 text-lg font-semibold text-gray-900">Task-by-task estimates</div>
            <div className="mb-4 text-sm text-gray-500">Weakest first.</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3 font-medium">Task</th>
                    <th className="py-2 pr-3 font-medium">Estimate</th>
                    <th className="hidden py-2 font-medium sm:table-cell">Counts toward</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.key} data-testid="fa-task-row" className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-500 sm:hidden">{(t.counts_toward ?? []).join(', ')}</div>
                      </td>
                      <td className="py-2 pr-3 font-semibold text-gray-900">{t.percent}%</td>
                      <td className="hidden py-2 text-gray-600 sm:table-cell">{(t.counts_toward ?? []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="mb-1 text-lg font-semibold text-gray-900">Study plan</div>
            <div className="mb-4 text-sm text-gray-500">
              A day-by-day plan PDF built from these scores. It can take up to a minute.
            </div>
            <form onSubmit={onStudyPlan} className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="fa-target" className="mb-1 block text-sm font-medium text-gray-700">
                  Target overall (10–90)
                </label>
                <Input
                  id="fa-target"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={90}
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="fa-exam-date" className="mb-1 block text-sm font-medium text-gray-700">
                  Exam date <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <Input id="fa-exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="fa-minutes" className="mb-1 block text-sm font-medium text-gray-700">
                  Daily minutes (10–600)
                </label>
                <Input
                  id="fa-minutes"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={600}
                  required
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  disabled={!targetValid || !minutesValid || studyPlan.isPending}
                  className="w-full sm:w-auto"
                >
                  {studyPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {studyPlan.isPending ? 'Building study plan…' : 'Download study plan'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
