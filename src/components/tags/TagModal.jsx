import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { tagsApi } from '../../lib/api';

const schema = z.object({
  name: z.string().min(2, 'Tag name is required'),
  color: z.string().min(1, 'Pick a color'),
  description: z.string().optional(),
});

const COLORS = [
  { key: 'green', cls: 'bg-green-500' },
  { key: 'blue', cls: 'bg-blue-500' },
  { key: 'purple', cls: 'bg-purple-500' },
  { key: 'orange', cls: 'bg-amber-500' },
  { key: 'red', cls: 'bg-red-500' },
  { key: 'gray', cls: 'bg-gray-500' },
  { key: 'teal', cls: 'bg-teal-500' },
  { key: 'indigo', cls: 'bg-indigo-500' },
  { key: 'pink', cls: 'bg-pink-500' },
  { key: 'lime', cls: 'bg-lime-500' },
  { key: 'cyan', cls: 'bg-cyan-500' },
  { key: 'amber', cls: 'bg-amber-600' },
];

export function TagModal({ trigger }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: 'green', description: '' },
  });

  const onSubmit = useCallback(async (values) => {
    try {
      await tagsApi.create({
        name: values.name.trim(),
        color: values.color,
        description: values.description || '',
      });
      toast.success('Tag created!');
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      form.reset();
      setOpen(false);
    } catch (err) {
      console.error('Failed to create tag:', err);
      toast.error('Failed to create tag');
    }
  }, [form, queryClient]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Tag</DialogTitle>
          <DialogDescription>Tags help categorize contacts and conversations.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Tag Name</div>
            <Input className="mt-2" placeholder="VIP" {...form.register('name')} />
            {form.formState.errors.name ? <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p> : null}
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Color</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => form.setValue('color', c.key, { shouldValidate: true })}
                  className="rounded-full p-1"
                  aria-label={c.key}
                >
                  <div
                    className={[
                      'h-7 w-7 rounded-full',
                      c.cls,
                      form.watch('color') === c.key ? 'ring-2 ring-black/30 ring-offset-2' : 'ring-1 ring-black/10',
                    ].join(' ')}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Description</div>
            <Textarea className="mt-2" placeholder="Optional…" {...form.register('description')} />
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Preview</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {form.watch('name') || 'Tag'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

