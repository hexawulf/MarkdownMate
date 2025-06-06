# MarkdownMate

<div align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind-3-blue?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</div>

<p align="center">
  <strong>A real-time collaborative markdown editor for modern teams</strong>
</p>

<p align="center">
  Beautiful, fast, and collaborative markdown editing with a VSCode-like experience
</p>

---

## ✨ Features

- **✅ Real-time Collaborative Editing** - Work together with live cursors and presence indicators
- **✅ Monaco Editor Integration** - VSCode-like editing experience with intelligent autocomplete
- **✅ GitHub Flavored Markdown** - Full GFM support with syntax highlighting and math expressions
- **✅ Modern Responsive UI** - Clean, professional interface that works on all devices
- **✅ Secure Document Sharing** - Share documents with granular permissions
- **✅ Export Capabilities** - Export to PDF, HTML, or keep as Markdown
- **✅ WebSocket Real-time** - Instant synchronization across all connected users
- **✅ Professional Design** - GitHub-inspired color scheme and typography

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development with excellent IDE support
- **Vite** - Lightning-fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **shadcn/ui** - Beautiful, accessible component library

### Editor & Markdown
- **Monaco Editor** - The editor that powers VSCode
- **GitHub Flavored Markdown** - Full GFM support including tables, task lists, and math
- **Syntax Highlighting** - Code blocks with language-specific highlighting
- **Live Preview** - Real-time markdown rendering

### Real-time Features
- **WebSocket Integration** - Instant synchronization
- **Live Cursors** - See where team members are editing
- **Presence Indicators** - Know who's online and active
- **Conflict Resolution** - Smart handling of simultaneous edits

### Build & Deployment
- **Vite Bundler** - Optimized production builds
- **GitHub Pages Ready** - One-click deployment to GitHub Pages
- **Vercel Compatible** - Deploy to Vercel with zero configuration

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher (or **yarn** 1.22.0+)

## 🛠️ Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/hexawulf/MarkdownMate.git
cd MarkdownMate
```

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
MarkdownMate/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── EditorLayout.tsx
│   │   │   ├── MonacoEditor.tsx
│   │   │   └── ...
│   │   ├── pages/          # Page components
│   │   │   ├── Landing.tsx
│   │   │   ├── Home.tsx
│   │   │   └── ...
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── stores/         # State management
│   │   └── types/          # TypeScript type definitions
│   ├── index.html
│   └── ...
├── server/                 # Backend API (Express.js)
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Data persistence layer
│   └── ...
├── shared/                 # Shared types and schemas
│   └── schema.ts
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

## 🎨 Key Components

### Landing Page
- Modern SaaS-style landing page
- Gradient backgrounds and professional typography
- Feature showcase with icons and descriptions
- Call-to-action buttons with smooth navigation

### Editor Layout
- Split-view with editor and preview panes
- Collapsible sidebar for document navigation
- Real-time collaboration panel
- Status indicators and word count

### Monaco Editor
- VSCode-like editing experience
- Intelligent autocomplete and error detection
- Customizable themes and settings
- Integrated markdown syntax highlighting

## 🔧 Development Guide

### Adding New Components
1. Create component in `client/src/components/`
2. Export from appropriate index file
3. Add TypeScript interfaces in `types/`
4. Include Tailwind classes for styling

### Styling Guidelines
- Use Tailwind utility classes
- Follow GitHub color scheme variables
- Ensure responsive design (mobile-first)
- Maintain accessibility standards

### State Management
- Use Zustand for global state
- React Query for server state
- Custom hooks for complex logic

## 🚀 Deployment

### GitHub Pages

1. **Enable GitHub Pages** in repository settings
2. **Configure source** to "GitHub Actions"
3. **Push to main branch** - deployment happens automatically

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`

### Vercel

1. **Import repository** in Vercel dashboard
2. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Deploy** - automatic deployments on push

### Environment Variables

For production deployment, configure these environment variables:

```bash
NODE_ENV=production
DATABASE_URL=your_database_url
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Code Standards
- Use TypeScript for all new code
- Follow existing code style and formatting
- Add tests for new features
- Update documentation as needed

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

## 🐛 Known Issues

- WebSocket reconnection needs improvement in poor network conditions
- Large documents (>10MB) may experience performance issues
- Mobile keyboard overlay needs optimization

## 🔮 Roadmap

- [ ] Offline editing support
- [ ] Plugin system for extensions
- [ ] Advanced collaboration features (comments, suggestions)
- [ ] Integration with popular file storage services
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced export options (Word, LaTeX)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor** - For providing the excellent code editor
- **shadcn/ui** - For the beautiful component library
- **Tailwind CSS** - For the utility-first CSS framework
- **Vite** - For the lightning-fast build tool
- **React Team** - For the amazing framework

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

---

<div align="center">
  <p>Made with ❤️ for the developer community</p>
  <p>
    <a href="https://github.com/hexawulf/MarkdownMate">⭐ Star this repo</a> |
    <a href="https://github.com/hexawulf/MarkdownMate/issues">🐛 Report Bug</a> |
    <a href="https://github.com/hexawulf/MarkdownMate/issues">💡 Request Feature</a>
  </p>
</div>