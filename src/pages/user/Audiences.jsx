import { Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { AudienceModal } from '../../components/audiences/AudienceModal';
import { useAudiences } from '../../lib/dataHooks';

export function AudiencesPage() {
  const audiencesQ = useAudiences();

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Audiences</div>
          <div className="mt-1 text-sm text-gray-500">Segment contacts for targeted messaging and automation.</div>
        </div>
        <AudienceModal trigger={<Button>Create Audience</Button>} />
      </div>

      {audiencesQ.isLoading ? (
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {(audiencesQ.data ?? []).map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-gray-900">{a.name}</div>
                  <div className="mt-1 text-sm text-gray-500 line-clamp-2">{a.description}</div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    <Users className="h-3.5 w-3.5" />
                    {(Math.floor(Math.random() * 900) + 120).toLocaleString()} contacts
                  </div>
                  <div className="mt-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-700">
                      {a.conditions?.rules?.length ? 'Conditions configured' : 'No conditions'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant={a.type === 'dynamic' ? 'success' : 'muted'}>
                    {a.type === 'dynamic' ? 'Dynamic' : 'Static'}
                  </Badge>
                  <div className="mt-2 text-xs text-gray-400">Updated: 2h ago</div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Button variant="outline" size="sm">
                  View Contacts
                </Button>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600">
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
