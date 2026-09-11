import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { cn } from '../../lib/utils';
import { whatsappManagerApi, type WhatsAppNumberRecord } from '../../lib/whatsappManagerApi';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3;

export function RegisterNumberModal({
  open,
  onOpenChange,
  numbers,
  numbersLoading,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  numbers: WhatsAppNumberRecord[];
  numbersLoading: boolean;
  onRegistered: (phoneNumberId: string) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [autoPin, setAutoPin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedId('');
      setPin('');
      setAutoPin(true);
      setSubmitting(false);
    }
  }, [open]);

  const selected = numbers.find((n) => n.phone_number_id === selectedId);

  async function submit() {
    if (!selectedId) {
      toast.error('Select a phone number');
      return;
    }
    setSubmitting(true);
    const t = toast.loading('Registering number…');
    try {
      await whatsappManagerApi.registerNumber({
        phone_number_id: selectedId,
        pin: autoPin ? undefined : pin.trim() || undefined,
      });
      toast.success('Number registered', { id: t });
      onOpenChange(false);
      onRegistered(selectedId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      toast.error(msg, { id: t });
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (step === 1 && !selectedId) {
      toast.error('Choose a number from the list');
      return;
    }
    if (step === 2 && !autoPin && pin.trim() && pin.trim().length < 4) {
      toast.error('PIN must be at least 4 digits, or leave it empty');
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(90vh,720px)] max-w-lg border border-white/10 bg-[#161B22] p-0 text-gray-100 sm:max-w-lg',
          '[&>button]:text-gray-400 [&>button]:hover:bg-white/10 [&>button]:hover:text-white',
        )}
      >
        <div className="border-b border-white/10 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Register new number</DialogTitle>
            <DialogDescription className="text-gray-400">
              Link a WhatsApp Business phone from your Meta account to this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  step >= s ? 'bg-[#00D4AA]' : 'bg-white/10',
                )}
              />
            ))}
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-5 py-4 sm:px-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-3"
              >
                <p className="text-sm text-gray-400">Select the number you want to register for this workspace.</p>
                {numbersLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin text-[#00D4AA]" />
                    Loading numbers…
                  </div>
                ) : numbers.length === 0 ? (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                    No numbers available. Connect WhatsApp in Meta Business Suite, then refresh the numbers list.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {numbers.map((n) => {
                      const active = n.phone_number_id === selectedId;
                      return (
                        <li key={n.phone_number_id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(n.phone_number_id)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition',
                              active
                                ? 'border-[#00D4AA]/60 bg-[#00D4AA]/10 text-white'
                                : 'border-white/10 bg-[#0D1117] text-gray-200 hover:border-white/20',
                            )}
                          >
                            <span className="font-medium">{n.display_phone_number ?? n.phone_number_id}</span>
                            {n.verified_name && <span className="hidden truncate text-xs text-gray-400 sm:block">{n.verified_name}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <p className="text-sm text-gray-400">
                  Some registrations require a PIN from Meta. You can auto-generate or enter your own.
                </p>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0D1117] px-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">Auto-generate PIN</div>
                    <div className="text-xs text-gray-500">Recommended unless Meta gave you a specific PIN</div>
                  </div>
                  <Switch checked={autoPin} onCheckedChange={setAutoPin} />
                </div>
                {!autoPin && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">PIN</label>
                    <Input
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter PIN"
                      type="password"
                      autoComplete="one-time-code"
                      className="border-white/10 bg-[#0D1117] text-white placeholder:text-gray-600"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-3 text-sm"
              >
                <p className="text-gray-400">Confirm registration for:</p>
                <div className="rounded-xl border border-white/10 bg-[#0D1117] p-4">
                  <div className="font-semibold text-white">{selected?.display_phone_number ?? selectedId}</div>
                  {selected?.verified_name && <div className="mt-1 text-gray-400">{selected.verified_name}</div>}
                  <div className="mt-2 font-mono text-xs text-[#00D4AA]/80">{selectedId}</div>
                  <div className="mt-3 text-xs text-gray-500">
                    PIN: {autoPin ? 'Auto-generated by Meta flow' : pin ? '••••••' : 'Not set'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between gap-3 border-t border-white/10 p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-transparent text-gray-200 hover:bg-white/10"
            onClick={step === 1 ? () => onOpenChange(false) : back}
            disabled={submitting}
          >
            {step === 1 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" /> Back
              </>
            )}
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next} className="bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !selectedId}
              className="bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering…
                </>
              ) : (
                'Submit registration'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
