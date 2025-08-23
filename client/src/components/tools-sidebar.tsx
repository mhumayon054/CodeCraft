import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  X, 
  Target, 
  Calendar, 
  Video, 
  BarChart3,
  Plus,
  ChevronLeft 
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
              <Button size="sm" variant="outline" data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>

            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Study Planner feature</p>
              <p className="text-xs mt-1">Coming soon with full task management</p>
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
