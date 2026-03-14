import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Editor from "@/pages/Editor";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={Editor} />
          <Route path="/editor" component={Editor} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
