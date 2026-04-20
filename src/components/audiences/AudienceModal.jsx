import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

const FIELDS = ['Tag', 'Last Active', 'Phone Contains', 'Contact Status', 'Audience Member'];
const OPS = ['=', '≠', 'contains', '< days', '> days'];

export function AudienceModal({ trigger }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('dynamic');
  const [match, setMatch] = useState('all');
  const [conds, setConds] = useState([{ field: 'Tag', op: '=', value: 'VIP' }]);

  const addCond = useCallback(() => setConds((c) => [...c, { field: 'Tag', op: '=', value: '' }]), []);
  const removeCond = useCallback((idx) => setConds((c) => c.filter((_, i) => i !== idx)), []);

  const previewCount = useMemo(() => 342, [conds, match, type]); // placeholder

  const onSave = useCallback(() => {
    toast.success('Saved (mock)');
    setName('');
    setDescription('');
    setType('dynamic');
    setMatch('all');
    setConds([{ field: 'Tag', op: '=', value: 'VIP' }]);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Audience</DialogTitle>
          <DialogDescription>Build dynamic segments from tags and activity.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Audience Name</div>
              <Input
                className="mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VIP - Active < 7 days"
              />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Description</div>
              <Input
                className="mt-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional…"
              />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Type</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${type === 'dynamic' ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700'}`}
                  onClick={() => setType('dynamic')}
                >
                  Dynamic
                </button>
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${type === 'static' ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700'}`}
                  onClick={() => setType('static')}
                >
                  Static
                </button>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {type === 'dynamic' ? 'Auto-updates as contacts match conditions.' : 'Manual membership control.'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Conditions</div>
                <div className="text-sm text-gray-500">Match {match === 'all' ? 'ALL' : 'ANY'} conditions</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setMatch((m) => (m === 'all' ? 'any' : 'all'))}>
                  Toggle
                </Button>
                <Button size="sm" onClick={addCond}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {conds.map((c, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <select
                    className="col-span-4 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-accent"
                    value={c.field}
                    onChange={(e) =>
                      setConds((arr) => arr.map((v, i) => (i === idx ? { ...v, field: e.target.value } : v)))
                    }
                  >
                    {FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <select
                    className="col-span-3 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-accent"
                    value={c.op}
                    onChange={(e) =>
                      setConds((arr) => arr.map((v, i) => (i === idx ? { ...v, op: e.target.value } : v)))
                    }
                  >
                    {OPS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="col-span-4"
                    value={c.value}
                    onChange={(e) =>
                      setConds((arr) => arr.map((v, i) => (i === idx ? { ...v, value: e.target.value } : v)))
                    }
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    className="col-span-1 flex h-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                    onClick={() => removeCond(idx)}
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Preview</div>
                <Badge variant="success">{previewCount.toLocaleString()} contacts</Badge>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                This audience will match {previewCount.toLocaleString()} contacts.
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => toast('Close to cancel.')}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save Audience</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
