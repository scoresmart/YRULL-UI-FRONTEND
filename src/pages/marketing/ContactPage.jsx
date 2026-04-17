import { useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Mail, MapPin, Phone, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ContactPage() {
  useDocumentTitle(
    'Contact',
    'Get in touch with Yrull. Reach us at support@yrull.com or fill out the contact form.',
  );

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSending(true);

    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      toast.error('Please fill in all required fields.');
      setSending(false);
      return;
    }

    const mailto = `mailto:support@yrull.com?subject=${encodeURIComponent(subject || 'Contact from ' + name)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
    window.open(mailto, '_blank');

    setSubmitted(true);
    setSending(false);
    toast.success('Your message has been prepared. Thank you!');
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-sidebar py-20 text-center text-white sm:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">Contact</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Get in touch</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            Have a question, feedback, or partnership idea? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:px-8">
          {/* Contact info */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900">Contact information</h2>
            <p className="mt-3 text-sm text-gray-500">Reach out anytime — we typically respond within 24 hours.</p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">General inquiries</h3>
                  <a href="mailto:support@yrull.com" className="mt-1 text-sm text-brand-accent hover:underline">support@yrull.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Privacy & data</h3>
                  <a href="mailto:privacy@yrull.com" className="mt-1 text-sm text-brand-accent hover:underline">privacy@yrull.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Office</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Prepsmart Pty Ltd<br />
                    97 Waverly Street, Moonee Ponds<br />
                    Melbourne, Victoria 3039, Australia
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-accent/10">
                  <CheckCircle2 className="h-7 w-7 text-brand-accent" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Thank you!</h3>
                <p className="mt-2 text-sm text-gray-500">We&apos;ve received your message and will get back to you shortly.</p>
                <Button className="mt-6" variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-medium uppercase tracking-wide text-gray-400">Name *</label>
                    <Input id="name" name="name" placeholder="Your name" required />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-gray-400">Email *</label>
                    <Input id="email" name="email" type="email" placeholder="you@company.com" required />
                  </div>
                </div>
                <div className="mt-5 space-y-1.5">
                  <label htmlFor="subject" className="text-xs font-medium uppercase tracking-wide text-gray-400">Subject</label>
                  <Input id="subject" name="subject" placeholder="What's this about?" />
                </div>
                <div className="mt-5 space-y-1.5">
                  <label htmlFor="message" className="text-xs font-medium uppercase tracking-wide text-gray-400">Message *</label>
                  <Textarea id="message" name="message" placeholder="Tell us more..." rows={5} required />
                </div>
                <Button type="submit" className="mt-6 w-full sm:w-auto" size="lg" disabled={sending}>
                  <Send className="mr-2 h-4 w-4" /> Send message
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
