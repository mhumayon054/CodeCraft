import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  X, 
  Target, 
  Calendar, 
  Video, 
  BarChart3,
  Plus,
  ChevronLeft,
  Clock,
  CheckCircle,
  Edit,
  Trash2
} from "lucide-react";

interface ToolsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'menu' | 'predictor' | 'planner' | 'classes';

export default function ToolsSidebar({ isOpen, onClose }: ToolsSidebarProps) {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<View>('menu');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [editingTask, setEditingTask] = useState<any>(null);

  const availableInterests = [
    "AI & ML", "Web Development", "Mobile Apps", "Data Science", 
    "Cybersecurity", "Cloud Computing", "Game Development", "Blockchain",
    "DevOps", "UI/UX Design", "Database Management", "Software Testing"
  ];

  const getRecommendationsMutation = useMutation({
    mutationFn: async (interests: string[]) => {
      const response = await apiRequest("POST", "/api/predictor/recommend", { interests });
      return response.json();
    },
    onSuccess: (data) => {
      setRecommendations(data.recommendations || []);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleGetRecommendations = () => {
    if (selectedInterests.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one interest",
        variant: "destructive",
      });
      return;
    }
    getRecommendationsMutation.mutate(selectedInterests);
  };

  const resetView = () => {
    setCurrentView('menu');
    setSelectedInterests([]);
    setRecommendations([]);
    setShowTaskForm(false);
    setEditingTask(null);
  };

  // Task management queries and mutations
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/planner/tasks'],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest('POST', '/api/planner/tasks', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/planner/tasks'] });
      setShowTaskForm(false);
      toast({ title: 'Success', description: 'Task created successfully!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const response = await apiRequest('PUT', `/api/planner/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/planner/tasks'] });
      setEditingTask(null);
      toast({ title: 'Success', description: 'Task updated successfully!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest('DELETE', `/api/planner/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/planner/tasks'] });
      toast({ title: 'Success', description: 'Task deleted successfully!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'pending') return !task.completed;
    if (taskFilter === 'completed') return task.completed;
    return true;
  });

  const handleTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const taskData = {
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      dueAt: formData.get('dueAt') ? new Date(formData.get('dueAt') as string).toISOString() : null,
      notes: formData.get('notes') as string || null,
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, ...taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const toggleTaskComplete = (task: any) => {
    updateTaskMutation.mutate({ id: task.id, completed: !task.completed });
  };

  const startEditing = (task: any) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const deleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'predictor':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={resetView}
                data-testid="button-back-predictor"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h4 className="font-semibold text-gray-800">Future Career Predictor</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Your Interests
              </label>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map(interest => (
                  <Badge
                    key={interest}
                    variant={selectedInterests.includes(interest) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedInterests.includes(interest)
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "hover:bg-blue-50 hover:text-blue-700"
                    }`}
                    onClick={() => toggleInterest(interest)}
                    data-testid={`interest-${interest.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleGetRecommendations}
              disabled={getRecommendationsMutation.isPending || selectedInterests.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl"
              data-testid="button-get-recommendations"
            >
              {getRecommendationsMutation.isPending ? "Getting Recommendations..." : "Get Career Recommendations"}
            </Button>

            {recommendations.length > 0 && (
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-800">Recommendations</h5>
                {recommendations.map((rec, index) => (
                  <Card key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
                    <CardContent className="p-4">
                      <h6 className="font-semibold text-gray-800 mb-2">
                        🚀 {rec.track}
                      </h6>
                      <p className="text-sm text-gray-600 mb-3">{rec.why}</p>
                      <div className="space-y-2">
                        <h6 className="text-sm font-medium text-gray-700">Roadmap:</h6>
                        <div className="text-xs text-gray-600 space-y-1">
                          {rec.starterRoadmap?.map((step: string, stepIndex: number) => (
                            <div key={stepIndex}>• {step}</div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'planner':
        if (showTaskForm) {
          return (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowTaskForm(false)}
                    data-testid="button-back-task-form"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h4 className="font-semibold text-gray-800">
                    {editingTask ? 'Edit Task' : 'Add New Task'}
                  </h4>
                </div>
              </div>

              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    defaultValue={editingTask?.title || ''}
                    placeholder="e.g., Study for Math Exam"
                    data-testid="input-task-title"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Task Type</Label>
                  <Select name="type" defaultValue={editingTask?.type || 'study'}>
                    <SelectTrigger data-testid="select-task-type">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Study Session</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dueAt">Due Date (Optional)</Label>
                  <Input
                    id="dueAt"
                    name="dueAt"
                    type="datetime-local"
                    defaultValue={editingTask?.dueAt ? new Date(editingTask.dueAt).toISOString().slice(0, 16) : ''}
                    data-testid="input-task-due-date"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Additional details about this task..."
                    defaultValue={editingTask?.notes || ''}
                    data-testid="textarea-task-notes"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    data-testid="button-save-task"
                  >
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowTaskForm(false);
                      setEditingTask(null);
                    }}
                    data-testid="button-cancel-task"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          );
        }

        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={resetView}
                  data-testid="button-back-planner"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h4 className="font-semibold text-gray-800">Study Planner</h4>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowTaskForm(true)}
                data-testid="button-add-task"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>

            <div className="flex space-x-2 mb-4">
              {['all', 'pending', 'completed'].map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={taskFilter === filter ? 'default' : 'outline'}
                  onClick={() => setTaskFilter(filter as typeof taskFilter)}
                  data-testid={`filter-${filter}`}
                  className="capitalize"
                >
                  {filter}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No tasks found</p>
                  <p className="text-xs mt-1">
                    {taskFilter === 'all' ? 'Create your first task!' : `No ${taskFilter} tasks`}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <Card key={task.id} className="bg-white border">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskComplete(task)}
                          data-testid={`checkbox-task-${task.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                              {task.title}
                            </h5>
                            <div className="flex space-x-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEditing(task)}
                                data-testid={`button-edit-task-${task.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteTask(task.id)}
                                data-testid={`button-delete-task-${task.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {task.type}
                            </Badge>
                            {task.dueAt && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(task.dueAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          {task.notes && (
                            <p className="text-sm text-gray-600 mt-2">{task.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'classes':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={resetView}
                  data-testid="button-back-classes"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h4 className="font-semibold text-gray-800">Online Classes</h4>
              </div>
              <Button size="sm" variant="outline" data-testid="button-create-class">
                <Plus className="h-4 w-4 mr-1" /> Create
              </Button>
            </div>

            <div className="text-center py-8 text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Online Classes Hub</p>
              <p className="text-xs mt-1">Virtual classroom management</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 space-y-3">
            <Card 
              className="hover:bg-gray-50 cursor-pointer transition-colors" 
              onClick={() => setCurrentView('predictor')}
              data-testid="tool-future-predictor"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm">Future Predictor</h5>
                    <p className="text-xs text-gray-500">AI-powered career guidance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:bg-gray-50 cursor-pointer transition-colors" 
              onClick={() => setCurrentView('planner')}
              data-testid="tool-study-planner"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm">Study Planner</h5>
                    <p className="text-xs text-gray-500">Organize tasks and deadlines</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:bg-gray-50 cursor-pointer transition-colors" 
              onClick={() => setCurrentView('classes')}
              data-testid="tool-online-classes"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Video className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm">Online Classes</h5>
                    <p className="text-xs text-gray-500">Virtual classroom hub</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="opacity-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm">Progress Analytics</h5>
                    <p className="text-xs text-gray-500">Coming Soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed right-0 top-0 w-full h-full bg-white z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Study Tools</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
              data-testid="button-close-tools"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
