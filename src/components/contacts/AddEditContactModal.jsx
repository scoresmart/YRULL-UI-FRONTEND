import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const schema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes: z.string().optional(),
});

export function AddEditContactModal({ trigger }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', phone: '', email: '', notes: '' },
  });

  const onSubmit = useCallback(
    async (values) => {
      toast.success('Saved (mock)');
      form.reset();
      return values;
    },
    [form],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Create or update a contact in your workspace.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">First Name</div>
              <Input className="mt-2" {...form.register('first_name')} />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Last Name</div>
              <Input className="mt-2" {...form.register('last_name')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Phone *</div>
              <Input className="mt-2" placeholder="+1 415 555 0123" {...form.register('phone')} />
              {form.formState.errors.phone ? (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</div>
              <Input className="mt-2" placeholder="name@company.com" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Notes</div>
            <Textarea className="mt-2" {...form.register('notes')} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

