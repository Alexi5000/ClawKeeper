import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Play, Loader2 } from 'lucide-react';

interface TaskTemplate {
  name: string;
  description: string;
  parameters: Record<string, any>;
  capabilities: string[];
}

interface TaskSubmissionFormProps {
  agent_id: string;
  agent_name: string;
  templates: TaskTemplate[];
  on_submit: (task: {
    task_name: string;
    description: string;
    parameters: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'critical';
  }) => void;
  is_loading: boolean;
}

export function TaskSubmissionForm({
  agent_name,
  templates,
  on_submit,
  is_loading,
}: TaskSubmissionFormProps) {
  const [task_name, set_task_name] = useState('');
  const [description, set_description] = useState('');
  const [parameters, set_parameters] = useState('{}');
  const [priority, set_priority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [selected_template, set_selected_template] = useState<string>('');

  const handle_template_select = (template: TaskTemplate) => {
    set_task_name(template.name);
    set_description(template.description);
    set_parameters(JSON.stringify(template.parameters, null, 2));
    set_selected_template(template.name);
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const parsed_params = JSON.parse(parameters);
      on_submit({
        task_name,
        description,
        parameters: parsed_params,
        priority,
      });
    } catch (error) {
      alert('Invalid JSON in parameters field');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Task to {agent_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handle_submit} className="space-y-4">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Quick Start Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => handle_template_select(template)}
                    className={`px-3 py-1 text-sm rounded-md border transition-all ${
                      selected_template === template.name
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task Name */}
          <div>
            <label htmlFor="task_name" className="text-sm font-medium mb-2 block">
              Task Name
            </label>
            <Input
              id="task_name"
              value={task_name}
              onChange={(e) => set_task_name(e.target.value)}
              placeholder="e.g., Process Invoice"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="text-sm font-medium mb-2 block">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => set_description(e.target.value)}
              placeholder="Describe what you want the agent to do..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
              required
            />
          </div>

          {/* Parameters */}
          <div>
            <label htmlFor="parameters" className="text-sm font-medium mb-2 block">
              Parameters (JSON)
            </label>
            <textarea
              id="parameters"
              value={parameters}
              onChange={(e) => set_parameters(e.target.value)}
              placeholder='{"key": "value"}'
              rows={6}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="text-sm font-medium mb-2 block">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => set_priority(e.target.value as any)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={is_loading} className="w-full">
            {is_loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Task
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
