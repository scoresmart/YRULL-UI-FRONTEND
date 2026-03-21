import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/brand/BrandMark';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const CHANNELS = [
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'Supercharge your social media marketing with Instagram Automation.',
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      </div>
    ),
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    description: "Elevate your marketing with TikTok's seamless automation.",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.2 8.2 0 005.58 2.17V11.7a4.85 4.85 0 01-3.77-1.83V6.69h3.77z" />
        </svg>
      </div>
    ),
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    description: 'Choose the most popular mobile messaging app in the world and reach 2 billion users.',
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>
    ),
  },
  {
    key: 'messenger',
    name: 'Facebook Messenger',
    description: 'Create Facebook Messenger automation to keep customers happy.',
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0084FF]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.465 3.443.465 6.627 0 12-4.975 12-11.112C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z" />
        </svg>
      </div>
    ),
  },
  {
    key: 'telegram',
    name: 'Telegram',
    description: 'Power up your business with Telegram automation.',
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0088CC]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </div>
    ),
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);

  const handleSelect = async (channel) => {
    const workspaceId = profile?.workspace_id;
    if (!workspaceId) {
      toast.error('Workspace not found. Please log in again.');
      return;
    }
    try {
      await supabase.from('workspace_channels').upsert(
        { workspace_id: workspaceId, channel: channel.key, connected: false },
        { onConflict: 'workspace_id,channel' },
      );
      navigate('/integrations');
    } catch (e) {
      toast.error('Failed to select channel');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="grid min-h-screen grid-cols-2">
        {/* ── Left panel ── */}
        <div className="flex flex-col justify-between p-16">
          <BrandMark variant="light" className="text-xl" />

          <div className="max-w-md">
            <div className="mb-8">
              <div className="flex gap-2">
                <div className="h-14 w-14 rounded-full bg-green-200" />
                <div className="h-14 w-14 rounded-full bg-green-300 -ml-4" />
              </div>
              <div className="mt-2 h-16 w-16 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 -mt-4 ml-3 flex items-center justify-center text-2xl">
                📬
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Where would you like to start?
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              Don't worry, you can connect other channels later.
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Skip for now <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* ── Right panel — channel cards ── */}
        <div className="flex flex-col justify-center p-8 pr-16">
          <div className="space-y-3">
            {CHANNELS.map((ch) => (
              <button
                key={ch.key}
                onClick={() => handleSelect(ch)}
                className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:shadow-md"
              >
                {ch.icon}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{ch.name}</div>
                  <div className="mt-0.5 text-sm text-gray-500">{ch.description}</div>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
