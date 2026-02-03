import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TaskSubmissionForm } from '@/components/agents/TaskSubmissionForm';
import { ExecutionStatus } from '@/components/agents/ExecutionStatus';
import { ExecutionHistory } from '@/components/agents/ExecutionHistory';
import { Bot, Zap, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  capabilities?: string[];
}

export function AgentConsolePage() {
  const [selected_agent_id, set_selected_agent_id] = useState<string>('clawkeeper');
  const [task_result, set_task_result] = useState<any>(null);
  const [is_executing, set_is_executing] = useState(false);
  const [execution_start_time, set_execution_start_time] = useState<number | null>(null);

  // Fetch agent status
  const { data: agent_data, isLoading: agents_loading } = useQuery<any>({
    queryKey: ['agents-status'],
    queryFn: async () => await api.get_agent_status(),
    refetchInterval: 10000,
  });

  // Fetch templates for selected agent
  const { data: templates_data } = useQuery<any>({
    queryKey: ['agent-templates', selected_agent_id],
    queryFn: async () => await api.get_agent_templates(selected_agent_id),
    enabled: !!selected_agent_id,
  });

  // Fetch execution history for selected agent
  const { data: runs_data, isLoading: runs_loading, refetch: refetch_runs } = useQuery<any>({
    queryKey: ['agent-runs', selected_agent_id],
    queryFn: async () => await api.get_agent_runs(selected_agent_id, 10),
    enabled: !!selected_agent_id,
    refetchInterval: is_executing ? 2000 : false,
  });

  // Get all agents organized by type
  const all_agents: Agent[] = agent_data
    ? [
        ...(agent_data.agents?.ceo || []),
        ...(agent_data.agents?.orchestrators || []),
        ...(agent_data.agents?.workers || []),
      ]
    : [];

  const selected_agent = all_agents.find((a) => a.id === selected_agent_id);

  const handle_submit_task = async (task: {
    task_name: string;
    description: string;
    parameters: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'critical';
  }) => {
    set_is_executing(true);
    set_execution_start_time(Date.now());
    set_task_result(null);

    try {
      const result = await api.execute_agent_task(selected_agent_id, task);
      set_task_result(result);
      refetch_runs();
    } catch (error: any) {
      set_task_result({
        task_id: 'error',
        success: false,
        output: {},
        error: error.message || 'Task execution failed',
        duration_ms: Date.now() - (execution_start_time || Date.now()),
        agent_id: selected_agent_id,
      });
    } finally {
      set_is_executing(false);
      set_execution_start_time(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Agent Console</h1>
        <p className="text-muted-foreground mt-1">
          Execute tasks and interact with your AI agents
        </p>
      </div>

      {/* Agent Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Agent</CardTitle>
        </CardHeader>
        <CardContent>
          {agents_loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div>
              <select
                value={selected_agent_id}
                onChange={(e) => set_selected_agent_id(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border bg-background text-sm"
              >
                <optgroup label="CEO">
                  {agent_data?.agents?.ceo?.map((agent: Agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Orchestrators">
                  {agent_data?.agents?.orchestrators?.map((agent: Agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Workers">
                  {agent_data?.agents?.workers?.slice(0, 20).map((agent: Agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.description}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Selected Agent Info */}
              {selected_agent && (
                <div className="mt-4 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{selected_agent.name}</h3>
                        <Badge variant={selected_agent.status === 'idle' ? 'default' : 'secondary'}>
                          {selected_agent.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selected_agent.description}
                      </p>
                      {selected_agent.capabilities && selected_agent.capabilities.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <Zap className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {selected_agent.capabilities.length} capabilities
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Task Submission */}
        <div className="space-y-6">
          <TaskSubmissionForm
            agent_id={selected_agent_id}
            agent_name={selected_agent?.name || 'Agent'}
            templates={templates_data?.templates || []}
            on_submit={handle_submit_task}
            is_loading={is_executing}
          />
        </div>

        {/* Right Column: Execution Status & History */}
        <div className="space-y-6">
          <ExecutionStatus
            result={task_result}
            is_loading={is_executing}
            start_time={execution_start_time}
          />

          <ExecutionHistory runs={runs_data?.runs || []} is_loading={runs_loading} />
        </div>
      </div>
    </div>
  );
}
