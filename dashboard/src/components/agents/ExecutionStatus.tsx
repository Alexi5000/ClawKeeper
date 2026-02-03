import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, CheckCircle2, XCircle, Clock, Coins, Zap } from 'lucide-react';

interface TaskResult {
  task_id: string;
  success: boolean;
  output: Record<string, unknown>;
  error: string | null;
  duration_ms: number;
  agent_id: string;
  tokens_used?: number;
  cost?: number;
}

interface ExecutionStatusProps {
  result: TaskResult | null;
  is_loading: boolean;
  start_time: number | null;
}

export function ExecutionStatus({ result, is_loading, start_time }: ExecutionStatusProps) {
  const [elapsed_time, set_elapsed_time] = useState(0);

  useEffect(() => {
    if (is_loading && start_time) {
      const interval = setInterval(() => {
        set_elapsed_time(Date.now() - start_time);
      }, 100);
      return () => clearInterval(interval);
    } else {
      set_elapsed_time(0);
    }
  }, [is_loading, start_time]);

  const format_time = (ms: number) => {
    return (ms / 1000).toFixed(1) + 's';
  };

  const format_cost = (cost: number | undefined) => {
    if (!cost) return '$0.000';
    return '$' + cost.toFixed(3);
  };

  if (!is_loading && !result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Submit a task to see execution status
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Execution Status</span>
          {is_loading && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Running
            </Badge>
          )}
          {result && result.success && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
          {result && !result.success && (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {is_loading && (
          <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-primary animate-pulse" style={{ width: '100%' }} />
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="text-sm font-medium">
                {is_loading ? format_time(elapsed_time) : result ? format_time(result.duration_ms) : '-'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Tokens</div>
              <div className="text-sm font-medium">
                {result?.tokens_used?.toLocaleString() || '-'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="text-sm font-medium">
                {format_cost(result?.cost)}
              </div>
            </div>
          </div>
        </div>

        {/* Output Display */}
        {result && (
          <div>
            <div className="text-sm font-medium mb-2">
              {result.success ? 'Output' : 'Error'}
            </div>
            <div className="relative">
              <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-96">
                {result.success
                  ? JSON.stringify(result.output, null, 2)
                  : result.error || 'Unknown error'}
              </pre>
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {is_loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Agent is processing your task...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
