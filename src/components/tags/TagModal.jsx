import { useCallback, useEffect, useState } from 'react';
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
import { TAG_COLORS, tagColor } from '../../lib/tagColors';
import { cn } from '../../lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Tag name is required'),
  color: z.string().min(1, 'Pick a color'),
  description: z.string().optional(),
});

/**
 * Create/edit dialog for a tag.
 *
 * Pass `tag` to edit an existing one; omit it to create. Controlled usage is
 * supported via `open`/`onOpenChange` (the tag grid opens the edit dialog from
 * a row action rather than a trigger element).
 */
export function TagModal({ trigger, tag, open: controlledOpen, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;

  const isEdit = Boolean(tag);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tag?.name ?? '',
      color: tag?.color ?? 'green',
      description: tag?.description ?? '',
    },
  });

  const { reset } = form;

  // Reopening for a different tag has to refill the fields — react-hook-form
  // keeps its own state across renders and won't pick up new defaults alone.
  useEffect(() => {
    if (open) {
      reset({ name: tag?.name ?? '', color: tag?.color ?? 'green', description: tag?.description ?? '' });
    }
  }, [open, tag, reset]);

  const onSubmit = useCallback(
    async (values) => {
      const payload = {
        name: values.name.trim(),
        color: values.color,
        description: values.description || '',
      };
      try {
        if (isEdit) {
          await tagsApi.update(tag.id, payload);
          toast.success('Tag updated');
        } else {
          await tagsApi.create(payload);
          toast.success('Tag created!');
        }
        await queryClient.invalidateQueries({ queryKey: ['tags'] });
        form.reset();
        setOpen(false);
      } catch (err) {
        console.error(isEdit ? 'Failed to update tag:' : 'Failed to create tag:', err);
        toast.error(err.message || (isEdit ? 'Failed to update tag' : 'Failed to create tag'));
      }
    },
    [form, queryClient, isEdit, tag, setOpen],
  );

  const selectedColor = form.watch('color');
  const previewName = form.watch('name');

  const content = (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
        <DialogDescription>Tags help categorize contacts and conversations.</DialogDescription>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Tag Name</div>
          <Input className="mt-2" placeholder="VIP" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Color</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => form.setValue('color', c.key, { shouldValidate: true })}
                className="rounded-full p-1"
                aria-label={c.label}
                aria-pressed={selectedColor === c.key}
              >
                <div
                  className={cn(
                    'h-7 w-7 rounded-full',
                    c.dot,
                    selectedColor === c.key ? 'ring-2 ring-black/30 ring-offset-2' : 'ring-1 ring-black/10',
                  )}
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
            <span className={cn('h-2 w-2 rounded-full', tagColor(selectedColor).dot)} />
            {previewName || 'Tag'}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      {content}
    </Dialog>
  );
}
