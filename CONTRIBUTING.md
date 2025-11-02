# Contributing to MarkdownMate

Thank you for your interest in contributing to MarkdownMate! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git

### Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/MarkdownMate.git
   cd MarkdownMate
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
MarkdownMate/
├── client/src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utility functions
│   ├── stores/         # State management
│   └── types/          # TypeScript definitions
├── server/             # Backend API
├── shared/             # Shared types and schemas
└── .github/workflows/  # CI/CD configuration
```

## Code Standards

### TypeScript
- Use TypeScript for all new code
- Define interfaces for component props
- Use proper type annotations
- Avoid `any` type unless absolutely necessary

### React Components
- Use functional components with hooks
- Follow component naming conventions (PascalCase)
- Extract complex logic into custom hooks
- Use proper prop destructuring

### Styling
- Use Tailwind CSS utility classes
- Follow the established color scheme
- Ensure responsive design (mobile-first approach)
- Maintain accessibility standards

### Code Style
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic
- Follow existing code formatting

## Commit Guidelines

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(editor): add real-time collaboration
fix(ui): resolve mobile navigation issue
docs(readme): update installation instructions
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards

3. Test your changes thoroughly:
   ```bash
   npm run check  # TypeScript checking
   npm run build  # Build verification
   ```

4. Commit your changes with meaningful commit messages

5. Push to your fork and create a pull request

6. Fill out the pull request template with:
   - Clear description of changes
   - Screenshots for UI changes
   - Testing instructions
   - Breaking changes (if any)

## Testing Guidelines

### Manual Testing
- Test all new features thoroughly
- Verify responsive design on different screen sizes
- Test keyboard navigation and accessibility
- Check browser compatibility

### Component Testing
- Test component props and state changes
- Verify error handling
- Test edge cases
- Ensure proper cleanup

## Documentation

### Code Documentation
- Document complex functions and algorithms
- Add JSDoc comments for public APIs
- Update README for new features
- Include code examples where helpful

### User Documentation
- Update user-facing documentation
- Add screenshots for new features
- Provide clear step-by-step instructions
- Include troubleshooting guides

## Issue Guidelines

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots or error messages

### Feature Requests
Include:
- Clear description of the feature
- Use case and benefits
- Potential implementation approach
- Mockups or examples (if applicable)

## Review Process

### Code Review Checklist
- [ ] Code follows project standards
- [ ] Tests pass and new tests added if needed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
- [ ] Accessibility considerations addressed
- [ ] Performance impact considered

### Review Timeline
- Initial review within 2-3 business days
- Follow-up reviews within 1-2 business days
- Urgent fixes reviewed within 24 hours

## Release Process

### Version Numbering
We follow Semantic Versioning (SemVer):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Release Workflow
1. Create release branch from `main`
2. Update version numbers and changelog
3. Test release candidate
4. Merge to `main` and tag release
5. Deploy to your self-hosted server (see DEPLOYMENT.md)

## Getting Help

### Communication Channels
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and community support
- Pull Request Comments: Code-specific discussions

### Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)

## Recognition

Contributors are recognized in:
- README.md acknowledgments
- Release notes
- GitHub contributor graphs

Thank you for contributing to MarkdownMate!