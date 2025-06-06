import { Button } from "@/components/ui/button";
import { FileText, Users, Zap, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <Users className="w-8 h-8 text-accent mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-foreground">Real-time Collaboration</h3>
            </div>
            <div>
              <p className="text-muted-foreground">
                Work together in real-time with live cursors and presence indicators.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-foreground">Rich Markdown</h3>
            </div>
            <div>
              <p className="text-muted-foreground">
                GitHub Flavored Markdown with syntax highlighting and math support.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-foreground">Monaco Editor</h3>
            </div>
            <div>
              <p className="text-muted-foreground">
                VSCode-like editing experience with intelligent autocomplete.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <Shield className="w-8 h-8 text-accent mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-foreground">Secure & Private</h3>
            </div>
            <div>
              <p className="text-muted-foreground">
                Your documents are secure with modern authentication and encryption.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Get Started Today</h3>
              <p className="text-muted-foreground">
                Join thousands of teams already using MarkdownMate for their documentation needs.
              </p>
            </div>
            <div>
              <Button 
                onClick={handleLogin} 
                size="lg" 
                className="w-full github-button-primary"
              >
                Sign In to Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
