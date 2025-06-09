import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import EditorLayout from "@/components/EditorLayout";

export default function Home() {
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [currentUser, loading, toast]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          <span className="text-foreground font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return <EditorLayout />;
}
