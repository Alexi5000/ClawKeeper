import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Bot, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Activity, 
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_ICONS = {
  idle: CheckCircle2,
  busy: Loader2,
  offline: AlertCircle,
  error: AlertCircle,
};

const STATUS_COLORS = {
  idle: 'text-green-500',
  busy: 'text-blue-500',
  offline: 'text-gray-400',
  error: 'text-red-500',
};

const STATUS_BG_COLORS = {
  idle: 'bg-green-500/10',
  busy: 'bg-blue-500/10',
  offline: 'bg-gray-400/10',
  error: 'bg-red-500/10',
};

export function AgentsPage() {
  const [search_query, set_search_query] = useState('');
  const [expanded_sections, set_expanded_sections] = useState<Set<string>>(
    new Set(['ceo', 'orchestrators'])
  );

  const { data: agent_data, isLoading } = useQuery<any>({
    queryKey: ['agents-status'],
    queryFn: async () => await api.get_agent_status(),
    staleTime: 30000,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const toggle_section = (section: string) => {
    const new_sections = new Set(expanded_sections);
    if (new_sections.has(section)) {
      new_sections.delete(section);
    } else {
      new_sections.add(section);
    }
    set_expanded_sections(new_sections);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ceo_agents = agent_data?.agents?.ceo || [];
  const orchestrators = agent_data?.agents?.orchestrators || [];
  const workers = agent_data?.agents?.workers || [];

  // Group workers by parent (memoized)
  const workers_by_parent = useMemo(() => {
    return workers.reduce((acc: Record<string, any[]>, worker: any) => {
      const parent = worker.metadata?.parent_id || 'unknown';
      if (!acc[parent]) acc[parent] = [];
      acc[parent].push(worker);
      return acc;
    }, {});
  }, [workers]);

  // Filter agents by search (memoized)
  const filtered_orchestrators = useMemo(() => {
    if (!search_query) return orchestrators;
    return orchestrators.filter((agent: any) =>
      agent.name.toLowerCase().includes(search_query.toLowerCase()) ||
      agent.id.toLowerCase().includes(search_query.toLowerCase())
    );
  }, [orchestrators, search_query]);

  const filtered_workers = useMemo(() => {
    return Object.keys(workers_by_parent).reduce((acc: Record<string, any[]>, key) => {
      const agents = workers_by_parent[key];
      if (!search_query) {
        acc[key] = agents;
      } else {
        const filtered = agents.filter((agent: any) =>
          agent.name.toLowerCase().includes(search_query.toLowerCase()) ||
          agent.id.toLowerCase().includes(search_query.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[key] = filtered;
        }
      }
      return acc;
    }, {});
  }, [workers_by_parent, search_query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
        <p className="text-muted-foreground">
          Manage and monitor all {agent_data?.counts?.total} ClawKeeper AI agents
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{agent_data?.counts?.total || 0}</p>
              </div>
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-blue-500">{agent_data?.summary?.busy || 0}</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Idle</p>
                <p className="text-2xl font-bold text-green-500">{agent_data?.summary?.idle || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-gray-400">{agent_data?.summary?.offline || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search_query}
            onChange={(e) => set_search_query(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Agent Hierarchy */}
      <div className="space-y-4">
        {/* CEO Agent */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => toggle_section('ceo')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expanded_sections.has('ceo') ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  CEO Agent
                </CardTitle>
              </div>
              <Badge>1 agent</Badge>
            </div>
          </CardHeader>
          {expanded_sections.has('ceo') && ceo_agents.length > 0 && (
            <CardContent>
              {ceo_agents.map((agent: any) => (
                <AgentCard key={agent.id} agent={agent} level={0} />
              ))}
            </CardContent>
          )}
        </Card>

        {/* Orchestrators */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => toggle_section('orchestrators')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expanded_sections.has('orchestrators') ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Orchestrators
                </CardTitle>
              </div>
              <Badge>{orchestrators.length} agents</Badge>
            </div>
          </CardHeader>
          {expanded_sections.has('orchestrators') && (
            <CardContent className="space-y-2">
              {filtered_orchestrators.map((orchestrator: any) => (
                <div key={orchestrator.id} className="space-y-2">
                  <AgentCard agent={orchestrator} level={0} />
                  
                  {/* Workers under this orchestrator */}
                  {filtered_workers[orchestrator.id]?.length > 0 && expanded_sections.has(orchestrator.id) && (
                    <div className="ml-8 space-y-2 border-l-2 border-muted pl-4">
                      {filtered_workers[orchestrator.id].map((worker: any) => (
                        <AgentCard key={worker.id} agent={worker} level={1} />
                      ))}
                    </div>
                  )}
                  
                  {/* Expand/collapse workers */}
                  {workers_by_parent[orchestrator.id]?.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle_section(orchestrator.id);
                      }}
                    >
                      {expanded_sections.has(orchestrator.id) ? (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Hide {workers_by_parent[orchestrator.id].length} workers
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-4 w-4 mr-2" />
                          Show {workers_by_parent[orchestrator.id].length} workers
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function AgentCard({ agent, level }: { agent: any; level: number }) {
  const StatusIcon = STATUS_ICONS[agent.status as keyof typeof STATUS_ICONS] || Activity;
  const is_busy = agent.status === 'busy';

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
      level > 0 && "bg-muted/30"
    )}>
      <div className="flex items-center gap-3 flex-1">
        <div className={cn(
          "flex items-center justify-center h-10 w-10 rounded-lg",
          STATUS_BG_COLORS[agent.status as keyof typeof STATUS_BG_COLORS]
        )}>
          <StatusIcon className={cn(
            "h-5 w-5",
            STATUS_COLORS[agent.status as keyof typeof STATUS_COLORS],
            is_busy && "animate-spin"
          )} />
        </div>
        <div className="flex-1">
          <p className="font-medium">{agent.name}</p>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={agent.status === 'busy' ? 'default' : 'secondary'}>
          {agent.status}
        </Badge>
        {agent.capabilities && agent.capabilities.length > 0 && (
          <Badge variant="outline">{agent.capabilities.length} skills</Badge>
        )}
      </div>
    </div>
  );
}
