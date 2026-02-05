import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';
import { 
  Zap, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  Bot,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api, type OrchestrationPlan, type OrchestrationEvent } from '@/lib/api';
import { cn } from '@/lib/utils';
import { use_auth_store } from '@/stores/auth-store';

const EXAMPLE_PROMPTS = [
  'Generate monthly P&L report and reconcile all accounts',
  'Process all pending invoices and schedule payments',
  'Import transactions from Plaid and categorize expenses',
  'Run compliance check and prepare audit documentation',
  'Analyze cash flow and create forecast for next quarter',
];

export function CommandCenterPage() {
  const [command, set_command] = useState('');
  const [plan, set_plan] = useState<OrchestrationPlan | null>(null);
  const [execution_events, set_execution_events] = useState<OrchestrationEvent[]>([]);
  const [is_executing, set_is_executing] = useState(false);
  
  const { is_authenticated } = use_auth_store();

  // Create plan mutation
  const create_plan_mutation = useMutation({
    mutationFn: async (cmd: string) => {
      console.log('Creating plan for command:', cmd);
      const result = await api.create_orchestration_plan(cmd);
      console.log('Plan creation response:', result);
      return result.plan;
    },
    onSuccess: (plan) => {
      console.log('Plan created successfully:', plan);
      set_plan(plan);
      alert(`Plan created with ${plan.tasks?.length || 0} tasks!`);
    },
    onError: (error: any) => {
      console.error('Plan creation failed:', error);
      alert(`Failed to create plan: ${error.message}`);
    },
  });

  // Execute plan mutation
  const execute_plan_mutation = useMutation({
    mutationFn: async (plan_id: string) => {
      set_is_executing(true);
      set_execution_events([]);
      
      const result = await api.execute_orchestration_plan_stream(
        plan_id,
        (event) => {
          set_execution_events(prev => [...prev, event]);
        }
      );
      
      set_is_executing(false);
      return result;
    },
  });

  const handle_create_plan = () => {
    if (!command.trim()) return;
    create_plan_mutation.mutate(command);
  };

  const handle_execute_plan = () => {
    if (!plan) return;
    execute_plan_mutation.mutate(plan.plan_id);
  };

  const handle_quick_prompt = (prompt: string) => {
    set_command(prompt);
  };

  const get_task_status = (task_id: string) => {
    const task_events = execution_events.filter(e => 
      (e.type === 'task_started' || e.type === 'task_completed' || e.type === 'task_failed') && 
      'task_id' in e && 
      e.task_id === task_id
    );
    
    const latest = task_events[task_events.length - 1];
    if (!latest) return 'pending';
    
    if (latest.type === 'task_started') return 'running';
    if (latest.type === 'task_completed') return 'completed';
    if (latest.type === 'task_failed') return 'failed';
    
    return 'pending';
  };

  const completed_tasks = plan?.tasks.filter(t => get_task_status(t.task_id) === 'completed').length || 0;
  const total_tasks = plan?.tasks.length || 0;
  const progress = total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Deploy agents with a single prompt - describe your goal and let ClawKeeper orchestrate the work
        </p>
      </div>

      {/* Auth Warning */}
      {!is_authenticated && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <div className="ml-2">
            <h4 className="font-semibold text-yellow-600">Authentication Required</h4>
            <p className="text-sm text-yellow-600/80 mt-1">
              Please log in at <a href="/login" className="underline font-medium">the login page</a> to use the Command Center.
            </p>
          </div>
        </Alert>
      )}

      {/* Command Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            What do you need done?
          </CardTitle>
          <CardDescription>
            Describe any financial task in natural language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Examples */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handle_quick_prompt(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Command Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="e.g., Generate monthly P&L report and reconcile all accounts..."
              value={command}
              onChange={(e) => set_command(e.target.value)}
              className="min-h-[120px] text-base"
              disabled={is_executing}
            />
            <div className="flex gap-2">
              <Button
                onClick={handle_create_plan}
                disabled={!command.trim() || create_plan_mutation.isPending || is_executing}
                className="flex-1"
                size="lg"
              >
                {create_plan_mutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Plan with DeepSeek AI...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Create Execution Plan
                  </>
                )}
              </Button>
            </div>
            
            {/* Status Messages */}
            {create_plan_mutation.isPending && (
              <div className="text-sm text-muted-foreground text-center animate-pulse">
                DeepSeek is analyzing your command and decomposing it into tasks...
              </div>
            )}
            
            {create_plan_mutation.isError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <strong>Error:</strong> {(create_plan_mutation.error as any)?.message || 'Unknown error'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Preview */}
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Execution Plan
              </span>
              <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>
                {plan.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {plan.tasks.length} tasks identified - Review and execute
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            {is_executing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completed_tasks} / {total_tasks}</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Task List */}
            <div className="space-y-2">
              {plan.tasks.map((task, index) => {
                const status = get_task_status(task.task_id);
                const StatusIcon = 
                  status === 'completed' ? CheckCircle2 :
                  status === 'failed' ? XCircle :
                  status === 'running' ? Loader2 :
                  Clock;

                return (
                  <div
                    key={task.task_id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      status === 'completed' && "bg-green-500/10 border-green-500/20",
                      status === 'failed' && "bg-red-500/10 border-red-500/20",
                      status === 'running' && "bg-blue-500/10 border-blue-500/20"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5",
                      status === 'running' && "animate-spin"
                    )}>
                      <StatusIcon className={cn(
                        "h-5 w-5",
                        status === 'completed' && "text-green-500",
                        status === 'failed' && "text-red-500",
                        status === 'running' && "text-blue-500",
                        status === 'pending' && "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {index + 1}
                        </span>
                        <p className="font-medium">{task.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          {task.agent_name}
                        </Badge>
                        {task.required_capabilities.slice(0, 3).map(cap => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {task.required_capabilities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{task.required_capabilities.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      status === 'completed' ? 'default' :
                      status === 'failed' ? 'destructive' :
                      status === 'running' ? 'default' :
                      'secondary'
                    }>
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Execute Button */}
            {!is_executing && plan.status === 'pending' && (
              <Button
                onClick={handle_execute_plan}
                disabled={execute_plan_mutation.isPending}
                className="w-full"
                size="lg"
              >
                {execute_plan_mutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Execute Plan
                  </>
                )}
              </Button>
            )}

            {/* Execution Summary */}
            {execute_plan_mutation.isSuccess && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <p className="font-medium">Execution Complete</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {execute_plan_mutation.data.summary}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Completed:</span>{' '}
                        <span className="font-medium text-green-500">
                          {execute_plan_mutation.data.tasks_completed}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>{' '}
                        <span className="font-medium text-red-500">
                          {execute_plan_mutation.data.tasks_failed}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{' '}
                        <span className="font-medium">
                          {(execute_plan_mutation.data.total_duration_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
