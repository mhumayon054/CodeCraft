import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/components/bottom-navigation";
import ToolsSidebar from "@/components/tools-sidebar";
import ProgressRing from "@/components/ui/progress-ring";
import GPAPage from "@/pages/gpa-page";
import ChatPage from "@/pages/chat-page";
import { 
  GraduationCap, 
  Brain, 
  Calendar, 
  TrendingUp, 
  Target,
  Bell,
  ChevronRight,
  Video,
  Plus
} from "lucide-react";

type Tab = 'home' | 'gpa' | 'chat';

export default function HomePage() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [toolsSidebarOpen, setToolsSidebarOpen] = useState(false);

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/profile"],
  });

  const { data: gpaHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/gpa/history"],
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/planner/tasks"],
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });

  const currentCGPA = gpaHistory.length > 0 ? parseFloat(gpaHistory[0]?.cgpaAfterThisSemester || '0') : 0;
  const lastSemesterGPA = gpaHistory.length > 0 ? parseFloat(gpaHistory[0]?.semesterGPA || '0') : 0;
  const pendingTasks = tasks.filter((task: any) => !task.completed);
  const profileCompletion = profile?.profileCompletion || 0;
  const upcomingClasses = classes.filter((cls: any) => new Date(cls.startsAt) > new Date());

  const renderTabContent = () => {
    switch (currentTab) {
      case 'gpa':
        return <GPAPage />;
      case 'chat':
        return <ChatPage />;
      default:
        return (
          <div className="p-4 space-y-6 pb-24">
            {/* Profile Completion Card */}
            <Card 
              className="glass-card hover-scale cursor-pointer bg-white/25 backdrop-blur-lg border border-white/18" 
              onClick={() => {/* TODO: Open profile modal */}}
              data-testid="card-profile"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Complete Your Profile</h3>
                    <p className="text-sm text-gray-600">Add your interests & university info</p>
                  </div>
                  <div className="text-right flex items-center space-x-3">
                    <ProgressRing value={profileCompletion} size={40} />
                    <div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {profileCompletion}%
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPA Summary Card */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Academic Progress</span>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentTab('gpa')}
                    className="text-blue-500 hover:text-blue-600"
                    data-testid="button-view-gpa"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {currentCGPA.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600">Current CGPA</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500">
                      {lastSemesterGPA.toFixed(1)}
                    </div>
                    <p className="text-sm text-gray-600">Last Semester</p>
                  </div>
                </div>

                {/* GPA Chart Preview */}
                <div className="gpa-chart rounded-xl p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-end space-x-2 h-16">
                    {gpaHistory.slice(-5).reverse().map((record: any, index: number) => {
                      const height = (parseFloat(record?.semesterGPA || '0') / 4.0) * 100;
                      return (
                        <div
                          key={index}
                          className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-sm"
                          style={{ height: `${height}%` }}
                          title={`Semester ${record?.semesterNo}: ${record?.semesterGPA}`}
                        />
                      );
                    })}
                    {gpaHistory.length === 0 && (
                      <div className="flex-1 text-center text-gray-500 text-sm">
                        No GPA data yet
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => setCurrentTab('gpa')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg transform transition-transform hover:scale-[1.02]"
                  data-testid="button-add-semester"
                >
                  Add New Semester
                </Button>
              </CardContent>
            </Card>

            {/* AI Recommendation Widget */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">AI Study Tip</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {currentCGPA > 0 
                        ? `Target ${(currentCGPA + 0.2).toFixed(1)} GPA next semester to boost your overall performance. Focus on high-credit courses for maximum impact!`
                        : "Start tracking your grades to get personalized study recommendations from Study Genius!"
                      }
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCurrentTab('chat')}
                      className="text-purple-500 hover:text-purple-600 p-0 h-auto font-medium"
                      data-testid="button-ask-study-genius"
                    >
                      Ask Study Genius →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="hover-scale cursor-pointer" 
                onClick={() => setToolsSidebarOpen(true)}
                data-testid="card-future-predictor"
              >
                <CardContent className="p-4 text-left">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                    <Target className="h-6 w-6 text-blue-500" />
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm">Future Predictor</h4>
                  <p className="text-xs text-gray-500 mt-1">Career guidance</p>
                </CardContent>
              </Card>

              <Card 
                className="hover-scale cursor-pointer" 
                onClick={() => setToolsSidebarOpen(true)}
                data-testid="card-study-planner"
              >
                <CardContent className="p-4 text-left">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm">Study Planner</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {pendingTasks.length} tasks due
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Classes */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="h-5 w-5" />
                    <span>Upcoming Classes</span>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setToolsSidebarOpen(true)}
                    className="text-blue-500 hover:text-blue-600"
                    data-testid="button-view-classes"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingClasses.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingClasses.slice(0, 2).map((cls: any) => (
                      <div key={cls.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <Video className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 text-sm">{cls.title}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(cls.startsAt).toLocaleDateString()} at{' '}
                            {new Date(cls.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                          data-testid={`button-join-class-${cls.id}`}
                        >
                          Join
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No upcoming classes</p>
                    <p className="text-xs mt-1">Check back later or join a class</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto bg-white relative overflow-hidden">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <ProgressRing value={profileCompletion} size={48} />
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center absolute top-1 left-1">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{user?.name || 'User'}</h3>
            <p className="text-xs text-gray-500">
              {profileCompletion}% Complete
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" className="bg-gray-100 hover:bg-gray-200">
          <Bell className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentTab={currentTab} 
        onTabChange={setCurrentTab}
        onMoreClick={() => setToolsSidebarOpen(true)}
      />

      {/* Tools Sidebar */}
      <ToolsSidebar 
        isOpen={toolsSidebarOpen} 
        onClose={() => setToolsSidebarOpen(false)} 
      />
    </div>
  );
}
