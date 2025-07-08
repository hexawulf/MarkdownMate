import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Users, Github, Share2, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { signInWithGoogle, currentUser, loading } = useAuth();

  useEffect(() => {
    // This effect hook handles automatic redirection to the external editor
    // (https://markdown.piapps.dev/editor) if a user is already logged in
    // and the authentication state is no longer loading.
    // It uses window.location.href for external redirection.
    // A try-catch block is included to log any potential errors during redirection.
    if (!loading && currentUser) {
      try {
        // console.log("Redirecting to external editor as user is logged in.");
        window.location.href = "https://markdown.piapps.dev/editor";
      } catch (error) {
        console.error("Failed to redirect to external editor:", error);
      }
    }
  }, [currentUser, loading, setLocation]);

  const handleGetStarted = () => {
    setLocation("/editor");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-background">
        {/* Gradient Background Removed: <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-muted/50"></div> */}
        
        <div className="relative">
          {/* Navigation */}
          <nav className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">MarkdownMate</span>
            </div>
            <Button 
              variant="outline" 
              onClick={signInWithGoogle}
              className="border-border text-foreground hover:bg-muted"
            >
              Sign In
            </Button>
          </nav>

          {/* Hero Content */}
          <div className="px-6 py-24 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-5xl font-bold tracking-tight text-foreground lg:text-7xl">
                Beautiful Markdown,{" "}
                <span className="text-primary">Together</span>
              </h1>
              
              <p className="mt-6 text-xl leading-8 text-muted-foreground max-w-2xl mx-auto">
                The collaborative markdown editor for modern teams. Write, edit, and share beautiful documents in real-time.
              </p>
              
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button 
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg"
                >
                  Get Started Free
                </Button>
                <a href="#features" className="text-lg font-semibold leading-6 text-foreground hover:text-primary transition-colors">
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Everything you need to write together
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Powerful features designed for modern teams who value beautiful documentation.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl lg:mt-20 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  Real-time Collaboration
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  See changes instantly as your team writes. Live cursors and presence indicators keep everyone in sync.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <Github className="h-6 w-6 text-primary-foreground" />
                  </div>
                  GitHub Integration
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  Full GitHub Flavored Markdown support with syntax highlighting, tables, and math expressions.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <Share2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  Secure Sharing
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  Share documents securely with granular permissions. Keep sensitive information protected.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <Download className="h-6 w-6 text-primary-foreground" />
                  </div>
                  Export Anywhere
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  Export to PDF, HTML, or keep as Markdown. Your content works everywhere you need it.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-muted">
        <div className="px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Ready to start writing together?
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Join thousands of teams who've already made the switch to collaborative markdown editing.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button 
                size="lg"
                onClick={handleGetStarted}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <FileText className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">MarkdownMate</span>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                About
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-8">
            <p className="text-xs text-muted-foreground text-center">
              © 2024 MarkdownMate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
