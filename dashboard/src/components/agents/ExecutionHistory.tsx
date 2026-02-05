import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { format_datetime } from '@/lib/utils';

interface AgentRun {
  id: string;
  agent_id: string;
  task_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_used: number;
  cost: number;
  error: string | null;
}

interface ExecutionHistoryProps {
  runs: AgentRun[];
  is_loading: boolean;
}

export function ExecutionHistory({ runs, is_loading }: ExecutionHistoryProps) {
  const get_status_badge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const format_duration = (ms: number | null) => {
    if (!ms) return '-';
    return (ms / 1000).toFixed(1) + 's';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
      </CardHeader>
      <CardContent>
        {is_loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No execution history yet
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">Task {run.task_id.slice(0, 8)}</div>
                  {get_status_badge(run.status)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format_duration(run.duration_ms)}
                  </div>
                  <div>
                    {run.tokens_used?.toLocaleString() || 0} tokens
                  </div>
                  <div>
                    ${typeof run.cost === 'number' ? run.cost.toFixed(3) : Number(run.cost || 0).toFixed(3)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format_datetime(run.started_at)}
                </div>
                {run.error && (
                  <div className="text-xs text-destructive mt-2 truncate">
                    Error: {run.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
