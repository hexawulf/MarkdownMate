import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Plus, Circle } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { User } from "@shared/schema";

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
}

interface ActiveUser extends User {
  isOnline: boolean;
  cursor?: {
    lineNumber: number;
    column: number;
  };
  status?: string;
}

export default function CollaborationPanel({ isOpen, onClose, documentId }: CollaborationPanelProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const { messages } = useWebSocket(documentId);

  // Fetch document collaborators
  const { data: collaborators = [] } = useQuery({
    queryKey: ["/api/documents", documentId, "collaborators"],
    enabled: !!documentId,
  });

  // Handle WebSocket messages for presence
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    switch (latestMessage.type) {
      case 'user-joined':
        setActiveUsers(prev => [
          ...prev.filter(u => u.id !== latestMessage.userId),
          {
            id: latestMessage.userId,
            email: latestMessage.userEmail || '',
            firstName: latestMessage.userFirstName || '',
            lastName: latestMessage.userLastName || '',
            profileImageUrl: latestMessage.userProfileImage || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            isOnline: true,
            status: 'Active',
          }
        ]);
        break;
      
      case 'user-left':
        setActiveUsers(prev => prev.filter(u => u.id !== latestMessage.userId));
        break;
      
      case 'cursor-update':
        setActiveUsers(prev => prev.map(user => 
          user.id === latestMessage.userId 
            ? { ...user, cursor: latestMessage.cursor, status: `Line ${latestMessage.cursor.lineNumber}` }
            : user
        ));
        break;

      case 'text-change':
        setActiveUsers(prev => prev.map(user => 
          user.id === latestMessage.userId 
            ? { ...user, status: 'Editing...' }
            : user
        ));
        break;
    }
  }, [messages]);

  if (!isOpen || !documentId) return null;

  return (
    <Card className="fixed bottom-6 right-6 w-80 shadow-lg z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Active Collaborators</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {activeUsers.length > 0 ? (
          activeUsers.map((user) => (
            <div key={user.id} className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || ''} alt={user.firstName || user.email} />
                <AvatarFallback>
                  {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.email}
                </div>
                <div className="flex items-center space-x-1">
                  <Circle className="h-2 w-2 fill-accent text-accent" />
                  <span className="text-xs text-muted-foreground">
                    {user.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No other collaborators online
          </div>
        )}
        
        <div className="pt-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Invite people
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
