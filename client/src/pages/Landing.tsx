import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Zap, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">MarkdownMate</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A powerful, real-time collaborative markdown editor for teams. Create, edit, and share beautiful documents together.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center github-card">
            <CardHeader>
              <Users className="w-8 h-8 text-accent mx-auto mb-2" />
              <CardTitle className="github-card-title font-semibold">Real-time Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                Work together in real-time with live cursors and presence indicators.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center github-card">
            <CardHeader>
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="github-card-title font-semibold">Rich Markdown</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                GitHub Flavored Markdown with syntax highlighting and math support.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center github-card">
            <CardHeader>
              <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="github-card-title font-semibold">Monaco Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                VSCode-like editing experience with intelligent autocomplete.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center github-card">
            <CardHeader>
              <Shield className="w-8 h-8 text-accent mx-auto mb-2" />
              <CardTitle className="github-card-title font-semibold">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                Your documents are secure with modern authentication and encryption.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-md mx-auto github-card">
            <CardHeader>
              <CardTitle className="github-card-title">Get Started Today</CardTitle>
              <CardDescription className="text-muted-foreground">
                Join thousands of teams already using MarkdownMate for their documentation needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleLogin} 
                size="lg" 
                className="w-full github-button-primary"
              >
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
