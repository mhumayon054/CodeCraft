import { Button } from "@/components/ui/button";
import { Home, TrendingUp, Brain, Grid3x3 } from "lucide-react";

interface BottomNavigationProps {
  currentTab: string;
  onTabChange: (tab: 'home' | 'gpa' | 'chat') => void;
  onMoreClick: () => void;
}

export default function BottomNavigation({ 
  currentTab, 
  onTabChange, 
  onMoreClick 
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200">
      <div className="flex">
        <Button
          variant="ghost"
          className={`flex-1 py-3 flex flex-col items-center space-y-1 transition-colors ${
            currentTab === 'home' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
          }`}
          onClick={() => onTabChange('home')}
          data-testid="tab-home"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs font-medium">Home</span>
        </Button>
        
        <Button
          variant="ghost"
          className={`flex-1 py-3 flex flex-col items-center space-y-1 transition-colors ${
            currentTab === 'gpa' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
          }`}
          onClick={() => onTabChange('gpa')}
          data-testid="tab-gpa"
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-xs font-medium">GPA</span>
        </Button>
        
        <Button
          variant="ghost"
          className={`flex-1 py-3 flex flex-col items-center space-y-1 transition-colors ${
            currentTab === 'chat' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
          }`}
          onClick={() => onTabChange('chat')}
          data-testid="tab-chat"
        >
          <Brain className="h-5 w-5" />
          <span className="text-xs font-medium">AI Chat</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex-1 py-3 flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={onMoreClick}
          data-testid="tab-more"
        >
          <Grid3x3 className="h-5 w-5" />
          <span className="text-xs font-medium">More</span>
        </Button>
      </div>
    </div>
  );
}
