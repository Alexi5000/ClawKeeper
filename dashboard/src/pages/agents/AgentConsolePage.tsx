import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { TaskSubmissionForm } from '@/components/agents/TaskSubmissionForm';
import { ExecutionStatus } from '@/components/agents/ExecutionStatus';
import { ExecutionHistory } from '@/components/agents/ExecutionHistory';
import { Bot, Zap, Loader2, Search } from 'lucide-react';
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
  const [agent_search, set_agent_search] = useState('');

  // Fetch agent status (shared query key with other components)
  const { data: agent_data, isLoading: agents_loading } = useQuery<any>({
    queryKey: ['agents-status'],
    queryFn: async () => await api.get_agent_status(),
    staleTime: 30000,
    refetchInterval: false, // Disable auto-refetch, use manual refetch
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

  // Get all agents organized by type (memoized to prevent array recreation)
  const all_agents: Agent[] = useMemo(
    () =>
      agent_data
        ? [
            ...(agent_data.agents?.ceo || []),
            ...(agent_data.agents?.orchestrators || []),
            ...(agent_data.agents?.workers || []),
          ]
        : [],
    [agent_data]
  );

  const selected_agent = useMemo(
    () => all_agents.find((a) => a.id === selected_agent_id),
    [all_agents, selected_agent_id]
  );

  // Filter agents by search query
  const filtered_ceo = useMemo(
    () => (agent_data?.agents?.ceo || []).filter((a: Agent) =>
      a.name.toLowerCase().includes(agent_search.toLowerCase()) ||
      a.id.toLowerCase().includes(agent_search.toLowerCase())
    ),
    [agent_data?.agents?.ceo, agent_search]
  );

  const filtered_orchestrators = useMemo(
    () => (agent_data?.agents?.orchestrators || []).filter((a: Agent) =>
      a.name.toLowerCase().includes(agent_search.toLowerCase()) ||
      a.id.toLowerCase().includes(agent_search.toLowerCase())
    ),
    [agent_data?.agents?.orchestrators, agent_search]
  );

  const filtered_workers = useMemo(
    () => (agent_data?.agents?.workers || []).filter((a: Agent) =>
      a.name.toLowerCase().includes(agent_search.toLowerCase()) ||
      a.id.toLowerCase().includes(agent_search.toLowerCase())
    ),
    [agent_data?.agents?.workers, agent_search]
  );

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
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={agent_search}
                  onChange={(e) => set_agent_search(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Agent Selector */}
              <Select value={selected_agent_id} onValueChange={set_selected_agent_id}>
                <SelectTrigger className="w-full h-auto py-3">
                  <SelectValue placeholder="Select an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {filtered_ceo.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>CEO</SelectLabel>
                      {filtered_ceo.map((agent: Agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-purple-500" />
                            <span>{agent.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {agent.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {filtered_orchestrators.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Orchestrators</SelectLabel>
                      {filtered_orchestrators.map((agent: Agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-500" />
                            <span>{agent.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {agent.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {filtered_workers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Workers ({filtered_workers.length})</SelectLabel>
                      {filtered_workers.map((agent: Agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">{agent.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {agent.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {filtered_ceo.length === 0 && 
                   filtered_orchestrators.length === 0 && 
                   filtered_workers.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No agents found matching "{agent_search}"
                    </div>
                  )}
                </SelectContent>
              </Select>

              {/* Selected Agent Info */}
              {selected_agent && (
                <div className="p-4 rounded-lg border bg-muted/30">
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
