import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-7 w-7 text-destructive shrink-0" />
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>

          <Button asChild size="sm">
            <Link href="/">Back to editor</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
