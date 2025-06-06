import { Button } from "@/components/ui/button";
import { FileText, Users, Github, Share2, Download } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/editor");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50"></div>
        
        <div className="relative">
          {/* Navigation */}
          <nav className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">MarkdownMate</span>
            </div>
            <Button 
              variant="outline" 
              onClick={handleGetStarted}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Sign In
            </Button>
          </nav>

          {/* Hero Content */}
          <div className="px-6 py-24 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 lg:text-7xl">
                Beautiful Markdown,{" "}
                <span className="text-blue-600">Together</span>
              </h1>
              
              <p className="mt-6 text-xl leading-8 text-gray-600 max-w-2xl mx-auto">
                The collaborative markdown editor for modern teams. Write, edit, and share beautiful documents in real-time.
              </p>
              
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button 
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  Get Started Free
                </Button>
                <a href="#features" className="text-lg font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors">
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>

              {/* Social Proof */}
              <div className="mt-16">
                <p className="text-sm text-gray-500 mb-6">Trusted by 10,000+ teams worldwide</p>
                <div className="flex items-center justify-center space-x-8 opacity-60">
                  <div className="text-lg font-semibold text-gray-400">Acme Corp</div>
                  <div className="text-lg font-semibold text-gray-400">TechStart</div>
                  <div className="text-lg font-semibold text-gray-400">InnovateX</div>
                  <div className="text-lg font-semibold text-gray-400">DevTeam</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
              Everything you need to write together
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Powerful features designed for modern teams who value beautiful documentation.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl lg:mt-20 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Real-time Collaboration
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  See changes instantly as your team writes. Live cursors and presence indicators keep everyone in sync.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Github className="h-6 w-6 text-white" />
                  </div>
                  GitHub Integration
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Full GitHub Flavored Markdown support with syntax highlighting, tables, and math expressions.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Share2 className="h-6 w-6 text-white" />
                  </div>
                  Secure Sharing
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Share documents securely with granular permissions. Keep sensitive information protected.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  Export Anywhere
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Export to PDF, HTML, or keep as Markdown. Your content works everywhere you need it.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-50">
        <div className="px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
              Ready to start writing together?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Join thousands of teams who've already made the switch to collaborative markdown editing.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button 
                size="lg"
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">MarkdownMate</span>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                About
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Terms
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8">
            <p className="text-xs text-gray-500 text-center">
              © 2024 MarkdownMate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
