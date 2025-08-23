import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Brain, Send, Menu, X, Plus, MessageSquare, Paperclip } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export default function ChatPage() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["/api/ai/chats"],
  });

  const { data: currentSession } = useQuery<ChatSession>({
    queryKey: ["/api/ai/chats", currentSessionId],
    enabled: !!currentSessionId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { sessionId?: string; message: string }) => {
      const response = await apiRequest("POST", "/api/ai/chat", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/chats", data.sessionId] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      sessionId: currentSessionId || undefined,
      message: message.trim(),
    });
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setSidebarOpen(false);
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
  };

  const messages = currentSession?.messages || [];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Chat Sessions Sidebar */}
      <div className={`absolute left-0 top-0 w-3/4 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Chat Sessions</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(false)}
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          <Button 
            onClick={createNewSession}
            className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium"
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Button
                key={session.id}
                variant="ghost"
                className={`w-full justify-start p-3 h-auto hover:bg-gray-50 ${
                  currentSessionId === session.id ? 'bg-blue-50 border border-blue-200' : ''
                }`}
                onClick={() => selectSession(session.id)}
                data-testid={`session-${session.id}`}
              >
                <div className="text-left">
                  <h4 className="font-medium text-gray-800 text-sm truncate">
                    {session.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {session.messages.length > 0 && 
                      session.messages[session.messages.length - 1].content.slice(0, 50)}
                    {session.messages.length > 0 && 
                      session.messages[session.messages.length - 1].content.length > 50 && '...'}
                  </p>
                </div>
              </Button>
            ))}
            
            {sessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chat sessions yet</p>
                <p className="text-xs">Start a conversation!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSidebarOpen(true)}
          data-testid="button-open-sidebar"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">Study Genius Model</h3>
          <p className="text-xs text-gray-500">Built by Chef_dev for students</p>
        </div>
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Brain className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-full">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Welcome to Study Genius!</h3>
              <p className="text-gray-600 text-sm">
                I am Study Genius Model, built by Chef_dev for students. 
                How can I help you improve your academic performance today?
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}>
                {msg.role === 'user' ? (
                  <span className="text-white font-semibold text-sm">U</span>
                ) : (
                  <Brain className="h-4 w-4 text-white" />
                )}
              </div>
              <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className={`rounded-2xl p-3 inline-block max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-tr-md' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {sendMessageMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-md p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="text-gray-600"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Study Genius anything..."
              className="pr-12 rounded-2xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
