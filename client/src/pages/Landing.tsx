import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Zap, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">MarkdownMate</h1>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            A powerful, real-time collaborative markdown editor for teams. Create, edit, and share beautiful documents together.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="w-8 h-8 text-accent mx-auto mb-2" />
              <CardTitle>Real-time Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Work together in real-time with live cursors and presence indicators.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle>Rich Markdown</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                GitHub Flavored Markdown with syntax highlighting and math support.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="w-8 h-8 text-warning mx-auto mb-2" />
              <CardTitle>Monaco Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                VSCode-like editing experience with intelligent autocomplete.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-8 h-8 text-accent mx-auto mb-2" />
              <CardTitle>Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your documents are secure with modern authentication and encryption.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started Today</CardTitle>
              <CardDescription>
                Join thousands of teams already using MarkdownMate for their documentation needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} size="lg" className="w-full">
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
